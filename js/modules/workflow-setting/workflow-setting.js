/**
 * workflow-setting.js - Workflow Settings Module
 * Quản lý: Phân loại RQL2, Vùng miền, Phương án (dành cho module Giám Sát, Complaint)
 */

window.workflowSettings = {
    requestTypes: [], // { type, subType }
    regions: [], // { region, provinceCode, provinceName, branch }
    resolutions: [] // { name }
};

document.addEventListener('DOMContentLoaded', () => {
    // Buttons Add
    const btnAddReqType = document.getElementById('btn-add-req-type');
    const btnAddRegion = document.getElementById('btn-add-region');
    const btnAddResolution = document.getElementById('btn-add-resolution');

    if (btnAddReqType) btnAddReqType.addEventListener('click', addRequestType);
    if (btnAddRegion) btnAddRegion.addEventListener('click', addRegion);
    if (btnAddResolution) btnAddResolution.addEventListener('click', addResolution);

    // Import/Export
    bindIfExists('btn-export-req', 'click', exportReqExcel);
    bindIfExists('import-req-excel', 'change', importReqExcel);
    
    bindIfExists('btn-export-region', 'click', exportRegionExcel);
    bindIfExists('import-region-excel', 'change', importRegionExcel);
    
    bindIfExists('btn-export-res', 'click', exportResExcel);
    bindIfExists('import-res-excel', 'change', importResExcel);
});

function bindIfExists(id, eventName, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(eventName, handler);
}

window.loadWorkflowSettingsFromDrive = async function() {
    if (!window.GPORTAL_FOLDERS || !AppState.isLoggedIn) return;
    console.log('Đang tải Workflow Settings từ Drive...');

    try {
        const settingsData = await window.getJsonFromDrive('workflow_settings.json', window.GPORTAL_FOLDERS.settings);
        
        if (settingsData) {
            window.workflowSettings.requestTypes = Array.isArray(settingsData.requestTypes) ? settingsData.requestTypes : [];
            window.workflowSettings.regions = Array.isArray(settingsData.regions) ? settingsData.regions : [];
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
    renderRegions();
    renderResolutions();
}

// ==================== REQUEST TYPE & SUB-TYPE ====================
function renderRequestTypes() {
    const list = document.getElementById('ws-req-type-list');
    if (!list) return;
    list.innerHTML = '';
    window.workflowSettings.requestTypes.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${item.type}</strong> 
                <span class="tag-task" style="font-size: 11px; margin-left: 8px; padding: 2px 6px;">${item.subType}</span>
            </div>
            <button class="btn-icon danger" type="button" title="Xóa" onclick="deleteRequestType(${index})"><i class='bx bx-trash'></i></button>
        `;
        list.appendChild(li);
    });
}

function addRequestType() {
    const typeInput = document.getElementById('ws-req-type-name');
    const subTypeInput = document.getElementById('ws-sub-type-name');
    const type = typeInput.value.trim();
    const subType = subTypeInput.value.trim();
    
    if (!type || !subType) return alert('Vui lòng nhập cả Loại RQL2 và Phân loại!');
    
    if (window.workflowSettings.requestTypes.some(rt => rt.type.toLowerCase() === type.toLowerCase() && rt.subType.toLowerCase() === subType.toLowerCase())) {
        return alert('Tổ hợp Loại RQL2 và Phân loại này đã tồn tại!');
    }

    window.workflowSettings.requestTypes.push({ type, subType });
    typeInput.value = '';
    subTypeInput.value = '';
    
    renderRequestTypes();
    window.saveWorkflowSettingsToDrive();
}

window.deleteRequestType = function(index) {
    if (confirm('Bạn có chắc muốn xóa loại này?')) {
        window.workflowSettings.requestTypes.splice(index, 1);
        renderRequestTypes();
        window.saveWorkflowSettingsToDrive();
    }
};

function exportReqExcel() {
    const data = window.workflowSettings.requestTypes.map(item => ({
        'Loại RQL2': item.type,
        'Phân loại': item.subType
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RequestType");
    XLSX.writeFile(wb, "RQL2_PhanLoai.xlsx");
}

function importReqExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, {type: 'array'});
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(ws);
            
            let count = 0;
            jsonData.forEach(row => {
                const type = (row['Loại RQL2'] || '').trim();
                const subType = (row['Phân loại'] || '').trim();
                if (type && subType) {
                    if (!window.workflowSettings.requestTypes.some(rt => rt.type.toLowerCase() === type.toLowerCase() && rt.subType.toLowerCase() === subType.toLowerCase())) {
                        window.workflowSettings.requestTypes.push({ type, subType });
                        count++;
                    }
                }
            });
            renderRequestTypes();
            window.saveWorkflowSettingsToDrive();
            alert(`Đã import thêm ${count} bản ghi!`);
        } catch(err) {
            alert('Lỗi đọc file Excel: ' + err.message);
        }
        e.target.value = ''; // reset
    };
    reader.readAsArrayBuffer(file);
}

// ==================== REGIONS ====================
function renderRegions() {
    const list = document.getElementById('ws-region-list');
    if (!list) return;
    list.innerHTML = '';
    window.workflowSettings.regions.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${item.region}</strong> 
                <span style="margin-left: 6px; font-size: 13px; color: var(--text-muted);">${item.provinceCode} - ${item.provinceName} - ${item.branch}</span>
            </div>
            <button class="btn-icon danger" type="button" title="Xóa" onclick="deleteRegion(${index})"><i class='bx bx-trash'></i></button>
        `;
        list.appendChild(li);
    });
}

function addRegion() {
    const region = document.getElementById('ws-region-name').value.trim();
    const provinceCode = document.getElementById('ws-province-code').value.trim();
    const provinceName = document.getElementById('ws-province-name').value.trim();
    const branch = document.getElementById('ws-branch-name').value.trim();
    
    if (!region || !provinceCode || !provinceName || !branch) return alert('Vui lòng nhập đầy đủ Khu Vực, Mã Tỉnh, Tỉnh/Thành, và Chi Nhánh!');
    
    if (window.workflowSettings.regions.some(r => r.branch.toLowerCase() === branch.toLowerCase())) {
        return alert('Chi nhánh này đã tồn tại!');
    }

    window.workflowSettings.regions.push({ region, provinceCode, provinceName, branch });
    document.getElementById('ws-region-name').value = '';
    document.getElementById('ws-province-code').value = '';
    document.getElementById('ws-province-name').value = '';
    document.getElementById('ws-branch-name').value = '';
    
    renderRegions();
    window.saveWorkflowSettingsToDrive();
}

window.deleteRegion = function(index) {
    if (confirm('Bạn có chắc muốn xóa vùng miền này?')) {
        window.workflowSettings.regions.splice(index, 1);
        renderRegions();
        window.saveWorkflowSettingsToDrive();
    }
};

function exportRegionExcel() {
    const data = window.workflowSettings.regions.map(item => ({
        'Khu Vực': item.region,
        'Mã Tỉnh/Thành': item.provinceCode,
        'Tỉnh / Thành': item.provinceName,
        'Chi Nhánh': item.branch
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Regions");
    XLSX.writeFile(wb, "DuLieuVungMien.xlsx");
}

function importRegionExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, {type: 'array'});
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(ws);
            
            let count = 0;
            jsonData.forEach(row => {
                const region = (row['Khu Vực'] || '').trim();
                const provinceCode = (row['Mã Tỉnh/Thành'] || '').trim();
                const provinceName = (row['Tỉnh / Thành'] || '').trim();
                const branch = (row['Chi Nhánh'] || '').trim();
                
                if (region && provinceCode && provinceName && branch) {
                    if (!window.workflowSettings.regions.some(r => r.branch.toLowerCase() === branch.toLowerCase())) {
                        window.workflowSettings.regions.push({ region, provinceCode, provinceName, branch });
                        count++;
                    }
                }
            });
            renderRegions();
            window.saveWorkflowSettingsToDrive();
            alert(`Đã import thêm ${count} bản ghi!`);
        } catch(err) {
            alert('Lỗi đọc file Excel: ' + err.message);
        }
        e.target.value = ''; // reset
    };
    reader.readAsArrayBuffer(file);
}

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

function exportResExcel() {
    const data = window.workflowSettings.resolutions.map(item => ({
        'Phương án': item.name
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resolutions");
    XLSX.writeFile(wb, "PhuongAn.xlsx");
}

function importResExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, {type: 'array'});
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(ws);
            
            let count = 0;
            jsonData.forEach(row => {
                const name = (row['Phương án'] || '').trim();
                if (name) {
                    if (!window.workflowSettings.resolutions.some(res => res.name.toLowerCase() === name.toLowerCase())) {
                        window.workflowSettings.resolutions.push({ name });
                        count++;
                    }
                }
            });
            renderResolutions();
            window.saveWorkflowSettingsToDrive();
            alert(`Đã import thêm ${count} bản ghi!`);
        } catch(err) {
            alert('Lỗi đọc file Excel: ' + err.message);
        }
        e.target.value = ''; // reset
    };
    reader.readAsArrayBuffer(file);
}
