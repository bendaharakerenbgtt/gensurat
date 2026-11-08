/**
 * GenSurat - main.js
 * Application Orchestrator, Stepper Navigation, Preview Renderer, and Form Binding.
 */

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
const INDO_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

let currentActivePage = 'all';
let isProgrammaticLoading = false;
let autoSaveTimer = null;
let currentSuratType = 'SPZ';

// ==========================================
// DATE & ROMAN HELPERS
// ==========================================
function getRomanMonth(dateObj) {
    const d = dateObj instanceof Date ? dateObj : new Date();
    return ROMAN_MONTHS[d.getMonth()] || 'I';
}

function formatIndoDate(dateObj) {
    const d = dateObj instanceof Date ? dateObj : new Date();
    return `${d.getDate()} ${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function autoGenerateNoSurat() {
    const prof = getCurrentDocumentProfile();
    const now = new Date();
    const roman = getRomanMonth(now);
    const year = now.getFullYear();

    const urutEl = document.getElementById('field_nomor_urut');
    const curUrut = (urutEl ? urutEl.value.trim() : '') || '001';

    const kode = prof.org_kode_surat || 'XXX/XXX';
    const noSurat = `${curUrut}/${currentSuratType}/${kode}/${roman}/${year}`;

    const fieldNo = document.getElementById('field_nomor_surat');
    if (fieldNo) fieldNo.value = noSurat;

    const noPill = document.getElementById('nomor_surat_preview_pill');
    if (noPill) noPill.innerText = noSurat;

    updatePreview();
}

function composeNomorSurat() {
    const prof = getCurrentDocumentProfile();
    const urut = (document.getElementById('field_nomor_urut')?.value || '001').trim();
    const roman = document.getElementById('no_surat_roman_label')?.innerText.trim() || getRomanMonth(new Date());
    const year = new Date().getFullYear();
    const kode = prof.org_kode_surat || 'XXX/XXX';

    const fullNo = `${urut}/${currentSuratType}/${kode}/${roman}/${year}`;
    const fieldNo = document.getElementById('field_nomor_surat');
    if (fieldNo) fieldNo.value = fullNo;

    const noPill = document.getElementById('nomor_surat_preview_pill');
    if (noPill) noPill.innerText = fullNo;

    updatePreview();
}

// ==========================================
// DOCUMENT TYPE SWITCHER
// ==========================================
function selectSuratType(type) {
    currentSuratType = type === 'SBA' ? 'SBA' : 'SPZ';

    const badge = document.getElementById('active_doc_badge');
    if (badge) badge.innerText = currentSuratType;

    const typeLabel = document.getElementById('no_surat_tipe_label');
    if (typeLabel) typeLabel.innerText = currentSuratType;

    // Show/hide type-specific form cards
    const spzCards = document.querySelectorAll('.spz-only-card');
    const sbaCards = document.querySelectorAll('.sba-only-card');

    if (currentSuratType === 'SPZ') {
        spzCards.forEach(c => c.classList.remove('hidden'));
        sbaCards.forEach(c => c.classList.add('hidden'));
        document.getElementById('spz_perihal_helper')?.classList.remove('hidden');
        document.getElementById('default_perihal_helper')?.classList.add('hidden');
    } else {
        spzCards.forEach(c => c.classList.add('hidden'));
        sbaCards.forEach(c => c.classList.remove('hidden'));
        document.getElementById('spz_perihal_helper')?.classList.add('hidden');
        document.getElementById('default_perihal_helper')?.classList.remove('hidden');
    }

    renderPageTabs();
    applyActivePageVisibility();
    updatePreview();
}

// ==========================================
// STEPPER & PAGE TABS
// ==========================================
function getPageTabsConfig() {
    const tabs = [
        { id: 'all', label: 'Semua Halaman', icon: 'fa-layer-group', badge: 'Semua', desc: 'Tampilkan seluruh lembar dokumen' }
    ];

    if (currentSuratType === 'SPZ') {
        const pages = getSpzPagesStructure();
        pages.forEach(p => {
            tabs.push({ id: p.id, label: p.label, icon: p.icon, badge: `Hal ${p.id}`, desc: p.desc });
        });
    } else {
        const pages = getSbaPagesStructure();
        pages.forEach(p => {
            tabs.push({ id: p.id, label: p.label, icon: p.icon, badge: `Hal ${p.id}`, desc: p.desc });
        });
    }

    return tabs;
}

function renderPageTabs() {
    const container = document.getElementById('page_stepper_tabs');
    if (!container) return;

    const tabs = getPageTabsConfig();
    let html = '';

    tabs.forEach(tab => {
        const isActive = currentActivePage === tab.id;
        html += `
            <button type="button" onclick="setActivePage('${tab.id}', true)" class="page-tab-item px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${isActive ? 'bg-white text-black border-white shadow-sm' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}">
                <i class="fa-solid ${tab.icon} text-[11px]"></i>
                <span>${escapeHtml(tab.label)}</span>
            </button>
        `;
    });

    container.innerHTML = html;
}

function scrollPageTabs(direction) {
    const container = document.getElementById('page_stepper_tabs');
    if (!container) return;
    const amount = direction === 'left' ? -180 : 180;
    container.scrollBy({ left: amount, behavior: 'smooth' });
}

function setActivePage(pageId, shouldScroll = false) {
    currentActivePage = pageId === 'all' ? 'all' : (isNaN(pageId) ? pageId : parseInt(pageId, 10));
    renderPageTabs();
    applyActivePageVisibility();
    updateStepBannerAndNavButtons();

    if (shouldScroll) {
        if (currentActivePage === 'all') {
            const previewBox = document.getElementById('preview_sheet_outer_box');
            if (previewBox) previewBox.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const sheet = document.querySelector(`.spz-page-sheet[data-page="${currentActivePage}"]`);
            if (sheet) {
                sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }
}

function goToNextPage() {
    const tabs = getPageTabsConfig().filter(t => t.id !== 'all');
    if (currentActivePage === 'all') {
        if (tabs.length > 0) setActivePage(tabs[0].id, true);
        return;
    }
    const curIdx = tabs.findIndex(t => t.id === currentActivePage);
    if (curIdx >= 0 && curIdx < tabs.length - 1) {
        setActivePage(tabs[curIdx + 1].id, true);
    }
}

function goToPrevPage() {
    const tabs = getPageTabsConfig().filter(t => t.id !== 'all');
    if (currentActivePage === 'all') return;
    const curIdx = tabs.findIndex(t => t.id === currentActivePage);
    if (curIdx > 0) {
        setActivePage(tabs[curIdx - 1].id, true);
    } else {
        setActivePage('all', true);
    }
}

function applyActivePageVisibility() {
    const sheets = document.querySelectorAll('.spz-page-sheet');
    const badges = document.querySelectorAll('.spz-sheet-badge');

    sheets.forEach((sheet, idx) => {
        const pageNum = parseInt(sheet.getAttribute('data-page') || (idx + 1), 10);
        const badge = badges[idx];

        if (currentActivePage === 'all' || currentActivePage === pageNum) {
            sheet.classList.remove('hidden-by-step');
            if (badge) badge.classList.remove('hidden-by-step');
        } else {
            sheet.classList.add('hidden-by-step');
            if (badge) badge.classList.add('hidden-by-step');
        }
    });
}

function updateStepBannerAndNavButtons() {
    const tabs = getPageTabsConfig().filter(t => t.id !== 'all');
    const banner = document.getElementById('form_step_banner_title');
    const desc = document.getElementById('form_step_banner_desc');

    if (currentActivePage === 'all') {
        if (banner) banner.innerText = 'Menampilkan Seluruh Dokumen';
        if (desc) desc.innerText = 'Semua lembar surat dan formulir aktif ditampilkan bersamaan.';
    } else {
        const currentTab = tabs.find(t => t.id === currentActivePage);
        if (currentTab) {
            if (banner) banner.innerText = currentTab.label;
            if (desc) desc.innerText = currentTab.desc;
        }
    }
}

// ==========================================
// PREVIEW RENDER & PAPER SCALE
// ==========================================
function renderSuratFullHtml(isWordOrPrint = false) {
    if (currentSuratType === 'SPZ' && typeof renderSpzLetterHtml === 'function') {
        return renderSpzLetterHtml(isWordOrPrint);
    } else if (typeof renderSbaLetterHtml === 'function') {
        return renderSbaLetterHtml(isWordOrPrint);
    }
    return '';
}

function renderLetterPreview() {
    const paper = document.getElementById('rendered_surat_paper');
    if (!paper) return;

    paper.innerHTML = renderSuratFullHtml(false);
    applyActivePageVisibility();
    applyResponsivePaperScale();
}

function updatePreview(preserveScroll = true) {
    const outer = document.getElementById('preview_sheet_outer_box');
    const scrollPos = outer && preserveScroll ? outer.scrollTop : 0;

    renderLetterPreview();

    if (outer && preserveScroll) {
        outer.scrollTop = scrollPos;
    }

    if (!isProgrammaticLoading) {
        saveDocumentStateDebounced();
    }
}

function applyResponsivePaperScale() {
    const wrapper = document.getElementById('paper_scale_wrapper');
    const outer = document.getElementById('preview_sheet_outer_box');
    if (!wrapper || !outer) return;

    const availableWidth = outer.clientWidth - 32;
    const standardWidth = 794;

    if (availableWidth < standardWidth) {
        const scale = Math.max(0.35, availableWidth / standardWidth);
        wrapper.style.transform = `scale(${scale})`;
        wrapper.style.transformOrigin = 'top center';
        wrapper.style.width = `${standardWidth}px`;
        wrapper.style.marginBottom = `-${Math.round((1 - scale) * wrapper.offsetHeight)}px`;
    } else {
        wrapper.style.transform = 'none';
        wrapper.style.width = '100%';
        wrapper.style.marginBottom = '0';
    }
}

// ==========================================
// FORM DATA COLLECT & LOAD
// ==========================================
function collectCurrentFormData() {
    const fieldIds = [
        'field_nomor_surat', 'field_nomor_urut', 'field_lampiran',
        'field_tanggal_surat', 'field_perihal', 'spz_input_fasilitas',
        'field_tujuan', 'field_nama_acara', 'field_hari_tanggal', 'field_waktu', 'field_tempat',
        'field_pembuka', 'field_isi_inti', 'field_penutup',
        'field_ttd1_jabatan', 'field_ttd1_nama', 'field_ttd1_nim',
        'field_ttd2_jabatan', 'field_ttd2_nama', 'field_ttd2_nim',
        'field_ttd3_jabatan', 'field_ttd3_nama', 'field_ttd3_nim',
        'field_ttd_bem_jabatan', 'field_ttd_bem_nama', 'field_ttd_bem_nim',
        'field_ttd_mpm_jabatan', 'field_ttd_mpm_nama', 'field_ttd_mpm_nim',
        'field_ttd_wadir_jabatan', 'field_ttd_wadir_nama', 'field_ttd_wadir_nip',
        'spz_no_hp', 'spz_batas_waktu',
        'sba_output_kegiatan', 'sba_hambatan_kegiatan', 'sba_evaluasi_kegiatan'
    ];

    const checkboxIds = [
        'field_ttd1_active', 'field_ttd2_active', 'field_ttd3_active',
        'field_ttd_mpm_active', 'field_ttd_bem_active', 'field_ttd_wadir_active',
        'field_use_kop', 'spz_inc_lampiran_panitia', 'spz_inc_subbag_umum',
        'sba_inc_prestasi', 'sba_inc_keuangan', 'sba_inc_nota', 'sba_inc_dok'
    ];

    const data = {};
    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value;
    });

    checkboxIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.checked;
    });

    return data;
}

function loadFormDataIntoInputs(doc) {
    if (!doc) return;
    isProgrammaticLoading = true;

    selectSuratType(doc.type || 'SPZ');

    const titleEl = document.getElementById('active_doc_title');
    if (titleEl) titleEl.value = doc.title || 'Surat Tanpa Judul';

    const d = doc.formData || {};
    Object.keys(d).forEach(k => {
        const el = document.getElementById(k);
        if (!el) return;
        if (el.type === 'checkbox') {
            el.checked = !!d[k];
        } else {
            el.value = d[k];
        }
    });

    // Load dedicated lists
    if (doc.spzData) {
        if (Array.isArray(doc.spzData.barang)) spzBarangList = JSON.parse(JSON.stringify(doc.spzData.barang));
        if (Array.isArray(doc.spzData.panitia)) spzPanitiaList = JSON.parse(JSON.stringify(doc.spzData.panitia));
        if (Array.isArray(doc.spzData.rundown)) spzRundownList = JSON.parse(JSON.stringify(doc.spzData.rundown));
    }

    if (doc.sbaData) {
        if (Array.isArray(doc.sbaData.rundown)) sbaRundownList = JSON.parse(JSON.stringify(doc.sbaData.rundown));
        if (Array.isArray(doc.sbaData.prestasi)) sbaPrestasiList = JSON.parse(JSON.stringify(doc.sbaData.prestasi));
        if (Array.isArray(doc.sbaData.pemasukan)) sbaPemasukanList = JSON.parse(JSON.stringify(doc.sbaData.pemasukan));
        if (Array.isArray(doc.sbaData.pengeluaran)) sbaPengeluaranCategories = JSON.parse(JSON.stringify(doc.sbaData.pengeluaran));
        if (Array.isArray(doc.sbaData.notas)) sbaNotaList = JSON.parse(JSON.stringify(doc.sbaData.notas));
        if (Array.isArray(doc.sbaData.dokumentasi)) sbaDokList = JSON.parse(JSON.stringify(doc.sbaData.dokumentasi));
    }

    // Render editors
    if (typeof renderSpzBarangEditor === 'function') renderSpzBarangEditor();
    if (typeof renderSpzPanitiaEditor === 'function') renderSpzPanitiaEditor();
    if (typeof renderSpzRundownEditor === 'function') renderSpzRundownEditor();

    if (typeof renderSbaRundownEditor === 'function') renderSbaRundownEditor();
    if (typeof renderSbaPrestasiEditor === 'function') renderSbaPrestasiEditor();
    if (typeof renderSbaPemasukanEditor === 'function') renderSbaPemasukanEditor();
    if (typeof renderSbaPengeluaranEditor === 'function') renderSbaPengeluaranEditor();
    if (typeof renderSbaNotaGallery === 'function') renderSbaNotaGallery();
    if (typeof renderSbaDokumentasiGallery === 'function') renderSbaDokumentasiGallery();

    isProgrammaticLoading = false;
    updatePreview();
}

function saveDocumentStateDebounced() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        triggerAutoSave();
    }, 400);
}

function triggerAutoSave() {
    const doc = getActiveDocument();
    if (!doc) return;

    doc.type = currentSuratType;
    doc.formData = collectCurrentFormData();
    doc.lastModified = new Date().toISOString();

    doc.spzData = {
        barang: spzBarangList,
        panitia: spzPanitiaList,
        rundown: spzRundownList
    };

    doc.sbaData = {
        rundown: sbaRundownList,
        prestasi: sbaPrestasiList,
        pemasukan: sbaPemasukanList,
        pengeluaran: sbaPengeluaranCategories,
        notas: sbaNotaList,
        dokumentasi: sbaDokList
    };

    const docs = getSavedDocuments();
    const idx = docs.findIndex(d => d.id === doc.id);
    if (idx >= 0) {
        docs[idx] = doc;
    } else {
        docs.unshift(doc);
    }
    saveDocumentsList(docs);

    const timeLabel = document.getElementById('doc_last_modified_text');
    if (timeLabel) timeLabel.innerText = 'Tersimpan otomatis';
}

function handleActiveDocTitleChange(newTitle) {
    const doc = getActiveDocument();
    if (doc) {
        doc.title = newTitle.trim() || 'Surat Tanpa Judul';
        saveDocumentStateDebounced();
    }
}

// ==========================================
// MODAL BUAT SURAT BARU
// ==========================================
function openCreateNewDocModal() {
    const modal = document.getElementById('modal_create_new_doc');
    if (!modal) return;
    const titleInput = document.getElementById('new_doc_title_input');
    if (titleInput) titleInput.value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (titleInput) titleInput.focus();
}

function closeCreateNewDocModal() {
    const modal = document.getElementById('modal_create_new_doc');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function handleCreateNewDocSubmit(event) {
    if (event) event.preventDefault();
    const typeRadio = document.querySelector('input[name="new_doc_type"]:checked');
    const type = typeRadio ? typeRadio.value : 'SPZ';
    const title = (document.getElementById('new_doc_title_input')?.value || '').trim();

    const newDoc = createNewDocument(type, title);
    closeCreateNewDocModal();
    loadFormDataIntoInputs(newDoc);
    showToast(`Dokumen ${type} baru berhasil dibuat.`, 'success');
}

// ==========================================
// FORMATTING HELPERS
// ==========================================
function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatInlineRichText(str) {
    if (!str) return '';
    if (typeof str !== 'string') return String(str);
    if (str.includes('preview-placeholder-hint')) {
        return str;
    }
    let out = escapeHtml(str);
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return out;
}

function formatTtdJabatan(text) {
    if (!text) return '';
    return formatInlineRichText(text).replace(/\n/g, '<br>');
}

function formatSelectionBold(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const selected = text.substring(start, end);
    input.value = text.substring(0, start) + `**${selected || 'teks'}**` + text.substring(end);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function formatSelectionItalic(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const selected = text.substring(start, end);
    input.value = text.substring(0, start) + `*${selected || 'teks'}*` + text.substring(end);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function showToast(message, type = 'info') {
    if (typeof Swal !== 'undefined') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: type,
            title: message
        });
    }
}

// ==========================================
// LAYOUT & THEME
// ==========================================
function setLayoutMode(mode) {
    const formSec = document.getElementById('workspace_form_section');
    const prevSec = document.getElementById('workspace_preview_section');
    const btnSide = document.getElementById('btn_mode_side');
    const btnStacked = document.getElementById('btn_mode_stacked');

    if (!formSec || !prevSec) return;

    if (mode === 'preview') {
        formSec.classList.add('hidden');
        prevSec.classList.remove('hidden');
        prevSec.className = 'w-full';
    } else if (mode === 'form') {
        formSec.classList.remove('hidden');
        formSec.className = 'w-full max-w-4xl mx-auto';
        prevSec.classList.add('hidden');
    } else {
        // Dual / Side by side
        formSec.classList.remove('hidden');
        prevSec.classList.remove('hidden');
        formSec.className = 'w-full lg:w-5/12 xl:w-5/12';
        prevSec.className = 'w-full lg:w-7/12 xl:w-7/12';
    }

    applyResponsivePaperScale();
}

function toggleTheme(event) {
    const isDark = !document.documentElement.classList.contains('light-mode');
    if (isDark) {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark');
        localStorage.setItem(THEME_STORAGE_KEY, 'light');
    } else {
        document.documentElement.classList.remove('light-mode');
        document.documentElement.classList.add('dark');
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    }
    syncThemeIcons();
}

function syncThemeIcons() {
    const isLight = document.documentElement.classList.contains('light-mode');
    document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
        if (isLight) {
            icon.className = 'fa-solid fa-moon theme-toggle-icon text-neutral-600';
        } else {
            icon.className = 'fa-solid fa-sun theme-toggle-icon text-neutral-300';
        }
    });
}

// ==========================================
// TIME & DATE PICKER SYNC
// ==========================================
function populateTimeDropdowns() {
    const hours = ['--', ...Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))];
    const minutes = ['--', ...Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))];

    ['time_start_h', 'time_end_h'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.options && el.options.length === 0) {
            el.innerHTML = hours.map(h => `<option value="${h === '--' ? '' : h}">${h}</option>`).join('');
        }
    });
    ['time_start_m', 'time_end_m'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.options && el.options.length === 0) {
            el.innerHTML = minutes.map(m => `<option value="${m === '--' ? '' : m}">${m}</option>`).join('');
        }
    });
}

function syncTimeFromPickers() {
    populateTimeDropdowns();
    const sh = document.getElementById('time_start_h')?.value;
    const sm = document.getElementById('time_start_m')?.value;
    const eh = document.getElementById('time_end_h')?.value;
    const em = document.getElementById('time_end_m')?.value;
    const untilFinish = document.getElementById('time_until_finish')?.checked;

    const field = document.getElementById('field_waktu');
    if (!field) return;

    if (untilFinish) {
        field.value = (sh && sm) ? `${sh}.${sm} WIB – Selesai` : '08.00 WIB – Selesai';
    } else if (sh && sm && eh && em) {
        field.value = `${sh}.${sm} – ${eh}.${em} WIB`;
    }
    updatePreview();
}

function syncEventDateFromPickers() {
    const picker = document.getElementById('field_tanggal_picker');
    if (picker && picker.value) {
        const parts = picker.value.split('-');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            const hari = INDO_DAYS[d.getDay()];
            const tgl = `${hari}, ${d.getDate()} ${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
            const target = document.getElementById('field_hari_tanggal');
            if (target) target.value = tgl;
            updatePreview();
        }
    }
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Theme sync
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark');
    }
    syncThemeIcons();

    // Check URL params
    const params = new URLSearchParams(window.location.search);
    const targetDocId = params.get('id');
    const newDocType = params.get('new');

    let activeDoc = null;
    if (newDocType) {
        activeDoc = createNewDocument(newDocType, `${newDocType} Baru`);
    } else if (targetDocId) {
        setActiveDocumentId(targetDocId);
        activeDoc = getActiveDocument();
    } else {
        activeDoc = getActiveDocument();
    }

    if (!activeDoc) {
        // Create first default SPZ document
        activeDoc = createNewDocument('SPZ', 'Surat Perizinan Baru');
    }

    loadFormDataIntoInputs(activeDoc);
    populateTimeDropdowns();
    initPreviewQuickEditEvents();

    window.addEventListener('resize', applyResponsivePaperScale);
});
