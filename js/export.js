/**
 * GenSurat - export.js
 * Handles Preflight Validation (Empty fields warning), Print to PDF, Word (.doc) export, and Copy text.
 */

// ==========================================
// PREFLIGHT VALIDATION: CHECK EMPTY REQUIRED FIELDS
// ==========================================
function checkEmptyRequiredFields() {
    const doc = typeof getActiveDocument === 'function' ? getActiveDocument() : null;
    const type = doc ? doc.type : 'SPZ';

    const missingByPage = {};
    let total = 0;

    function recordMissing(pageName, pageTabId, fieldId, label) {
        if (!missingByPage[pageName]) missingByPage[pageName] = [];
        missingByPage[pageName].push({ id: fieldId, pageTabId, label });
        total++;
    }

    if (type === 'SPZ') {
        // --- HALAMAN 1: PERMOHONAN ---
        const page1 = 'Hal 1: Permohonan Izin';
        const rawFas = document.getElementById('spz_input_fasilitas')?.value.trim();
        const rawPerihal = document.getElementById('field_perihal')?.value.trim();
        if (!rawFas && !rawPerihal) recordMissing(page1, 1, 'spz_input_fasilitas', 'Perihal / Fasilitas Peminjaman');

        const tujuan = document.getElementById('field_tujuan')?.value.trim();
        if (!tujuan) recordMissing(page1, 1, 'field_tujuan', 'Tujuan Surat');

        const acara = document.getElementById('field_nama_acara')?.value.trim();
        if (!acara) recordMissing(page1, 1, 'field_nama_acara', 'Nama Kegiatan / Acara');

        const hariTgl = document.getElementById('field_hari_tanggal')?.value.trim();
        if (!hariTgl) recordMissing(page1, 1, 'field_hari_tanggal', 'Hari & Tanggal Pelaksanaan');

        const waktu = document.getElementById('field_waktu')?.value.trim();
        if (!waktu) recordMissing(page1, 1, 'field_waktu', 'Waktu Pelaksanaan');

        const tempat = document.getElementById('field_tempat')?.value.trim();
        if (!tempat) recordMissing(page1, 1, 'field_tempat', 'Tempat Pelaksanaan');

        // --- HALAMAN 2: PENGESAHAN (Hanya slot TTD yang aktif) ---
        const page2 = 'Hal 2: Pengesahan & Tanda Tangan';
        const isTtd1 = document.getElementById('field_ttd1_active')?.checked;
        if (isTtd1) {
            const nama1 = document.getElementById('field_ttd1_nama')?.value.trim();
            if (!nama1) recordMissing(page2, 2, 'field_ttd1_nama', 'Nama Ketua Pelaksana');
        }

        const isTtd2 = document.getElementById('field_ttd2_active')?.checked;
        if (isTtd2) {
            const nama2 = document.getElementById('field_ttd2_nama')?.value.trim();
            if (!nama2) recordMissing(page2, 2, 'field_ttd2_nama', 'Nama Ketua Organisasi');
        }

        const isTtd3 = document.getElementById('field_ttd3_active')?.checked;
        if (isTtd3) {
            const nama3 = document.getElementById('field_ttd3_nama')?.value.trim();
            if (!nama3) recordMissing(page2, 2, 'field_ttd3_nama', 'Nama Dosen Pembina');
        }

        const isMpm = document.getElementById('field_ttd_mpm_active')?.checked;
        if (isMpm) {
            const namaMpm = document.getElementById('field_ttd_mpm_nama')?.value.trim();
            if (!namaMpm) recordMissing(page2, 2, 'field_ttd_mpm_nama', 'Nama Ketua MPM');
        }

        const isBem = document.getElementById('field_ttd_bem_active')?.checked;
        if (isBem) {
            const namaBem = document.getElementById('field_ttd_bem_nama')?.value.trim();
            if (!namaBem) recordMissing(page2, 2, 'field_ttd_bem_nama', 'Nama Ketua BEM');
        }

        const isWadir = document.getElementById('field_ttd_wadir_active')?.checked;
        if (isWadir) {
            const namaWadir = document.getElementById('field_ttd_wadir_nama')?.value.trim();
            if (!namaWadir) recordMissing(page2, 2, 'field_ttd_wadir_nama', 'Nama Wakil Direktur');
        }

        // --- HALAMAN 4: LEMBAR SUBBAG (Jika aktif) ---
        const incSubbag = document.getElementById('spz_inc_subbag_umum')?.checked;
        if (incSubbag) {
            const pageSub = 'Lembar Persetujuan Subbag Umum';
            const hp = document.getElementById('spz_no_hp')?.value.trim();
            if (!hp) recordMissing(pageSub, 'subbag_umum', 'spz_no_hp', 'Nomor WhatsApp / HP Ketua Pelaksana');
        }
    } else {
        // --- SBA CHECKS ---
        const page1 = 'Hal 1: Berita Acara';
        const acara = document.getElementById('field_nama_acara')?.value.trim();
        if (!acara) recordMissing(page1, 1, 'field_nama_acara', 'Nama Kegiatan Berita Acara');

        const hariTgl = document.getElementById('field_hari_tanggal')?.value.trim();
        if (!hariTgl) recordMissing(page1, 1, 'field_hari_tanggal', 'Hari & Tanggal Pelaksanaan');

        const pageTtd = 'Hal Pengesahan Berita Acara';
        const isTtd1 = document.getElementById('field_ttd1_active')?.checked;
        if (isTtd1) {
            const nama1 = document.getElementById('field_ttd1_nama')?.value.trim();
            if (!nama1) recordMissing(pageTtd, 'pengesahan', 'field_ttd1_nama', 'Nama Ketua Pelaksana');
        }
        const isTtd2 = document.getElementById('field_ttd2_active')?.checked;
        if (isTtd2) {
            const nama2 = document.getElementById('field_ttd2_nama')?.value.trim();
            if (!nama2) recordMissing(pageTtd, 'pengesahan', 'field_ttd2_nama', 'Nama Ketua Organisasi');
        }
    }

    return { total, missingByPage };
}

// ==========================================
// PREFLIGHT MODAL UI
// ==========================================
let pendingExportAction = null;

function openPrintPreflightModal(actionType, onProceed) {
    const { total, missingByPage } = checkEmptyRequiredFields();

    // Jika semua bagian wajib terisi -> langsung jalankan tanpa mengganggu pengguna!
    if (total === 0) {
        onProceed();
        return;
    }

    pendingExportAction = onProceed;

    const modal = document.getElementById('modal_preflight_warning');
    if (!modal) {
        // Fallback jika modal element belum siap di DOM
        onProceed();
        return;
    }

    const countLabel = document.getElementById('preflight_missing_count');
    if (countLabel) countLabel.innerText = `${total} Bagian`;

    const listContainer = document.getElementById('preflight_missing_list');
    if (listContainer) {
        let html = '';
        Object.keys(missingByPage).forEach(pageName => {
            const items = missingByPage[pageName];
            html += `
                <div class="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                    <p class="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                        <i class="fa-solid fa-file-lines text-neutral-400 text-[11px]"></i> ${escapeHtml(pageName)}
                    </p>
                    <div class="space-y-1.5 pl-2">
                        ${items.map(it => `
                            <div class="flex items-center justify-between py-1 border-b border-neutral-800/60 last:border-none">
                                <span class="text-xs text-neutral-400">&bull; ${escapeHtml(it.label)}</span>
                                <button type="button" onclick="jumpToEmptyField('${it.id}', '${it.pageTabId}')" class="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors">
                                    Isi Ini <i class="fa-solid fa-arrow-right text-[9px] ml-1"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closePrintPreflightModal() {
    const modal = document.getElementById('modal_preflight_warning');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    pendingExportAction = null;
}

function proceedWithExportAnyway() {
    const action = pendingExportAction;
    closePrintPreflightModal();
    if (typeof action === 'function') {
        action();
    }
}

function jumpToEmptyField(fieldId, pageTabId) {
    closePrintPreflightModal();

    if (pageTabId && typeof setActivePage === 'function') {
        setActivePage(pageTabId, true);
    }

    setTimeout(() => {
        const el = document.getElementById(fieldId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
            el.classList.add('ring-2', 'ring-white');
            setTimeout(() => {
                el.classList.remove('ring-2', 'ring-white');
            }, 2000);
        }
    }, 250);
}

// ==========================================
// EXPORT: PRINT TO PDF
// ==========================================
function quickPrintSurat() {
    openPrintPreflightModal('print', () => {
        window.print();
    });
}

// ==========================================
// EXPORT: MICROSOFT WORD (.DOC)
// ==========================================
function exportSuratWord() {
    openPrintPreflightModal('word', () => {
        const doc = typeof getActiveDocument === 'function' ? getActiveDocument() : null;
        const type = doc ? doc.type : 'SPZ';

        let innerContent = '';
        if (type === 'SPZ' && typeof renderSpzLetterHtml === 'function') {
            innerContent = renderSpzLetterHtml(true);
        } else if (typeof renderSbaLetterHtml === 'function') {
            innerContent = renderSbaLetterHtml(true);
        }

        // Clean out interactive badges, edit markers, tooltips
        innerContent = innerContent
            .replace(/<div class="spz-sheet-badge[\s\S]*?<\/div>/gi, '')
            .replace(/preview-editable/gi, '')
            .replace(/data-edit-[a-z0-9_-]+="[^"]*"/gi, '')
            .replace(/title="[^"]*"/gi, '');

        const wordHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>${escapeHtml(doc ? doc.title : 'Surat Resmi')}</title>
                <!--[if gte mso 9]>
                <xml>
                    <w:WordDocument>
                        <w:View>Print</w:View>
                        <w:Zoom>100</w:Zoom>
                        <w:DoNotOptimizeForBrowser/>
                    </w:WordDocument>
                </xml>
                <![endif]-->
                <style>
                    @page Section1 {
                        size: 210mm 297mm;
                        margin: 20mm 20mm 20mm 20mm;
                        mso-header-margin: 35.4pt;
                        mso-footer-margin: 35.4pt;
                    }
                    div.Section1 { page: Section1; }
                    body {
                        font-family: 'Times New Roman', serif;
                        font-size: 12pt;
                        color: #000000;
                        line-height: 1.35;
                        background: #FFFFFF;
                        margin: 0;
                        padding: 0;
                    }
                    table { border-collapse: collapse; width: 100%; }
                    .kop-separator {
                        border-top: 2.5pt solid #000000;
                        border-bottom: 0.8pt solid #000000;
                        height: 3pt;
                        margin: 8pt 0 14pt 0;
                    }
                    .spz-page-sheet {
                        page-break-after: always;
                        padding: 0;
                        margin-bottom: 24pt;
                    }
                    .spz-page-sheet:last-child {
                        page-break-after: auto;
                    }
                    table.spz-border-table th, table.spz-border-table td {
                        border: 1px solid #000000;
                        padding: 4pt 6pt;
                    }
                </style>
            </head>
            <body>
                <div class="Section1">
                    ${innerContent}
                </div>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = (doc ? doc.title.replace(/[^a-zA-Z0-9_\-]/g, '_') : 'surat_resmi') + '.doc';
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Dokumen Word Diunduh',
                html: `
                    <p class="text-xs text-neutral-300 leading-relaxed mb-3">
                        File <b>${escapeHtml(filename)}</b> berhasil diunduh.
                    </p>
                    <div class="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-left text-xs space-y-1.5 text-neutral-400">
                        <p class="font-bold text-white flex items-center gap-1.5">
                            <i class="fa-solid fa-circle-info text-blue-400"></i> Catatan Kompatibilitas:
                        </p>
                        <p>&bull; <b>Di Laptop / PC:</b> Buka file ini di Microsoft Word atau WPS Office untuk tata letak tabel yang rapi.</p>
                        <p>&bull; <b>Di HP (Android/iOS):</b> Jangan buka di aplikasi Google Dokumen HP karena tidak mendukung format tabel Word penuh.</p>
                        <p>&bull; <b>Rekomendasi di HP:</b> Gunakan tombol <b>Cetak / Simpan PDF</b> agar langsung tampil sempurna.</p>
                    </div>
                `,
                confirmButtonColor: '#27272a'
            });
        }
    });
}

// ==========================================
// EXPORT: COPY PLAIN TEXT
// ==========================================
function copySuratText() {
    const paper = document.getElementById('rendered_surat_paper');
    if (!paper) return;

    const text = paper.innerText.replace(/\n{3,}/g, '\n\n').trim();
    navigator.clipboard.writeText(text).then(() => {
        if (typeof showToast === 'function') {
            showToast('Teks surat berhasil disalin ke papan klip.', 'success');
        }
    }).catch(err => {
        console.error('Clipboard copy error:', err);
    });
}
