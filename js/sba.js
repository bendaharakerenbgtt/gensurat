/**
 * GenSurat - sba.js
 * Dedicated Data, Editors, and Multi-Page A4 Letter Renderer for Surat Berita Acara (SBA).
 */

const DEFAULT_SBA_RUNDOWN = [
    { no: '1.', rangkaian: 'Registrasi Peserta & Pembukaan', waktu: '08.00 – 08.30 WIB', pj: 'Divisi Acara' },
    { no: '2.', rangkaian: 'Penyampaian Materi / Diskusi Pokok', waktu: '08.30 – 11.30 WIB', pj: 'Pemateri / Moderator' },
    { no: '3.', rangkaian: 'Evaluasi & Penutupan Kegiatan', waktu: '11.30 – 12.00 WIB', pj: 'Ketua Pelaksana' }
];

const DEFAULT_SBA_PRESTASI = [
    { nama: '', nim: '', prodi: '', kategori: '', capaian: '' }
];

const DEFAULT_SBA_PEMASUKAN = [
    { uraian: 'Kas Organisasi', nominal: 500000 },
    { uraian: 'Iuran Peserta Kegiatan', nominal: 350000 }
];

const DEFAULT_SBA_PENGELUARAN = [
    {
        nama: 'BELANJA PERLENGKAPAN & KONSUMSI',
        divisi: [
            {
                nama: 'Divisi Perlengkapan',
                items: [
                    { uraian: 'Sewa Sound System & Mic', volume: '1', satuan: 'Paket', harga: 250000, total: 250000 },
                    { uraian: 'Baterai Mic Wireless & Lakban', volume: '2', satuan: 'Pcs', harga: 25000, total: 50000 }
                ]
            },
            {
                nama: 'Divisi Konsumsi',
                items: [
                    { uraian: 'Snack Box Peserta & Tamu', volume: '30', satuan: 'Kotak', harga: 15000, total: 450000 }
                ]
            }
        ]
    }
];

let sbaRundownList = JSON.parse(JSON.stringify(DEFAULT_SBA_RUNDOWN));
let sbaPrestasiList = JSON.parse(JSON.stringify(DEFAULT_SBA_PRESTASI));
let sbaPemasukanList = JSON.parse(JSON.stringify(DEFAULT_SBA_PEMASUKAN));
let sbaPengeluaranCategories = JSON.parse(JSON.stringify(DEFAULT_SBA_PENGELUARAN));
let sbaNotaList = [];
let sbaDokList = [];

let sbaJenisKegiatan = 'Program Kerja'; // atau 'Agenda Kerja'

// ==========================================
// SBA EDITORS: RUNDOWN
// ==========================================
function renderSbaRundownEditor() {
    const container = document.getElementById('sba_rundown_editor_rows');
    if (!container) return;

    let html = '';
    sbaRundownList.forEach((r, idx) => {
        html += `
            <div class="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2" data-idx="${idx}">
                <div class="flex items-center justify-between text-[11px]">
                    <span class="font-mono text-neutral-400 font-bold">Rundown Agenda #${idx + 1}</span>
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="setRundownUntilFinish('SBA', ${idx})" class="text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded bg-neutral-800" title="Format sampai selesai">s/d Selesai</button>
                        <button type="button" onclick="removeSbaRundownRow(${idx})" class="text-neutral-500 hover:text-red-400 p-1" title="Hapus"><i class="fa-solid fa-trash-can text-xs"></i></button>
                    </div>
                </div>
                <div class="grid grid-cols-12 gap-2">
                    <div class="col-span-5">
                        <input type="text" value="${escapeHtml(r.waktu || '')}" onblur="autoFormatRundownTimeOnBlur('SBA', ${idx}, this)" oninput="updateSbaRundownField(${idx}, 'waktu', this.value)" placeholder="Waktu (08.00 – 09.00 WIB)" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-neutral-400">
                    </div>
                    <div class="col-span-4">
                        <input type="text" value="${escapeHtml(r.rangkaian || '')}" oninput="updateSbaRundownField(${idx}, 'rangkaian', this.value)" placeholder="Rangkaian Kegiatan" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400">
                    </div>
                    <div class="col-span-3">
                        <input type="text" value="${escapeHtml(r.pj || '')}" oninput="updateSbaRundownField(${idx}, 'pj', this.value)" placeholder="PJ / Pengisi" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400">
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function addSbaRundownRow() {
    sbaRundownList.push({ no: `${sbaRundownList.length + 1}.`, rangkaian: '', waktu: '', pj: '' });
    renderSbaRundownEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function removeSbaRundownRow(idx) {
    if (sbaRundownList.length <= 1) {
        sbaRundownList = [{ no: '1.', rangkaian: '', waktu: '', pj: '' }];
    } else {
        sbaRundownList.splice(idx, 1);
    }
    // Re-index
    sbaRundownList.forEach((r, i) => r.no = `${i + 1}.`);
    renderSbaRundownEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function updateSbaRundownField(idx, field, val) {
    if (sbaRundownList[idx]) {
        sbaRundownList[idx][field] = val;
        if (typeof updatePreview === 'function') updatePreview();
    }
}

// ==========================================
// SBA EDITORS: PRESTASI / CAPAIAN
// ==========================================
function renderSbaPrestasiEditor() {
    const container = document.getElementById('sba_prestasi_editor_rows');
    if (!container) return;

    let html = '';
    sbaPrestasiList.forEach((p, idx) => {
        html += `
            <div class="grid grid-cols-12 gap-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800 items-center" data-idx="${idx}">
                <div class="col-span-1 text-[10px] font-mono text-neutral-500 text-center">${idx + 1}.</div>
                <div class="col-span-3">
                    <input type="text" value="${escapeHtml(p.nama || '')}" oninput="updateSbaPrestasiField(${idx}, 'nama', this.value)" placeholder="Nama Lengkap" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400">
                </div>
                <div class="col-span-2">
                    <input type="text" value="${escapeHtml(p.nim || '')}" oninput="updateSbaPrestasiField(${idx}, 'nim', this.value)" placeholder="NIM" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 font-mono text-[11px]">
                </div>
                <div class="col-span-2">
                    <input type="text" value="${escapeHtml(p.prodi || '')}" oninput="updateSbaPrestasiField(${idx}, 'prodi', this.value)" placeholder="Prodi" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 text-[11px]">
                </div>
                <div class="col-span-3">
                    <input type="text" value="${escapeHtml(p.capaian || '')}" oninput="updateSbaPrestasiField(${idx}, 'capaian', this.value)" placeholder="Capaian / Prestasi" class="w-full text-xs bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 text-[11px]">
                </div>
                <div class="col-span-1 flex items-center justify-end">
                    <button type="button" onclick="removeSbaPrestasiRow(${idx})" class="text-neutral-500 hover:text-red-400 p-1" title="Hapus"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function addSbaPrestasiRow() {
    sbaPrestasiList.push({ nama: '', nim: '', prodi: '', kategori: '', capaian: '' });
    renderSbaPrestasiEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function removeSbaPrestasiRow(idx) {
    if (sbaPrestasiList.length <= 1) {
        sbaPrestasiList = [{ nama: '', nim: '', prodi: '', kategori: '', capaian: '' }];
    } else {
        sbaPrestasiList.splice(idx, 1);
    }
    renderSbaPrestasiEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function updateSbaPrestasiField(idx, field, val) {
    if (sbaPrestasiList[idx]) {
        sbaPrestasiList[idx][field] = val;
        if (typeof updatePreview === 'function') updatePreview();
    }
}

// ==========================================
// SBA EDITORS: KEUANGAN (PEMASUKAN & PENGELUARAN)
// ==========================================
function renderSbaPemasukanEditor() {
    const container = document.getElementById('sba_pemasukan_editor_rows');
    if (!container) return;

    let html = '';
    sbaPemasukanList.forEach((p, idx) => {
        html += `
            <div class="flex items-center gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800" data-idx="${idx}">
                <span class="text-[10px] font-mono text-neutral-500 w-5 text-center">${idx + 1}.</span>
                <input type="text" value="${escapeHtml(p.uraian || '')}" oninput="updateSbaPemasukanField(${idx}, 'uraian', this.value)" placeholder="Sumber Pemasukan (cth: Kas UKM)" class="text-xs bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 flex-1 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400">
                <div class="relative w-36">
                    <span class="absolute left-2.5 top-1.5 text-xs text-neutral-500">Rp</span>
                    <input type="number" value="${p.nominal || ''}" oninput="updateSbaPemasukanField(${idx}, 'nominal', this.value)" placeholder="0" class="text-xs bg-neutral-950 border border-neutral-800 rounded pl-8 pr-2 py-1.5 w-full text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 text-right">
                </div>
                <button type="button" onclick="removeSbaPemasukanRow(${idx})" class="text-neutral-500 hover:text-red-400 p-1.5" title="Hapus"><i class="fa-solid fa-trash-can text-xs"></i></button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function addSbaPemasukanRow() {
    sbaPemasukanList.push({ uraian: '', nominal: 0 });
    renderSbaPemasukanEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function removeSbaPemasukanRow(idx) {
    if (sbaPemasukanList.length <= 1) {
        sbaPemasukanList = [{ uraian: '', nominal: 0 }];
    } else {
        sbaPemasukanList.splice(idx, 1);
    }
    renderSbaPemasukanEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function updateSbaPemasukanField(idx, field, val) {
    if (sbaPemasukanList[idx]) {
        sbaPemasukanList[idx][field] = field === 'nominal' ? parseFloat(val) || 0 : val;
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function renderSbaPengeluaranEditor() {
    const container = document.getElementById('sba_pengeluaran_categories_container');
    if (!container) return;

    let html = '';
    sbaPengeluaranCategories.forEach((cat, catIdx) => {
        let divisiHtml = '';
        (cat.divisi || []).forEach((div, divIdx) => {
            let itemsHtml = '';
            (div.items || []).forEach((it, itIdx) => {
                const totalItem = (parseFloat(it.volume) || 1) * (parseFloat(it.harga) || 0);
                itemsHtml += `
                    <tr class="text-xs border-b border-neutral-800/60">
                        <td class="p-1.5 text-center text-neutral-500">${itIdx + 1}.</td>
                        <td class="p-1.5">
                            <input type="text" value="${escapeHtml(it.uraian || '')}" oninput="updateSbaDivisiItemField(${divIdx}, ${itIdx}, 'uraian', this.value, ${catIdx})" placeholder="Nama Item / Belanja" class="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 text-xs">
                        </td>
                        <td class="p-1.5 w-16">
                            <input type="number" value="${it.volume || 1}" oninput="updateSbaDivisiItemField(${divIdx}, ${itIdx}, 'volume', this.value, ${catIdx})" class="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center text-xs">
                        </td>
                        <td class="p-1.5 w-20">
                            <input type="text" value="${escapeHtml(it.satuan || 'Pcs')}" oninput="updateSbaDivisiItemField(${divIdx}, ${itIdx}, 'satuan', this.value, ${catIdx})" class="w-full bg-neutral-950 border border-neutral-800 rounded px-1.5 py-1 text-white text-center text-xs">
                        </td>
                        <td class="p-1.5 w-28">
                            <input type="number" value="${it.harga || 0}" oninput="updateSbaDivisiItemField(${divIdx}, ${itIdx}, 'harga', this.value, ${catIdx})" class="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-right text-xs">
                        </td>
                        <td class="p-1.5 w-28 text-right font-mono text-white text-xs">
                            ${formatRupiah(totalItem)}
                        </td>
                        <td class="p-1.5 w-10 text-center">
                            <button type="button" onclick="removeSbaDivisiItem(${divIdx}, ${itIdx}, ${catIdx})" class="text-neutral-500 hover:text-red-400 p-1" title="Hapus"><i class="fa-solid fa-trash-can text-xs"></i></button>
                        </td>
                    </tr>
                `;
            });

            divisiHtml += `
                <div class="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 space-y-2 mb-2">
                    <div class="flex items-center justify-between">
                        <input type="text" value="${escapeHtml(div.nama || '')}" oninput="updateSbaDivisiNama(${divIdx}, this.value, ${catIdx})" placeholder="Nama Divisi (cth: Divisi Perlengkapan)" class="text-xs font-bold bg-transparent border-b border-dashed border-neutral-700 text-orange-400 px-1 py-0.5 focus:outline-none focus:border-orange-400 w-64">
                        <div class="flex items-center gap-1.5">
                            <button type="button" onclick="addSbaDivisiItem(${divIdx}, ${catIdx})" class="text-[10px] text-neutral-300 hover:text-white px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 flex items-center gap-1"><i class="fa-solid fa-plus text-[9px]"></i> Tambah Item</button>
                            <button type="button" onclick="removeSbaDivisi(${divIdx}, ${catIdx})" class="text-neutral-500 hover:text-red-400 p-1" title="Hapus Divisi"><i class="fa-solid fa-trash-can text-xs"></i></button>
                        </div>
                    </div>
                    <table class="w-full">
                        <thead>
                            <tr class="text-[10px] font-mono text-neutral-400 border-b border-neutral-800">
                                <th class="p-1 text-center w-8">No</th>
                                <th class="p-1 text-left">Uraian</th>
                                <th class="p-1 text-center w-16">Vol</th>
                                <th class="p-1 text-center w-20">Satuan</th>
                                <th class="p-1 text-right w-28">Harga</th>
                                <th class="p-1 text-right w-28">Total</th>
                                <th class="p-1 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        });

        html += `
            <div class="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3 mb-3">
                <div class="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <input type="text" value="${escapeHtml(cat.nama || '')}" oninput="updateSbaCategoryNama(${catIdx}, this.value)" placeholder="Nama Kategori (cth: BELANJA PERLENGKAPAN)" class="text-xs font-black bg-transparent border-b border-neutral-700 text-white px-1 py-0.5 focus:outline-none focus:border-white w-72 uppercase tracking-wide">
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="addSbaDivisi(${catIdx})" class="text-[11px] text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center gap-1"><i class="fa-solid fa-folder-plus text-[10px]"></i> Tambah Divisi</button>
                        <button type="button" onclick="removeSbaCategory(${catIdx})" class="text-neutral-500 hover:text-red-400 p-1" title="Hapus Kategori"><i class="fa-solid fa-trash-can text-xs"></i></button>
                    </div>
                </div>
                ${divisiHtml}
            </div>
        `;
    });
    container.innerHTML = html;
}

function updateSbaCategoryNama(catIdx, val) {
    if (sbaPengeluaranCategories[catIdx]) {
        sbaPengeluaranCategories[catIdx].nama = val;
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function addSbaCategory(nama = 'KATEGORI BELANJA BARU') {
    sbaPengeluaranCategories.push({
        nama,
        divisi: [
            {
                nama: 'Divisi Baru',
                items: [
                    { uraian: '', volume: '1', satuan: 'Pcs', harga: 0, total: 0 }
                ]
            }
        ]
    });
    renderSbaPengeluaranEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function removeSbaCategory(catIdx) {
    if (sbaPengeluaranCategories.length <= 1) {
        sbaPengeluaranCategories = [{
            nama: 'BELANJA PERLENGKAPAN & KONSUMSI',
            divisi: [{ nama: 'Divisi Perlengkapan', items: [{ uraian: '', volume: '1', satuan: 'Pcs', harga: 0, total: 0 }] }]
        }];
    } else {
        sbaPengeluaranCategories.splice(catIdx, 1);
    }
    renderSbaPengeluaranEditor();
    if (typeof updatePreview === 'function') updatePreview();
}

function addSbaDivisi(catIdx = 0) {
    if (sbaPengeluaranCategories[catIdx]) {
        sbaPengeluaranCategories[catIdx].divisi.push({
            nama: 'Divisi Baru',
            items: [{ uraian: '', volume: '1', satuan: 'Pcs', harga: 0, total: 0 }]
        });
        renderSbaPengeluaranEditor();
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function removeSbaDivisi(divIdx, catIdx = 0) {
    if (sbaPengeluaranCategories[catIdx]) {
        sbaPengeluaranCategories[catIdx].divisi.splice(divIdx, 1);
        if (sbaPengeluaranCategories[catIdx].divisi.length === 0) {
            sbaPengeluaranCategories[catIdx].divisi.push({
                nama: 'Divisi Baru',
                items: [{ uraian: '', volume: '1', satuan: 'Pcs', harga: 0, total: 0 }]
            });
        }
        renderSbaPengeluaranEditor();
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function updateSbaDivisiNama(divIdx, val, catIdx = 0) {
    if (sbaPengeluaranCategories[catIdx] && sbaPengeluaranCategories[catIdx].divisi[divIdx]) {
        sbaPengeluaranCategories[catIdx].divisi[divIdx].nama = val;
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function addSbaDivisiItem(divIdx, catIdx = 0) {
    if (sbaPengeluaranCategories[catIdx] && sbaPengeluaranCategories[catIdx].divisi[divIdx]) {
        sbaPengeluaranCategories[catIdx].divisi[divIdx].items.push({
            uraian: '', volume: '1', satuan: 'Pcs', harga: 0, total: 0
        });
        renderSbaPengeluaranEditor();
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function removeSbaDivisiItem(divIdx, itIdx, catIdx = 0) {
    if (sbaPengeluaranCategories[catIdx] && sbaPengeluaranCategories[catIdx].divisi[divIdx]) {
        sbaPengeluaranCategories[catIdx].divisi[divIdx].items.splice(itIdx, 1);
        if (sbaPengeluaranCategories[catIdx].divisi[divIdx].items.length === 0) {
            sbaPengeluaranCategories[catIdx].divisi[divIdx].items.push({
                uraian: '', volume: '1', satuan: 'Pcs', harga: 0, total: 0
            });
        }
        renderSbaPengeluaranEditor();
        if (typeof updatePreview === 'function') updatePreview();
    }
}

function updateSbaDivisiItemField(divIdx, itIdx, field, val, catIdx = 0) {
    if (sbaPengeluaranCategories[catIdx] && sbaPengeluaranCategories[catIdx].divisi[divIdx] && sbaPengeluaranCategories[catIdx].divisi[divIdx].items[itIdx]) {
        const item = sbaPengeluaranCategories[catIdx].divisi[divIdx].items[itIdx];
        item[field] = val;
        item.total = (parseFloat(item.volume) || 1) * (parseFloat(item.harga) || 0);
        renderSbaPengeluaranEditor();
        if (typeof updatePreview === 'function') updatePreview();
    }
}

// ==========================================
// SBA EDITORS: NOTA & DOKUMENTASI GALLERY
// ==========================================
function renderSbaNotaGallery() {
    const container = document.getElementById('sba_nota_gallery_grid');
    if (!container) return;

    if (sbaNotaList.length === 0) {
        container.innerHTML = `
            <div class="col-span-12 p-6 text-center rounded-xl border border-dashed border-neutral-800 text-neutral-500">
                <i class="fa-solid fa-receipt text-2xl mb-2 block"></i>
                <p class="text-xs">Belum ada nota yang diunggah.</p>
                <p class="text-[10px] text-neutral-600 mt-0.5">Unggah foto bukti belanja untuk ditampilkan di lampiran nota.</p>
            </div>
        `;
        return;
    }

    let html = '';
    sbaNotaList.forEach((nota, idx) => {
        html += `
            <div class="relative group rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 aspect-3/4 flex flex-col justify-between" data-idx="${idx}">
                <img src="${nota.src}" alt="${escapeHtml(nota.title || 'Nota')}" class="w-full h-full object-cover">
                <div class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                    <span class="text-[10px] text-white font-medium truncate">${escapeHtml(nota.title || `Nota #${idx + 1}`)}</span>
                    <button type="button" onclick="removeSbaNotaItem(${idx})" class="text-neutral-400 hover:text-red-400 p-1" title="Hapus"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function handleSbaNotaUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            sbaNotaList.push({
                title: file.name.replace(/\.[^/.]+$/, ''),
                src: e.target.result
            });
            renderSbaNotaGallery();
            if (typeof updatePreview === 'function') updatePreview();
        };
        reader.readAsDataURL(file);
    });
}

function removeSbaNotaItem(idx) {
    sbaNotaList.splice(idx, 1);
    renderSbaNotaGallery();
    if (typeof updatePreview === 'function') updatePreview();
}

function clearAllSbaNotas() {
    sbaNotaList = [];
    renderSbaNotaGallery();
    if (typeof updatePreview === 'function') updatePreview();
}

function renderSbaDokumentasiGallery() {
    const container = document.getElementById('sba_dok_gallery_grid');
    if (!container) return;

    if (sbaDokList.length === 0) {
        container.innerHTML = `
            <div class="col-span-12 p-6 text-center rounded-xl border border-dashed border-neutral-800 text-neutral-500">
                <i class="fa-solid fa-camera text-2xl mb-2 block"></i>
                <p class="text-xs">Belum ada foto dokumentasi yang diunggah.</p>
                <p class="text-[10px] text-neutral-600 mt-0.5">Unggah foto kegiatan untuk ditampilkan di lembar dokumentasi.</p>
            </div>
        `;
        return;
    }

    let html = '';
    sbaDokList.forEach((dok, idx) => {
        html += `
            <div class="relative group rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 aspect-4/3 flex flex-col justify-between" data-idx="${idx}">
                <img src="${dok.src}" alt="${escapeHtml(dok.caption || 'Dokumentasi')}" class="w-full h-full object-cover">
                <div class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                    <span class="text-[10px] text-white font-medium truncate">${escapeHtml(dok.caption || `Foto #${idx + 1}`)}</span>
                    <button type="button" onclick="removeSingleSbaDok(${idx})" class="text-neutral-400 hover:text-red-400 p-1" title="Hapus"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function handleSbaDokumentasiUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            sbaDokList.push({
                caption: file.name.replace(/\.[^/.]+$/, ''),
                src: e.target.result
            });
            renderSbaDokumentasiGallery();
            if (typeof updatePreview === 'function') updatePreview();
        };
        reader.readAsDataURL(file);
    });
}

function removeSingleSbaDok(idx) {
    sbaDokList.splice(idx, 1);
    renderSbaDokumentasiGallery();
    if (typeof updatePreview === 'function') updatePreview();
}

function clearAllSbaDokumentasi() {
    sbaDokList = [];
    renderSbaDokumentasiGallery();
    if (typeof updatePreview === 'function') updatePreview();
}

// ==========================================
// SBA PAGES STRUCTURE (For Navigation & Tabs)
// ==========================================
function getSbaPagesStructure() {
    const pages = [
        { id: 1, key: 'pokok', label: 'Hal 1: Berita Acara', icon: 'fa-clipboard-check', desc: 'Identitas & Pokok Berita Acara' },
        { id: 2, key: 'rundown', label: 'Hal 2: Hasil Kegiatan', icon: 'fa-table-list', desc: 'Realisasi Susunan Acara' }
    ];

    let pageId = 3;

    // Output & Prestasi
    const incPrestasi = document.getElementById('sba_inc_prestasi') ? document.getElementById('sba_inc_prestasi').checked : true;
    if (incPrestasi) {
        pages.push({ id: pageId, key: 'output_eval', label: `Hal ${pageId}: Output & Prestasi`, icon: 'fa-award', desc: 'Output & Prestasi Peserta' });
        pageId++;
    }

    // Hambatan & Evaluasi
    pages.push({ id: pageId, key: 'hambatan', label: `Hal ${pageId}: Evaluasi`, icon: 'fa-triangle-exclamation', desc: 'Hambatan & Evaluasi' });
    pageId++;

    // Laporan Keuangan
    const incKeuangan = document.getElementById('sba_inc_keuangan') ? document.getElementById('sba_inc_keuangan').checked : true;
    if (incKeuangan) {
        pages.push({ id: pageId, key: 'keuangan', label: `Hal ${pageId}: Keuangan`, icon: 'fa-wallet', desc: 'Laporan Belanja & Rekapitulasi' });
        pageId++;
    }

    // Lembar Pengesahan
    pages.push({ id: pageId, key: 'pengesahan', label: `Hal ${pageId}: Pengesahan`, icon: 'fa-signature', desc: 'Lembar Tanda Tangan' });
    pageId++;

    // Lampiran Nota
    const incNota = document.getElementById('sba_inc_nota') ? document.getElementById('sba_inc_nota').checked : true;
    if (incNota) {
        pages.push({ id: pageId, key: 'nota', label: `Hal ${pageId}: Lampiran Nota`, icon: 'fa-receipt', desc: 'Lampiran Bukti Nota' });
        pageId++;
    }

    // Lampiran Dokumentasi
    const incDok = document.getElementById('sba_inc_dok') ? document.getElementById('sba_inc_dok').checked : true;
    if (incDok) {
        pages.push({ id: pageId, key: 'dok', label: `Hal ${pageId}: Dokumentasi`, icon: 'fa-camera', desc: 'Foto Dokumentasi Acara' });
    }

    return pages;
}

// ==========================================
// SBA FULL A4 LETTER RENDERER
// ==========================================
function renderSbaLetterHtml(isWordOrPrint = false) {
    const prof = getCurrentDocumentProfile();

    const rawNoSurat = (document.getElementById('field_nomor_surat')?.value || '').trim();
    const noSurat = rawNoSurat || `001/SBA/${prof.org_kode_surat || 'XXX/XXX'}/${getRomanMonth(new Date())}/${new Date().getFullYear()}`;

    const rawLamp = (document.getElementById('field_lampiran')?.value || '').trim();
    const lampiran = rawLamp || 'Terlampir';

    const rawNamaAcara = (document.getElementById('field_nama_acara')?.value || '').trim();
    const namaAcara = rawNamaAcara || 'Nama Kegiatan XXX';

    const perihal = document.getElementById('field_perihal')?.value.trim() || `Surat Berita Acara ${namaAcara}`;
    const tanggalSurat = document.getElementById('field_tanggal_surat')?.value.trim() || `Jakarta, ${formatIndoDate(new Date())}`;
    const hariTanggal = document.getElementById('field_hari_tanggal')?.value.trim() || 'Hari, Tanggal Bulan Tahun';
    const waktu = document.getElementById('field_waktu')?.value.trim() || '08.00 s/d 13.00 WIB';
    const tempat = document.getElementById('field_tempat')?.value.trim() || 'Lokasi Kegiatan / Ruangan Kampus';

    const rawPembuka = (document.getElementById('field_pembuka')?.value || '').trim();
    const defaultPembuka = `Melalui surat ini kami sampaikan bahwa **${prof.org_wadah || 'Unit Kegiatan Mahasiswa'} ${prof.org_nama || 'Organisasi XXX'}** ${prof.kampus_nama || 'Politeknik Negeri Media Kreatif'} telah melaksanakan kegiatan **${namaAcara}** pada:`;
    const pembuka = rawPembuka || defaultPembuka;

    const rawIsiInti = (document.getElementById('field_isi_inti')?.value || '').trim();
    const isiInti = rawIsiInti || 'Kegiatan ini diselenggarakan dalam rangka mencapai target program kerja organisasi dan menghasilkan capaian-capaian strategis sebagaimana diuraikan dalam berita acara ini.';

    // Pejabat
    const isTtd1Active = document.getElementById('field_ttd1_active') ? document.getElementById('field_ttd1_active').checked : true;
    let ttd1Jabatan = (document.getElementById('field_ttd1_jabatan')?.value || '').trim() || 'Ketua Pelaksana';
    const ttd1Nama = (document.getElementById('field_ttd1_nama')?.value || '').trim() || (isWordOrPrint ? 'Nama Ketua Pelaksana' : '<span class="preview-placeholder-hint">Nama Ketua Pelaksana</span>');
    const ttd1Nim = (document.getElementById('field_ttd1_nim')?.value || '').trim() || (isWordOrPrint ? 'NIM. XXXXXXXXX' : '<span class="preview-placeholder-hint">NIM. XXXXXXXXX</span>');

    const isTtd2Active = document.getElementById('field_ttd2_active') ? document.getElementById('field_ttd2_active').checked : true;
    let ttd2Jabatan = (document.getElementById('field_ttd2_jabatan')?.value || '').trim() || (prof.ketua_org_jabatan || 'Ketua Organisasi');
    const ttd2Nama = (document.getElementById('field_ttd2_nama')?.value || '').trim() || prof.ketua_org_nama || (isWordOrPrint ? 'Nama Ketua Organisasi' : '<span class="preview-placeholder-hint">Nama Ketua Organisasi</span>');
    const ttd2Nim = (document.getElementById('field_ttd2_nim')?.value || '').trim() || prof.ketua_org_nim || (isWordOrPrint ? 'NIM. XXXXXXXXX' : '<span class="preview-placeholder-hint">NIM. XXXXXXXXX</span>');

    const isTtd3Active = document.getElementById('field_ttd3_active') ? document.getElementById('field_ttd3_active').checked : true;
    let ttd3Jabatan = (document.getElementById('field_ttd3_jabatan')?.value || '').trim() || (prof.dosen_pembina_jabatan || 'Dosen Pembina');
    const ttd3Nama = (document.getElementById('field_ttd3_nama')?.value || '').trim() || prof.dosen_pembina_nama || (isWordOrPrint ? 'Nama Dosen Pembina' : '<span class="preview-placeholder-hint">Nama Dosen Pembina</span>');
    const ttd3Nim = (document.getElementById('field_ttd3_nim')?.value || '').trim() || prof.dosen_pembina_nip || (isWordOrPrint ? 'NIP. XXXXXXXXXXXXXXXXXX' : '<span class="preview-placeholder-hint">NIP. XXXXXXXXXXXXXXXXXX</span>');

    const isMpmActive = document.getElementById('field_ttd_mpm_active') ? document.getElementById('field_ttd_mpm_active').checked : true;
    let mpmJabatan = (document.getElementById('field_ttd_mpm_jabatan')?.value || '').trim() || (prof.ketua_mpm_jabatan || 'Ketua MPM PoliMedia');
    const mpmNama = (document.getElementById('field_ttd_mpm_nama')?.value || '').trim() || prof.ketua_mpm_nama || (isWordOrPrint ? 'Nama Ketua MPM' : '<span class="preview-placeholder-hint">Nama Ketua MPM</span>');
    const mpmNim = (document.getElementById('field_ttd_mpm_nim')?.value || '').trim() || prof.ketua_mpm_nim || (isWordOrPrint ? 'NIM. XXXXXXXXX' : '<span class="preview-placeholder-hint">NIM. XXXXXXXXX</span>');

    const isBemActive = document.getElementById('field_ttd_bem_active') ? document.getElementById('field_ttd_bem_active').checked : true;
    let bemJabatan = (document.getElementById('field_ttd_bem_jabatan')?.value || '').trim() || (prof.ketua_bem_jabatan || 'Ketua BEM PoliMedia');
    const bemNama = (document.getElementById('field_ttd_bem_nama')?.value || '').trim() || prof.ketua_bem_nama || (isWordOrPrint ? 'Nama Ketua BEM' : '<span class="preview-placeholder-hint">Nama Ketua BEM</span>');
    const bemNim = (document.getElementById('field_ttd_bem_nim')?.value || '').trim() || prof.ketua_bem_nim || (isWordOrPrint ? 'NIM. XXXXXXXXX' : '<span class="preview-placeholder-hint">NIM. XXXXXXXXX</span>');

    const isWadirActive = document.getElementById('field_ttd_wadir_active') ? document.getElementById('field_ttd_wadir_active').checked : true;
    let wadirJabatan = (document.getElementById('field_ttd_wadir_jabatan')?.value || '').trim() || (prof.wadir_jabatan || 'Wakil Direktur Bidang Kemahasiswaan dan Alumni');
    const wadirNama = (document.getElementById('field_ttd_wadir_nama')?.value || '').trim() || prof.wadir_nama || (isWordOrPrint ? 'Nama Wakil Direktur' : '<span class="preview-placeholder-hint">Nama Wakil Direktur</span>');
    const wadirNip = (document.getElementById('field_ttd_wadir_nip')?.value || '').trim() || (prof.wadir_nip ? `NIP. ${prof.wadir_nip}` : (isWordOrPrint ? 'NIP. XXXXXXXXXXXXXXXXXX' : '<span class="preview-placeholder-hint">NIP. XXXXXXXXXXXXXXXXXX</span>'));

    const sbaPages = getSbaPagesStructure();
    const totalPages = sbaPages.length;
    let pagesHtml = '';

    const kopHtml = generateOfficialKopHtml('14pt');
    const watermarkHtml = getOfficialWatermarkHtml('145mm');

    sbaPages.forEach(p => {
        const pageNum = p.id;
        const key = p.key;
        let contentHtml = '';

        if (key === 'pokok') {
            // ==========================================
            // HALAMAN 1: IDENTITAS & POKOK BERITA ACARA
            // ==========================================
            contentHtml = `
                <div style="text-align: right; margin-bottom: 12pt; font-family: 'Times New Roman', serif; font-size: 12pt;">
                    <p style="margin: 0;"><span class="preview-editable" data-edit-target="field_tanggal_surat" data-edit-label="Tanggal Surat" data-edit-type="text" title="Klik untuk edit Tanggal Surat">${formatInlineRichText(tanggalSurat)}</span></p>
                </div>

                <table style="border-collapse: collapse; margin-bottom: 16pt; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.45;">
                    <tr>
                        <td style="width: 75px; vertical-align: top; padding: 1.5pt 0;">Nomor</td>
                        <td style="width: 15px; vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                        <td style="vertical-align: top; padding: 1.5pt 0;"><span class="preview-editable" data-edit-target="field_nomor_urut" data-edit-label="Nomor Surat" data-edit-type="nomor_surat" title="Klik untuk edit Nomor Surat">${formatInlineRichText(noSurat)}</span></td>
                    </tr>
                    <tr>
                        <td style="width: 75px; vertical-align: top; padding: 1.5pt 0;">Hal</td>
                        <td style="width: 15px; vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                        <td style="vertical-align: top; padding: 1.5pt 0;"><span class="preview-editable" data-edit-target="field_perihal" data-edit-label="Perihal Surat" data-edit-type="text" title="Klik untuk edit Perihal">${formatInlineRichText(perihal)}</span></td>
                    </tr>
                    <tr>
                        <td style="width: 75px; vertical-align: top; padding: 1.5pt 0;">Lampiran</td>
                        <td style="width: 15px; vertical-align: top; text-align: center; padding: 1.5pt 0;">:</td>
                        <td style="vertical-align: top; padding: 1.5pt 0;"><span class="preview-editable" data-edit-target="field_lampiran" data-edit-label="Lampiran" data-edit-type="text" title="Klik untuk edit Lampiran">${formatInlineRichText(lampiran)}</span></td>
                    </tr>
                </table>

                <div style="text-align: center; margin-bottom: 16pt; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold; line-height: 1.4;">
                    <p style="margin: 0;">BERITA ACARA</p>
                    <p style="margin: 0;"><span class="preview-editable" data-edit-target="field_nama_acara" data-edit-label="Nama Kegiatan" data-edit-type="text" title="Klik untuk edit Nama Kegiatan">${formatInlineRichText(namaAcara.toUpperCase())}</span></p>
                    <p style="margin: 0;">${escapeHtml(prof.org_wadah || 'UNIT KEGIATAN MAHASISWA')} ${escapeHtml(prof.org_nama || 'NAMA ORGANISASI')}</p>
                </div>

                <div class="preview-editable" data-edit-target="field_pembuka" data-edit-label="Paragraf Pembuka" data-edit-type="textarea" title="Klik untuk edit Paragraf Pembuka">
                    <p style="margin: 0 0 10pt 0; text-align: justify; text-indent: 1.25cm; line-height: 1.5; font-family: 'Times New Roman', serif; font-size: 12pt;">
                        ${formatInlineRichText(pembuka).replace(/\n/g, '<br>')}
                    </p>
                </div>

                <table style="width: calc(100% - 1.25cm); margin-left: 1.25cm; border-collapse: collapse; margin-bottom: 12pt; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.45;">
                    <tr class="preview-editable" data-edit-target="field_hari_tanggal" data-edit-label="Hari & Tanggal" data-edit-type="text" title="Klik untuk edit Hari & Tanggal">
                        <td style="width: 120px; vertical-align: top; padding: 2pt 0;">Hari, tanggal</td>
                        <td style="width: 18px; vertical-align: top; text-align: center; padding: 2pt 0;">:</td>
                        <td style="vertical-align: top; padding: 2pt 0;">${formatInlineRichText(hariTanggal)}</td>
                    </tr>
                    <tr class="preview-editable" data-edit-target="field_waktu" data-edit-label="Waktu Kegiatan" data-edit-type="text" title="Klik untuk edit Waktu">
                        <td style="vertical-align: top; padding: 2pt 0;">Pukul</td>
                        <td style="vertical-align: top; text-align: center; padding: 2pt 0;">:</td>
                        <td style="vertical-align: top; padding: 2pt 0;">${formatInlineRichText(waktu)}</td>
                    </tr>
                    <tr class="preview-editable" data-edit-target="field_tempat" data-edit-label="Tempat Kegiatan" data-edit-type="text" title="Klik untuk edit Tempat">
                        <td style="vertical-align: top; padding: 2pt 0;">Tempat</td>
                        <td style="vertical-align: top; text-align: center; padding: 2pt 0;">:</td>
                        <td style="vertical-align: top; padding: 2pt 0;">${formatInlineRichText(tempat).replace(/\n/g, '<br>')}</td>
                    </tr>
                </table>

                <div class="preview-editable" data-edit-target="field_isi_inti" data-edit-label="Paragraf Isi Inti" data-edit-type="textarea" title="Klik untuk edit Paragraf Isi Inti">
                    <p style="margin: 0 0 10pt 0; text-align: justify; text-indent: 1.25cm; line-height: 1.5; font-family: 'Times New Roman', serif; font-size: 12pt;">
                        ${formatInlineRichText(isiInti).replace(/\n/g, '<br>')}
                    </p>
                </div>
            `;
        } else if (key === 'rundown') {
            // ==========================================
            // HALAMAN 2: REALISASI RUNDOWN KEGIATAN
            // ==========================================
            contentHtml = `
                <div style="margin-bottom: 12pt; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    <p style="margin: 0;">[${formatInlineRichText(noSurat)}]</p>
                </div>

                <p style="margin: 0 0 4pt 0; font-family: 'Times New Roman', serif; font-size: 12pt;">Hasil dan <em>Output</em> Kegiatan <span class="font-bold">${formatInlineRichText(sbaJenisKegiatan)}</span></p>
                <p style="margin: 0 0 10pt 0; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    1. Hasil Kegiatan (Realisasi Rundown Acara)
                </p>

                <table class="spz-border-table">
                    <thead>
                        <tr style="text-align: center; font-weight: bold;">
                            <th style="width: 36px;">No</th>
                            <th style="text-align: left;">Rangkaian Kegiatan</th>
                            <th style="width: 140px;">Waktu</th>
                            <th style="width: 155px;">Penanggung Jawab</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sbaRundownList.map((r, idx) => `
                            <tr>
                                <td style="text-align: center;">${r.no || `${idx + 1}.`}</td>
                                <td>${formatInlineRichText(r.rangkaian) || (isWordOrPrint ? 'Agenda ' + (idx + 1) : '<span class="preview-placeholder-hint">Agenda ' + (idx + 1) + '</span>')}</td>
                                <td style="text-align: center;">${formatInlineRichText(r.waktu) || (isWordOrPrint ? '08.00 – 09.00 WIB' : '<span class="preview-placeholder-hint">08.00 – 09.00 WIB</span>')}</td>
                                <td style="text-align: center;">${formatInlineRichText(r.pj) || (isWordOrPrint ? 'PJ Acara' : '<span class="preview-placeholder-hint">PJ Acara</span>')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else if (key === 'output_eval') {
            // ==========================================
            // HALAMAN 3: OUTPUT & PRESTASI PESERTA
            // ==========================================
            const outputText = (document.getElementById('sba_output_kegiatan')?.value || '').trim() ||
                '1. Terlaksananya seluruh rangkaian program kerja sesuai dengan perencanaan.\n2. Terjalinnya koordinasi dan sinergi yang solid antar divisi panitia.\n3. Peserta mendapatkan wawasan dan keterampilan praktis yang aplikatif.';

            contentHtml = `
                <div style="margin-bottom: 12pt; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    <p style="margin: 0;">[${formatInlineRichText(noSurat)}]</p>
                </div>

                <p style="margin: 0 0 10pt 0; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    2. <em>Output</em> Kegiatan
                </p>

                <div class="preview-editable" data-edit-target="sba_output_kegiatan" data-edit-label="Output Kegiatan" data-edit-type="textarea" title="Klik untuk edit Output">
                    <p style="margin: 0 0 12pt 0; text-align: justify; text-indent: 1.25cm; line-height: 1.5; font-family: 'Times New Roman', serif; font-size: 12pt;">
                        ${formatInlineRichText(outputText).replace(/\n/g, '<br>')}
                    </p>
                </div>

                <p style="margin: 12pt 0 6pt 0; font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold;">
                    Tabel Capaian / Prestasi Peserta Kegiatan:
                </p>

                <table class="spz-border-table">
                    <thead>
                        <tr style="text-align: center; font-weight: bold;">
                            <th style="width: 36px;">No</th>
                            <th style="text-align: left;">Nama Peserta</th>
                            <th style="width: 120px;">NIM</th>
                            <th style="width: 130px;">Prodi</th>
                            <th style="width: 150px;">Capaian / Prestasi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sbaPrestasiList.map((p, idx) => `
                            <tr>
                                <td style="text-align: center;">${idx + 1}.</td>
                                <td>${formatInlineRichText(p.nama) || (isWordOrPrint ? 'Peserta ' + (idx + 1) : '<span class="preview-placeholder-hint">Peserta ' + (idx + 1) + '</span>')}</td>
                                <td style="text-align: center;">${formatInlineRichText(p.nim) || (isWordOrPrint ? 'NIM. XXXXXXXXX' : '<span class="preview-placeholder-hint">NIM. XXXXXXXXX</span>')}</td>
                                <td style="text-align: center;">${formatInlineRichText(p.prodi) || (isWordOrPrint ? 'Prodi XXX' : '<span class="preview-placeholder-hint">Prodi XXX</span>')}</td>
                                <td>${formatInlineRichText(p.capaian) || (isWordOrPrint ? 'Juara / Lulus Terbaik' : '<span class="preview-placeholder-hint">Juara / Lulus Terbaik</span>')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else if (key === 'hambatan') {
            // ==========================================
            // HALAMAN 4: HAMBATAN & EVALUASI
            // ==========================================
            const hambatanText = (document.getElementById('sba_hambatan_kegiatan')?.value || '').trim() ||
                '1. Adanya kendala teknis penyesuaian jadwal sarana di awal kegiatan.\n2. Waktu persiapan gladi resik yang cukup terbatas sebelum acara dimulai.';
            const evaluasiText = (document.getElementById('sba_evaluasi_kegiatan')?.value || '').trim() ||
                '1. Melakukan konfirmasi perizinan sarana dan fasilitas H-3 sebelum pelaksanaan.\n2. Menetapkan jadwal gladi resik H-1 agar seluruh pengisi acara lebih siap.';

            contentHtml = `
                <div style="margin-bottom: 12pt; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    <p style="margin: 0;">[${formatInlineRichText(noSurat)}]</p>
                </div>

                <p style="margin: 0 0 10pt 0; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    3. Hambatan Kegiatan
                </p>
                <div class="preview-editable" data-edit-target="sba_hambatan_kegiatan" data-edit-label="Hambatan Kegiatan" data-edit-type="textarea" title="Klik untuk edit Hambatan">
                    <p style="margin: 0 0 14pt 0; text-align: justify; text-indent: 1.25cm; line-height: 1.5; font-family: 'Times New Roman', serif; font-size: 12pt;">
                        ${formatInlineRichText(hambatanText).replace(/\n/g, '<br>')}
                    </p>
                </div>

                <p style="margin: 0 0 10pt 0; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    4. Evaluasi & Solusi Kegiatan
                </p>
                <div class="preview-editable" data-edit-target="sba_evaluasi_kegiatan" data-edit-label="Evaluasi Kegiatan" data-edit-type="textarea" title="Klik untuk edit Evaluasi">
                    <p style="margin: 0 0 10pt 0; text-align: justify; text-indent: 1.25cm; line-height: 1.5; font-family: 'Times New Roman', serif; font-size: 12pt;">
                        ${formatInlineRichText(evaluasiText).replace(/\n/g, '<br>')}
                    </p>
                </div>
            `;
        } else if (key === 'keuangan') {
            // ==========================================
            // HALAMAN 5: LAPORAN KEUANGAN & REKAPITULASI
            // ==========================================
            let totalPemasukan = 0;
            sbaPemasukanList.forEach(p => totalPemasukan += (parseFloat(p.nominal) || 0));

            let totalPengeluaran = 0;
            let pengeluaranTablesHtml = '';

            sbaPengeluaranCategories.forEach(cat => {
                let catTotal = 0;
                let rows = '';

                (cat.divisi || []).forEach(div => {
                    let divTotal = 0;
                    (div.items || []).forEach((it, itIdx) => {
                        const tot = (parseFloat(it.volume) || 1) * (parseFloat(it.harga) || 0);
                        divTotal += tot;
                        rows += `
                            <tr>
                                <td style="text-align: center;">${itIdx + 1}.</td>
                                <td>${formatInlineRichText(it.uraian) || 'Item Belanja'}</td>
                                <td style="text-align: center;">${it.volume || 1}</td>
                                <td style="text-align: center;">${it.satuan || 'Pcs'}</td>
                                <td style="text-align: right;">${formatRupiah(it.harga || 0)}</td>
                                <td style="text-align: right; font-weight: bold;">${formatRupiah(tot)}</td>
                            </tr>
                        `;
                    });
                    catTotal += divTotal;
                });

                totalPengeluaran += catTotal;

                pengeluaranTablesHtml += `
                    <p style="margin: 10pt 0 4pt 0; font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold;">
                        ${escapeHtml(cat.nama || 'BELANJA')}
                    </p>
                    <table class="spz-border-table" style="margin-bottom: 8pt;">
                        <thead>
                            <tr style="text-align: center; font-weight: bold;">
                                <th style="width: 36px;">No</th>
                                <th style="text-align: left;">Uraian Belanja</th>
                                <th style="width: 45px;">Vol</th>
                                <th style="width: 65px;">Satuan</th>
                                <th style="width: 100px;">Harga Satuan</th>
                                <th style="width: 115px;">Jumlah Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                            <tr style="font-weight: bold; background-color: rgba(0,0,0,0.03);">
                                <td colspan="5" style="text-align: right; padding-right: 8pt;">Subtotal ${escapeHtml(cat.nama || 'Belanja')}:</td>
                                <td style="text-align: right;">${formatRupiah(catTotal)}</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            });

            const saldoAkhir = totalPemasukan - totalPengeluaran;

            contentHtml = `
                <div style="margin-bottom: 12pt; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    <p style="margin: 0;">[${formatInlineRichText(noSurat)}]</p>
                </div>

                <p style="margin: 0 0 8pt 0; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    5. Laporan Keuangan Kegiatan
                </p>

                <!-- TABEL PEMASUKAN -->
                <p style="margin: 0 0 4pt 0; font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold;">
                    A. Pemasukan Dana
                </p>
                <table class="spz-border-table" style="margin-bottom: 10pt;">
                    <thead>
                        <tr style="text-align: center; font-weight: bold;">
                            <th style="width: 36px;">No</th>
                            <th style="text-align: left;">Sumber Pemasukan</th>
                            <th style="width: 150px; text-align: right;">Nominal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sbaPemasukanList.map((p, idx) => `
                            <tr>
                                <td style="text-align: center;">${idx + 1}.</td>
                                <td>${formatInlineRichText(p.uraian) || 'Pemasukan ' + (idx + 1)}</td>
                                <td style="text-align: right; font-family: 'Times New Roman', serif;">${formatRupiah(p.nominal || 0)}</td>
                            </tr>
                        `).join('')}
                        <tr style="font-weight: bold; background-color: rgba(0,0,0,0.03);">
                            <td colspan="2" style="text-align: right; padding-right: 8pt;">Total Pemasukan:</td>
                            <td style="text-align: right;">${formatRupiah(totalPemasukan)}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- TABEL PENGELUARAN -->
                <p style="margin: 0 0 4pt 0; font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold;">
                    B. Pengeluaran Dana
                </p>
                ${pengeluaranTablesHtml}

                <!-- TABEL REKAPITULASI -->
                <p style="margin: 12pt 0 4pt 0; font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: bold;">
                    C. Rekapitulasi Saldo Keuangan
                </p>
                <table class="spz-border-table">
                    <tbody>
                        <tr>
                            <td style="font-weight: bold;">1. Total Penerimaan / Pemasukan</td>
                            <td style="width: 150px; text-align: right; font-weight: bold;">${formatRupiah(totalPemasukan)}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold;">2. Total Realisasi Pengeluaran</td>
                            <td style="width: 150px; text-align: right; font-weight: bold;">${formatRupiah(totalPengeluaran)}</td>
                        </tr>
                        <tr style="background-color: rgba(0,0,0,0.05); font-weight: bold;">
                            <td>Sisa Saldo Kas (Pemasukan – Pengeluaran)</td>
                            <td style="text-align: right;">${formatRupiah(saldoAkhir)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        } else if (key === 'pengesahan') {
            // ==========================================
            // HALAMAN 6: LEMBAR PENGESAHAN (TTD)
            // ==========================================
            let ttdPjContent = '';
            if (isTtd1Active && isTtd2Active) {
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

            contentHtml = `
                <div style="margin-bottom: 12pt; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    <p style="margin: 0;">[${formatInlineRichText(noSurat)}]</p>
                </div>

                <p style="margin: 0 0 14pt 0; text-align: justify; text-indent: 1.25cm; line-height: 1.5; font-family: 'Times New Roman', serif; font-size: 12pt;">
                    Demikian Berita Acara ini kami susun dengan sebenarnya sebagai bukti pertanggungjawaban pelaksanaan kegiatan untuk dapat dipergunakan sebagaimana mestinya.
                </p>

                <!-- TINGKAT 1: PENANGGUNG JAWAB -->
                ${ttdPjContent ? `
                    <div style="font-family: 'Times New Roman', serif; margin-bottom: 14pt;">
                        <p style="margin: 0 0 6pt 0; text-align: center; font-weight: bold; font-size: 12pt;">Penanggung Jawab,</p>
                        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11pt; table-layout: fixed;">
                            ${ttdPjContent}
                        </table>
                    </div>
                ` : ''}

                <!-- TINGKAT 2: MENGETAHUI -->
                ${ttdMengetahuiContent ? `
                    <div style="font-family: 'Times New Roman', serif; margin-bottom: 14pt;">
                        <p style="margin: 0 0 6pt 0; text-align: center; font-weight: bold; font-size: 12pt;">Mengetahui,</p>
                        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11pt; table-layout: fixed;">
                            ${ttdMengetahuiContent}
                        </table>
                    </div>
                ` : ''}

                <!-- TINGKAT 3: MENYETUJUI WADIR III (TERKUNCI TINGGI) -->
                <div style="height: 125pt; min-height: 125pt; margin-bottom: 12pt; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;">
                    ${isWadirActive ? `
                        <div style="font-family: 'Times New Roman', serif; text-align: center;">
                            <p style="margin: 0 0 2pt 0; font-size: 11pt; font-weight: bold; line-height: 1.25;">Menyetujui,</p>
                            <p style="margin: 0; font-size: 11pt; line-height: 1.25;">${formatTtdJabatan(wadirJabatan)}</p>
                            <div style="height: 42pt;"></div>
                            <p style="margin: 0; font-size: 11pt; font-weight: bold; text-decoration: underline; line-height: 1.25; white-space: nowrap;">${formatInlineRichText(wadirNama)}</p>
                            <p style="margin: 0; font-size: 10pt; line-height: 1.25; white-space: nowrap;">${formatInlineRichText(wadirNip)}</p>
                        </div>
                    ` : `
                        <div class="preview-editable print:hidden" data-edit-target="ttd_wadir_block" data-edit-label="Menyetujui (Wakil Direktur)" data-edit-type="ttd_wadir" onclick="enableWadirAndOpenEdit(event)" title="Klik untuk mengaktifkan Wakil Direktur" style="height: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed #71717a; border-radius: 8px; background-color: rgba(255, 255, 255, 0.02); cursor: pointer;">
                            <span style="font-size: 9.5pt; color: #a1a1aa; font-weight: bold;"><i class="fa-solid fa-plus-circle mr-1.5"></i> Klik untuk Mengaktifkan Tanda Tangan Wakil Direktur (Menyetujui)</span>
                        </div>
                        <div class="hidden print:block" style="height: 100%;"></div>
                    `}
                </div>
            `;
        } else if (key === 'nota') {
            // ==========================================
            // HALAMAN 7: LAMPIRAN NOTA KEUANGAN
            // ==========================================
            let gridHtml = '';
            if (sbaNotaList.length === 0) {
                gridHtml = `
                    <div style="padding: 40px 20px; text-align: center; border: 1.5px dashed #a1a1aa; border-radius: 8px; font-family: 'Times New Roman', serif;">
                        <p style="margin: 0 0 4pt 0; font-size: 14pt; font-weight: bold; color: #71717a;">[LAMPIRAN NOTA KEUANGAN KOSONG]</p>
                        <p style="margin: 0; font-size: 11pt; color: #a1a1aa;">Unggah foto atau pindai nota bukti belanja pada panel formulir di samping.</p>
                    </div>
                `;
            } else {
                gridHtml = `
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                        ${sbaNotaList.map((n, i) => `
                            <div style="border: 1px solid #000; padding: 4px; text-align: center; background: #fff;">
                                <img src="${n.src}" alt="Nota #${i + 1}" style="max-height: 380px; width: 100%; object-fit: contain; display: block; margin-bottom: 4px;">
                                <span style="font-size: 10pt; font-family: 'Times New Roman', serif;">Nota #${i + 1}: ${escapeHtml(n.title || '')}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            contentHtml = `
                <div style="margin-bottom: 12pt; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    <p style="margin: 0;">[${formatInlineRichText(noSurat)}]</p>
                </div>
                <p style="margin: 0 0 10pt 0; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    Lampiran: Bukti Nota Belanja Keuangan
                </p>
                ${gridHtml}
            `;
        } else if (key === 'dok') {
            // ==========================================
            // HALAMAN 8: LAMPIRAN DOKUMENTASI KEGIATAN
            // ==========================================
            let dokGridHtml = '';
            if (sbaDokList.length === 0) {
                dokGridHtml = `
                    <div style="padding: 40px 20px; text-align: center; border: 1.5px dashed #a1a1aa; border-radius: 8px; font-family: 'Times New Roman', serif;">
                        <p style="margin: 0 0 4pt 0; font-size: 14pt; font-weight: bold; color: #71717a;">[LAMPIRAN DOKUMENTASI KOSONG]</p>
                        <p style="margin: 0; font-size: 11pt; color: #a1a1aa;">Unggah foto dokumentasi kegiatan pada panel formulir di samping.</p>
                    </div>
                `;
            } else {
                dokGridHtml = `
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                        ${sbaDokList.map((d, i) => `
                            <div style="border: 1px solid #000; padding: 4px; text-align: center; background: #fff;">
                                <img src="${d.src}" alt="Foto #${i + 1}" style="max-height: 280px; width: 100%; object-fit: contain; display: block; margin-bottom: 4px;">
                                <span style="font-size: 10pt; font-family: 'Times New Roman', serif;">Dokumentasi #${i + 1}: ${escapeHtml(d.caption || '')}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            contentHtml = `
                <div style="margin-bottom: 12pt; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    <p style="margin: 0;">[${formatInlineRichText(noSurat)}]</p>
                </div>
                <p style="margin: 0 0 10pt 0; font-family: 'Times New Roman', serif; font-size: 12pt; font-weight: bold;">
                    Lampiran: Foto Dokumentasi Kegiatan
                </p>
                ${dokGridHtml}
            `;
        }

        pagesHtml += `
            <div class="spz-sheet-badge print:hidden">
                <span class="text-[10px] font-mono text-neutral-400 uppercase font-bold tracking-wider">Halaman ${pageNum} &bull; ${escapeHtml(p.label)}</span>
                <span class="text-[10px] font-mono text-neutral-400 font-bold">${pageNum} / ${totalPages}</span>
            </div>
            <div class="spz-page-sheet" data-page="${pageNum}">
                ${watermarkHtml}
                <div style="position: relative; z-index: 2;">
                    ${kopHtml}
                    <div class="spz-body-container" style="padding-left: 9mm; padding-right: 4mm;">
                        ${contentHtml}
                    </div>
                </div>
            </div>
        `;
    });

    return pagesHtml;
}

function formatRupiah(num) {
    const n = parseFloat(num) || 0;
    return 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
