/**
 * GenSurat - spz.js
 * Dedicated Data, Editors, and A4 Letter Renderer for Surat Perizinan (SPZ).
 */

const DEFAULT_SPZ_BARANG = [
    { nama: '', jumlah: '' },
    { nama: '', jumlah: '' }
];

const DEFAULT_SPZ_PANITIA = [
    { nama: '', nim: '', prodi: '', delegasi: 'XXX' },
    { nama: '', nim: '', prodi: '', delegasi: 'XXX' }
];

const DEFAULT_SPZ_RUNDOWN = [
    { nama: '', waktu: '', pj: '' },
    { nama: '', waktu: '', pj: '' }
];

let spzBarangList = JSON.parse(JSON.stringify(DEFAULT_SPZ_BARANG));
let spzPanitiaList = JSON.parse(JSON.stringify(DEFAULT_SPZ_PANITIA));
let spzRundownList = JSON.parse(JSON.stringify(DEFAULT_SPZ_RUNDOWN));

let isSpzPembukaManuallyEdited = false;

// ==========================================
// RUNDOWN TIME HELPERS
// ==========================================
function cleanRundownTimePart(str) {
    if (!str) return '';
    return str.toString()
        .replace(/WIB/gi, '')
        .replace(/[-–—]/g, '')
        .replace(/\s+/g, '')
        .replace(/[^0-9.:]/g, '')
        .trim();
}

function formatRundownTimeString(raw) {
    if (!raw) return '';
    const clean = raw.trim();
    if (!clean) return '';

    // Handle "s/d Selesai"
    if (/(?:s\/?d|sampai|-)\s*(?:selesai|akhir)/i.test(clean)) {
        const startPart = clean.replace(/(?:s\/?d|sampai|-)\s*(?:selesai|akhir).*/i, '').trim();
        const startFormatted = formatSingleTimePoint(startPart);
        return startFormatted ? `${startFormatted} – Selesai WIB` : '08.00 – Selesai WIB';
    }

    // Split range
    const parts = clean.split(/[-–—]|(?:\s+s\/?d\s+)/i).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
        const start = formatSingleTimePoint(parts[0]);
        const end = formatSingleTimePoint(parts[1]);
        if (start && end) return `${start} – ${end} WIB`;
    } else if (parts.length === 1) {
        const single = formatSingleTimePoint(parts[0]);
        if (single) return `${single} WIB`;
    }

    return clean;
}

function formatSingleTimePoint(str) {
    if (!str) return '';
    const digitsOnly = str.replace(/[^0-9]/g, '');
    if (digitsOnly.length === 4) {
        return `${digitsOnly.substr(0, 2)}.${digitsOnly.substr(2, 2)}`;
    }
    if (digitsOnly.length === 3) {
        return `0${digitsOnly.substr(0, 1)}.${digitsOnly.substr(1, 2)}`;
    }
    if (str.includes('.') || str.includes(':')) {
        const sep = str.includes('.') ? '.' : ':';
        const [h, m] = str.split(sep).map(x => x.replace(/[^0-9]/g, '').trim());
        if (h !== undefined && m !== undefined) {
            return `${h.padStart(2, '0')}.${m.padStart(2, '0')}`;
        }
    }
    return str.trim();
}

function extractRundownStartTime(str) {
    if (!str) return '08.00';
    const match = str.match(/(\d{1,2})[.:](\d{2})/);
    return match ? `${match[1].padStart(2, '0')}.${match[2]}` : '08.00';
}

function extractRundownEndTime(str) {
    if (!str) return '';
    if (/selesai/i.test(str)) return 'Selesai';
    const matches = [...str.matchAll(/(\d{1,2})[.:](\d{2})/g)];
    if (matches.length >= 2) {
        const m = matches[1];
        return `${m[1].padStart(2, '0')}.${m[2]}`;
    }
    return '';
}

function addMinutesToTimeString(timeStr, mins) {
    const clean = (timeStr || '').replace(/[^0-9.:]/g, '');
    const [hStr, mStr] = clean.includes('.') ? clean.split('.') : clean.split(':');
    let h = parseInt(hStr || '8', 10);
    let m = parseInt(mStr || '0', 10);
    m += mins;
    h += Math.floor(m / 60);
    m = m % 60;
    h = h % 24;
    return `${h.toString().padStart(2, '0')}.${m.toString().padStart(2, '0')}`;
}

function autoFormatRundownTimeOnBlur(type, idx, inputEl) {
    if (!inputEl) return;
    const formatted = formatRundownTimeString(inputEl.value);
    inputEl.value = formatted;
    if (type === 'SPZ') {
        updateSpzRundownField(idx, 'waktu', formatted);
    } else if (type === 'SBA' && typeof updateSbaRundownField === 'function') {
        updateSbaRundownField(idx, 'waktu', formatted);
    }
}

function applyRundownQuickTime(type, idx, timeVal, part) {
    let current = '';
    if (type === 'SPZ' && spzRundownList[idx]) current = spzRundownList[idx].waktu || '';
    else if (type === 'SBA' && typeof sbaRundownList !== 'undefined' && sbaRundownList[idx]) current = sbaRundownList[idx].waktu || '';

    let start = extractRundownStartTime(current) || '08.00';
    let end = extractRundownEndTime(current) || '09.00';

    if (part === 'start') {
        start = timeVal;
        if (!end || end === 'Selesai') end = addMinutesToTimeString(start, 60);
    } else if (part === 'end') {
        end = timeVal;
    }

    const newTime = `${start} – ${end} WIB`;
    if (type === 'SPZ') {
        updateSpzRundownField(idx, 'waktu', newTime);
        renderSpzRundownEditor();
    } else if (type === 'SBA' && typeof updateSbaRundownField === 'function') {
        updateSbaRundownField(idx, 'waktu', newTime);
        if (typeof renderSbaRundownEditor === 'function') renderSbaRundownEditor();
    }
    if (typeof updatePreview === 'function') updatePreview();
}

function setRundownUntilFinish(type, idx) {
    let current = '';
    if (type === 'SPZ' && spzRundownList[idx]) current = spzRundownList[idx].waktu || '';
    else if (type === 'SBA' && typeof sbaRundownList !== 'undefined' && sbaRundownList[idx]) current = sbaRundownList[idx].waktu || '';

    const start = extractRundownStartTime(current) || '08.00';
    const newTime = `${start} – Selesai WIB`;

    if (type === 'SPZ') {
        updateSpzRundownField(idx, 'waktu', newTime);
        renderSpzRundownEditor();
    } else if (type === 'SBA' && typeof updateSbaRundownField === 'function') {
        updateSbaRundownField(idx, 'waktu', newTime);
        if (typeof renderSbaRundownEditor === 'function') renderSbaRundownEditor();
    }
    if (typeof updatePreview === 'function') updatePreview();
}

function inheritPrevRundownTime(type, idx) {
    if (idx <= 0) return;
    let prev = '';
    if (type === 'SPZ' && spzRundownList[idx - 1]) prev = spzRundownList[idx - 1].waktu || '';
    else if (type === 'SBA' && typeof sbaRundownList !== 'undefined' && sbaRundownList[idx - 1]) prev = sbaRundownList[idx - 1].waktu || '';

    const prevEnd = extractRundownEndTime(prev);
    if (!prevEnd || prevEnd === 'Selesai') return;

    const start = prevEnd;
    const end = addMinutesToTimeString(start, 60);
    const newTime = `${start} – ${end} WIB`;

    if (type === 'SPZ') {
        updateSpzRundownField(idx, 'waktu', newTime);
        renderSpzRundownEditor();
    } else if (type === 'SBA' && typeof updateSbaRundownField === 'function') {
        updateSbaRundownField(idx, 'waktu', newTime);
        if (typeof renderSbaRundownEditor === 'function') renderSbaRundownEditor();
    }
    if (typeof updatePreview === 'function') updatePreview();
}

// ==========================================
// SPZ EDITORS (BARANG, PANITIA, RUNDOWN)
// ==========================================
function renderSpzBarangEditor() {
    const container = document.getElementById('spz_barang_editor_rows');
    if (!container) return;

    let html = '';
    spzBarangList.forEach((item, idx) => {
        html += `
            <div class="flex items-center gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800" data-idx="${idx}">
                <span class="text-[10px] font-mono text-neutral-500 w-5 text-center">${idx + 1}.</span>
                <input type="text" value="${escapeHtml(item.nama || '')}" oninput="updateSpzBarangField(${idx}, 'nama', this.value)" placeholder="Nama Barang (cth: Mic Wireless)" class="text-xs bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 flex-1 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400">
                <input type="text" value="${escapeHtml(item.jumlah || '')}" oninput="updateSpzBarangField(${idx}, 'jumlah', this.value)" placeholder="Jumlah (cth: 2 Unit)" class="text-xs bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 w-24 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 text-center">
                <button type="button" onclick="removeSpzBarangRow(${idx})" class="text-neutral-500 hover:text-red-400 p-1.5 transition-colors" title="Hapus Baris"><i class="fa-solid fa-trash-can text-xs"></i></button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function addSpzBarangRow() {
    spzBarangList.push({ nama: '', jumlah: '' });
    renderSpzBarangEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function removeSpzBarangRow(idx) {
    if (spzBarangList.length <= 1) {
        spzBarangList = [{ nama: '', jumlah: '' }];
    } else {
        spzBarangList.splice(idx, 1);
    }
    renderSpzBarangEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function updateSpzBarangField(idx, field, val) {
    if (spzBarangList[idx]) {
        spzBarangList[idx][field] = val;
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function resetSpzBarangDefault() {
    spzBarangList = JSON.parse(JSON.stringify(DEFAULT_SPZ_BARANG));
    renderSpzBarangEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function renderSpzPanitiaEditor() {
    const container = document.getElementById('spz_panitia_editor_rows');
    if (!container) return;

    const prof = getCurrentDocumentProfile();
    const defaultDelegasi = prof.org_singkatan || 'XXX';

    let html = '';
    spzPanitiaList.forEach((p, idx) => {
        html += `
            <div class="grid grid-cols-12 gap-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800 items-center" data-idx="${idx}">
                <div class="col-span-1 text-[10px] font-mono text-neutral-500 text-center">${idx + 1}.</div>
                <div class="col-span-4">
                    <input type="text" value="${escapeHtml(p.nama || '')}" oninput="updateSpzPanitiaField(${idx}, 'nama', this.value)" placeholder="Nama Lengkap" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400">
                </div>
                <div class="col-span-3">
                    <input type="text" value="${escapeHtml(p.nim || '')}" oninput="updateSpzPanitiaField(${idx}, 'nim', this.value)" placeholder="NIM" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 font-mono text-[11px]">
                </div>
                <div class="col-span-2">
                    <input type="text" value="${escapeHtml(p.prodi || '')}" oninput="updateSpzPanitiaField(${idx}, 'prodi', this.value)" placeholder="Prodi" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 text-[11px]">
                </div>
                <div class="col-span-2 flex items-center justify-end gap-1">
                    <button type="button" onclick="removeSpzPanitiaRow(${idx})" class="text-neutral-500 hover:text-red-400 p-1" title="Hapus"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function addSpzPanitiaRow() {
    const prof = getCurrentDocumentProfile();
    spzPanitiaList.push({ nama: '', nim: '', prodi: '', delegasi: prof.org_singkatan || 'XXX' });
    renderSpzPanitiaEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function removeSpzPanitiaRow(idx) {
    if (spzPanitiaList.length <= 1) {
        const prof = getCurrentDocumentProfile();
        spzPanitiaList = [{ nama: '', nim: '', prodi: '', delegasi: prof.org_singkatan || 'XXX' }];
    } else {
        spzPanitiaList.splice(idx, 1);
    }
    renderSpzPanitiaEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function updateSpzPanitiaField(idx, field, val) {
    if (spzPanitiaList[idx]) {
        spzPanitiaList[idx][field] = val;
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function resetSpzPanitiaDefault() {
    const prof = getCurrentDocumentProfile();
    spzPanitiaList = [
        { nama: '', nim: '', prodi: '', delegasi: prof.org_singkatan || 'XXX' },
        { nama: '', nim: '', prodi: '', delegasi: prof.org_singkatan || 'XXX' }
    ];
    renderSpzPanitiaEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function renderSpzRundownEditor() {
    const container = document.getElementById('spz_rundown_editor_rows');
    if (!container) return;

    let html = '';
    spzRundownList.forEach((r, idx) => {
        html += `
            <div class="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2" data-idx="${idx}">
                <div class="flex items-center justify-between text-[11px]">
                    <span class="font-mono text-neutral-400 font-bold">Rundown #${idx + 1}</span>
                    <div class="flex items-center gap-1.5">
                        ${idx > 0 ? `<button type="button" onclick="inheritPrevRundownTime('SPZ', ${idx})" class="text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded bg-neutral-800" title="Ikuti jam selesai sebelumnya"><i class="fa-solid fa-clock-rotate-left mr-1"></i>Lanjut Jam</button>` : ''}
                        <button type="button" onclick="setRundownUntilFinish('SPZ', ${idx})" class="text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded bg-neutral-800" title="Format sampai selesai">s/d Selesai</button>
                        <button type="button" onclick="removeSpzRundownRow(${idx})" class="text-neutral-500 hover:text-red-400 p-1" title="Hapus"><i class="fa-solid fa-trash-can text-xs"></i></button>
                    </div>
                </div>
                <div class="grid grid-cols-12 gap-2">
                    <div class="col-span-5">
                        <input type="text" value="${escapeHtml(r.waktu || '')}" onblur="autoFormatRundownTimeOnBlur('SPZ', ${idx}, this)" oninput="updateSpzRundownField(${idx}, 'waktu', this.value)" placeholder="Waktu (08.00 – 09.00 WIB)" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-neutral-400">
                    </div>
                    <div class="col-span-4">
                        <input type="text" value="${escapeHtml(r.nama || '')}" oninput="updateSpzRundownField(${idx}, 'nama', this.value)" placeholder="Nama Agenda" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400">
                    </div>
                    <div class="col-span-3">
                        <input type="text" value="${escapeHtml(r.pj || '')}" oninput="updateSpzRundownField(${idx}, 'pj', this.value)" placeholder="PJ / Pengisi" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400">
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function addSpzRundownRow() {
    spzRundownList.push({ nama: '', waktu: '', pj: '' });
    renderSpzRundownEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function removeSpzRundownRow(idx) {
    if (spzRundownList.length <= 1) {
        spzRundownList = [{ nama: '', waktu: '', pj: '' }];
    } else {
        spzRundownList.splice(idx, 1);
    }
    renderSpzRundownEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function updateSpzRundownField(idx, field, val) {
    if (spzRundownList[idx]) {
        spzRundownList[idx][field] = val;
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function resetSpzRundownDefault() {
    spzRundownList = JSON.parse(JSON.stringify(DEFAULT_SPZ_RUNDOWN));
    renderSpzRundownEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

// ==========================================
// SPZ SMART INPUT & AUTO SYNC
// ==========================================
function handleSpzFasilitasChange(val) {
    updateSpzAutoTempat(val);
    updateSpzAutoPembuka();
    if (typeof updatePreview === 'function') updatePreview();
}

function updateSpzAutoTempat(fas) {
    const tempatEl = document.getElementById('field_tempat');
    if (!tempatEl) return;
    const clean = (fas || '').trim();
    if (clean) {
        tempatEl.value = clean;
    }
}

function resetSpzTempatDefault() {
    const tempatEl = document.getElementById('field_tempat');
    const fasEl = document.getElementById('spz_input_fasilitas');
    if (tempatEl && fasEl) {
        tempatEl.value = fasEl.value.trim() || '';
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function toggleSpzPembukaManual() {
    const autoBox = document.getElementById('spz_pembuka_auto_container');
    const manualBox = document.getElementById('spz_pembuka_manual_container');
    if (!autoBox || !manualBox) return;

    if (autoBox.classList.contains('hidden')) {
        autoBox.classList.remove('hidden');
        manualBox.classList.add('hidden');
        isSpzPembukaManuallyEdited = false;
        syncSpzPembukaAuto();
    } else {
        autoBox.classList.add('hidden');
        manualBox.classList.remove('hidden');
        isSpzPembukaManuallyEdited = true;
    }
    if (typeof updatePreview === 'function') updatePreview();
}

function updateSpzAutoPembuka() {
    if (isSpzPembukaManuallyEdited) return;

    const prof = getCurrentDocumentProfile();
    const wadah = prof.org_wadah || 'Unit Kegiatan Mahasiswa';
    const orgNama = prof.org_nama || 'Organisasi XXX';

    const fasEl = document.getElementById('spz_input_fasilitas');
    const fasilitas = fasEl ? fasEl.value.trim() : '';

    const acaraEl = document.getElementById('field_nama_acara');
    const acara = acaraEl ? acaraEl.value.trim() : '';

    let text = `Melalui surat ini, kami **${wadah} ${orgNama}** bermaksud untuk mengajukan permohonan izin peminjaman fasilitas`;
    if (fasilitas) text += ` **${fasilitas}**`;
    if (acara) text += ` untuk kegiatan **${acara}**`;
    text += ` yang akan dilaksanakan pada:`;

    const displayBox = document.getElementById('spz_pembuka_display_box');
    if (displayBox) {
        displayBox.innerHTML = formatInlineRichText(text);
    }

    const fieldPembuka = document.getElementById('field_pembuka');
    if (fieldPembuka && !isSpzPembukaManuallyEdited) {
        fieldPembuka.value = text;
    }
}

function syncSpzPembukaAuto() {
    isSpzPembukaManuallyEdited = false;
    updateSpzAutoPembuka();
    if (typeof updatePreview === 'function') updatePreview();
}

function generateContohSpzIsiInti() {
    const isiEl = document.getElementById('field_isi_inti');
    if (isiEl) {
        isiEl.value = 'Ini adalah kegiatan perizinan yang diselenggarakan guna menunjang kelancaran program kerja organisasi.';
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function toggleSpzAttachmentSections() {
    const incPanitia = document.getElementById('spz_inc_lampiran_panitia')?.checked;
    const panitiaSec = document.getElementById('spz_panitia_section');
    if (panitiaSec) {
        panitiaSec.style.display = incPanitia ? 'block' : 'none';
    }
    if (typeof updatePreview === 'function') updatePreview();
}

function toggleSpzSubbagSections() {
    const incSubbag = document.getElementById('spz_inc_subbag_umum')?.checked;
    const subbagSec = document.getElementById('spz_subbag_section');
    if (subbagSec) {
        subbagSec.style.display = incSubbag ? 'block' : 'none';
    }
    if (typeof updatePreview === 'function') updatePreview();
}

function extractJamTerakhirSpz(waktuStr) {
    if (!waktuStr) return '21.00 WIB';
    if (/selesai/i.test(waktuStr)) return 'Selesai WIB';
    const matches = [...waktuStr.matchAll(/(\d{1,2})[.:](\d{2})/g)];
    if (matches.length >= 2) {
        return `${matches[1][1].padStart(2, '0')}.${matches[1][2]} WIB`;
    } else if (matches.length === 1) {
        return `${matches[0][1].padStart(2, '0')}.${matches[0][2]} WIB`;
    }
    return '21.00 WIB';
}

function formatSpzText(str) {
    if (!str) return '';
    return formatInlineRichText(str);
}

function formatSpzTujuan(text) {
    if (!text) return '';
    return formatInlineRichText(text);
}

// ==========================================
// SPZ PAGES STRUCTURE (For Navigation & Tabs)
// ==========================================
function getSpzPagesStructure() {
    const pages = [
        { id: 1, key: 'permohonan', label: 'Hal 1: Permohonan', icon: 'fa-file-lines', desc: 'Kop, Tujuan & Rincian Acara' },
        { id: 2, key: 'pengesahan', label: 'Hal 2: Pengesahan', icon: 'fa-signature', desc: 'Penutup & 6 Tanda Tangan' }
    ];

    let lampiranPageId = 3;

    // Lampiran Barang, Panitia & Rundown
    const incPanitia = document.getElementById('spz_inc_lampiran_panitia') ? document.getElementById('spz_inc_lampiran_panitia').checked : true;
    pages.push({
        id: lampiranPageId,
        key: 'lampiran_detail',
        label: `Hal ${lampiranPageId}: Lampiran`,
        icon: 'fa-table-list',
        desc: incPanitia ? 'Barang, Panitia & Rundown' : 'Barang & Rundown'
    });
    lampiranPageId++;

    // Lembar Persetujuan Subbag
    const incSubbag = document.getElementById('spz_inc_subbag_umum') ? document.getElementById('spz_inc_subbag_umum').checked : true;
    if (incSubbag) {
        pages.push({
            id: lampiranPageId,
            key: 'subbag_umum',
            label: `Hal ${lampiranPageId}: Lembar Subbag`,
            icon: 'fa-building-columns',
            desc: 'Persetujuan Subbag Umum'
        });
    }

    return pages;
}

// ==========================================
// SPZ FULL A4 LETTER RENDERER
// ==========================================
function renderSpzLetterHtml(isWordOrPrint = false) {
    const prof = getCurrentDocumentProfile();

    // 1. DATA FORM
    const rawNoSurat = (document.getElementById('field_nomor_surat')?.value || '').trim();
    const noSurat = rawNoSurat || `001/SPZ/${prof.org_kode_surat || 'XXX/XXX'}/${getRomanMonth(new Date())}/${new Date().getFullYear()}`;

    const rawLampiran = (document.getElementById('field_lampiran')?.value || '').trim();
    const lampiran = rawLampiran ? (/^\d+$/.test(rawLampiran) ? `${rawLampiran} Lembar` : rawLampiran) : 'Lampiran';

    const rawFasilitas = (document.getElementById('spz_input_fasilitas')?.value || '').trim();
    const rawPerihal = (document.getElementById('field_perihal')?.value || '').trim();
    const perihal = rawPerihal || (rawFasilitas ? `Surat Perizinan Peminjaman Fasilitas ${rawFasilitas}` : 'Surat Perizinan Peminjaman Fasilitas XXX');

    const rawTanggalSurat = (document.getElementById('field_tanggal_surat')?.value || '').trim();
    const tanggalSurat = rawTanggalSurat || `Jakarta, ${formatIndoDate(new Date())}`;

    const rawTujuan = (document.getElementById('field_tujuan')?.value || '').trim();
    const tujuan = rawTujuan || `Yth. **${prof.subbag_jabatan || 'Kepala Subbagian Umum'}**\n${prof.kampus_nama || 'Politeknik Negeri Media Kreatif'}\nDi Tempat`;

    const rawAcara = (document.getElementById('field_nama_acara')?.value || '').trim();
    const namaAcara = rawAcara || 'Nama Kegiatan XXX';

    const rawHariTanggal = (document.getElementById('field_hari_tanggal')?.value || '').trim();
    const hariTanggal = rawHariTanggal || 'Hari, Tanggal Bulan Tahun';

    const rawWaktu = (document.getElementById('field_waktu')?.value || '').trim();
    const waktu = rawWaktu || '08.00 – 16.00 WIB';

    const rawTempat = (document.getElementById('field_tempat')?.value || '').trim();
    const tempat = rawTempat || (rawFasilitas || 'Lokasi Kegiatan / Ruangan XXX');

    const rawPembuka = (document.getElementById('field_pembuka')?.value || '').trim();
    const defaultPembuka = `Melalui surat ini, kami **${prof.org_wadah || 'Unit Kegiatan Mahasiswa'} ${prof.org_nama || 'Organisasi XXX'}** bermaksud untuk mengajukan permohonan izin peminjaman fasilitas **${tempat}** untuk kegiatan **${namaAcara}** yang akan dilaksanakan pada:`;
    const pembuka = rawPembuka || defaultPembuka;

    const rawPenutup = (document.getElementById('field_penutup')?.value || '').trim();
    const penutup = rawPenutup || 'Demikian surat perizinan ini kami buat. Atas perhatian dan kerja sama, kami sampaikan terima kasih.';

    // Pejabat Form Inputs
    const isTtd1Active = document.getElementById('field_ttd1_active') ? document.getElementById('field_ttd1_active').checked : true;
    let ttd1Jabatan = (document.getElementById('field_ttd1_jabatan')?.value || '').trim() || 'Ketua Pelaksana';
    const rawTtd1Nama = (document.getElementById('field_ttd1_nama')?.value || '').trim();
    const ttd1Nama = rawTtd1Nama || (isWordOrPrint ? 'Nama Ketua Pelaksana' : '<span class="preview-placeholder-hint">Nama Ketua Pelaksana</span>');
    const rawTtd1Nim = (document.getElementById('field_ttd1_nim')?.value || '').trim();
    const ttd1Nim = rawTtd1Nim || (isWordOrPrint ? 'NIM. XXXXXXXXX' : '<span class="preview-placeholder-hint">NIM. XXXXXXXXX</span>');

    const isTtd2Active = document.getElementById('field_ttd2_active') ? document.getElementById('field_ttd2_active').checked : true;
    let ttd2Jabatan = (document.getElementById('field_ttd2_jabatan')?.value || '').trim() || (prof.ketua_org_jabatan || 'Ketua Organisasi');
    const rawTtd2Nama = (document.getElementById('field_ttd2_nama')?.value || '').trim();
    const ttd2Nama = rawTtd2Nama || prof.ketua_org_nama || (isWordOrPrint ? 'Nama Ketua Organisasi' : '<span class="preview-placeholder-hint">Nama Ketua Organisasi</span>');
    const rawTtd2Nim = (document.getElementById('field_ttd2_nim')?.value || '').trim();
    const ttd2Nim = rawTtd2Nim || prof.ketua_org_nim || (isWordOrPrint ? 'NIM. XXXXXXXXX' : '<span class="preview-placeholder-hint">NIM. XXXXXXXXX</span>');

    const isTtd3Active = document.getElementById('field_ttd3_active') ? document.getElementById('field_ttd3_active').checked : true;
    let ttd3Jabatan = (document.getElementById('field_ttd3_jabatan')?.value || '').trim() || (prof.dosen_pembina_jabatan || 'Dosen Pembina');
    const rawTtd3Nama = (document.getElementById('field_ttd3_nama')?.value || '').trim();
    const ttd3Nama = rawTtd3Nama || prof.dosen_pembina_nama || (isWordOrPrint ? 'Nama Dosen Pembina' : '<span class="preview-placeholder-hint">Nama Dosen Pembina</span>');
    const rawTtd3Nim = (document.getElementById('field_ttd3_nim')?.value || '').trim();
    const ttd3Nim = rawTtd3Nim || prof.dosen_pembina_nip || (isWordOrPrint ? 'NIP. XXXXXXXXXXXXXXXXXX' : '<span class="preview-placeholder-hint">NIP. XXXXXXXXXXXXXXXXXX</span>');

    const isMpmActive = document.getElementById('field_ttd_mpm_active') ? document.getElementById('field_ttd_mpm_active').checked : true;
    let mpmJabatan = (document.getElementById('field_ttd_mpm_jabatan')?.value || '').trim() || (prof.ketua_mpm_jabatan || 'Ketua MPM PoliMedia');
    const rawMpmNama = (document.getElementById('field_ttd_mpm_nama')?.value || '').trim();
    const mpmNama = rawMpmNama || prof.ketua_mpm_nama || (isWordOrPrint ? 'Nama Ketua MPM' : '<span class="preview-placeholder-hint">Nama Ketua MPM</span>');
    const rawMpmNim = (document.getElementById('field_ttd_mpm_nim')?.value || '').trim();
    const mpmNim = rawMpmNim || prof.ketua_mpm_nim || (isWordOrPrint ? 'NIM. XXXXXXXXX' : '<span class="preview-placeholder-hint">NIM. XXXXXXXXX</span>');

    const isBemActive = document.getElementById('field_ttd_bem_active') ? document.getElementById('field_ttd_bem_active').checked : true;
    let bemJabatan = (document.getElementById('field_ttd_bem_jabatan')?.value || '').trim() || (prof.ketua_bem_jabatan || 'Ketua BEM PoliMedia');
    const rawBemNama = (document.getElementById('field_ttd_bem_nama')?.value || '').trim();
    const bemNama = rawBemNama || prof.ketua_bem_nama || (isWordOrPrint ? 'Nama Ketua BEM' : '<span class="preview-placeholder-hint">Nama Ketua BEM</span>');
    const rawBemNim = (document.getElementById('field_ttd_bem_nim')?.value || '').trim();
    const bemNim = rawBemNim || prof.ketua_bem_nim || (isWordOrPrint ? 'NIM. XXXXXXXXX' : '<span class="preview-placeholder-hint">NIM. XXXXXXXXX</span>');

    const isWadirActive = document.getElementById('field_ttd_wadir_active') ? document.getElementById('field_ttd_wadir_active').checked : true;
    let wadirJabatan = (document.getElementById('field_ttd_wadir_jabatan')?.value || '').trim() || (prof.wadir_jabatan || 'Wakil Direktur Bidang Kemahasiswaan dan Alumni');
    const rawWadirNama = (document.getElementById('field_ttd_wadir_nama')?.value || '').trim();
    const wadirNama = rawWadirNama || prof.wadir_nama || (isWordOrPrint ? 'Nama Wakil Direktur' : '<span class="preview-placeholder-hint">Nama Wakil Direktur</span>');
    const rawWadirNip = (document.getElementById('field_ttd_wadir_nip')?.value || '').trim();
    const wadirNip = rawWadirNip || (prof.wadir_nip ? `NIP. ${prof.wadir_nip}` : (isWordOrPrint ? 'NIP. XXXXXXXXXXXXXXXXXX' : '<span class="preview-placeholder-hint">NIP. XXXXXXXXXXXXXXXXXX</span>'));

    const incSubbag = document.getElementById('spz_inc_subbag_umum') ? document.getElementById('spz_inc_subbag_umum').checked : true;
    const noHp = (document.getElementById('spz_no_hp')?.value || '').trim() || (isWordOrPrint ? '08XXXXXXXXXX' : '<span class="preview-placeholder-hint">08XXXXXXXXXX</span>');
    const rawBatas = (document.getElementById('spz_batas_waktu')?.value || '').trim();
    const batasWaktu = rawBatas || extractJamTerakhirSpz(waktu);

    const spzKop = generateOfficialKopHtml('8pt');
    const watermarkHtml = getOfficialWatermarkHtml('145mm');

    let totalPages = 3 + (incSubbag ? 1 : 0);
    let currentPageNum = 1;
    let pagesHtml = '';

    // ==========================================
    // HALAMAN 1: PERMOHONAN IZIN & DETAIL ACARA
    // ==========================================
    pagesHtml += `
        <div class="spz-sheet-badge print:hidden">
            <span class="text-[10px] font-mono text-neutral-400 uppercase font-bold tracking-wider">Halaman 1 &bull; Permohonan Izin</span>
            <span class="text-[10px] font-mono text-neutral-400 font-bold">1 / ${totalPages}</span>
        </div>
        <div class="spz-page-sheet" data-page="1">
            ${watermarkHtml}
            <div style="position: relative; z-index: 2;">
                ${spzKop}
                <div class="spz-body-container" style="padding-left: 9mm; padding-right: 4mm;">
                    <!-- HEADER NOMOR, LAMPIRAN, HAL & TANGGAL -->
                    <table style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.35; margin-bottom: 14pt;">
                        <tr>
                            <td style="width: 85px; vertical-align: top; padding: 1pt 0;">Nomor</td>
                            <td style="width: 18px; vertical-align: top; text-align: center; padding: 1pt 0;">:</td>
                            <td style="vertical-align: top; padding: 1pt 0;" class="preview-editable" data-edit-target="field_nomor_urut" data-edit-label="Nomor Surat" data-edit-type="nomor_surat" title="Klik untuk edit Nomor Surat">
                                ${formatInlineRichText(noSurat)}
                            </td>
                            <td style="width: 220px; vertical-align: top; text-align: right; padding: 1pt 0;" class="preview-editable" data-edit-target="field_tanggal_surat" data-edit-label="Tanggal Surat" data-edit-type="date" title="Klik untuk edit Tanggal Surat">
                                ${formatInlineRichText(tanggalSurat)}
                            </td>
                        </tr>
                        <tr>
                            <td style="vertical-align: top; padding: 1pt 0;">Lampiran</td>
                            <td style="vertical-align: top; text-align: center; padding: 1pt 0;">:</td>
                            <td colspan="2" style="vertical-align: top; padding: 1pt 0;" class="preview-editable" data-edit-target="field_lampiran" data-edit-label="Lampiran Surat" data-edit-type="lampiran" title="Klik untuk edit Lampiran">
                                ${formatInlineRichText(lampiran)}
                            </td>
                        </tr>
                        <tr>
                            <td style="vertical-align: top; padding: 1pt 0;">Hal</td>
                            <td style="vertical-align: top; text-align: center; padding: 1pt 0;">:</td>
                            <td colspan="2" style="vertical-align: top; padding: 1pt 0;" class="preview-editable" data-edit-target="${rawFasilitas ? 'spz_input_fasilitas' : 'field_perihal'}" data-edit-label="${rawFasilitas ? 'Fasilitas Peminjaman' : 'Perihal Surat'}" data-edit-type="text" title="Klik untuk edit Perihal">
                                ${formatInlineRichText(perihal)}
                            </td>
                        </tr>
                    </table>

                    <!-- TUJUAN SURAT -->
                    <div class="preview-editable" data-edit-target="field_tujuan" data-edit-label="Tujuan Surat" data-edit-type="textarea" title="Klik untuk edit Tujuan Surat" style="margin-bottom: 14pt; line-height: 1.45; font-family: 'Times New Roman', serif; font-size: 12pt;">
                        ${formatSpzTujuan(tujuan).replace(/\n/g, '<br>')}
                    </div>

                    <!-- SALAM PEMBUKA & PARAGRAF PEMBUKA -->
                    <p style="margin: 0 0 4pt 0; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.45;">Assalamu’alaikum Wr. Wb.</p>
                    <div class="preview-editable" data-edit-target="field_pembuka" data-edit-label="Paragraf Pembuka" data-edit-type="textarea" title="Klik untuk edit Paragraf Pembuka">
                        <p style="margin: 0 0 10pt 0; text-align: justify; text-indent: 1.25cm; line-height: 1.45; font-family: 'Times New Roman', serif; font-size: 12pt;">
                            ${formatSpzText(pembuka).replace(/\n/g, '<br>')}
                        </p>
                    </div>

                    <!-- DETAIL RINCIAN ACARA -->
                    <table style="margin: 0 0 10pt 1.25cm; border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.45;">
                        <tr class="preview-editable" data-edit-target="field_nama_acara" data-edit-label="Nama Acara" data-edit-type="text" title="Klik untuk edit Nama Acara">
                            <td style="width: 140px; vertical-align: top; padding: 1.5pt 0;">Hari / Tanggal</td>
                            <td style="width: 18px; vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                            <td style="vertical-align: top; padding: 1.5pt 0;" class="preview-editable" data-edit-target="field_hari_tanggal" data-edit-label="Hari & Tanggal" data-edit-type="text" title="Klik untuk edit Hari & Tanggal">
                                ${formatInlineRichText(hariTanggal)}
                            </td>
                        </tr>
                        <tr class="preview-editable" data-edit-target="field_waktu" data-edit-label="Waktu Kegiatan" data-edit-type="text" title="Klik untuk edit Waktu">
                            <td style="vertical-align: top; padding: 1.5pt 0;">Waktu</td>
                            <td style="vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                            <td style="vertical-align: top; padding: 1.5pt 0;">${formatInlineRichText(waktu)}</td>
                        </tr>
                        <tr class="preview-editable" data-edit-target="field_tempat" data-edit-label="Tempat Pelaksanaan" data-edit-type="text" title="Klik untuk edit Tempat">
                            <td style="vertical-align: top; padding: 1.5pt 0;">Tempat</td>
                            <td style="vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                            <td style="vertical-align: top; padding: 1.5pt 0;">${formatInlineRichText(tempat)}</td>
                        </tr>
                    </table>

                    <p style="margin: 8pt 0 0 0; text-align: justify; text-indent: 1.25cm; line-height: 1.45; font-family: 'Times New Roman', serif; font-size: 12pt;">
                        Susunan kepanitiaan dan susunan kegiatan terlampir.
                    </p>
                </div>
            </div>
        </div>
    `;
    currentPageNum++;

    // ==========================================
    // HALAMAN 2: PENUTUP & PENGESAHAN (6 TTD)
    // ==========================================
    let ttdPjContent = '';
    if (isTtd1Active && isTtd2Active) {
        // Dua orang: Ketua Pelaksana (kanan) & Ketua Organisasi (kiri)
        ttdPjContent = `
            <colgroup>
                <col style="width: 48%;">
                <col style="width: 4%;">
                <col style="width: 48%;">
            </colgroup>
            <tr>
                <td style="width: 48%; vertical-align: top; line-height: 1.25;">
                    ${formatTtdJabatan(ttd2Jabatan)}<br><br><br><br><br>
                    <strong style="text-decoration: underline; font-size: 11pt;">${formatInlineRichText(ttd2Nama)}</strong><br>
                    <span style="font-size: 10pt;">${formatInlineRichText(ttd2Nim)}</span>
                </td>
                <td style="width: 4%;"></td>
                <td style="width: 48%; vertical-align: top; line-height: 1.25;">
                    ${formatTtdJabatan(ttd1Jabatan)}<br><br><br><br><br>
                    <strong style="text-decoration: underline; font-size: 11pt;">${formatInlineRichText(ttd1Nama)}</strong><br>
                    <span style="font-size: 10pt;">${formatInlineRichText(ttd1Nim)}</span>
                </td>
            </tr>
        `;
    } else if (isTtd2Active) {
        // Ketua Organisasi Sendirian -> OTOMATIS KE TENGAH
        ttdPjContent = `
            <tr>
                <td style="width: 100%; vertical-align: top; line-height: 1.25; text-align: center;">
                    ${formatTtdJabatan(ttd2Jabatan)}<br><br><br><br><br>
                    <strong style="text-decoration: underline; font-size: 11pt;">${formatInlineRichText(ttd2Nama)}</strong><br>
                    <span style="font-size: 10pt;">${formatInlineRichText(ttd2Nim)}</span>
                </td>
            </tr>
        `;
    } else if (isTtd1Active) {
        // Ketua Pelaksana Sendirian -> OTOMATIS KE TENGAH
        ttdPjContent = `
            <tr>
                <td style="width: 100%; vertical-align: top; line-height: 1.25; text-align: center;">
                    ${formatTtdJabatan(ttd1Jabatan)}<br><br><br><br><br>
                    <strong style="text-decoration: underline; font-size: 11pt;">${formatInlineRichText(ttd1Nama)}</strong><br>
                    <span style="font-size: 10pt;">${formatInlineRichText(ttd1Nim)}</span>
                </td>
            </tr>
        `;
    }

    // TINGKAT 2: MENGETAHUI (DOSEN, MPM, BEM)
    const activeMengetahui = [];
    if (isTtd3Active) activeMengetahui.push({ jabatan: ttd3Jabatan, nama: ttd3Nama, id: ttd3Nim });
    if (isMpmActive) activeMengetahui.push({ jabatan: mpmJabatan, nama: mpmNama, id: mpmNim });
    if (isBemActive) activeMengetahui.push({ jabatan: bemJabatan, nama: bemNama, id: bemNim });

    let ttdMengetahuiContent = '';
    if (activeMengetahui.length === 3) {
        ttdMengetahuiContent = `
            <colgroup>
                <col style="width: 34%;">
                <col style="width: 32%;">
                <col style="width: 34%;">
            </colgroup>
            <tr>
                ${activeMengetahui.map(m => `
                    <td style="vertical-align: top; line-height: 1.25;">
                        ${formatTtdJabatan(m.jabatan)}<br><br><br><br><br>
                        <strong style="text-decoration: underline; font-size: 10.5pt;">${formatInlineRichText(m.nama)}</strong><br>
                        <span style="font-size: 9.5pt;">${formatInlineRichText(m.id)}</span>
                    </td>
                `).join('')}
            </tr>
        `;
    } else if (activeMengetahui.length === 2) {
        ttdMengetahuiContent = `
            <colgroup>
                <col style="width: 48%;">
                <col style="width: 4%;">
                <col style="width: 48%;">
            </colgroup>
            <tr>
                <td style="width: 48%; vertical-align: top; line-height: 1.25;">
                    ${formatTtdJabatan(activeMengetahui[0].jabatan)}<br><br><br><br><br>
                    <strong style="text-decoration: underline; font-size: 11pt;">${formatInlineRichText(activeMengetahui[0].nama)}</strong><br>
                    <span style="font-size: 10pt;">${formatInlineRichText(activeMengetahui[0].id)}</span>
                </td>
                <td style="width: 4%;"></td>
                <td style="width: 48%; vertical-align: top; line-height: 1.25;">
                    ${formatTtdJabatan(activeMengetahui[1].jabatan)}<br><br><br><br><br>
                    <strong style="text-decoration: underline; font-size: 11pt;">${formatInlineRichText(activeMengetahui[1].nama)}</strong><br>
                    <span style="font-size: 10pt;">${formatInlineRichText(activeMengetahui[1].id)}</span>
                </td>
            </tr>
        `;
    } else if (activeMengetahui.length === 1) {
        ttdMengetahuiContent = `
            <tr>
                <td style="width: 100%; vertical-align: top; line-height: 1.25; text-align: center;">
                    ${formatTtdJabatan(activeMengetahui[0].jabatan)}<br><br><br><br><br>
                    <strong style="text-decoration: underline; font-size: 11pt;">${formatInlineRichText(activeMengetahui[0].nama)}</strong><br>
                    <span style="font-size: 10pt;">${formatInlineRichText(activeMengetahui[0].id)}</span>
                </td>
            </tr>
        `;
    }

    pagesHtml += `
        <div class="spz-sheet-badge print:hidden">
            <span class="text-[10px] font-mono text-neutral-400 uppercase font-bold tracking-wider">Halaman 2 &bull; Pengesahan Surat</span>
            <span class="text-[10px] font-mono text-neutral-400 font-bold">2 / ${totalPages}</span>
        </div>
        <div class="spz-page-sheet" data-page="2">
            ${watermarkHtml}
            <div style="position: relative; z-index: 2;">
                ${spzKop}
                <div class="spz-body-container" style="padding-left: 9mm; padding-right: 4mm;">
                    <div class="preview-editable" data-edit-target="field_penutup" data-edit-label="Paragraf Penutup" data-edit-type="textarea" title="Klik untuk edit Paragraf Penutup">
                        <p style="margin: 0 0 12pt 0; text-align: justify; text-indent: 1.25cm; line-height: 1.45; font-family: 'Times New Roman', serif; font-size: 12pt;">
                            ${formatSpzText(penutup).replace(/\n/g, '<br>')}
                        </p>
                    </div>

                    <!-- TINGKAT 1: PENANGGUNG JAWAB -->
                    ${ttdPjContent ? `
                        <div class="preview-editable" data-edit-target="card_penandatangan" data-edit-label="Penanggung Jawab" data-edit-type="ttd_pj" title="Klik untuk edit Penanggung Jawab" style="font-family: 'Times New Roman', serif; margin-bottom: 14pt;">
                            <p style="margin: 0 0 6pt 0; text-align: center; font-weight: bold; font-size: 12pt;">Penanggung Jawab,</p>
                            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11pt; table-layout: fixed;">
                                ${ttdPjContent}
                            </table>
                        </div>
                    ` : ''}

                    <!-- TINGKAT 2: MENGETAHUI -->
                    ${ttdMengetahuiContent ? `
                        <div class="preview-editable" data-edit-target="card_ttd_mengetahui" data-edit-label="Pihak Mengetahui" data-edit-type="ttd_mengetahui" title="Klik untuk edit Pihak Mengetahui" style="font-family: 'Times New Roman', serif; margin-bottom: 14pt;">
                            <p style="margin: 0 0 6pt 0; text-align: center; font-weight: bold; font-size: 12pt;">Mengetahui,</p>
                            <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11pt; table-layout: fixed;">
                                ${ttdMengetahuiContent}
                            </table>
                        </div>
                    ` : ''}

                    <!-- TINGKAT 3: MENYETUJUI WADIR (TINGGI TERKUNCI) -->
                    <div id="spz_tingkat3_wadir_wrapper" style="height: 120pt; min-height: 120pt; margin-bottom: 12pt; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;">
                        ${isWadirActive ? `
                            <div class="preview-editable" data-edit-target="ttd_wadir_block" data-edit-label="Menyetujui (Wakil Direktur)" data-edit-type="ttd_wadir" title="Klik untuk edit Wakil Direktur" style="font-family: 'Times New Roman', serif; text-align: center;">
                                <p style="margin: 0 0 2pt 0; font-size: 11pt; font-weight: bold; line-height: 1.25;">Menyetujui,</p>
                                <p style="margin: 0; font-size: 11pt; line-height: 1.25;">${formatTtdJabatan(wadirJabatan)}</p>
                                <div style="height: 42pt;"></div>
                                <p style="margin: 0; font-size: 11pt; font-weight: bold; text-decoration: underline; line-height: 1.25; white-space: nowrap;">${formatInlineRichText(wadirNama)}</p>
                                <p style="margin: 0; font-size: 10pt; line-height: 1.25; white-space: nowrap;">${formatInlineRichText(wadirNip)}</p>
                            </div>
                        ` : `
                            <div class="preview-editable print:hidden" data-edit-target="ttd_wadir_block" data-edit-label="Menyetujui (Wakil Direktur)" data-edit-type="ttd_wadir" onclick="enableWadirAndOpenEdit(event)" title="Klik untuk mengaktifkan Wakil Direktur" style="height: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed #71717a; border-radius: 8px; background-color: rgba(255, 255, 255, 0.02); cursor: pointer;">
                                <span style="font-size: 9.5pt; color: #a1a1aa; font-weight: bold;"><i class="fa-solid fa-plus-circle mr-1.5"></i> Klik untuk Mengaktifkan Tanda Tangan Wakil Direktur (Menyetujui)</span>
                                <span style="font-size: 8.5pt; color: #71717a; margin-top: 3pt;">(Posisi tembusan di bawah tetap terkunci rapi)</span>
                            </div>
                            <div class="hidden print:block" style="height: 100%;"></div>
                        `}
                    </div>

                    <!-- TINGKAT 4: TEMBUSAN -->
                    <div style="font-size: 11pt; line-height: 1.35; text-align: left; margin-bottom: 0; font-family: 'Times New Roman', serif;">
                        <p style="margin: 0 0 2pt 0; font-weight: bold; font-size: 11pt;">Tembusan:</p>
                        <table style="margin-left: 18pt; border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.35;">
                            ${isWadirActive ? `
                                <tr>
                                    <td style="width: 22px; vertical-align: top; padding: 1pt 0;">1.</td>
                                    <td style="vertical-align: top; padding: 1pt 0; white-space: nowrap;">Wakil Direktur Bidang Kemahasiswaan dan Alumni</td>
                                </tr>
                                <tr>
                                    <td style="width: 22px; vertical-align: top; padding: 1pt 0;">2.</td>
                                    <td style="vertical-align: top; padding: 1pt 0; white-space: nowrap;">Satpam &amp; OB</td>
                                </tr>
                                <tr>
                                    <td style="width: 22px; vertical-align: top; padding: 1pt 0;">3.</td>
                                    <td style="vertical-align: top; padding: 1pt 0; white-space: nowrap;">Arsip</td>
                                </tr>
                            ` : `
                                <tr>
                                    <td style="width: 22px; vertical-align: top; padding: 1pt 0;">1.</td>
                                    <td style="vertical-align: top; padding: 1pt 0; white-space: nowrap;">Satpam &amp; OB</td>
                                </tr>
                                <tr>
                                    <td style="width: 22px; vertical-align: top; padding: 1pt 0;">2.</td>
                                    <td style="vertical-align: top; padding: 1pt 0; white-space: nowrap;">Arsip</td>
                                </tr>
                            `}
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    currentPageNum++;

    // ==========================================
    // HALAMAN 3: LAMPIRAN BARANG, PANITIA & RUNDOWN
    // ==========================================
    const incPanitia = document.getElementById('spz_inc_lampiran_panitia') ? document.getElementById('spz_inc_lampiran_panitia').checked : true;

    pagesHtml += `
        <div class="spz-sheet-badge print:hidden">
            <span class="text-[10px] font-mono text-neutral-400 uppercase font-bold tracking-wider">Halaman 3 &bull; Lampiran Kegiatan</span>
            <span class="text-[10px] font-mono text-neutral-400 font-bold">3 / ${totalPages}</span>
        </div>
        <div class="spz-page-sheet" data-page="3">
            ${watermarkHtml}
            <div style="position: relative; z-index: 2;">
                ${spzKop}
                <div class="spz-body-container" style="padding-left: 9mm; padding-right: 4mm;">
                    <!-- TABEL 1: BARANG PINJAMAN -->
                    <div style="margin-bottom: 12pt;">
                        <p style="margin: 0 0 4pt 0; font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold;">
                            Lampiran 1: Daftar Barang Pinjaman
                        </p>
                        <table class="spz-border-table">
                            <thead>
                                <tr>
                                    <th style="width: 45px; text-align: center;">No.</th>
                                    <th style="text-align: left;">Nama Sarana / Barang</th>
                                    <th style="width: 140px; text-align: center;">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${spzBarangList.map((b, idx) => `
                                    <tr>
                                        <td style="text-align: center;">${idx + 1}.</td>
                                        <td>${formatInlineRichText(b.nama) || (isWordOrPrint ? 'Barang ' + (idx + 1) : '<span class="preview-placeholder-hint">Barang ' + (idx + 1) + '</span>')}</td>
                                        <td style="text-align: center;">${formatInlineRichText(b.jumlah) || (isWordOrPrint ? '1 Unit' : '<span class="preview-placeholder-hint">1 Unit</span>')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- TABEL 2: KEPANITIAAN (OPSIONAL) -->
                    ${incPanitia ? `
                        <div style="margin-bottom: 12pt;">
                            <p style="margin: 0 0 4pt 0; font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold;">
                                Lampiran 2: Susunan Kepanitiaan
                            </p>
                            <table class="spz-border-table">
                                <thead>
                                    <tr>
                                        <th style="width: 45px; text-align: center;">No.</th>
                                        <th style="text-align: left;">Nama Panitia</th>
                                        <th style="width: 130px; text-align: center;">NIM</th>
                                        <th style="width: 140px; text-align: center;">Program Studi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${spzPanitiaList.map((p, idx) => `
                                        <tr>
                                            <td style="text-align: center;">${idx + 1}.</td>
                                            <td>${formatInlineRichText(p.nama) || (isWordOrPrint ? 'Nama Panitia ' + (idx + 1) : '<span class="preview-placeholder-hint">Nama Panitia ' + (idx + 1) + '</span>')}</td>
                                            <td style="text-align: center; font-family: 'Times New Roman', serif;">${formatInlineRichText(p.nim) || (isWordOrPrint ? 'NIM. XXXXXXXXX' : '<span class="preview-placeholder-hint">NIM. XXXXXXXXX</span>')}</td>
                                            <td style="text-align: center;">${formatInlineRichText(p.prodi) || (isWordOrPrint ? 'Prodi XXX' : '<span class="preview-placeholder-hint">Prodi XXX</span>')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}

                    <!-- TABEL 3: SUSUNAN KEGIATAN / RUNDOWN -->
                    <div style="margin-bottom: 12pt;">
                        <p style="margin: 0 0 4pt 0; font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold;">
                            Lampiran ${incPanitia ? '3' : '2'}: Susunan Acara / Rundown
                        </p>
                        <table class="spz-border-table">
                            <thead>
                                <tr>
                                    <th style="width: 45px; text-align: center;">No.</th>
                                    <th style="width: 170px; text-align: center;">Waktu</th>
                                    <th style="text-align: left;">Nama Agenda / Kegiatan</th>
                                    <th style="width: 150px; text-align: center;">PJ / Pengisi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${spzRundownList.map((r, idx) => `
                                    <tr>
                                        <td style="text-align: center;">${idx + 1}.</td>
                                        <td style="text-align: center; font-family: 'Times New Roman', serif;">${formatInlineRichText(r.waktu) || (isWordOrPrint ? '08.00 – 09.00 WIB' : '<span class="preview-placeholder-hint">08.00 – 09.00 WIB</span>')}</td>
                                        <td>${formatInlineRichText(r.nama) || (isWordOrPrint ? 'Agenda ' + (idx + 1) : '<span class="preview-placeholder-hint">Agenda ' + (idx + 1) + '</span>')}</td>
                                        <td style="text-align: center;">${formatInlineRichText(r.pj) || (isWordOrPrint ? 'PJ Acara' : '<span class="preview-placeholder-hint">PJ Acara</span>')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    currentPageNum++;

    // ==========================================
    // HALAMAN 4: LEMBAR PERSETUJUAN SUBBAG UMUM (TERKUNCI TEKS RESMI KAMPUS)
    // ==========================================
    if (incSubbag) {
        pagesHtml += `
            <div class="spz-sheet-badge print:hidden">
                <span class="text-[10px] font-mono text-neutral-400 uppercase font-bold tracking-wider">Halaman ${currentPageNum} &bull; Lembar Persetujuan Subbag Umum</span>
                <span class="text-[10px] font-mono text-neutral-400 font-bold">${currentPageNum} / ${totalPages}</span>
            </div>
            <div class="spz-page-sheet" data-page="${currentPageNum}">
                ${watermarkHtml}
                <div style="position: relative; z-index: 2;">
                    ${spzKop}
                    <div class="spz-body-container" style="padding-left: 9mm; padding-right: 4mm;">
                        <p style="margin: 16pt 0 14pt 0; text-align: justify; text-indent: 1.25cm; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5;">
                            Dengan dikeluarkannya surat ini, Kepala Subbagian Umum Politeknik Negeri Media Kreatif menyetujui untuk memfasilitasi pengajuan peminjaman pada:
                        </p>

                        <table style="margin: 0 0 12pt 1.25cm; border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.45;">
                            <tr class="preview-editable" data-edit-target="field_nomor_urut" data-edit-label="Nomor Surat" data-edit-type="nomor_surat" title="Klik untuk edit Nomor Surat">
                                <td style="width: 165px; vertical-align: top; padding: 1.5pt 0;">Nomor Surat</td>
                                <td style="width: 18px; vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                                <td style="vertical-align: top; padding: 1.5pt 0;">${formatInlineRichText(noSurat)}</td>
                            </tr>
                            <tr class="preview-editable" data-edit-target="${rawFasilitas ? 'spz_input_fasilitas' : 'field_perihal'}" data-edit-label="${rawFasilitas ? 'Fasilitas Peminjaman' : 'Perihal Surat'}" data-edit-type="text" title="Klik untuk edit Perihal">
                                <td style="width: 165px; vertical-align: top; padding: 1.5pt 0;">Perihal</td>
                                <td style="width: 18px; vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                                <td style="vertical-align: top; padding: 1.5pt 0;">${formatInlineRichText(perihal)}</td>
                            </tr>
                            <tr class="preview-editable" data-edit-target="field_hari_tanggal" data-edit-label="Tanggal Pelaksanaan" data-edit-type="text" title="Klik untuk edit Tanggal Pelaksanaan">
                                <td style="width: 165px; vertical-align: top; padding: 1.5pt 0;">Tanggal</td>
                                <td style="width: 18px; vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                                <td style="vertical-align: top; padding: 1.5pt 0;">${formatInlineRichText(hariTanggal)}</td>
                            </tr>
                            <tr class="preview-editable" data-edit-target="field_ttd1_nama" data-edit-label="Nama Ketua Pelaksana" data-edit-type="text" title="Klik untuk edit Ketua Pelaksana">
                                <td style="width: 165px; vertical-align: top; padding: 1.5pt 0;">Ketua Pelaksana</td>
                                <td style="width: 18px; vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                                <td style="vertical-align: top; padding: 1.5pt 0;">${formatInlineRichText(ttd1Nama)}</td>
                            </tr>
                            <tr class="preview-editable" data-edit-target="spz_no_hp" data-edit-label="No. WhatsApp / HP" data-edit-type="text" title="Klik untuk edit No HP">
                                <td style="width: 165px; vertical-align: top; padding: 1.5pt 0;">Nomor Handphone</td>
                                <td style="width: 18px; vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                                <td style="vertical-align: top; padding: 1.5pt 0;">${formatInlineRichText(noHp)}</td>
                            </tr>
                        </table>

                        <p style="margin: 0 0 6pt 0; text-align: justify; text-indent: 1.25cm; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5;">
                            Hal – hal terkait penggunaan sarana dan prasarana, dapat dijaga dan disepakati<br>bersama atas peraturan sebagai berikut :
                        </p>

                        <!-- DAFTAR 11 PERATURAN RESMI (TABEL 12PT) -->
                        <table style="margin-left: 1.25cm; width: calc(100% - 1.25cm); border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.45; margin-bottom: 12pt;">
                            <tr>
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">1.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Tidak boleh ada yang merokok disetiap ruangan yang dipakai acara<br>sampai selesai acara.</td>
                            </tr>
                            <tr>
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">2.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Segala kerusakan fasilitas yang ada di ruangan maupun yang dipinjam<br>menjadi tanggung jawab peminjam atau pemakai ruangan.</td>
                            </tr>
                            <tr>
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">3.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Jaga kebersihan tempat yang dipakai dari awal kegiatan sampai selesai kegiatan.</td>
                            </tr>
                            <tr>
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">4.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Wajib koordinasi dan lapor dengan komandan satpam dan regu satpam.</td>
                            </tr>
                            <tr>
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">5.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Penyerahan SPZ maksimal H-3 sebelum acara, sudah ada di ruang sub tim umum.</td>
                            </tr>
                            <tr class="preview-editable" data-edit-target="spz_batas_waktu" data-edit-label="Batas Waktu Kegiatan" data-edit-type="text" title="Klik untuk edit Batas Waktu">
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">6.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Waktu kegiatan maksimal ${formatInlineRichText(batasWaktu)}</td>
                            </tr>
                            <tr>
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">7.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Dilarang menginap di dalam kelas dan sekitar lingkungan kampus.</td>
                            </tr>
                            <tr>
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">8.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Dilarang merubah susunan meja dan kursi dan sarana yang lain.</td>
                            </tr>
                            <tr>
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">9.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Segala kerusakan dan kehilangan menjadi tanggung jawab pihak peminjam.</td>
                            </tr>
                            <tr>
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">10.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Dilarang mencoret – coret di tempat yang tidak semestinya tanpa persetujuan.</td>
                            </tr>
                            <tr>
                                <td style="width: 28px; vertical-align: top; padding: 1.5pt 0;">11.</td>
                                <td style="vertical-align: top; text-align: justify; padding: 1.5pt 0;">Segala bentuk pelanggaran akan dikenakan sanksi sesuai peraturan tata<br>tertib yang berlaku di Kampus PoliMedia.</td>
                            </tr>
                        </table>

                        <div style="margin-left: auto; width: 280px; text-align: center; margin-top: 10pt; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.35;">
                            <p style="margin: 0;">${formatInlineRichText(tanggalSurat)}</p>
                            <p style="margin: 0;">Kepala Subbagian Umum<br><br><br><br><br></p>
                            <p style="margin: 0; font-weight: bold; text-decoration: underline;">${prof.subbag_nama || 'Runny Wachyuni, S.Pd., M.M.'}</p>
                            <p style="margin: 0;">NIP. ${prof.subbag_nip || '198106172005012004'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    return pagesHtml;
}
