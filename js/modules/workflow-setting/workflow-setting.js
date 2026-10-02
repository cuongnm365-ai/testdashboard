/**
 * workflow-setting.js - Workflow Settings Module (Báº¢N VIáº¾T Láº I TOÃ€N Bá»˜)
 *
 * Quáº£n lÃ½ cÃ¡c danh má»¥c Ä‘á»™ng dÃ¹ng cho module GiÃ¡m SÃ¡t vÃ  Complaint (sau nÃ y).
 *
 * ============================================================================
 * NHÃ“M Dá»® LIá»†U
 * ============================================================================
 * DÃ¹ng chung GiÃ¡m SÃ¡t + Complaint:
 *   - regions        : VÃ¹ng miá»n  (Khu vá»±c > Tá»‰nh/ThÃ nh > Chi nhÃ¡nh)
 *   - requestTypes   : PhÃ¢n loáº¡i RQL2 (cáº¥p 1 > cáº¥p 2)
 *   - resolutions    : PhÆ°Æ¡ng Ã¡n
 * DÃ nh cho Complaint (Má»šI):
 *   - sources           : Nguá»“n tiáº¿p nháº­n khiáº¿u náº¡i
 *   - fbAccounts        : Nick FB CSKH
 *   - levels            : Cáº¥p Ä‘á»™ khiáº¿u náº¡i
 *   - handlingUnits     : ÄÆ¡n vá»‹ xá»­ lÃ½
 *   - vouchers          : Voucher
 *   - results           : Káº¿t quáº£
 *   - complaintServices : Loáº¡i dá»‹ch vá»¥ khiáº¿u náº¡i
 *   - srTypes           : Loáº¡i yÃªu cáº§u SR (cáº¥p 1 > cáº¥p 2, phá»¥ thuá»™c nhÆ° VÃ¹ng miá»n)
 *
 * Cáº¥u trÃºc dá»¯ liá»‡u lÆ°u trÃªn Drive (workflow_settings.json) â€” GIá»® NGUYÃŠN cáº¥u
 * trÃºc cÅ© cá»§a requestTypes/regions/resolutions nÃªn monitoring.js váº«n cháº¡y:
 *   requestTypes / srTypes : [{ type, subTypes: [] }]
 *   regions                : [{ region, provinceCode, provinceName, branches: [] }]
 *   danh sÃ¡ch Ä‘Æ¡n giáº£n     : [{ name }]
 *
 * ============================================================================
 * THAY Äá»”I SO Vá»šI Báº¢N CÅ¨
 * ============================================================================
 * 1) Giao diá»‡n trang Ä‘Æ°á»£c JS tá»± dá»±ng vÃ o #view-workflow_setting (KHÃ”NG cáº§n sá»­a
 *    index.html): thÃªm danh má»¥c má»›i chá»‰ cáº§n khai bÃ¡o trong SIMPLE_LISTS /
 *    TREE_LISTS bÃªn dÆ°á»›i.
 * 2) Dá»¯ liá»‡u VÃ¹ng miá»n gá»n hÆ¡n: gom theo Khu vá»±c, má»—i khu vá»±c lÃ  1 khá»‘i thu
 *    gá»n/má»Ÿ rá»™ng, cÃ³ Ã´ tÃ¬m kiáº¿m â€” khÃ´ng cÃ²n láº·p tÃªn khu vá»±c cho tá»«ng tá»‰nh.
 * 3) Sá»­a lá»—i Import Excel VÃ¹ng miá»n: trÆ°á»›c Ä‘Ã¢y dÃ¹ng (cell || '').trim() nÃªn
 *    lá»—i khi Ã´ lÃ  sá»‘, vÃ  báº¯t buá»™c tiÃªu Ä‘á» cá»™t pháº£i khá»›p tá»«ng kÃ½ tá»±. Giá» nháº­n
 *    diá»‡n cá»™t linh hoáº¡t (khÃ´ng phÃ¢n biá»‡t hoa thÆ°á»ng/dáº¥u/khoáº£ng tráº¯ng), tá»± Ä‘iá»n
 *    xuá»‘ng cÃ¡c Ã´ gá»™p (merge cell) bá»‹ trá»‘ng.
 * 3) Import cho danh sÃ¡ch phá»¥ thuá»™c (RQL2, Loáº¡i YC SR) há»— trá»£ 2 kiá»ƒu file:
 *      - 2 cá»™t:  [Cáº¥p 1 | Cáº¥p 2]  (file do chÃ­nh tool Export ra)
 *      - Ma tráº­n: má»—i Cá»˜T lÃ  1 má»¥c cáº¥p 1 (á»Ÿ dÃ²ng tiÃªu Ä‘á»), cÃ¡c Ã´ bÃªn dÆ°á»›i lÃ 
 *        má»¥c cáº¥p 2 â€” Ä‘Ãºng nhÆ° cÃ¡ch báº£ng theo dÃµi khiáº¿u náº¡i trÃªn Excel Ä‘ang lÃ m.
 * ============================================================================
 */

(function () {
    'use strict';

    // ======================================================================
    // KHAI BÃO DANH Má»¤C
    // ======================================================================
    const SIMPLE_LISTS = [
        { key: 'resolutions',       group: 'common',    title: 'PhÆ°Æ¡ng Ã¡n (Resolution)',     icon: 'bx-check-shield',       ph: 'TÃªn phÆ°Æ¡ng Ã¡n',                          header: 'PhÆ°Æ¡ng Ã¡n',               file: 'PhuongAn' },
        { key: 'sources',           group: 'complaint', title: 'Nguá»“n tiáº¿p nháº­n khiáº¿u náº¡i',  icon: 'bx-inbox',              ph: 'VD: Email, MXH (Alert), Hotline',        header: 'Nguá»“n tiáº¿p nháº­n',         file: 'NguonTiepNhan' },
        { key: 'fbAccounts',        group: 'complaint', title: 'Nick FB CSKH',               icon: 'bxl-facebook-circle',   ph: 'Nick Facebook (KV | Nick)',                 header: 'Nick FB CSKH',            file: 'NickFB_CSKH' },
        { key: 'levels',            group: 'complaint', title: 'Cáº¥p Ä‘á»™ khiáº¿u náº¡i',           icon: 'bx-error-circle',       ph: 'VD: Cáº¥p 1, Cáº¥p 2...',                    header: 'Cáº¥p Ä‘á»™ khiáº¿u náº¡i',        file: 'CapDoKhieuNai' },
        { key: 'handlingUnits',     group: 'complaint', title: 'ÄÆ¡n vá»‹ xá»­ lÃ½',               icon: 'bx-buildings',          ph: 'VD: SOC HTTC, SOC phá»‘i há»£p...',          header: 'ÄÆ¡n vá»‹ xá»­ lÃ½',            file: 'DonViXuLy' },
        { key: 'vouchers',          group: 'complaint', title: 'Voucher',                    icon: 'bx-gift',               ph: 'TÃªn voucher',                            header: 'Voucher',                 file: 'Voucher' },
        { key: 'results',           group: 'complaint', title: 'Káº¿t quáº£',                    icon: 'bx-check-circle',       ph: 'VD: ÄÃ£ xá»­ lÃ½, KhÃ´ng xá»­ lÃ½ Ä‘Æ°á»£c...',      header: 'Káº¿t quáº£',                 file: 'KetQua' },
        { key: 'complaintServices', group: 'complaint', title: 'Loáº¡i dá»‹ch vá»¥ khiáº¿u náº¡i',     icon: 'bx-category',           ph: 'VD: Internet, Truyá»n hÃ¬nh...',           header: 'Loáº¡i dá»‹ch vá»¥ khiáº¿u náº¡i',  file: 'LoaiDichVuKhieuNai' }
    ];

    const TREE_LISTS = [
        { key: 'requestTypes', group: 'common',    title: 'PhÃ¢n loáº¡i RQL2',   icon: 'bx-list-ul', parentLabel: 'Loáº¡i RQL2 (cáº¥p 1)',      childLabel: 'PhÃ¢n loáº¡i (cáº¥p 2)',     headers: ['Loáº¡i RQL2', 'PhÃ¢n loáº¡i'],                         file: 'RQL2_PhanLoai' },
        { key: 'srTypes',      group: 'complaint', title: 'Loáº¡i yÃªu cáº§u SR',  icon: 'bx-support', parentLabel: 'Loáº¡i YC SR (cáº¥p 1)',     childLabel: 'Loáº¡i YC SR (cáº¥p 2)',    headers: ['Loáº¡i YC SR (cáº¥p 1)', 'Loáº¡i YC SR (cáº¥p 2)'],       file: 'SR_LoaiYeuCau' }
    ];

    const REGION_KEY = 'regions';
    const REGION_HEADERS = ['Khu Vá»±c', 'MÃ£ Tá»‰nh/ThÃ nh', 'Tá»‰nh / ThÃ nh', 'Chi NhÃ¡nh'];

    const REG = {};
    SIMPLE_LISTS.forEach(c => { REG[c.key] = Object.assign({ kind: 'simple' }, c); });
    TREE_LISTS.forEach(c => { REG[c.key] = Object.assign({ kind: 'tree' }, c); });
    REG[REGION_KEY] = { kind: 'region', key: REGION_KEY, file: 'DuLieuVungMien' };

    function defaultWF() {
        const o = { requestTypes: [], regions: [], srTypes: [] };
        SIMPLE_LISTS.forEach(c => { o[c.key] = []; });
        return o;
    }

    window.workflowSettings = Object.assign(defaultWF(), window.workflowSettings || {});

    // ======================================================================
    // TIá»†N ÃCH
    // ======================================================================
    const wf = () => window.workflowSettings;
    const $ = (id) => document.getElementById(id);
    const S = (v) => (v === undefined || v === null) ? '' : String(v).trim();
    const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const enc = encodeURIComponent;
    const dec = decodeURIComponent;
    const same = (a, b) => S(a).toLowerCase() === S(b).toLowerCase();

    // Chuáº©n hoÃ¡ Ä‘á»ƒ so khá»›p tiÃªu Ä‘á» cá»™t / tÃ¬m kiáº¿m: bá» dáº¥u, bá» khoáº£ng tráº¯ng & kÃ½ tá»± Ä‘áº·c biá»‡t
    function norm(s) {
        return S(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Ä‘/g, 'd').replace(/Ä/g, 'd')
            .toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // TÃ¡ch nhiá»u má»¥c trong 1 Ã´ nháº­p. LuÃ´n tÃ¡ch theo ";" vÃ  xuá»‘ng dÃ²ng; cÃ³ thá»ƒ tÃ¡ch thÃªm theo dáº¥u ","
    function parseMulti(str, alsoComma) {
        const re = alsoComma ? /[;,\n]+/ : /[;\n]+/;
        return S(str).split(re).map(S).filter(Boolean);
    }

    function injectStyles() {
        if ($('wf-style')) return;
        const st = document.createElement('style');
        st.id = 'wf-style';
        st.textContent = `
            #view-workflow_setting .wf-head { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
            #view-workflow_setting .wf-head h3 { font-size:15px; display:flex; align-items:center; gap:8px; }
            #view-workflow_setting .wf-head-actions { display:flex; gap:8px; }
            #view-workflow_setting .wf-mini { display:inline-flex; align-items:center; gap:4px; padding:5px 10px; font-size:12px; cursor:pointer; }
            #view-workflow_setting .wf-toolbar { display:flex; gap:10px; align-items:center; margin-bottom:10px; }
            #view-workflow_setting .wf-toolbar .form-input { margin-top:0; flex:1; }
            #view-workflow_setting .wf-scroll { max-height:460px; overflow-y:auto; padding-right:4px; }
            #view-workflow_setting .wf-empty { text-align:center; color:var(--text-muted); font-size:13px; padding:18px; border:1px dashed var(--border-color); border-radius:10px; list-style:none; }
            #view-workflow_setting .data-item label { display:flex; align-items:center; gap:10px; cursor:pointer; color:var(--text-main); font-size:13.5px; }
            #view-workflow_setting .wf-region { background:var(--bg-primary); border:1px solid var(--border-color); border-radius:10px; margin-bottom:8px; }
            #view-workflow_setting .wf-region > summary { list-style:none; cursor:pointer; display:flex; align-items:center; gap:10px; padding:11px 14px; font-weight:600; font-size:13.5px; color:var(--text-main); }
            #view-workflow_setting .wf-region > summary::-webkit-details-marker { display:none; }
            #view-workflow_setting .wf-region > summary::before { content:'\\25B8'; color:var(--text-muted); transition:transform .15s; }
            #view-workflow_setting .wf-region[open] > summary::before { transform:rotate(90deg); }
            #view-workflow_setting .wf-count { margin-left:auto; font-weight:500; font-size:11.5px; color:var(--text-muted); white-space:nowrap; }
            #view-workflow_setting .wf-prov { padding:2px 14px 12px 38px; display:flex; flex-direction:column; gap:10px; }
            #view-workflow_setting .wf-prov-head { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-main); }
            #view-workflow_setting .wf-prov-head small { color:var(--text-muted); }
            #view-workflow_setting .wf-chips { display:flex; flex-wrap:wrap; gap:6px; margin:6px 0 0 24px; }
            #view-workflow_setting .wf-chip { display:inline-flex; align-items:center; gap:6px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:999px; padding:3px 10px; font-size:12px; color:var(--text-muted); cursor:pointer; }
            #view-workflow_setting .wf-card-title { cursor:pointer; user-select:none; flex:1; min-width:180px; }
            #view-workflow_setting .wf-chev { transition:transform .2s; color:var(--text-muted); }
            #view-workflow_setting .wf-card:not(.wf-collapsed) .wf-chev { transform:rotate(90deg); }
            #view-workflow_setting .wf-badge { font-size:11.5px; font-weight:600; color:var(--accent); background:var(--accent-glow); padding:2px 10px; border-radius:999px; }
            #view-workflow_setting .wf-card.wf-collapsed .wf-body { display:none; }
            #view-workflow_setting .wf-card.wf-collapsed .wf-head { margin-bottom:0; }
            #view-workflow_setting .wf-kids { padding:2px 14px 12px 38px; display:flex; flex-direction:column; gap:2px; }
            #view-workflow_setting .wf-kid { display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-muted); padding:4px 0; cursor:pointer; }
            #view-workflow_setting .wf-child-count { margin-left:auto; font-size:11.5px; font-weight:500; color:var(--text-muted); }
        `;
        document.head.appendChild(st);
    }

    // ======================================================================
    // Dá»°NG GIAO DIá»†N
    // ======================================================================
    function headHtml(key, title, icon) {
        return `<div class="wf-head">
            <h3 class="wf-card-title" data-act="toggle-card" data-key="${key}"><i class='bx bx-chevron-right wf-chev'></i> <i class='bx ${icon}'></i> ${esc(title)} <span class="wf-badge" id="wf-badge-${key}">0</span></h3>
            <div class="wf-head-actions">
                <button type="button" class="btn-ghost wf-mini" data-act="export" data-key="${key}"><i class='bx bx-download'></i> Export</button>
                <label for="wf-file-${key}" class="btn-ghost wf-mini"><i class='bx bx-upload'></i> Import</label>
                <input type="file" id="wf-file-${key}" data-act="import" data-key="${key}" accept=".xlsx,.xls" style="display:none;">
            </div>
        </div>`;
    }

    function delBtnHtml(key) {
        return `<button type="button" id="wf-del-${key}" class="btn-ghost danger wf-mini" data-act="del" data-key="${key}" style="display:none;"><i class='bx bx-trash'></i> XÃ³a má»¥c Ä‘Ã£ chá»n</button>`;
    }

    function searchHtml(key) {
        return `<div class="wf-toolbar"><input type="text" class="form-input wf-search" data-search="${key}" placeholder="TÃ¬m kiáº¿m...">${delBtnHtml(key)}</div>`;
    }

    function simpleCardHtml(c) {
        return `<div class="ai-card wf-card" id="wf-card-${c.key}">
            ${headHtml(c.key, c.title, c.icon)}
            <div class="wf-body">
            <div class="input-group">
                <input type="text" id="wf-in-${c.key}" placeholder="${esc(c.ph)}">
                <button type="button" class="btn-primary" data-act="add" data-key="${c.key}"><i class='bx bx-plus'></i> ThÃªm</button>
            </div>
            ${searchHtml(c.key)}
            <ul id="wf-list-${c.key}" class="data-list"></ul>
            </div>
        </div>`;
    }

    function treeCardHtml(c) {
        return `<div class="ai-card span-2 wf-card" id="wf-card-${c.key}">
            ${headHtml(c.key, c.title, c.icon)}
            <div class="wf-body">
            <div class="input-group">
                <input type="text" id="wf-p-${c.key}" list="wf-dl-${c.key}" placeholder="${esc(c.parentLabel)} â€” chá»n hoáº·c nháº­p má»›i">
                <datalist id="wf-dl-${c.key}"></datalist>
                <input type="text" id="wf-c-${c.key}" placeholder="${esc(c.childLabel)} â€” nhiá»u má»¥c cÃ¡ch nhau dáº¥u ;">
                <button type="button" class="btn-primary" data-act="tree-add" data-key="${c.key}"><i class='bx bx-plus'></i> ThÃªm</button>
            </div>
            ${searchHtml(c.key)}
            <div id="wf-list-${c.key}" class="wf-scroll"></div>
            </div>
        </div>`;
    }

    function regionCardHtml() {
        const k = REGION_KEY;
        return `<div class="ai-card span-2 wf-card" id="wf-card-${k}">
            ${headHtml(k, 'Dá»¯ liá»‡u VÃ¹ng miá»n', 'bx-map-pin')}
            <div class="wf-body">
            <div class="input-group" style="margin-bottom:8px;">
                <input type="text" id="wf-r-region" list="wf-dl-regions" placeholder="Khu Vá»±c">
                <datalist id="wf-dl-regions"></datalist>
                <input type="text" id="wf-r-code" placeholder="MÃ£ Tá»‰nh (VD: HN)">
                <input type="text" id="wf-r-name" placeholder="Tá»‰nh/ThÃ nh (VD: 01.HÃ  Ná»™i)">
            </div>
            <div class="input-group">
                <input type="text" id="wf-r-branch" placeholder="Chi NhÃ¡nh â€” nhiá»u má»¥c cÃ¡ch nhau dáº¥u , hoáº·c ;">
                <button type="button" class="btn-primary" data-act="region-add" data-key="${k}"><i class='bx bx-plus'></i> ThÃªm</button>
            </div>
            ${searchHtml(k)}
            <div id="wf-list-${k}" class="wf-scroll"></div>
            </div>
        </div>`;
    }

    function buildUI() {
        const sec = $('view-workflow_setting');
        if (!sec) return;
        injectStyles();

        const common = [regionCardHtml()];
        TREE_LISTS.filter(c => c.group === 'common').forEach(c => common.push(treeCardHtml(c)));
        SIMPLE_LISTS.filter(c => c.group === 'common').forEach(c => common.push(simpleCardHtml(c)));

        const complaint = [];
        SIMPLE_LISTS.filter(c => c.group === 'complaint').forEach(c => complaint.push(simpleCardHtml(c)));
        TREE_LISTS.filter(c => c.group === 'complaint').forEach(c => complaint.push(treeCardHtml(c)));

        sec.innerHTML = `
            <div class="ai-card" style="margin-bottom:18px;">
                <h3><i class='bx bx-slider'></i> Cáº¥u hÃ¬nh Workflow: GiÃ¡m SÃ¡t &amp; Complaint</h3>
                <p style="font-size:13px; color:var(--text-muted); margin-top:8px;">Thiáº¿t láº­p cÃ¡c danh má»¥c Ä‘á»™ng cho 2 module trÃªn. Má»i thay Ä‘á»•i Ä‘Æ°á»£c tá»± Ä‘á»™ng lÆ°u vÃ o Google Drive (workflow_settings.json). Import Excel: dÃ²ng 1 lÃ  tiÃªu Ä‘á» cá»™t, dÃ¹ng nÃºt Export Ä‘á»ƒ láº¥y file máº«u.</p>
            </div>
            <div class="section-label">DÃ¹ng chung â€” GiÃ¡m SÃ¡t &amp; Complaint</div>
            <div class="settings-grid">${common.join('')}</div>
            <div class="section-label" style="margin-top:26px;">Complaint</div>
            <div class="settings-grid">${complaint.join('')}</div>`;

        bindEvents(sec);
        Object.keys(REG).forEach(applyCollapse);
        renderWorkflowSettingsUI();
    }

    // ======================================================================
    // Sá»° KIá»†N (gáº¯n 1 láº§n duy nháº¥t trÃªn section)
    // ======================================================================
    // Tráº¡ng thÃ¡i thu gá»n/má»Ÿ rá»™ng tá»«ng khá»‘i â€” nhá»› qua localStorage, máº·c Ä‘á»‹nh THU Gá»ŒN
    const COLLAPSE_KEY = 'gportal_wf_open_cards';
    function openSet() {
        try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')); } catch (e) { return new Set(); }
    }
    function applyCollapse(key) {
        const card = $('wf-card-' + key);
        if (card) card.classList.toggle('wf-collapsed', !openSet().has(key));
    }
    function setCardOpen(key, open) {
        const s = openSet();
        if (open) s.add(key); else s.delete(key);
        try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...s])); } catch (e) {}
        applyCollapse(key);
    }
    function setBadge(key, n) {
        const el = $('wf-badge-' + key);
        if (el) el.textContent = n;
    }

    function bindEvents(sec) {
        sec.addEventListener('click', onClick);
        sec.addEventListener('change', onChange);
        sec.addEventListener('input', (e) => {
            const key = e.target && e.target.dataset ? e.target.dataset.search : null;
            if (key) { if (e.target.value) setCardOpen(key, true); renderKey(key); }
        });
        sec.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' || !e.target.matches('.input-group input')) return;
            const btn = e.target.closest('.card, .wf-card').querySelector('.input-group [data-act$="add"]');
            if (btn) { e.preventDefault(); btn.click(); }
        });
    }

    function onClick(e) {
        const tg = e.target.closest('[data-act="toggle-card"]');
        if (tg) { setCardOpen(tg.dataset.key, !openSet().has(tg.dataset.key)); return; }
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const key = btn.dataset.key;
        switch (btn.dataset.act) {
            case 'add': addSimple(key); break;
            case 'tree-add': addTree(key); break;
            case 'region-add': addRegion(); break;
            case 'del': deleteSelected(key); break;
            case 'export': exportExcel(key); break;
        }
    }

    function onChange(e) {
        const t = e.target;
        if (t.classList && t.classList.contains('wf-chk')) {
            toggleDelBtn(t.dataset.key);
            return;
        }
        if (t.type === 'file' && t.dataset.act === 'import') importExcel(t.dataset.key, t);
    }

    function toggleDelBtn(key) {
        const list = $('wf-list-' + key);
        const btn = $('wf-del-' + key);
        if (!list || !btn) return;
        btn.style.display = list.querySelector('.wf-chk:checked') ? 'inline-flex' : 'none';
    }

    // ======================================================================
    // LÆ¯U / Táº¢I DRIVE
    // ======================================================================
    function commit(key) {
        renderKey(key);
        if (typeof window.saveWorkflowSettingsToDrive === 'function') window.saveWorkflowSettingsToDrive();
    }

    window.loadWorkflowSettingsFromDrive = async function () {
        if (!window.GPORTAL_FOLDERS || typeof AppState === 'undefined' || !AppState.isLoggedIn) return;
        try {
            const data = await window.getJsonFromDrive('workflow_settings.json', window.GPORTAL_FOLDERS.settings);
            const next = defaultWF();

            if (data) {
                // --- requestTypes (migrate Ä‘á»‹nh dáº¡ng pháº³ng cÅ© náº¿u cÃ³) ---
                let rt = Array.isArray(data.requestTypes) ? data.requestTypes : [];
                if (rt.length && typeof rt[0].subType !== 'undefined') {
                    const g = {};
                    rt.forEach(x => { (g[x.type] = g[x.type] || []).push(x.subType); });
                    rt = Object.keys(g).map(k => ({ type: k, subTypes: g[k] }));
                }
                next.requestTypes = rt.map(x => ({ type: S(x.type), subTypes: (x.subTypes || []).map(S).filter(Boolean) })).filter(x => x.type);

                // --- srTypes ---
                next.srTypes = (Array.isArray(data.srTypes) ? data.srTypes : [])
                    .map(x => ({ type: S(x.type), subTypes: (x.subTypes || []).map(S).filter(Boolean) })).filter(x => x.type);

                // --- regions (migrate Ä‘á»‹nh dáº¡ng pháº³ng cÅ© náº¿u cÃ³) ---
                let rg = Array.isArray(data.regions) ? data.regions : [];
                if (rg.length && typeof rg[0].branch !== 'undefined') {
                    const g = {};
                    rg.forEach(r => {
                        const k = `${r.region}|${r.provinceCode}|${r.provinceName}`;
                        if (!g[k]) g[k] = { region: r.region, provinceCode: r.provinceCode, provinceName: r.provinceName, branches: [] };
                        if (r.branch) g[k].branches.push(r.branch);
                    });
                    rg = Object.values(g);
                }
                next.regions = rg.map(r => ({
                    region: S(r.region), provinceCode: S(r.provinceCode), provinceName: S(r.provinceName),
                    branches: (r.branches || []).map(S).filter(Boolean)
                })).filter(r => r.region && r.provinceCode);

                // --- cÃ¡c danh sÃ¡ch Ä‘Æ¡n giáº£n ---
                SIMPLE_LISTS.forEach(c => {
                    next[c.key] = (Array.isArray(data[c.key]) ? data[c.key] : [])
                        .map(x => ({ name: S(x && x.name !== undefined ? x.name : x) })).filter(x => x.name);
                });
            }

            Object.assign(window.workflowSettings, next);
            renderWorkflowSettingsUI();
        } catch (err) {
            console.error('Lá»—i khi táº£i workflow settings:', err);
        }
    };

    window.saveWorkflowSettingsToDrive = async function () {
        if (!window.GPORTAL_FOLDERS || typeof AppState === 'undefined' || !AppState.isLoggedIn) return;
        try {
            await window.saveJsonToDrive('workflow_settings.json', window.workflowSettings, window.GPORTAL_FOLDERS.settings);
        } catch (err) {
            console.error('Lá»—i khi lÆ°u workflow settings:', err);
        }
    };

    // ======================================================================
    // RENDER
    // ======================================================================
    function renderKey(key) {
        const cfg = REG[key];
        if (!cfg) return;
        if (cfg.kind === 'simple') renderSimple(key);
        else if (cfg.kind === 'tree') renderTree(key);
        else renderRegions();
    }

    function renderWorkflowSettingsUI() {
        Object.keys(REG).forEach(renderKey);
    }
    window.renderWorkflowSettingsUI = renderWorkflowSettingsUI;

    function searchValue(key) {
        const el = document.querySelector(`[data-search="${key}"]`);
        return el ? norm(el.value) : '';
    }

    // ---- Danh sÃ¡ch Ä‘Æ¡n giáº£n ----
    function renderSimple(key) {
        const list = $('wf-list-' + key);
        if (!list) return;
        const q = searchValue(key);
        setBadge(key, (wf()[key] || []).length);
        const items = (wf()[key] || []).filter(x => !q || norm(`${x.kv || ''} ${x.name}`).includes(q));
        list.innerHTML = items.length
            ? items.map(x => `<li class="data-item"><label><input type="checkbox" class="custom-chk wf-chk" data-key="${key}" data-kind="item" data-name="${enc(x.name)}" data-kv="${enc(x.kv || '')}"><span>${esc(x.kv ? `${x.kv} Â· ${x.name}` : x.name)}</span></label></li>`).join('')
            : `<li class="wf-empty">${q ? 'KhÃ´ng tÃ¬m tháº¥y.' : 'ChÆ°a cÃ³ dá»¯ liá»‡u.'}</li>`;
        toggleDelBtn(key);
    }

    function addSimple(key) {
        const input = $('wf-in-' + key);
        if (!input) return;
        const names = parseMulti(input.value, false);
        if (!names.length) return alert('Vui lÃ²ng nháº­p giÃ¡ trá»‹.');
        const arr = wf()[key];
        names.forEach(value => {
            const match = key === 'fbAccounts' ? value.match(/^(.+?)\s*\|\s*(.+)$/) : null;
            const kv = match ? S(match[1]) : '';
            const name = match ? S(match[2]) : value;
            if (name && !arr.find(x => same(x.name, name) && same(x.kv || '', kv))) arr.push(Object.assign({ name }, kv ? { kv } : {}));
        });
        input.value = '';
        commit(key);
    }

    // ---- Danh sÃ¡ch phá»¥ thuá»™c 2 cáº¥p (RQL2, Loáº¡i YC SR) ----
    function renderTree(key) {
        const list = $('wf-list-' + key);
        if (!list) return;
        const q = searchValue(key);
        const data = wf()[key] || [];

        setBadge(key, data.length);
        const dl = $('wf-dl-' + key);
        if (dl) dl.innerHTML = data.map(x => `<option value="${esc(x.type)}"></option>`).join('');

        // Giá»¯ nguyÃªn tráº¡ng thÃ¡i má»Ÿ/Ä‘Ã³ng cá»§a tá»«ng má»¥c cha khi váº½ láº¡i
        const openParents = new Set(Array.from(list.querySelectorAll('details[open]')).map(d => d.dataset.p));
        let html = '';
        data.forEach(item => {
            const parentHit = q && norm(item.type).includes(q);
            const kids = item.subTypes.filter(s => !q || parentHit || norm(s).includes(q));
            if (q && !parentHit && !kids.length) return;
            const isOpen = q || openParents.has(enc(item.type));
            html += `<details class="wf-region" data-p="${enc(item.type)}" ${isOpen ? 'open' : ''}>
                <summary>
                    <input type="checkbox" class="custom-chk wf-chk" data-key="${key}" data-kind="parent" data-p="${enc(item.type)}">
                    <span>${esc(item.type)}</span><span class="wf-count">${item.subTypes.length} má»¥c</span>
                </summary>
                <div class="wf-kids">${kids.length ? kids.map(s => `
                    <label class="wf-kid">
                        <input type="checkbox" class="custom-chk wf-chk" data-key="${key}" data-kind="child" data-p="${enc(item.type)}" data-c="${enc(s)}">
                        <span>${esc(s)}</span>
                    </label>`).join('') : '<div class="wf-empty" style="padding:8px;">ChÆ°a cÃ³ má»¥c cáº¥p 2.</div>'}</div>
            </details>`;
        });
        list.innerHTML = html || `<div class="wf-empty">${q ? 'KhÃ´ng tÃ¬m tháº¥y.' : 'ChÆ°a cÃ³ dá»¯ liá»‡u.'}</div>`;
        toggleDelBtn(key);
    }

    function addTree(key) {
        const cfg = REG[key];
        const p = S($('wf-p-' + key).value);
        const c = $('wf-c-' + key).value;
        if (!p) return alert('Vui lÃ²ng nháº­p ' + cfg.parentLabel + '.');
        mergePairs(key, parseMulti(c, false).map(x => [p, x]), p);
        $('wf-p-' + key).value = '';
        $('wf-c-' + key).value = '';
        commit(key);
    }

    // pairs: [[cáº¥p1, cáº¥p2], ...]; ensureParent: táº¡o má»¥c cáº¥p 1 ká»ƒ cáº£ khi chÆ°a cÃ³ cáº¥p 2
    function mergePairs(key, pairs, ensureParent) {
        const arr = wf()[key];
        const getParent = (name) => {
            let o = arr.find(x => same(x.type, name));
            if (!o) { o = { type: name, subTypes: [] }; arr.push(o); }
            return o;
        };
        if (ensureParent) getParent(ensureParent);
        pairs.forEach(([p, c]) => {
            if (!S(p)) return;
            const o = getParent(S(p));
            if (S(c) && !o.subTypes.find(s => same(s, c))) o.subTypes.push(S(c));
        });
    }

    // ---- VÃ¹ng miá»n ----
    function renderRegions() {
        const box = $('wf-list-' + REGION_KEY);
        if (!box) return;
        const q = searchValue(REGION_KEY);
        const regs = wf().regions || [];
        setBadge(REGION_KEY, regs.length + ' tá»‰nh');

        const dl = $('wf-dl-regions');
        if (dl) dl.innerHTML = [...new Set(regs.map(r => r.region))].map(r => `<option value="${esc(r)}"></option>`).join('');

        const groups = new Map();
        regs.forEach(p => {
            if (q) {
                const hay = norm(p.region + p.provinceCode + p.provinceName + p.branches.join(''));
                if (!hay.includes(q)) return;
            }
            if (!groups.has(p.region)) groups.set(p.region, []);
            groups.get(p.region).push(p);
        });

        let html = '';
        groups.forEach((provs, region) => {
            const branchTotal = provs.reduce((n, p) => n + p.branches.length, 0);
            html += `<details class="wf-region" ${q ? 'open' : ''}>
                <summary>
                    <input type="checkbox" class="custom-chk wf-chk" data-key="${REGION_KEY}" data-kind="region" data-region="${enc(region)}">
                    <span>${esc(region)}</span>
                    <span class="wf-count">${provs.length} tá»‰nh Â· ${branchTotal} chi nhÃ¡nh</span>
                </summary>
                <div class="wf-prov">${provs.map(p => `
                    <div>
                        <div class="wf-prov-head">
                            <input type="checkbox" class="custom-chk wf-chk" data-key="${REGION_KEY}" data-kind="prov" data-code="${enc(p.provinceCode)}">
                            <b>${esc(p.provinceCode)}</b> <span>â€“ ${esc(p.provinceName)}</span> <small>(${p.branches.length} chi nhÃ¡nh)</small>
                        </div>
                        ${p.branches.length ? `<div class="wf-chips">${p.branches.map(b => `
                            <label class="wf-chip"><input type="checkbox" class="custom-chk wf-chk" data-key="${REGION_KEY}" data-kind="branch" data-code="${enc(p.provinceCode)}" data-branch="${enc(b)}">${esc(b)}</label>`).join('')}</div>` : ''}
                    </div>`).join('')}
                </div>
            </details>`;
        });
        box.innerHTML = html || `<div class="wf-empty">${q ? 'KhÃ´ng tÃ¬m tháº¥y.' : 'ChÆ°a cÃ³ dá»¯ liá»‡u.'}</div>`;
        toggleDelBtn(REGION_KEY);
    }

    function upsertProvince(region, code, name, branches) {
        const arr = wf().regions;
        let p = arr.find(r => same(r.provinceCode, code));
        if (!p) {
            p = { region, provinceCode: code, provinceName: name, branches: [] };
            arr.push(p);
        }
        (branches || []).forEach(b => { if (S(b) && !p.branches.find(x => same(x, b))) p.branches.push(S(b)); });
    }

    function addRegion() {
        const region = S($('wf-r-region').value);
        const code = S($('wf-r-code').value).toUpperCase();
        const name = S($('wf-r-name').value);
        if (!region || !code || !name) return alert('Vui lÃ²ng nháº­p Khu vá»±c, MÃ£ Tá»‰nh, Tá»‰nh/ThÃ nh.');
        upsertProvince(region, code, name, parseMulti($('wf-r-branch').value, true));
        ['wf-r-region', 'wf-r-code', 'wf-r-name', 'wf-r-branch'].forEach(id => { $(id).value = ''; });
        commit(REGION_KEY);
    }

    // ======================================================================
    // XOÃ CÃC Má»¤C ÄÃƒ CHá»ŒN
    // ======================================================================
    function deleteSelected(key) {
        const list = $('wf-list-' + key);
        if (!list) return;
        const checked = Array.from(list.querySelectorAll('.wf-chk:checked'));
        if (!checked.length) return;
        if (!confirm(`XÃ³a ${checked.length} má»¥c Ä‘Ã£ chá»n?`)) return;

        const cfg = REG[key];
        const d = wf();

        if (cfg.kind === 'simple') {
            const names = new Set(checked.map(c => `${dec(c.dataset.kv || '')}\u0000${dec(c.dataset.name)}`.toLowerCase()));
            d[key] = d[key].filter(x => !names.has(`${x.kv || ''}\u0000${x.name}`.toLowerCase()));
        } else if (cfg.kind === 'tree') {
            const parents = new Set();
            const kids = [];
            checked.forEach(c => {
                const p = dec(c.dataset.p);
                if (c.dataset.kind === 'parent') parents.add(p);
                else kids.push([p, dec(c.dataset.c)]);
            });
            d[key] = d[key].filter(x => !parents.has(x.type));
            kids.forEach(([p, c]) => {
                const o = d[key].find(x => x.type === p);
                if (o) o.subTypes = o.subTypes.filter(s => s !== c);
            });
        } else {
            const regionsDel = new Set();
            const provDel = new Set();
            const branchDel = [];
            checked.forEach(c => {
                if (c.dataset.kind === 'region') regionsDel.add(dec(c.dataset.region));
                else if (c.dataset.kind === 'prov') provDel.add(dec(c.dataset.code));
                else branchDel.push([dec(c.dataset.code), dec(c.dataset.branch)]);
            });
            d.regions = d.regions.filter(p => !regionsDel.has(p.region) && !provDel.has(p.provinceCode));
            branchDel.forEach(([code, b]) => {
                const p = d.regions.find(r => r.provinceCode === code);
                if (p) p.branches = p.branches.filter(x => x !== b);
            });
        }
        commit(key);
    }

    // ======================================================================
    // EXPORT / IMPORT EXCEL
    // ======================================================================
    function downloadAoa(aoa, sheetName, fileName) {
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, fileName + '.xlsx');
    }

    function exportExcel(key) {
        const cfg = REG[key];
        const d = wf();
        if (cfg.kind === 'simple') {
            downloadAoa([[cfg.header]].concat(d[key].map(x => [key === 'fbAccounts' && x.kv ? `${x.kv} | ${x.name}` : x.name])), 'Data', cfg.file);
        } else if (cfg.kind === 'tree') {
            const rows = [cfg.headers];
            d[key].forEach(x => {
                if (!x.subTypes.length) rows.push([x.type, '']);
                else x.subTypes.forEach(s => rows.push([x.type, s]));
            });
            downloadAoa(rows, 'Data', cfg.file);
        } else {
            const rows = [REGION_HEADERS];
            d.regions.forEach(r => {
                if (!r.branches.length) rows.push([r.region, r.provinceCode, r.provinceName, '']);
                else r.branches.forEach(b => rows.push([r.region, r.provinceCode, r.provinceName, b]));
            });
            downloadAoa(rows, 'Data', cfg.file);
        }
    }

    function importExcel(key, input) {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            try {
                const wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
                const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false });
                const cfg = REG[key];
                let count = 0;
                if (cfg.kind === 'simple') count = importSimple(key, aoa);
                else if (cfg.kind === 'tree') count = importTree(key, aoa);
                else count = importRegion(aoa);
                commit(key);
                alert(`âœ“ ÄÃ£ import ${count} dÃ²ng dá»¯ liá»‡u.`);
            } catch (err) {
                console.error('Lá»—i import Excel:', err);
                alert('Lá»—i file Excel: ' + err.message);
            } finally {
                input.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    const nonEmptyRows = (aoa) => aoa.filter(r => Array.isArray(r) && r.some(c => S(c)));

    function importSimple(key, aoa) {
        const rows = nonEmptyRows(aoa).slice(1); // bá» dÃ²ng tiÃªu Ä‘á»
        const arr = wf()[key];
        let n = 0;
        rows.forEach(r => {
            const value = S(r[0]);
            const match = key === 'fbAccounts' ? value.match(/^(.+?)\s*\|\s*(.+)$/) : null;
            const kv = match ? S(match[1]) : '';
            const name = match ? S(match[2]) : value;
            if (name && !arr.find(x => same(x.name, name) && same(x.kv || '', kv))) { arr.push(Object.assign({ name }, kv ? { kv } : {})); n++; }
        });
        return n;
    }

    function importTree(key, aoa) {
        const cfg = REG[key];
        const rows = nonEmptyRows(aoa);
        if (rows.length < 2) return 0;
        const head = rows[0].map(S);
        const pairs = [];

        const isPairFormat = norm(head[0]) === norm(cfg.headers[0]) && norm(head[1]) === norm(cfg.headers[1]);
        if (isPairFormat) {
            // Kiá»ƒu 2 cá»™t: [Cáº¥p 1 | Cáº¥p 2], tá»± Ä‘iá»n xuá»‘ng Ã´ gá»™p bá»‹ trá»‘ng
            let lastParent = '';
            rows.slice(1).forEach(r => {
                const p = S(r[0]) || lastParent;
                lastParent = p;
                pairs.push([p, S(r[1])]);
            });
        } else {
            // Kiá»ƒu ma tráº­n: má»—i cá»™t lÃ  1 má»¥c cáº¥p 1 (dÃ²ng tiÃªu Ä‘á»), bÃªn dÆ°á»›i lÃ  cÃ¡c má»¥c cáº¥p 2
            head.forEach((parent, col) => {
                if (!parent) return;
                pairs.push([parent, '']);
                rows.slice(1).forEach(r => { if (S(r[col])) pairs.push([parent, S(r[col])]); });
            });
        }
        mergePairs(key, pairs);
        return pairs.length;
    }

    function importRegion(aoa) {
        const rows = nonEmptyRows(aoa);
        if (rows.length < 2) return 0;
        const head = rows[0].map(norm);
        const iReg = head.findIndex(h => h.includes('khuvuc'));
        const iCode = head.findIndex(h => h.includes('tinh') && h.startsWith('ma'));
        const iName = head.findIndex((h, i) => i !== iCode && h.includes('tinh') && !h.startsWith('ma'));
        const iBr = head.findIndex(h => h.includes('chinhanh'));
        if (iReg < 0 || iCode < 0 || iName < 0) {
            throw new Error('KhÃ´ng nháº­n diá»‡n Ä‘Æ°á»£c cá»™t. File cáº§n cÃ³ cÃ¡c cá»™t: Khu Vá»±c, MÃ£ Tá»‰nh/ThÃ nh, Tá»‰nh / ThÃ nh, Chi NhÃ¡nh (dÃ²ng 1).');
        }

        let lastReg = '', lastCode = '', lastName = '';
        let n = 0;
        rows.slice(1).forEach(r => {
            let reg = S(r[iReg]), code = S(r[iCode]).toUpperCase(), name = S(r[iName]);
            // Ã” gá»™p (merge) trong Excel: cÃ¡c dÃ²ng sau bá»‹ trá»‘ng -> láº¥y láº¡i giÃ¡ trá»‹ dÃ²ng trÆ°á»›c
            if (!reg) reg = lastReg;
            if (!code && !name) { code = lastCode; name = lastName; }
            lastReg = reg; lastCode = code; lastName = name;
            if (!reg || !code || !name) return;
            upsertProvince(reg, code, name, iBr >= 0 ? parseMulti(r[iBr], false) : []);
            n++;
        });
        return n;
    }

    // ======================================================================
    // KHá»žI Táº O
    // ======================================================================
    document.addEventListener('DOMContentLoaded', buildUI);
})();
