/**
 * workflow-setting.js - Workflow Settings Module
 * Quản lý: Loại RQL2, Phân loại, Phương án (dành cho module Giám Sát, Complaint)
 */

window.workflowSettings = {
    requestTypes: [],
    subTypes: [],
    resolutions: []
};

document.addEventListener('DOMContentLoaded', () => {
    // Buttons Add
    const btnAddReqType = document.getElementById('btn-add-req-type');
    const btnAddSubType = document.getElementById('btn-add-sub-type');
    const btnAddResolution = document.getElementById('btn-add-resolution');

    if (btnAddReqType) btnAddReqType.addEventListener('click', addRequestType);
    if (btnAddSubType) btnAddSubType.addEventListener('click', addSubType);
    if (btnAddResolution) btnAddResolution.addEventListener('click', addResolution);
});

window.loadWorkflowSettingsFromDrive = async function() {
    if (!window.GPORTAL_FOLDERS || !AppState.isLoggedIn) return;
    console.log('Đang tải Workflow Settings từ Drive...');

    try {
        const settingsData = await window.getJsonFromDrive('workflow_settings.json', window.GPORTAL_FOLDERS.settings);
        
        if (settingsData) {
            window.workflowSettings.requestTypes = Array.isArray(settingsData.requestTypes) ? settingsData.requestTypes : [];
            window.workflowSettings.subTypes = Array.isArray(settingsData.subTypes) ? settingsData.subTypes : [];
            window.workflowSettings.resolutions = Array.isArray(settingsData.resolutions) ? settingsData.resolutions : [];
        }
        
        console.log('Đã load Workflow Settings thành công.');
        renderWorkflowSettingsUI();
    } catch (err) {
        console.error('Lỗi khi tải workflow settings:', err);
    }
};

window.saveWorkflowSettingsToDrive = async function() {
    if (!window.GPORTAL_FOLDERS || !AppState.isLoggedIn) return;
    try {
        const btnAll = document.querySelectorAll('#workflow-settings-container .btn-primary, #workflow-settings-container .btn-ghost, #workflow-settings-container .btn-icon');
        btnAll.forEach(btn => btn.disabled = true);

        await window.saveJsonToDrive('workflow_settings.json', window.workflowSettings, window.GPORTAL_FOLDERS.settings);
        
        btnAll.forEach(btn => btn.disabled = false);
        console.log('Đã lưu Workflow Settings thành công!');
    } catch (err) {
        console.error('Lỗi khi lưu workflow settings:', err);
        alert('Lưu thất bại: ' + err.message);
    }
};

function renderWorkflowSettingsUI() {
    renderRequestTypes();
    renderSubTypes();
    renderResolutions();
    updateSubTypeParentDropdown();
}

// ==================== REQUEST TYPE ====================
function renderRequestTypes() {
    const list = document.getElementById('ws-req-type-list');
    if (!list) return;
    list.innerHTML = '';
    window.workflowSettings.requestTypes.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${item.name}</strong>
            </div>
            <button class="btn-icon danger" type="button" title="Xóa" onclick="deleteRequestType(${index})"><i class='bx bx-trash'></i></button>
        `;
        list.appendChild(li);
    });
}

function addRequestType() {
    const nameInput = document.getElementById('ws-req-type-name');
    const name = nameInput.value.trim();
    if (!name) return alert('Vui lòng nhập tên Loại RQL2');
    
    // Check duplicate
    if (window.workflowSettings.requestTypes.some(rt => rt.name.toLowerCase() === name.toLowerCase())) {
        return alert('Tên này đã tồn tại!');
    }

    window.workflowSettings.requestTypes.push({ name });
    nameInput.value = '';
    
    renderRequestTypes();
    updateSubTypeParentDropdown();
    window.saveWorkflowSettingsToDrive();
}

window.deleteRequestType = function(index) {
    if (confirm('Bạn có chắc muốn xóa loại này? Các Phân loại (Sub-type) thuộc loại này sẽ không còn hiển thị đúng nếu không được cập nhật.')) {
        window.workflowSettings.requestTypes.splice(index, 1);
        renderRequestTypes();
        updateSubTypeParentDropdown();
        window.saveWorkflowSettingsToDrive();
    }
};

// ==================== SUB-TYPE ====================
function updateSubTypeParentDropdown() {
    const select = document.getElementById('ws-sub-type-parent');
    if (!select) return;
    const currentVal = select.value;
    
    select.innerHTML = '<option value="">-- Chọn Loại RQL2 --</option>';
    window.workflowSettings.requestTypes.forEach(rt => {
        const option = document.createElement('option');
        option.value = rt.name;
        option.textContent = rt.name;
        select.appendChild(option);
    });
    
    if (currentVal && window.workflowSettings.requestTypes.some(rt => rt.name === currentVal)) {
        select.value = currentVal;
    }
}

function renderSubTypes() {
    const list = document.getElementById('ws-sub-type-list');
    if (!list) return;
    list.innerHTML = '';
    window.workflowSettings.subTypes.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${item.name}</strong> 
                <span class="tag-task" style="font-size: 11px; margin-left: 8px; padding: 2px 6px;">${item.parentType}</span>
            </div>
            <button class="btn-icon danger" type="button" title="Xóa" onclick="deleteSubType(${index})"><i class='bx bx-trash'></i></button>
        `;
        list.appendChild(li);
    });
}

function addSubType() {
    const parentInput = document.getElementById('ws-sub-type-parent');
    const nameInput = document.getElementById('ws-sub-type-name');
    
    const parentType = parentInput.value;
    const name = nameInput.value.trim();
    
    if (!parentType) return alert('Vui lòng chọn Loại RQL2 trước!');
    if (!name) return alert('Vui lòng nhập tên Phân loại');

    // Check duplicate
    if (window.workflowSettings.subTypes.some(st => st.name.toLowerCase() === name.toLowerCase() && st.parentType === parentType)) {
        return alert('Tên phân loại này đã tồn tại trong Loại RQL2 đã chọn!');
    }

    window.workflowSettings.subTypes.push({ name, parentType });
    nameInput.value = '';
    
    renderSubTypes();
    window.saveWorkflowSettingsToDrive();
}

window.deleteSubType = function(index) {
    if (confirm('Bạn có chắc muốn xóa phân loại này?')) {
        window.workflowSettings.subTypes.splice(index, 1);
        renderSubTypes();
        window.saveWorkflowSettingsToDrive();
    }
};

// ==================== RESOLUTION ====================
function renderResolutions() {
    const list = document.getElementById('ws-resolution-list');
    if (!list) return;
    list.innerHTML = '';
    window.workflowSettings.resolutions.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${item.name}</strong>
            </div>
            <button class="btn-icon danger" type="button" title="Xóa" onclick="deleteResolution(${index})"><i class='bx bx-trash'></i></button>
        `;
        list.appendChild(li);
    });
}

function addResolution() {
    const nameInput = document.getElementById('ws-resolution-name');
    const name = nameInput.value.trim();
    if (!name) return alert('Vui lòng nhập tên Phương án');
    
    // Check duplicate
    if (window.workflowSettings.resolutions.some(res => res.name.toLowerCase() === name.toLowerCase())) {
        return alert('Tên này đã tồn tại!');
    }

    window.workflowSettings.resolutions.push({ name });
    nameInput.value = '';
    
    renderResolutions();
    window.saveWorkflowSettingsToDrive();
}

window.deleteResolution = function(index) {
    if (confirm('Bạn có chắc muốn xóa phương án này?')) {
        window.workflowSettings.resolutions.splice(index, 1);
        renderResolutions();
        window.saveWorkflowSettingsToDrive();
    }
};
