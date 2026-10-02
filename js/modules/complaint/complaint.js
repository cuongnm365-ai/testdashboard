(function () {
    'use strict';

    const TABLE_KEY = 'gportal_complaint_records_v1';
    const DEFAULT_ACCOUNT = 'CuongNM3';
    const CONTRACT_PREFIXES = [
        'HN','QN','HD','DA','NT','DN','BD','BG','BN','CB','HA','HB','LC','LS','PT','TN','TQ','VP','YB','DB','HM','HY','NA','NB','SL','TB','TH','SG','HP','BI','DK','DL','GL','HU','KT','PY','QB','QI','QA','QT','BT','LA','LD','NN','TI','AG','BL','CM','BE','CT','DT','HG','KG','ST','TG','TV','VL','LI','BK','VT','ND','HT','BP'
    ];

    const complaintState = {
        records: [],
        editingId: null,
        lastParsed: null,
        stage: 'initial',
        detected: null
    };

    function escapeHtml(value) {
        return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }

    function normalizeText(value) {
        return String(value === undefined || value === null ? '' : value).trim();
    }

    function normalizePhone(raw) {
        const value = normalizeText(raw).replace(/[^0-9+]/g, '');
        if (!value) return '';
        if (/^\+84\d{9,10}$/.test(value)) return '0' + value.slice(3);
        if (/^84\d{9,10}$/.test(value)) return '0' + value.slice(2);
        if (/^0\d{9,10}$/.test(value)) return value;
        if (/^\d{9,10}$/.test(value)) return '0' + value;
        return value;
    }

    function toLocalInput(dt) {
        if (!dt) return '';
        if (typeof dt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dt)) return dt;
        const d = new Date(dt);
        if (Number.isNaN(d.getTime())) return '';
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60000);
        return local.toISOString().slice(0, 16);
    }

    function getWorkflowSettings() {
        return window.workflowSettings || { regions: [], sources: [], requestTypes: [], srTypes: [], fbAccounts: [], levels: [], handlingUnits: [], vouchers: [], results: [], complaintServices: [] };
    }

    function slugify(value) {
        return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    function unique(values) {
        const seen = new Set();
        return values.filter((value) => {
            const key = normalizeText(value).toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function safeLocalGet(key) {
        try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
    }

    function safeLocalSet(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('[Complaint] localStorage save failed:', e); }
    }

    function getComplaintSourceOptions() {
        const setting = getWorkflowSettings();
        const fromWorkflow = (setting.sources || []).map((item) => item && item.name ? item.name : item).filter(Boolean);
        const fallback = ['Facebook', 'Email', 'X', 'Zalo', 'Other social media channels'];
        return unique(fromWorkflow.concat(fallback));
    }

    function getKVOptions() {
        const setting = getWorkflowSettings();
        const regions = Array.isArray(setting.regions) ? setting.regions : [];
        const kvs = regions.map((item) => item && item.region ? item.region : '');
        return unique(kvs.concat('CXD'));
    }

    function getCNOptionsByKV(kv) {
        const setting = getWorkflowSettings();
        const regions = Array.isArray(setting.regions) ? setting.regions : [];
        if (!kv || kv === 'CXD') return ['CXD'];
        const matched = regions.find((item) => normalizeText(item.region) === normalizeText(kv));
        if (!matched) return ['CXD'];
        const branches = Array.isArray(matched.branches) ? matched.branches : [];
        return unique(branches.map((item) => normalizeText(item)).concat('CXD'));
    }

    function getFTelOptionsByKV(kv) {
        const setting = getWorkflowSettings();
        const list = Array.isArray(setting.fbAccounts) ? setting.fbAccounts : [];
        if (!kv) return unique(list.map((item) => item && item.name ? item.name : item).filter(Boolean));
        const matched = list.filter((item) => {
            const name = normalizeText(item && item.name ? item.name : item);
            const kvName = normalizeText(item && item.kv ? item.kv : '');
            return !kvName || kvName === kv || name.toLowerCase().includes(kv.toLowerCase());
        });
        return unique(matched.map((item) => item && item.name ? item.name : item).filter(Boolean));
    }

    function getLevelOptions() {
        const setting = getWorkflowSettings();
        const values = Array.isArray(setting.levels) ? setting.levels : [];
        return unique(values.map((item) => item && item.name ? item.name : item).filter(Boolean));
    }

    function getSRType1Options() {
        const tree = getWorkflowSettings().srTypes || [];
        return unique(tree.map((item) => item && item.type ? item.type : item).filter(Boolean));
    }

    function getSRType2Options(level1) {
        const tree = getWorkflowSettings().srTypes || [];
        const match = tree.find((item) => normalizeText(item.type) === normalizeText(level1));
        return match ? unique((match.subTypes || []).map(normalizeText).filter(Boolean)) : [];
    }

    function getSimpleOptions(key, fallback) {
        const setting = getWorkflowSettings();
        const values = Array.isArray(setting[key]) ? setting[key] : [];
        const out = values.map((item) => item && item.name ? item.name : item).filter(Boolean);
        return unique(out.length ? out : fallback);
    }

    function fillSelect(select, options, selectedValue) {
        if (!select) return;
        const before = select.value;
        select.innerHTML = '<option value="">-- Chọn --</option>' + options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('');
        if (selectedValue && options.includes(selectedValue)) select.value = selectedValue;
        else if (before && options.includes(before)) select.value = before;
        else select.value = '';
    }

    function updateRelatedDropdowns() {
        const kv = document.getElementById('complaint-kv') ? document.getElementById('complaint-kv').value : '';
        const cnSelect = document.getElementById('complaint-cn');
        const fTelSelect = document.getElementById('complaint-ftel');
        const srType1 = document.getElementById('complaint-request-type-1') ? document.getElementById('complaint-request-type-1').value : '';

        if (cnSelect) fillSelect(cnSelect, getCNOptionsByKV(kv), cnSelect.value || '');
        if (fTelSelect) fillSelect(fTelSelect, getFTelOptionsByKV(kv), fTelSelect.value || '');

        const request2 = document.getElementById('complaint-request-type-2');
        if (request2) fillSelect(request2, getSRType2Options(srType1), request2.value || '');
    }

    function collectWorkflowOptions() {
        fillSelect(document.getElementById('complaint-source'), getComplaintSourceOptions(), '');
        fillSelect(document.getElementById('complaint-kv'), getKVOptions(), '');
        fillSelect(document.getElementById('complaint-level'), getLevelOptions(), '');
        fillSelect(document.getElementById('complaint-request-type-1'), getSRType1Options(), '');
        fillSelect(document.getElementById('complaint-ftel'), getFTelOptionsByKV(''), '');
        fillSelect(document.getElementById('complaint-service-type'), getSimpleOptions('complaintServices', ['Internet', 'TV', 'Phone', 'Di động', 'Data', 'Khác']), '');
        fillSelect(document.getElementById('complaint-handling-unit'), getSimpleOptions('handlingUnits', ['SOC HTTC', 'Phối hợp đơn vị']), '');
        fillSelect(document.getElementById('complaint-voucher'), getSimpleOptions('vouchers', []), '');
        fillSelect(document.getElementById('complaint-result'), getSimpleOptions('results', ['Đã xử lý', 'Đang xử lý', 'Chưa xử lý', 'Khác']), '');
        fillSelect(document.getElementById('complaint-cn'), getCNOptionsByKV(''), '');
        fillSelect(document.getElementById('complaint-request-type-2'), [], '');
        document.getElementById('complaint-account-receive').value = '';
        document.getElementById('complaint-account-lead').value = '';
        document.getElementById('complaint-account-last').value = '';
    }

    function showComplaintModal(mode, row) {
        const modal = document.getElementById('complaint-modal');
        if (!modal) return;
        const title = document.getElementById('complaint-modal-title');
        const deleteBtn = document.getElementById('btn-delete-complaint');
        const saveBtn = document.getElementById('btn-save-complaint');
        if (title) title.textContent = mode === 'edit' ? 'Chỉnh sửa khiếu nại' : 'Thêm khiếu nại mới';
        if (deleteBtn) deleteBtn.style.display = mode === 'edit' ? 'inline-flex' : 'none';
        if (saveBtn) saveBtn.textContent = 'Lưu';
        complaintState.editingId = row && row.id ? row.id : null;
        populateComplaintForm(row || {});
        modal.style.display = 'flex';
        modal.classList.add('active');
    }

    function closeComplaintModal() {
        const modal = document.getElementById('complaint-modal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        complaintState.editingId = null;
        complaintState.lastParsed = null;
    }

    function populateComplaintForm(row) {
        const values = row || {};
        const fields = {
            source: document.getElementById('complaint-source'),
            kv: document.getElementById('complaint-kv'),
            cn: document.getElementById('complaint-cn'),
            phone: document.getElementById('complaint-phone'),
            ftel: document.getElementById('complaint-ftel'),
            customer: document.getElementById('complaint-customer'),
            customerProfile: document.getElementById('complaint-customer-profile'),
            postUrl: document.getElementById('complaint-post-url'),
            content: document.getElementById('complaint-content'),
            level: document.getElementById('complaint-level'),
            customerTime: document.getElementById('complaint-customer-time'),
            alertTime: document.getElementById('complaint-alert-time'),
            firstReply: document.getElementById('complaint-first-reply'),
            completeTime: document.getElementById('complaint-complete-time'),
            accountReceive: document.getElementById('complaint-account-receive'),
            accountLead: document.getElementById('complaint-account-lead'),
            accountLast: document.getElementById('complaint-account-last'),
            requestType1: document.getElementById('complaint-request-type-1'),
            requestType2: document.getElementById('complaint-request-type-2'),
            serviceType: document.getElementById('complaint-service-type'),
            srCode: document.getElementById('complaint-sr-code'),
            handlingUnit: document.getElementById('complaint-handling-unit'),
            voucher: document.getElementById('complaint-voucher'),
            result: document.getElementById('complaint-result'),
            status: document.getElementById('complaint-status'),
            note: document.getElementById('complaint-note'),
            paste: document.getElementById('complaint-paste-text')
        };

        const sourceOptions = getComplaintSourceOptions();
        const kvOptions = getKVOptions();
        const levelOptions = getLevelOptions();
        const request1Options = getSRType1Options();
        const serviceOptions = getSimpleOptions('complaintServices', ['Internet', 'TV', 'Phone', 'Di động', 'Data', 'Khác']);
        const unitOptions = getSimpleOptions('handlingUnits', ['SOC HTTC', 'Phối hợp đơn vị']);
        const voucherOptions = getSimpleOptions('vouchers', []);
        const resultOptions = getSimpleOptions('results', ['Đã xử lý', 'Đang xử lý', 'Chưa xử lý', 'Khác']);

        fillSelect(fields.source, sourceOptions, values.source || '');
        fillSelect(fields.kv, kvOptions, values.kv || '');
        fillSelect(fields.cn, getCNOptionsByKV(values.kv || ''), values.cn || '');
        fillSelect(fields.ftel, getFTelOptionsByKV(values.kv || ''), values.nickFtel || '');
        fillSelect(fields.level, levelOptions, values.level || '');
        fillSelect(fields.requestType1, request1Options, values.requestType1 || '');
        fillSelect(fields.requestType2, getSRType2Options(values.requestType1 || ''), values.requestType2 || '');
        fillSelect(fields.serviceType, serviceOptions, values.serviceType || '');
        fillSelect(fields.handlingUnit, unitOptions, values.handlingUnit || '');
        fillSelect(fields.voucher, voucherOptions, values.voucher || '');
        fillSelect(fields.result, resultOptions, values.result || '');
        if (fields.status && !Array.from(fields.status.options).some((option) => option.value === (values.status || 'In Process'))) {
            fields.status.add(new Option(values.status || 'In Process', values.status || 'In Process'));
        }
        if (fields.status) fields.status.value = values.status || 'In Process';
        const statusBadge = document.getElementById('complaint-status-badge');
        if (statusBadge) statusBadge.textContent = values.status || 'In Process';

        fields.phone.value = values.phone || values.contractNo || '';
        fields.customer.value = values.customer || values.customerInfo || '';
        fields.customerProfile.value = values.customerProfile || values.customerEmail || '';
        fields.postUrl.value = values.postUrl || '';
        fields.postUrl.style.display = 'none';
        updatePostLinkDisplay();
        fields.content.value = values.complaintText || '';
        fields.customerTime.value = toLocalInput(values.complaintTime || values.customerComplaintTime || '');
        fields.alertTime.value = toLocalInput(values.alertReceivedTime || '');
        fields.firstReply.value = toLocalInput(values.firstReplyTime || '');
        fields.completeTime.value = toLocalInput(values.handlingCompletedTime || '');
        fields.accountReceive.value = values.accountReceive || '';
        fields.accountLead.value = values.accountLead || '';
        fields.accountLast.value = values.accountLast || '';
        fields.srCode.value = values.srCode || '';
        fields.note.value = values.note || '';
        complaintState.detected = null;
        updateProcessingDetection(fields.note.value, false);
        fields.paste.value = values.rawText || values.complaintText || '';

        if (Object.keys(values).some((key) => key !== 'id' && key !== 'createdAt' && Boolean(normalizeText(values[key])))) {
            fields.accountReceive.value = fields.accountReceive.value || DEFAULT_ACCOUNT;
            fields.accountLead.value = fields.accountLead.value || DEFAULT_ACCOUNT;
            fields.accountLast.value = fields.accountLast.value || DEFAULT_ACCOUNT;
        }

        const summary = document.getElementById('complaint-detection-summary');
        if (summary) summary.textContent = values.rawText ? 'Dữ liệu đã được phân tích từ paste' : 'Chưa phân tích';
        setComplaintStage('initial');
    }

    function parseComplaintEmail(text) {
        const whole = String(text || '').trim();
        const result = { detected: {}, confidence: {}, rawText: whole };
        if (!whole) return result;
        const lines = whole.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
        const emailMatches = [...whole.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)];
        const urls = [...whole.matchAll(/https?:\/\/[^\s\)\]>"']+/gi)].map((match) => match[0].replace(/[.,;]+$/, ''));
        const source = /facebook|fb\.com/i.test(whole) ? 'Facebook'
            : /x\.com|twitter/i.test(whole) ? 'X'
                : /zalo/i.test(whole) ? 'Zalo'
                    : /instagram/i.test(whole) ? 'Instagram'
                        : /tiktok/i.test(whole) ? 'TikTok'
                            : (emailMatches.length || /\b(sent|from):/i.test(whole)) ? 'Email' : 'Other social media channels';
        const createdMatch = whole.match(/(?:Created|Published|Date|Sent)\s*:\s*(?:(\d{1,2}:\d{2})\s+)?(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
        const isoMatch = whole.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
        const detectedTime = createdMatch
            ? `${createdMatch[4]}-${String(createdMatch[3]).padStart(2, '0')}-${String(createdMatch[2]).padStart(2, '0')}T${createdMatch[1] || '00:00'}`
            : isoMatch ? `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T${isoMatch[4]}:${isoMatch[5]}` : '';
        const commentMatch = whole.match(/Comment\s+from\s+([^|\n<]+)(?:\s*\|\s*Facebook)?/i);
        const nameMatch = commentMatch || whole.match(/(?:From|Sender|Author|Tên|Name|Họ tên|Customer|Khách hàng)\s*[:\-]?\s*([^\n<]+)/i);
        const customerName = nameMatch ? normalizeText(nameMatch[1]).replace(/\s*\|\s*Facebook.*$/i, '').replace(/\s*\|.*$/, '').trim() : '';
        const profileMatch = whole.match(/(?:Profile|URL Profile|Facebook Profile)\s*[:：]\s*(https?:\/\/[^\s]+)/i);
        const customerProfile = profileMatch ? profileMatch[1].replace(/[.,;]+$/, '') : (emailMatches[0] ? emailMatches[0][0] : '');
        const isProfileUrl = (url) => /facebook\.com\/(?:profile\.php|[A-Za-z0-9.]+\/?(?:\?.*)?$)/i.test(url);
        const profileUrl = customerProfile || urls.find(isProfileUrl) || '';
        const postUrl = urls.find((url) => !isProfileUrl(url) && /facebook|x\.com|twitter|instagram|zalo|linkedin|youtu|fpt/i.test(url))
            || urls.find((url) => !isProfileUrl(url)) || '';
        const srMatch = whole.match(/\b(?:Mã\s*SR|SR\s*[:#-]?|SR\s*ID)\s*[:\-]?\s*([A-Za-z0-9-]+)/i) || whole.match(/\b(SHI-[A-Z0-9-]+)\b/i);
        const complaintLines = lines.filter((line) => !/^ALERT\b/i.test(line)
            && !/^Comment\s+from\b/i.test(line)
            && !/^(Created|Published|Date|Sent)\s*:/i.test(line)
            && !/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(line)
            && !/^(View post|View article)\b/i.test(line));
        const complaintContent = complaintLines.join('\n').trim() || whole;
        result.detected = {
            source, customerComplaintTime: detectedTime, customerName,
            customerProfileUrl: profileUrl || (emailMatches[0] ? emailMatches[0][0] : ''), customerEmail: emailMatches[0] ? emailMatches[0][0] : '',
            postUrl, srCode: srMatch ? (srMatch[1] || srMatch[0]).trim() : '', complaintContent
        };
        result.confidence = {
            source: source === 'Other social media channels' ? 'low' : 'high',
            customerComplaintTime: detectedTime ? 'high' : 'low',
            customerName: customerName ? (commentMatch ? 'high' : 'medium') : 'low',
            customerProfileUrl: profileUrl ? 'high' : 'low',
            postUrl: postUrl ? 'high' : 'low', srCode: srMatch ? 'high' : 'low',
            complaintContent: complaintContent ? 'high' : 'low'
        };
        return result;
    }

    function extractProcessingDetails(note) {
        const text = String(note || '');
        const workflow = getWorkflowSettings();
        const identifiers = typeof window.extractMonitoringIdentifiers === 'function'
            ? window.extractMonitoringIdentifiers(text) : { contractNo: '', phone: '', srCode: '' };
        const labeledContract = text.match(/(?:contract(?:\s*(?:no|number))?|hợp đồng|số hợp đồng|SHĐ)\s*[:#-]?\s*([A-Z0-9-]{6,20})/i);
        const contractMatch = text.match(/\b([A-Z]{2}[A-Z]{3}\d{4})\b/i);
        const contractNo = ((labeledContract && labeledContract[1]) || (contractMatch && contractMatch[1]) || identifiers.contractNo || '').toUpperCase();
        let phone = '';
        if (!contractNo) {
            const labeledPhone = text.match(/(?:phone|mobile|sđt|điện thoại)\s*[:#-]?\s*([+\d()\s.-]{9,})/i);
            const rawPhone = labeledPhone ? labeledPhone[1] : (text.match(/(?:\+?84|0)[\d\s().-]{8,16}/) || [''])[0];
            phone = normalizePhone(rawPhone);
            if (!/^0\d{9,10}$/.test(phone)) phone = '';
        }
        const regions = Array.isArray(workflow.regions) ? workflow.regions : [];
        const explicitRegion = text.match(/(?:region|khu vực|KV)\s*[:：]\s*([^\n,;]+)/i);
        let regionRecord = explicitRegion
            ? regions.find((item) => normalizeText(item.region).toLowerCase() === normalizeText(explicitRegion[1]).toLowerCase())
            : regions.filter((item) => normalizeText(item.region) && text.toLowerCase().includes(normalizeText(item.region).toLowerCase())).sort((a, b) => normalizeText(b.region).length - normalizeText(a.region).length)[0];
        if (!regionRecord && contractNo) regionRecord = regions.find((item) => normalizeText(item.provinceCode).toUpperCase() === contractNo.slice(0, 2));
        if (!regionRecord) regionRecord = regions.find((item) => (item.branches || []).some((branchName) => text.toLowerCase().includes(normalizeText(branchName).toLowerCase())));
        const region = regionRecord ? normalizeText(regionRecord.region) : 'CXD';
        const explicitBranch = text.match(/(?:branch|chi nhánh|CN)\s*[:：]\s*([^\n,;]+)/i);
        const branchList = regionRecord && Array.isArray(regionRecord.branches) ? regionRecord.branches : [];
        const branch = (explicitBranch && branchList.find((item) => normalizeText(item).toLowerCase() === normalizeText(explicitBranch[1]).toLowerCase()))
            || branchList.filter((item) => normalizeText(item) && text.toLowerCase().includes(normalizeText(item).toLowerCase())).sort((a, b) => normalizeText(b).length - normalizeText(a).length)[0]
            || 'CXD';
        const customerEmail = (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [''])[0];
        return { contractNo, phone, customerIdentifier: contractNo || phone, customerEmail, region, branch, srCode: identifiers.srCode || '' };
    }

    function updatePostLinkDisplay() {
        const input = document.getElementById('complaint-post-url');
        const link = document.getElementById('complaint-post-link-display');
        const empty = document.getElementById('complaint-post-link-empty');
        if (!input || !link || !empty) return;
        const url = normalizeText(input.value);
        const safeUrl = /^https?:\/\//i.test(url) ? url : '';
        link.href = safeUrl || '#';
        link.style.display = safeUrl ? 'inline-flex' : 'none';
        empty.style.display = safeUrl ? 'none' : 'inline';
    }

    function setComplaintStage(stage) {
        complaintState.stage = stage;
        const initial = document.getElementById('complaint-stage-initial');
        const processing = document.getElementById('complaint-stage-processing');
        const next = document.getElementById('btn-complaint-stage-next');
        const back = document.getElementById('btn-complaint-stage-back');
        const save = document.getElementById('btn-save-complaint');
        const isProcessing = stage === 'processing';
        if (initial) initial.style.display = isProcessing ? 'none' : 'block';
        if (processing) processing.style.display = isProcessing ? 'block' : 'none';
        if (next) next.style.display = !isProcessing && complaintState.editingId ? 'inline-flex' : 'none';
        if (back) back.style.display = isProcessing ? 'inline-flex' : 'none';
        if (save) save.innerHTML = isProcessing
            ? '<i class="bx bx-save"></i> Lưu thông tin xử lý'
            : `<i class="bx bx-save"></i> ${complaintState.editingId ? 'Lưu thông tin khiếu nại' : 'Tạo khiếu nại'}`;
    }

    function updateProcessingDetection(note, scanned) {
        const nodes = {
            contract: document.getElementById('complaint-detected-contract'),
            phone: document.getElementById('complaint-detected-phone'),
            email: document.getElementById('complaint-detected-email'),
            region: document.getElementById('complaint-detected-region'),
            branch: document.getElementById('complaint-detected-branch')
        };
        if (!Object.values(nodes).every(Boolean)) return;
        if (!normalizeText(note)) {
            const previous = complaintState.detected || {};
            complaintState.detected = null;
            nodes.contract.textContent = scanned ? 'Not found' : 'Not scanned';
            nodes.phone.textContent = scanned ? 'Not found' : 'Not scanned';
            nodes.email.textContent = scanned ? 'Not found' : 'Not scanned';
            if (scanned) {
                const regionField = document.getElementById('complaint-kv');
                const branchField = document.getElementById('complaint-cn');
                const phoneField = document.getElementById('complaint-phone');
                const emailField = document.getElementById('complaint-customer-profile');
                const srField = document.getElementById('complaint-sr-code');
                if (phoneField && previous.customerIdentifier && phoneField.value === previous.customerIdentifier) phoneField.value = '';
                if (emailField && previous.customerEmail && emailField.value === previous.customerEmail) emailField.value = '';
                if (srField && previous.srCode && srField.value === previous.srCode) srField.value = '';
                if (regionField && (!regionField.value || regionField.value === previous.region || regionField.value === 'CXD')) regionField.value = 'CXD';
                if (branchField && (!branchField.value || branchField.value === previous.branch || branchField.value === 'CXD')) {
                    updateRelatedDropdowns();
                    branchField.value = 'CXD';
                }
            }
            nodes.region.textContent = document.getElementById('complaint-kv')?.value || 'CXD';
            nodes.branch.textContent = document.getElementById('complaint-cn')?.value || 'CXD';
            return;
        }

        const detected = extractProcessingDetails(note);
        const previous = complaintState.detected || {};
        complaintState.detected = detected;
        nodes.contract.textContent = detected.contractNo ? `${detected.contractNo} ✓` : 'Not found';
        nodes.phone.textContent = detected.contractNo
            ? 'Not scanned (contract found)'
            : detected.phone ? `${detected.phone} ✓` : 'Not found';
        nodes.email.textContent = detected.customerEmail ? `${detected.customerEmail} ✓` : 'Not found';
        nodes.region.textContent = detected.region || 'CXD';
        nodes.branch.textContent = detected.branch || 'CXD';

        const phoneField = document.getElementById('complaint-phone');
        const phoneIsAutomatic = phoneField && (!phoneField.value || phoneField.value === previous.customerIdentifier);
        const contractTakesPriority = detected.contractNo && phoneField && /^0\d{9,10}$/.test(phoneField.value);
        if (phoneField && (phoneIsAutomatic || contractTakesPriority)) {
            phoneField.value = detected.customerIdentifier;
        }
        const emailField = document.getElementById('complaint-customer-profile');
        if (emailField && detected.customerEmail && (!emailField.value || emailField.value === previous.customerEmail)) {
            emailField.value = detected.customerEmail;
        }
        const regionField = document.getElementById('complaint-kv');
        const branchField = document.getElementById('complaint-cn');
        if (regionField && (!regionField.value || regionField.value === 'CXD' || regionField.value === previous.region)) {
            if (![...regionField.options].some((option) => option.value === detected.region)) regionField.add(new Option(detected.region, detected.region));
            regionField.value = detected.region;
        }
        if (branchField && (!branchField.value || branchField.value === 'CXD' || branchField.value === previous.branch)) {
            updateRelatedDropdowns();
            if (![...branchField.options].some((option) => option.value === detected.branch)) branchField.add(new Option(detected.branch, detected.branch));
            branchField.value = detected.branch;
        }
        if (detected.srCode && !document.getElementById('complaint-sr-code').value) {
            document.getElementById('complaint-sr-code').value = detected.srCode;
        }
    }

    function formatShortDateTime(value) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString('vi-VN', { hour12: false });
    }

    function buildComplaintRowFromForm() {
        const info = {
            source: normalizeText(document.getElementById('complaint-source').value),
            kv: normalizeText(document.getElementById('complaint-kv').value),
            cn: normalizeText(document.getElementById('complaint-cn').value),
            phone: normalizeText(document.getElementById('complaint-phone').value),
            nickFtel: normalizeText(document.getElementById('complaint-ftel').value),
            customer: normalizeText(document.getElementById('complaint-customer').value),
            postUrl: normalizeText(document.getElementById('complaint-post-url').value),
            complaintText: normalizeText(document.getElementById('complaint-content').value),
            level: normalizeText(document.getElementById('complaint-level').value),
            complaintTime: normalizeText(document.getElementById('complaint-customer-time').value),
            alertReceivedTime: normalizeText(document.getElementById('complaint-alert-time').value),
            firstReplyTime: normalizeText(document.getElementById('complaint-first-reply').value),
            handlingCompletedTime: normalizeText(document.getElementById('complaint-complete-time').value),
            accountReceive: normalizeText(document.getElementById('complaint-account-receive').value),
            accountLead: normalizeText(document.getElementById('complaint-account-lead').value),
            accountLast: normalizeText(document.getElementById('complaint-account-last').value),
            requestType1: normalizeText(document.getElementById('complaint-request-type-1').value),
            requestType2: normalizeText(document.getElementById('complaint-request-type-2').value),
            serviceType: normalizeText(document.getElementById('complaint-service-type').value),
            srCode: normalizeText(document.getElementById('complaint-sr-code').value),
            handlingUnit: normalizeText(document.getElementById('complaint-handling-unit').value),
            voucher: normalizeText(document.getElementById('complaint-voucher').value),
            result: normalizeText(document.getElementById('complaint-result').value),
            note: normalizeText(document.getElementById('complaint-note').value),
            rawText: normalizeText(document.getElementById('complaint-paste-text').value)
        };

        const hasContent = Object.values(info).some((value) => Boolean(value));
        if (hasContent) {
            info.accountReceive = info.accountReceive || DEFAULT_ACCOUNT;
            info.accountLead = info.accountLead || DEFAULT_ACCOUNT;
            info.accountLast = info.accountLast || DEFAULT_ACCOUNT;
        }

        const noteDetection = complaintState.detected || extractProcessingDetails(info.note);
        const enteredValue = info.phone.toUpperCase();
        const contractNo = /^[A-Z]{2}[A-Z]{3}\d{4}$/.test(enteredValue) || /^[A-Z]{2}\d{7,8}$/.test(enteredValue)
            ? enteredValue : (noteDetection.contractNo || '');
        const phoneValue = contractNo ? '' : (normalizePhone(info.phone) || noteDetection.phone || '');

        return {
            id: complaintState.editingId || ('complaint_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8)),
            source: info.source,
            status: normalizeText(document.getElementById('complaint-status')?.value) || 'In Process',
            kv: info.kv,
            cn: info.cn,
            phone: phoneValue,
            contractNo,
            nickFtel: info.nickFtel,
            customer: info.customer,
            customerInfo: info.customer,
            customerProfile: normalizeText(document.getElementById('complaint-customer-profile')?.value),
            postUrl: info.postUrl,
            complaintText: info.complaintText || info.rawText,
            level: info.level,
            complaintTime: info.complaintTime,
            alertReceivedTime: info.alertReceivedTime,
            firstReplyTime: info.firstReplyTime,
            handlingCompletedTime: info.handlingCompletedTime,
            accountReceive: info.accountReceive,
            accountLead: info.accountLead,
            accountLast: info.accountLast,
            requestType1: info.requestType1,
            requestType2: info.requestType2,
            serviceType: info.serviceType,
            srCode: info.srCode,
            handlingUnit: info.handlingUnit,
            voucher: info.voucher,
            result: info.result,
            note: info.note,
            rawText: info.rawText,
            createdAt: new Date().toISOString()
        };
    }

    function addOrUpdateComplaintRow(keepOpen) {
        const record = buildComplaintRowFromForm();
        const rows = complaintState.records;
        const index = rows.findIndex((item) => item.id === record.id);

        if (index >= 0) rows[index] = record;
        else rows.unshift(record);

        rows.forEach((item, idx) => {
            item.stt = idx + 1;
        });

        saveComplaintState();
        renderComplaintTable();
        if (!keepOpen) closeComplaintModal();
        return record;
    }

    function validateComplaintRecord(record) {
        const errors = [];
        if (!record.source) errors.push('Nguồn không được để trống.');
        if (!record.complaintText && !record.rawText) errors.push('Nội dung khiếu nại không được để trống.');
        if (record.phone && !/^0\d{9,10}$/.test(record.phone)) errors.push('SĐT không hợp lệ.');
        if (record.srCode && !/^[A-Za-z0-9-]+$/.test(record.srCode)) errors.push('Mã SR không hợp lệ.');
        if (record.postUrl && !/^https?:\/\//i.test(record.postUrl)) errors.push('Link URL bài post không hợp lệ.');
        if (record.kv && record.cn && !getCNOptionsByKV(record.kv).includes(record.cn)) errors.push('CN không thuộc KV đã chọn.');
        return errors;
    }

    function saveComplaintState() {
        const state = { records: complaintState.records };
        safeLocalSet(TABLE_KEY, state);
        if (window.GPORTAL_FOLDERS && typeof window.saveJsonToDrive === 'function' && AppState && AppState.isLoggedIn) {
            window.saveJsonToDrive('complaints.json', state, window.GPORTAL_FOLDERS.settings).catch((err) => {
                console.warn('[Complaint] Không thể lưu lên Drive:', err);
            });
        }
    }

    async function loadComplaintState() {
        let state = safeLocalGet(TABLE_KEY);
        if (state && Array.isArray(state.records)) complaintState.records = state.records;
        else complaintState.records = [];

        if (window.GPORTAL_FOLDERS && AppState && AppState.isLoggedIn && typeof window.getJsonFromDrive === 'function') {
            try {
                const remote = await window.getJsonFromDrive('complaints.json', window.GPORTAL_FOLDERS.settings);
                if (remote && Array.isArray(remote.records)) {
                    complaintState.records = remote.records;
                    safeLocalSet(TABLE_KEY, { records: complaintState.records });
                }
            } catch (err) {
                console.warn('[Complaint] Không tải được dữ liệu từ Drive:', err);
            }
        }
        renderComplaintTable();
    }

    function clearComplaintForm() {
        const formIds = [
            'complaint-source', 'complaint-kv', 'complaint-cn', 'complaint-phone', 'complaint-ftel', 'complaint-customer', 'complaint-customer-profile', 'complaint-post-url', 'complaint-content',
            'complaint-level', 'complaint-customer-time', 'complaint-alert-time', 'complaint-first-reply', 'complaint-complete-time', 'complaint-account-receive', 'complaint-account-lead', 'complaint-account-last',
            'complaint-request-type-1', 'complaint-request-type-2', 'complaint-service-type', 'complaint-sr-code', 'complaint-handling-unit', 'complaint-voucher', 'complaint-result', 'complaint-note', 'complaint-paste-text'
        ];
        formIds.forEach((id) => {
            const node = document.getElementById(id);
            if (node) {
                if (node.tagName === 'SELECT') node.value = '';
                else node.value = '';
            }
        });
        document.getElementById('complaint-detection-summary').textContent = 'Chưa phân tích';
        complaintState.lastParsed = null;
        complaintState.detected = null;
        const status = document.getElementById('complaint-status');
        if (status) status.value = 'In Process';
        const postUrl = document.getElementById('complaint-post-url');
        if (postUrl) postUrl.style.display = 'none';
        fillSelect(document.getElementById('complaint-request-type-2'), [], '');
        updatePostLinkDisplay();
        updateProcessingDetection('', false);
        setComplaintStage('initial');
    }

    function applyComplaintSearch() {
        const query = normalizeText(document.getElementById('complaint-search')?.value || '').toLowerCase();
        const rows = complaintState.records.filter((item) => {
            if (!query) return true;
            const haystack = [
                item.source, item.status, item.customerProfile, item.kv, item.cn, item.phone, item.contractNo, item.nickFtel, item.customer, item.customerInfo, item.postUrl, item.complaintText,
                item.level, item.complaintTime, item.alertReceivedTime, item.firstReplyTime, item.handlingCompletedTime, item.accountReceive,
                item.accountLead, item.accountLast, item.requestType1, item.requestType2, item.serviceType, item.note, item.handlingUnit,
                item.voucher, item.result, item.srCode
            ].join(' ').toLowerCase();
            return haystack.includes(query);
        });
        const tbody = document.getElementById('complaint-tbody');
        if (!tbody) return;
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="26" style="text-align:center; padding:42px; color:var(--text-muted);">Không tìm thấy Complaint phù hợp.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map((item) => `
            <tr data-id="${item.id}" style="cursor:pointer;">
                <td>${escapeHtml(item.stt || '')}</td>
                <td>${escapeHtml(item.source || '—')}</td>
                <td><span class="complaint-table-status">${escapeHtml(item.status || 'In Process')}</span></td>
                <td>${escapeHtml(item.kv || '—')}</td>
                <td>${escapeHtml(item.cn || '—')}</td>
                <td>${escapeHtml(item.phone || item.contractNo || '—')}</td>
                <td>${escapeHtml(item.nickFtel || '—')}</td>
                <td>${escapeHtml(item.customer || item.customerInfo || '—')}${item.customerProfile ? `<br>${/^https?:\/\//i.test(item.customerProfile) ? `<a href="${escapeHtml(item.customerProfile)}" target="_blank" rel="noopener" class="mon-link">Profile ↗</a>` : escapeHtml(item.customerProfile)}` : ''}</td>
                <td>${item.postUrl ? `<a href="${escapeHtml(item.postUrl)}" target="_blank" rel="noopener" class="mon-link">Xem bài viết ↗</a>` : '—'}</td>
                <td>${escapeHtml((item.complaintText || '').slice(0, 160) || '—')}</td>
                <td>${escapeHtml(item.level || '—')}</td>
                <td>${escapeHtml(item.complaintTime ? formatShortDateTime(item.complaintTime) : '—')}</td>
                <td>${escapeHtml(item.alertReceivedTime ? formatShortDateTime(item.alertReceivedTime) : '—')}</td>
                <td>${escapeHtml(item.firstReplyTime ? formatShortDateTime(item.firstReplyTime) : '—')}</td>
                <td>${escapeHtml(item.handlingCompletedTime ? formatShortDateTime(item.handlingCompletedTime) : '—')}</td>
                <td>${escapeHtml(item.accountReceive || '—')}</td>
                <td>${escapeHtml(item.accountLead || '—')}</td>
                <td>${escapeHtml(item.accountLast || '—')}</td>
                <td>${escapeHtml(item.requestType1 || '—')}</td>
                <td>${escapeHtml(item.requestType2 || '—')}</td>
                <td>${escapeHtml(item.serviceType || '—')}</td>
                <td>${escapeHtml(item.note || '—')}</td>
                <td>${escapeHtml(item.handlingUnit || '—')}</td>
                <td>${escapeHtml(item.voucher || '—')}</td>
                <td>${escapeHtml(item.result || '—')}</td>
                <td>${item.srCode ? `<a href="http://sr.fpt.net/sr/ServiceRequest/detail?code=${encodeURIComponent(item.srCode)}" target="_blank" rel="noopener" class="mon-link">${escapeHtml(item.srCode)}</a>` : '—'}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('tr[data-id]').forEach((row) => {
            row.addEventListener('click', () => {
                const targetId = row.getAttribute('data-id');
                const found = complaintState.records.find((item) => item.id === targetId);
                if (found) showComplaintModal('edit', found);
            });
        });
    }

    function renderComplaintTable() {
        const tbody = document.getElementById('complaint-tbody');
        const badge = document.getElementById('complaint-count-badge');
        if (badge) badge.textContent = `${complaintState.records.length} bản ghi`;
        if (!tbody) return;
        if (!complaintState.records.length) {
            tbody.innerHTML = '<tr><td colspan="26" style="text-align:center; padding:42px; color:var(--text-muted);">Chưa có dữ liệu Complaint — bấm <strong>+ Thêm khiếu nại</strong> để bắt đầu.</td></tr>';
            return;
        }
        applyComplaintSearch();
    }

    function parseAndPopulate() {
        const text = document.getElementById('complaint-paste-text')?.value || '';
        if (!text.trim()) {
            alert('Vui lòng dán nội dung email/alert trước khi phân tích.');
            return;
        }
        const parsed = parseComplaintEmail(text);
        complaintState.lastParsed = parsed;

        const summary = document.getElementById('complaint-detection-summary');
        if (summary) summary.textContent = `Phân tích: ${Object.keys(parsed.detected).filter((key) => parsed.detected[key]).length} trường được gợi ý`;

        const confidenceRank = { low: 0, medium: 1, high: 2 };
        const fieldPairs = [
            ['complaint-source', parsed.detected.source, 'source'],
            ['complaint-customer', parsed.detected.customerName, 'customerName'],
            ['complaint-customer-profile', parsed.detected.customerProfileUrl, 'customerProfileUrl'],
            ['complaint-post-url', parsed.detected.postUrl, 'postUrl'],
            ['complaint-customer-time', toLocalInput(parsed.detected.customerComplaintTime || ''), 'customerComplaintTime'],
            ['complaint-content', parsed.detected.complaintContent || text, 'complaintContent']
        ];
        const eligiblePairs = fieldPairs.filter(([, value, confidenceKey]) => value && (confidenceRank[parsed.confidence[confidenceKey] || 'low'] >= confidenceRank.medium));
        const conflicts = eligiblePairs.filter(([id, value]) => document.getElementById(id)?.value.trim())
            .filter(([id, value]) => document.getElementById(id).value.trim() !== value);
        const replaceExisting = conflicts.length && window.confirm(`Phân tích phát hiện ${conflicts.length} trường đã có dữ liệu. Ghi đè các trường này? Chọn Hủy để chỉ điền trường còn trống.`);

        const setIfValue = (elementId, value) => {
            if (elementId && value) {
                const element = document.getElementById(elementId);
                if (element && element.value.trim() && element.value.trim() !== value && !replaceExisting) return;
                if (element && element.tagName === 'SELECT') {
                    if (Array.from(element.options).some((option) => option.value === value)) element.value = value;
                    else {
                        const opt = new Option(value, value);
                        element.add(opt);
                        element.value = value;
                    }
                } else if (element) element.value = value;
            }
        };

        eligiblePairs.forEach(([id, value]) => setIfValue(id, value));

        updateRelatedDropdowns();
        updatePostLinkDisplay();
    }

    function bindComplaintEvents() {
        if (document.body.dataset.complaintEventsBound === '1') return;
        document.body.dataset.complaintEventsBound = '1';

        const addBtn = document.getElementById('btn-complaint-add');
        const refreshBtn = document.getElementById('btn-complaint-refresh');
        const modalCloseBtn = document.getElementById('btn-close-complaint-modal');
        const stageNextBtn = document.getElementById('btn-complaint-stage-next');
        const stageBackBtn = document.getElementById('btn-complaint-stage-back');
        const postLinkEditBtn = document.getElementById('btn-edit-complaint-post-link');
        const parseBtn = document.getElementById('btn-parse-complaint');
        const saveBtn = document.getElementById('btn-save-complaint');
        const clearBtn = document.getElementById('btn-clear-complaint');
        const deleteBtn = document.getElementById('btn-delete-complaint');
        const searchInput = document.getElementById('complaint-search');

        if (addBtn) addBtn.addEventListener('click', () => { clearComplaintForm(); showComplaintModal('new', null); });
        if (refreshBtn) refreshBtn.addEventListener('click', () => loadComplaintState());
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeComplaintModal);
        if (stageNextBtn) stageNextBtn.addEventListener('click', () => {
            setComplaintStage('processing');
            updateProcessingDetection(document.getElementById('complaint-note').value, Boolean(document.getElementById('complaint-note').value.trim()));
        });
        if (stageBackBtn) stageBackBtn.addEventListener('click', () => setComplaintStage('initial'));
        if (postLinkEditBtn) postLinkEditBtn.addEventListener('click', () => {
            const input = document.getElementById('complaint-post-url');
            input.style.display = input.style.display === 'none' ? 'block' : 'none';
            if (input.style.display === 'block') input.focus();
        });
        document.getElementById('complaint-post-url')?.addEventListener('input', updatePostLinkDisplay);
        if (parseBtn) parseBtn.addEventListener('click', parseAndPopulate);
        if (clearBtn) clearBtn.addEventListener('click', clearComplaintForm);
        if (deleteBtn) deleteBtn.addEventListener('click', () => {
            if (!complaintState.editingId) return;
            if (!confirm('Bạn có chắc chắn muốn xóa khiếu nại này?')) return;
            complaintState.records = complaintState.records.filter((item) => item.id !== complaintState.editingId);
            saveComplaintState();
            renderComplaintTable();
            closeComplaintModal();
        });
        if (saveBtn) saveBtn.addEventListener('click', () => {
            if (complaintState.stage === 'processing') {
                updateProcessingDetection(document.getElementById('complaint-note').value, true);
            }
            const record = buildComplaintRowFromForm();
            const errors = validateComplaintRecord(record);
            if (errors.length) {
                alert(errors.join('\n'));
                return;
            }
            if (complaintState.stage === 'initial' && !complaintState.editingId) {
                const created = addOrUpdateComplaintRow(true);
                complaintState.editingId = created.id;
                document.getElementById('complaint-account-receive').value = created.accountReceive || DEFAULT_ACCOUNT;
                document.getElementById('complaint-account-lead').value = created.accountLead || DEFAULT_ACCOUNT;
                document.getElementById('complaint-account-last').value = created.accountLast || DEFAULT_ACCOUNT;
                const title = document.getElementById('complaint-modal-title');
                if (title) title.textContent = 'Khiếu nại đã tạo · Bổ sung thông tin xử lý';
                setComplaintStage('processing');
                updateProcessingDetection(document.getElementById('complaint-note').value, false);
            } else {
                addOrUpdateComplaintRow(false);
            }
        });
        if (searchInput) searchInput.addEventListener('input', applyComplaintSearch);

        document.getElementById('complaint-kv')?.addEventListener('change', updateRelatedDropdowns);
        document.getElementById('complaint-source')?.addEventListener('change', () => {
            const sourceValue = document.getElementById('complaint-source').value;
            if (sourceValue && !document.getElementById('complaint-content').value.trim()) {
                const summary = document.getElementById('complaint-detection-summary');
                if (summary) summary.textContent = `Nguồn đã chọn: ${sourceValue}`;
            }
        });
        document.getElementById('complaint-request-type-1')?.addEventListener('change', () => {
            const requestType1 = document.getElementById('complaint-request-type-1').value;
            const requestType2 = document.getElementById('complaint-request-type-2');
            fillSelect(requestType2, getSRType2Options(requestType1), '');
        });

        document.getElementById('complaint-note')?.addEventListener('input', (event) => updateProcessingDetection(event.target.value, true));
        document.getElementById('complaint-status')?.addEventListener('change', (event) => {
            document.getElementById('complaint-status-badge').textContent = event.target.value || 'In Process';
        });

        const dataEntryIds = ['complaint-source', 'complaint-kv', 'complaint-cn', 'complaint-phone', 'complaint-ftel', 'complaint-customer', 'complaint-customer-profile', 'complaint-post-url', 'complaint-content', 'complaint-level', 'complaint-customer-time', 'complaint-alert-time', 'complaint-first-reply', 'complaint-complete-time', 'complaint-request-type-1', 'complaint-request-type-2', 'complaint-service-type', 'complaint-sr-code', 'complaint-handling-unit', 'complaint-voucher', 'complaint-result', 'complaint-note'];
        const fillAccountsIfRowHasData = () => {
            if (!dataEntryIds.some((fieldId) => normalizeText(document.getElementById(fieldId)?.value))) return;
            ['complaint-account-receive', 'complaint-account-lead', 'complaint-account-last'].forEach((accountId) => {
                const input = document.getElementById(accountId);
                if (input && !input.value) input.value = DEFAULT_ACCOUNT;
            });
        };
        dataEntryIds.forEach((id) => {
            document.getElementById(id)?.addEventListener('input', fillAccountsIfRowHasData);
            document.getElementById(id)?.addEventListener('change', fillAccountsIfRowHasData);
        });

        document.getElementById('complaint-paste-text')?.addEventListener('paste', () => {
            setTimeout(parseAndPopulate, 150);
        });

        document.getElementById('complaint-modal')?.addEventListener('click', (event) => {
            if (event.target && event.target.id === 'complaint-modal') closeComplaintModal();
        });
    }

    function setupComplaintStyles() {
        if (document.getElementById('complaint-style')) return;
        const style = document.createElement('style');
        style.id = 'complaint-style';
        style.textContent = `
            #view-complaint .complaint-form-grid { display:grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 14px; }
            #view-complaint .complaint-form-grid .span-2 { grid-column: span 2; }
            #view-complaint .complaint-modal-card { overflow: hidden; }
            #view-complaint .modal-body .input-group-col { display:flex; flex-direction:column; gap:6px; }
            #view-complaint .modal-body label { font-size:12px; color: var(--text-muted); }
            #view-complaint .mon-link { color: var(--accent); }
            #view-complaint .complaint-processing-card { display:flex; flex-direction:column; gap:14px; padding:18px; }
            #view-complaint .complaint-processing-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
            #view-complaint .complaint-processing-heading > div { display:flex; align-items:center; gap:10px; }
            #view-complaint .complaint-processing-heading h4 { font-size:16px; }
            #view-complaint .complaint-status-badge, #view-complaint .complaint-table-status { display:inline-flex; align-items:center; border-radius:999px; padding:4px 10px; color:var(--accent); background:var(--accent-glow); font-size:12px; font-weight:600; }
            #view-complaint .complaint-status-field { max-width:320px; }
            #view-complaint .complaint-detection-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; }
            #view-complaint .complaint-detection-grid > div { min-width:0; padding:12px; border:1px solid var(--border-color); border-radius:10px; background:var(--bg-primary); display:flex; flex-direction:column; gap:6px; }
            #view-complaint .complaint-detection-grid span { color:var(--text-muted); font-size:11px; }
            #view-complaint .complaint-detection-grid strong { overflow-wrap:anywhere; font-size:13px; }
            #view-complaint .complaint-more-processing { margin-top:14px; padding:14px; border:1px solid var(--border-color); border-radius:10px; }
            #view-complaint .complaint-more-processing summary { cursor:pointer; color:var(--text-muted); font-size:13px; font-weight:600; margin-bottom:12px; }
            #view-complaint .complaint-post-link-row { display:flex; align-items:center; gap:10px; min-height:40px; flex-wrap:wrap; color:var(--text-muted); font-size:13px; }
            @media (max-width: 900px) { #view-complaint .complaint-form-grid { grid-template-columns: 1fr; } #view-complaint .complaint-form-grid .span-2 { grid-column: span 1; } }
            @media (max-width: 640px) { #view-complaint .complaint-detection-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } #view-complaint .complaint-processing-heading { align-items:flex-start; flex-direction:column; } }
        `;
        document.head.appendChild(style);
    }

    function initComplaintPage() {
        setupComplaintStyles();
        collectWorkflowOptions();
        bindComplaintEvents();
        loadComplaintState();
    }

    window.loadComplaintPage = async function () {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initComplaintPage, { once: true });
            return;
        }
        setupComplaintStyles();
        collectWorkflowOptions();
        bindComplaintEvents();
        await loadComplaintState();
    };

    document.addEventListener('DOMContentLoaded', initComplaintPage, { once: true });
})();
