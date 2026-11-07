/**
 * GenSurat - quickedit.js
 * Interactive click-to-edit preview system with draggable/dockable popovers.
 */

let currentQuickEditElement = null;
let popoverUserHasMoved = false;
let isPopoverDraggableInitialized = false;

function initPreviewQuickEditEvents() {
    const paper = document.getElementById('rendered_surat_paper');
    if (!paper) return;

    paper.addEventListener('click', (e) => {
        const editable = e.target.closest('.preview-editable');
        if (!editable) return;
        e.preventDefault();
        e.stopPropagation();
        openPreviewQuickEdit(editable);
    });
}

function openPreviewQuickEdit(editable) {
    currentQuickEditElement = editable;
    const targetId = editable.getAttribute('data-edit-target') || '';
    const label = editable.getAttribute('data-edit-label') || 'Bagian Surat';
    const type = editable.getAttribute('data-edit-type') || 'text';
    const idx = editable.getAttribute('data-edit-idx');

    const popover = document.getElementById('preview_quick_edit_popover');
    if (!popover) return;

    // Highlight element
    document.querySelectorAll('.preview-editable.active-editing').forEach(el => el.classList.remove('active-editing'));
    editable.classList.add('active-editing');

    // Title & badge
    const titleEl = document.getElementById('popover_target_title');
    if (titleEl) titleEl.innerText = label;

    const inputContainer = document.getElementById('popover_input_container');
    if (inputContainer) {
        inputContainer.innerHTML = generatePopoverInputHtml(type, targetId, idx);
    }

    popover.classList.remove('hidden');
    positionQuickEditPopover(editable, popover);

    // Auto focus first input
    setTimeout(() => {
        const firstInput = popover.querySelector('input:not([type="checkbox"]):not([type="radio"]), textarea, select');
        if (firstInput) {
            firstInput.focus();
            if (firstInput.select && typeof firstInput.select === 'function') firstInput.select();
        }
    }, 100);
}

function closePreviewQuickEdit() {
    const popover = document.getElementById('preview_quick_edit_popover');
    if (popover) popover.classList.add('hidden');
    document.querySelectorAll('.preview-editable.active-editing').forEach(el => el.classList.remove('active-editing'));
    currentQuickEditElement = null;
}

function positionQuickEditPopover(editable, popover) {
    initPopoverDraggable();

    if (window.innerWidth < 640) {
        // Mobile positioning
        popover.style.left = '4vw';
        popover.style.width = '92vw';
        popover.style.top = '12px';
        return;
    }

    if (popoverUserHasMoved) return;

    const rect = editable.getBoundingClientRect();
    const popW = 360;
    const popH = popover.offsetHeight || 320;

    let left = rect.right + 16;
    if (left + popW > window.innerWidth - 16) {
        left = Math.max(16, rect.left - popW - 16);
    }

    let top = rect.top;
    if (top + popH > window.innerHeight - 16) {
        top = Math.max(16, window.innerHeight - popH - 16);
    }

    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
}

function initPopoverDraggable() {
    if (isPopoverDraggableInitialized) return;
    const popover = document.getElementById('preview_quick_edit_popover');
    const header = document.getElementById('popover_drag_handle');
    if (!popover || !header) return;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        popoverUserHasMoved = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = popover.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        popover.style.left = `${Math.max(8, Math.min(window.innerWidth - popover.offsetWidth - 8, initialLeft + dx))}px`;
        popover.style.top = `${Math.max(8, Math.min(window.innerHeight - popover.offsetHeight - 8, initialTop + dy))}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });

    isPopoverDraggableInitialized = true;
}

function dockPopoverToSide() {
    const popover = document.getElementById('preview_quick_edit_popover');
    if (!popover) return;
    popoverUserHasMoved = true;
    popover.style.left = `${window.innerWidth - popover.offsetWidth - 24}px`;
    popover.style.top = '72px';
}

// ==========================================
// POPOVER INPUT HTML GENERATORS
// ==========================================
function generatePopoverInputHtml(type, targetId, idx) {
    // 1. KOP SURAT
    if (type === 'kop' || targetId === 'field_use_kop') {
        const useKop = document.getElementById('field_use_kop') ? document.getElementById('field_use_kop').checked : true;
        return `
            <div class="space-y-3 py-1">
                <div class="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <div class="flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-white shrink-0">
                            <i class="fa-solid fa-heading text-sm"></i>
                        </span>
                        <div>
                            <span class="text-xs font-bold text-white block">Kop Surat Resmi</span>
                            <span class="text-[10.5px] text-neutral-400">Tampilkan kop surat di bagian atas dokumen</span>
                        </div>
                    </div>
                    <input type="checkbox" id="quick_use_kop" ${useKop ? 'checked' : ''} onchange="syncQuickKopToggle(this.checked)" class="rounded border-neutral-700 text-white w-4 h-4 cursor-pointer">
                </div>
                <button type="button" onclick="openProfileModal()" class="w-full py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2">
                    <i class="fa-solid fa-sliders text-neutral-400"></i> Buka Pengaturan Profil & Kop
                </button>
            </div>
        `;
    }

    // 2. NOMOR SURAT
    if (type === 'nomor_surat' || targetId === 'field_nomor_urut') {
        const currentUrut = document.getElementById('field_nomor_urut')?.value || '';
        return `
            <div class="space-y-3 py-1">
                <div>
                    <label class="text-[11px] text-neutral-400 block mb-1.5 font-medium">Nomor Urut Surat (3 Digit)</label>
                    <input type="text" id="quick_nomor_urut" value="${escapeHtml(currentUrut)}" oninput="handleQuickNomorUrut(this.value)" placeholder="cth: 001" maxlength="6" class="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-neutral-400">
                </div>
                <button type="button" onclick="autoGenerateNoSurat()" class="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-rotate text-xs"></i> Buat Nomor Otomatis Baru
                </button>
            </div>
        `;
    }

    // 3. TEXTAREA (Pembuka, Isi, Penutup, Tujuan, Hambatan, Evaluasi)
    if (type === 'textarea') {
        const originalInput = document.getElementById(targetId);
        const val = originalInput ? originalInput.value : '';
        return `
            <div class="space-y-2 py-1">
                <div class="flex items-center gap-1.5 pb-1 border-b border-neutral-800">
                    <button type="button" onclick="formatQuickSelection('quick_input_textarea', '**')" class="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-bold text-neutral-300" title="Tebal (Bold)"><i class="fa-solid fa-bold"></i></button>
                    <button type="button" onclick="formatQuickSelection('quick_input_textarea', '*')" class="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] font-bold text-neutral-300" title="Miring (Italic)"><i class="fa-solid fa-italic"></i></button>
                    <button type="button" onclick="addQuickBulletPoint('quick_input_textarea', '${targetId}')" class="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[11px] text-neutral-300" title="Tambah Poin"><i class="fa-solid fa-list-ol"></i></button>
                </div>
                <textarea id="quick_input_textarea" oninput="syncQuickEditToForm('${targetId}', this.value)" rows="5" class="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white leading-relaxed focus:outline-none focus:border-neutral-400">${escapeHtml(val)}</textarea>
            </div>
        `;
    }

    // 4. PENANGGUNG JAWAB (TTD PJ: Ketua Organisasi + Ketua Pelaksana)
    if (type === 'ttd_pj' || targetId === 'card_penandatangan') {
        const isTtd1 = document.getElementById('field_ttd1_active')?.checked;
        const ttd1Nama = document.getElementById('field_ttd1_nama')?.value || '';
        const ttd1Nim = document.getElementById('field_ttd1_nim')?.value || '';

        const isTtd2 = document.getElementById('field_ttd2_active')?.checked;
        const ttd2Nama = document.getElementById('field_ttd2_nama')?.value || '';
        const ttd2Nim = document.getElementById('field_ttd2_nim')?.value || '';

        return `
            <div class="space-y-3 py-1">
                <!-- KETUA PELAKSANA -->
                <div class="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-white">Ketua Pelaksana</span>
                        <input type="checkbox" ${isTtd1 ? 'checked' : ''} onchange="syncQuickCheckboxToForm('field_ttd1_active', this.checked)" class="rounded border-neutral-700 text-white w-4 h-4 cursor-pointer">
                    </div>
                    ${isTtd1 ? `
                        <input type="text" value="${escapeHtml(ttd1Nama)}" oninput="syncQuickEditToForm('field_ttd1_nama', this.value)" placeholder="Nama Lengkap" class="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none">
                        <input type="text" value="${escapeHtml(ttd1Nim)}" oninput="syncQuickEditToForm('field_ttd1_nim', this.value)" placeholder="NIM" class="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none">
                    ` : '<p class="text-[10px] text-neutral-500">Nonaktif (TTD Ketua Organisasi otomatis ke tengah)</p>'}
                </div>

                <!-- KETUA ORGANISASI -->
                <div class="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-white">Ketua Organisasi</span>
                        <input type="checkbox" ${isTtd2 ? 'checked' : ''} onchange="syncQuickCheckboxToForm('field_ttd2_active', this.checked)" class="rounded border-neutral-700 text-white w-4 h-4 cursor-pointer">
                    </div>
                    ${isTtd2 ? `
                        <input type="text" value="${escapeHtml(ttd2Nama)}" oninput="syncQuickEditToForm('field_ttd2_nama', this.value)" placeholder="Nama Lengkap" class="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none">
                        <input type="text" value="${escapeHtml(ttd2Nim)}" oninput="syncQuickEditToForm('field_ttd2_nim', this.value)" placeholder="NIM" class="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none">
                    ` : '<p class="text-[10px] text-neutral-500">Nonaktif</p>'}
                </div>
            </div>
        `;
    }

    // 5. TTD WADIR
    if (type === 'ttd_wadir' || targetId === 'ttd_wadir_block') {
        const isWadir = document.getElementById('field_ttd_wadir_active')?.checked;
        const wNama = document.getElementById('field_ttd_wadir_nama')?.value || '';
        const wNip = document.getElementById('field_ttd_wadir_nip')?.value || '';
        const wJab = document.getElementById('field_ttd_wadir_jabatan')?.value || '';

        return `
            <div class="space-y-3 py-1">
                <div class="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                    <div>
                        <span class="text-xs font-bold text-white block">Tanda Tangan Wakil Direktur</span>
                        <span class="text-[10px] text-neutral-400">Pihak Menyetujui Kampus</span>
                    </div>
                    <input type="checkbox" ${isWadir ? 'checked' : ''} onchange="syncQuickCheckboxToForm('field_ttd_wadir_active', this.checked)" class="rounded border-neutral-700 text-white w-4 h-4 cursor-pointer">
                </div>
                ${isWadir ? `
                    <div class="space-y-2">
                        <input type="text" value="${escapeHtml(wJab)}" oninput="syncQuickEditToForm('field_ttd_wadir_jabatan', this.value)" placeholder="Jabatan Wadir" class="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none">
                        <input type="text" value="${escapeHtml(wNama)}" oninput="syncQuickEditToForm('field_ttd_wadir_nama', this.value)" placeholder="Nama Pejabat" class="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white focus:outline-none">
                        <input type="text" value="${escapeHtml(wNip)}" oninput="syncQuickEditToForm('field_ttd_wadir_nip', this.value)" placeholder="NIP" class="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-white font-mono focus:outline-none">
                    </div>
                ` : ''}
            </div>
        `;
    }

    // 6. DEFAULT SINGLE INPUT (Text)
    const origInput = document.getElementById(targetId);
    const val = origInput ? origInput.value : '';
    return `
        <div class="space-y-2 py-1">
            <input type="text" id="quick_input_single" value="${escapeHtml(val)}" oninput="syncQuickEditToForm('${targetId}', this.value)" placeholder="Masukkan isi..." class="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-400">
        </div>
    `;
}

// ==========================================
// SYNC HANDLERS
// ==========================================
function syncQuickEditToForm(targetId, val) {
    const orig = document.getElementById(targetId);
    if (orig) {
        orig.value = val;
        // Trigger oninput
        orig.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function syncQuickCheckboxToForm(targetId, checked) {
    const orig = document.getElementById(targetId);
    if (orig) {
        orig.checked = checked;
        orig.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Re-open to refresh popover view
    if (currentQuickEditElement) {
        openPreviewQuickEdit(currentQuickEditElement);
    }
}

function syncQuickKopToggle(checked) {
    const orig = document.getElementById('field_use_kop');
    if (orig) {
        orig.checked = checked;
        orig.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (typeof updatePreview === 'function') updatePreview();
}

function handleQuickNomorUrut(val) {
    const urutEl = document.getElementById('field_nomor_urut');
    if (urutEl) {
        urutEl.value = val;
        if (typeof composeNomorSurat === 'function') composeNomorSurat();
    }
}

function formatQuickSelection(textareaId, wrapper) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.substring(start, end);
    const replacement = `${wrapper}${selected || 'teks'}${wrapper}`;
    ta.value = text.substring(0, start) + replacement + text.substring(end);
    ta.selectionStart = start + wrapper.length;
    ta.selectionEnd = start + replacement.length - wrapper.length;
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
}

function addQuickBulletPoint(textareaId, targetFormId) {
    const ta = document.getElementById(textareaId);
    if (!ta) return;
    const lines = ta.value.split('\n').filter(Boolean);
    const nextNum = lines.length + 1;
    ta.value += (ta.value ? '\n' : '') + `${nextNum}. `;
    ta.focus();
    syncQuickEditToForm(targetFormId, ta.value);
}

function enableWadirAndOpenEdit(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const chk = document.getElementById('field_ttd_wadir_active');
    if (chk) {
        chk.checked = true;
        chk.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (typeof updatePreview === 'function') updatePreview();
    const wadirBlock = document.querySelector('[data-edit-type="ttd_wadir"]');
    if (wadirBlock) openPreviewQuickEdit(wadirBlock);
}
