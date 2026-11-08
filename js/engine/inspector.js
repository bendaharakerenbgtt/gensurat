/**
 * Properties Inspector & Element Hierarchy Panel - UDE-001
 */

export class InspectorPanel {
    constructor(inspectorEl, hierarchyEl, onTextUpdated, onAddTableRow, onLogoUpdated, onLogoRemoved, onLogoReset, onFormatChanged, onTextLive) {
        this.inspectorEl = inspectorEl;
        this.hierarchyEl = hierarchyEl;
        this.onTextUpdated = onTextUpdated;
        this.onAddTableRow = onAddTableRow;
        this.onLogoUpdated = onLogoUpdated;
        this.onLogoRemoved = onLogoRemoved;
        this.onLogoReset = onLogoReset;
        this.onFormatChanged = onFormatChanged;
        this.onTextLive = onTextLive;
        this.currentElement = null;
    }

    renderElement(element, page) {
        this.currentElement = element;
        if (!this.inspectorEl) return;

        if (!element) {
            this.inspectorEl.innerHTML = `
                <div class="p-4 text-center text-neutral-500 text-xs py-10">
                    <i class="fa-solid fa-arrow-pointer text-2xl mb-2 block text-neutral-600"></i>
                    Pilih elemen di kertas untuk melihat dan mengubah properti.
                </div>
            `;
            return;
        }

        // SPECIAL CASE: KOP LOGO INSPECTOR UI
        if (element.type === 'kop_logo') {
            this.renderKopLogoInspector(element, page);
            return;
        }

        const isModified = element.isModified;
        const typeLabel = element.type === 'paragraph' ? 'Paragraf Word' : (element.type === 'table' ? 'Tabel' : 'Teks PDF');

        // Detect if text corresponds to a signature block or official title
        const isTtdArea = /(ketua|direktur|wadir|sekretaris|bendahara|pembina|mengetahui|menyetujui|nip\.|nim\.|penanggung jawab|yth\.)/i.test(element.text || '');

        let tableControlsHtml = '';
        if (element.type === 'table') {
            tableControlsHtml = `
                <div class="pt-2">
                    <button type="button" id="btn_add_table_row" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow">
                        <i class="fa-solid fa-plus"></i> Tambah Baris Baru pada Tabel
                    </button>
                </div>
            `;
        }

        this.inspectorEl.innerHTML = `
            <div class="space-y-4">
                <!-- Header Info -->
                <div class="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded ${isModified ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-neutral-800 text-neutral-400'} font-semibold">
                            ${typeLabel} ${isModified ? '&bull; Diedit' : ''}
                        </span>
                        ${isTtdArea ? `
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold flex items-center gap-1">
                                <i class="fa-solid fa-signature text-purple-400"></i> Area TTD / Pejabat
                            </span>
                        ` : ''}
                    </div>
                    <span class="text-[10px] font-mono text-neutral-500">Hal. ${(page?.pageIndex || 0) + 1}</span>
                </div>

                <!-- Text Content Editor -->
                <div>
                    <label class="block text-[11px] font-medium text-neutral-400 mb-1">
                        Isi Teks / Konten:
                    </label>
                    <textarea id="inspector_text_input" rows="5" class="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white leading-relaxed focus:outline-none focus:border-blue-500 font-sans resize-y">${escapeHtml(element.text)}</textarea>
                </div>

                <!-- Word-Like Formatting Toolbar -->
                <div class="bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 flex flex-wrap items-center gap-1">
                    <!-- Bold / Italic -->
                    <div class="flex items-center bg-neutral-950 rounded p-0.5 border border-neutral-800/60">
                        <button type="button" id="btn_format_bold" class="w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${element.isBold ? 'bg-blue-600 text-white font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}" title="Tebal (Bold)">
                            <i class="fa-solid fa-bold"></i>
                        </button>
                        <button type="button" id="btn_format_italic" class="w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${element.isItalic ? 'bg-blue-600 text-white italic' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}" title="Miring (Italic)">
                            <i class="fa-solid fa-italic"></i>
                        </button>
                    </div>

                    <div class="h-5 w-px bg-neutral-800"></div>

                    <!-- Alignment -->
                    <div class="flex items-center bg-neutral-950 rounded p-0.5 border border-neutral-800/60">
                        <button type="button" id="btn_align_left" class="w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${(element.alignment === 'left' || !element.alignment) ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}" title="Rata Kiri">
                            <i class="fa-solid fa-align-left"></i>
                        </button>
                        <button type="button" id="btn_align_center" class="w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${element.alignment === 'center' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}" title="Rata Tengah">
                            <i class="fa-solid fa-align-center"></i>
                        </button>
                        <button type="button" id="btn_align_right" class="w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${element.alignment === 'right' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}" title="Rata Kanan">
                            <i class="fa-solid fa-align-right"></i>
                        </button>
                        <button type="button" id="btn_align_justify" class="w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${element.alignment === 'justify' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}" title="Rata Kanan Kiri">
                            <i class="fa-solid fa-align-justify"></i>
                        </button>
                    </div>

                    <div class="h-5 w-px bg-neutral-800"></div>

                    <!-- Horizontal Nudge / Geser / Tab -->
                    <div class="flex items-center bg-neutral-950 rounded p-0.5 border border-neutral-800/60 gap-1 px-1">
                        <span class="text-[9px] uppercase font-mono text-neutral-500 font-bold">Geser</span>
                        <button type="button" id="btn_nudge_left" class="w-6 h-6 flex items-center justify-center rounded text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors" title="Geser ke Kiri (5pt)">
                            <i class="fa-solid fa-chevron-left text-[10px]"></i>
                        </button>
                        <span id="label_nudge_offset" class="text-[10px] font-mono text-blue-400 min-w-8 text-center">${element.offsetX || 0}pt</span>
                        <button type="button" id="btn_nudge_right" class="w-6 h-6 flex items-center justify-center rounded text-xs text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors" title="Geser ke Kanan / Tab (5pt)">
                            <i class="fa-solid fa-chevron-right text-[10px]"></i>
                        </button>
                        ${element.offsetX ? `
                            <button type="button" id="btn_nudge_reset" class="text-[10px] text-neutral-500 hover:text-red-400 px-1" title="Reset Posisi Geser">
                                <i class="fa-solid fa-rotate-left text-[9px]"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Formatting Info -->
                <div class="grid grid-cols-2 gap-2 text-[11px]">
                    <div class="p-2 bg-neutral-950 border border-neutral-800/80 rounded">
                        <span class="text-neutral-500 block text-[10px]">Ukuran Font</span>
                        <span class="font-mono text-neutral-200 font-semibold">${element.fontSize || 12} pt</span>
                    </div>
                    <div class="p-2 bg-neutral-950 border border-neutral-800/80 rounded">
                        <span class="text-neutral-500 block text-[10px]">Font Family</span>
                        <span class="truncate block text-neutral-200 font-semibold" title="${element.fontFamily}">${element.fontFamily || 'Times New Roman'}</span>
                    </div>
                </div>

                ${tableControlsHtml}

                <!-- Actions -->
                <div class="pt-2 flex flex-col gap-2">
                    <button type="button" id="btn_apply_inspector" class="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                        <i class="fa-solid fa-check"></i> Terapkan Perubahan
                    </button>
                    ${isModified ? `
                        <button type="button" id="btn_reset_inspector" class="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
                            <i class="fa-solid fa-rotate-left"></i> Kembalikan ke Asli
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        // Event Listeners
        const textarea = document.getElementById('inspector_text_input');
        const applyBtn = document.getElementById('btn_apply_inspector');
        const resetBtn = document.getElementById('btn_reset_inspector');

        // Word Toolbar Listeners
        const boldBtn = document.getElementById('btn_format_bold');
        const italicBtn = document.getElementById('btn_format_italic');
        const alignLeftBtn = document.getElementById('btn_align_left');
        const alignCenterBtn = document.getElementById('btn_align_center');
        const alignRightBtn = document.getElementById('btn_align_right');
        const alignJustifyBtn = document.getElementById('btn_align_justify');
        const nudgeLeftBtn = document.getElementById('btn_nudge_left');
        const nudgeRightBtn = document.getElementById('btn_nudge_right');
        const nudgeResetBtn = document.getElementById('btn_nudge_reset');

        const triggerFormatUpdate = () => {
            if (this.onFormatChanged) {
                this.onFormatChanged(element.id, {
                    isBold: !!element.isBold,
                    isItalic: !!element.isItalic,
                    alignment: element.alignment || 'left',
                    offsetX: element.offsetX || 0
                });
            }
            this.renderElement(element, page);
        };

        if (boldBtn) {
            boldBtn.addEventListener('click', () => {
                element.isBold = !element.isBold;
                element.isModified = true;
                triggerFormatUpdate();
            });
        }
        if (italicBtn) {
            italicBtn.addEventListener('click', () => {
                element.isItalic = !element.isItalic;
                element.isModified = true;
                triggerFormatUpdate();
            });
        }
        if (alignLeftBtn) {
            alignLeftBtn.addEventListener('click', () => {
                element.alignment = 'left';
                element.isModified = true;
                triggerFormatUpdate();
            });
        }
        if (alignCenterBtn) {
            alignCenterBtn.addEventListener('click', () => {
                element.alignment = 'center';
                element.isModified = true;
                triggerFormatUpdate();
            });
        }
        if (alignRightBtn) {
            alignRightBtn.addEventListener('click', () => {
                element.alignment = 'right';
                element.isModified = true;
                triggerFormatUpdate();
            });
        }
        if (alignJustifyBtn) {
            alignJustifyBtn.addEventListener('click', () => {
                element.alignment = 'justify';
                element.isModified = true;
                triggerFormatUpdate();
            });
        }
        if (nudgeLeftBtn) {
            nudgeLeftBtn.addEventListener('click', () => {
                element.offsetX = (element.offsetX || 0) - 5;
                element.isModified = true;
                triggerFormatUpdate();
            });
        }
        if (nudgeRightBtn) {
            nudgeRightBtn.addEventListener('click', () => {
                element.offsetX = (element.offsetX || 0) + 5;
                element.isModified = true;
                triggerFormatUpdate();
            });
        }
        if (nudgeResetBtn) {
            nudgeResetBtn.addEventListener('click', () => {
                element.offsetX = 0;
                element.isModified = true;
                triggerFormatUpdate();
            });
        }

        if (textarea) {
            // Live instant DOM update without full canvas re-render (Zero Flickering)
            textarea.addEventListener('input', () => {
                element.text = textarea.value;
                if (this.onTextLive) {
                    this.onTextLive(element.id, textarea.value);
                }
            });

            // Commit state to mutation engine on apply button or blur
            if (applyBtn) {
                applyBtn.addEventListener('click', () => {
                    if (this.onTextUpdated) {
                        this.onTextUpdated(element.id, textarea.value);
                    }
                });
            }

            textarea.addEventListener('blur', () => {
                if (this.onTextUpdated && textarea.value !== element.originalText) {
                    this.onTextUpdated(element.id, textarea.value);
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                element.text = element.originalText;
                element.isBold = false;
                element.isItalic = false;
                element.alignment = element._initialAlignment || 'left';
                element.offsetX = 0;
                if (this.onTextUpdated) {
                    this.onTextUpdated(element.id, element.originalText);
                }
            });
        }

        const addRowBtn = document.getElementById('btn_add_table_row');
        if (addRowBtn) {
            addRowBtn.addEventListener('click', () => {
                if (this.onAddTableRow) {
                    this.onAddTableRow(element.id);
                }
            });
        }
    }

    renderKopLogoInspector(element, page) {
        const isModified = element.isModified;
        const isRemoved = element.extra?.isRemoved;
        const hasNewImage = !!element.extra?.newImageSrc;
        const logoTitle = element.extra?.title || 'Logo Kop Surat';

        let previewHtml = '';
        if (hasNewImage) {
            previewHtml = `
                <div class="p-3 bg-neutral-950 border border-emerald-800/60 rounded-xl flex flex-col items-center justify-center gap-2">
                    <img src="${element.extra.newImageSrc}" class="max-h-24 max-w-full object-contain rounded">
                    <span class="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <i class="fa-solid fa-check-circle"></i> Logo baru terpasang
                    </span>
                </div>
            `;
        } else if (isRemoved) {
            previewHtml = `
                <div class="p-4 bg-neutral-950 border border-red-900/60 rounded-xl text-center">
                    <i class="fa-solid fa-ban text-red-400 text-2xl mb-1.5 block"></i>
                    <span class="text-xs text-red-300 font-medium block">Logo Dikosongkan</span>
                    <span class="text-[10px] text-neutral-500 mt-0.5 block">Area logo lama ditutup rapi dengan latar putih</span>
                </div>
            `;
        } else {
            previewHtml = `
                <div class="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-center">
                    <i class="fa-solid fa-image text-blue-400 text-2xl mb-1.5 block"></i>
                    <span class="text-xs text-neutral-300 font-medium block">${logoTitle}</span>
                    <span class="text-[10px] text-neutral-500 mt-1 block">Menggunakan logo bawaan dari dokumen</span>
                </div>
            `;
        }

        this.inspectorEl.innerHTML = `
            <div class="space-y-4">
                <!-- Header -->
                <div class="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded ${isModified ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-blue-950 text-blue-400 border border-blue-800'} font-bold">
                            LOGO KOP SURAT
                        </span>
                        ${isModified ? '<span class="text-[10px] font-mono text-amber-400">&bull; Diedit</span>' : ''}
                    </div>
                    <span class="text-[10px] font-mono text-neutral-500">Hal. ${(page?.pageIndex || 0) + 1}</span>
                </div>

                <!-- Preview Area -->
                <div>
                    <label class="block text-[11px] font-medium text-neutral-400 mb-1.5">
                        Pratinjau Logo Kop:
                    </label>
                    ${previewHtml}
                </div>

                <!-- File Uploader & Actions -->
                <input type="file" id="inspector_logo_file_input" accept="image/png,image/jpeg,image/webp" class="hidden">

                <div class="pt-2 flex flex-col gap-2">
                    <button type="button" id="btn_upload_kop_logo" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow">
                        <i class="fa-solid fa-cloud-arrow-up"></i> ${hasNewImage ? 'Ganti dengan Gambar Lain' : 'Upload & Ganti Logo Kop'}
                    </button>

                    ${!isRemoved ? `
                        <button type="button" id="btn_remove_kop_logo" class="w-full py-1.5 bg-neutral-900 hover:bg-red-950/50 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-800/60 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
                            <i class="fa-solid fa-trash-can"></i> Kosongkan / Hapus Logo Ini
                        </button>
                    ` : ''}

                    ${isModified ? `
                        <button type="button" id="btn_reset_kop_logo" class="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
                            <i class="fa-solid fa-rotate-left"></i> Kembalikan ke Logo Asli
                        </button>
                    ` : ''}

                    <button type="button" id="btn_typesafe_assist" class="w-full py-1.5 bg-neutral-900 hover:bg-purple-950/40 text-purple-300 border border-purple-800/60 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
                        <i class="fa-solid fa-wand-magic-sparkles text-purple-400"></i> Bantu Deteksi dengan TypeSafe AI
                    </button>
                </div>

                <div class="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-lg text-[11px] text-neutral-400 space-y-1">
                    <div class="font-semibold text-neutral-300 flex items-center gap-1.5">
                        <i class="fa-solid fa-circle-info text-blue-400"></i> Petunjuk Logo:
                    </div>
                    <p class="leading-relaxed text-[10px]">
                        Gunakan file PNG transparan beresolusi tinggi untuk hasil cetak dan PDF yang maksimal.
                    </p>
                </div>
            </div>
        `;

        // Wire event handlers
        const uploadBtn = document.getElementById('btn_upload_kop_logo');
        const fileInput = document.getElementById('inspector_logo_file_input');
        const removeBtn = document.getElementById('btn_remove_kop_logo');
        const resetBtn = document.getElementById('btn_reset_kop_logo');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const arrayBuffer = await file.arrayBuffer();
                const reader = new FileReader();
                reader.onload = (loadEv) => {
                    const dataUrl = loadEv.target.result;
                    if (this.onLogoUpdated) {
                        this.onLogoUpdated(element.id, dataUrl, new Uint8Array(arrayBuffer), file.type || 'image/png');
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                if (this.onLogoRemoved) {
                    this.onLogoRemoved(element.id);
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (this.onLogoReset) {
                    this.onLogoReset(element.id);
                }
            });
        }

        const typeSafeBtn = document.getElementById('btn_typesafe_assist');
        if (typeSafeBtn) {
            typeSafeBtn.addEventListener('click', async () => {
                try {
                    const apiKey = localStorage.getItem('TYPESAFE_API_KEY');
                    if (!apiKey) {
                        const entered = prompt('Masukkan TypeSafe API Key Anda (atau kosongkan untuk batal):');
                        if (entered) {
                            localStorage.setItem('TYPESAFE_API_KEY', entered.trim());
                        } else {
                            return;
                        }
                    }
                    alert('TypeSafe AI siap menganalisis batas logo kop surat ini.');
                } catch (err) {
                    alert('TypeSafe error: ' + err.message);
                }
            });
        }
    }

    renderHierarchy(docModel, onNodeClicked) {
        if (!this.hierarchyEl) return;
        if (!docModel || !docModel.pages || docModel.pages.length === 0) {
            this.hierarchyEl.innerHTML = '<p class="text-xs text-neutral-500 p-3">Tidak ada struktur.</p>';
            return;
        }

        let html = '<div class="space-y-3">';
        docModel.pages.forEach((page, pIdx) => {
            html += `
                <div class="border border-neutral-800/80 rounded-lg overflow-hidden bg-neutral-950/50">
                    <div class="px-3 py-2 bg-neutral-900/80 text-[11px] font-bold text-neutral-300 flex items-center justify-between border-b border-neutral-800">
                        <span><i class="fa-regular fa-file text-neutral-500 mr-1.5"></i> Halaman ${pIdx + 1}</span>
                        <span class="text-[10px] font-mono text-neutral-500">${page.elements.length} elemen</span>
                    </div>
                    <div class="p-1 space-y-0.5 max-h-48 overflow-y-auto">
            `;

            page.elements.forEach(el => {
                let icon = 'fa-font text-neutral-500';
                if (el.type === 'kop_logo') icon = 'fa-image text-blue-400';
                else if (/@/.test(el.text || '')) icon = 'fa-envelope text-emerald-400';
                else if (/^(https?:\/\/|www\.)/i.test(el.text || '')) icon = 'fa-globe text-cyan-400';
                else if (/^(telp|wa|fax|phone)/i.test(el.text || '')) icon = 'fa-phone text-amber-400';
                else if (/(ketua|direktur|wadir|sekretaris|bendahara|pembina|mengetahui|menyetujui|nip\.|nim\.)/i.test(el.text || '')) icon = 'fa-signature text-purple-400';

                const previewText = el.text ? el.text.substring(0, 30) + (el.text.length > 30 ? '...' : '') : '[Kosong]';
                const isMod = el.isModified;
                html += `
                    <div data-element-id="${el.id}" class="hierarchy-tree-node px-2.5 py-1.5 rounded text-xs text-neutral-400 hover:text-white hover:bg-neutral-800/60 cursor-pointer flex items-center justify-between transition-colors ${this.currentElement?.id === el.id ? 'bg-blue-950/60 text-blue-300 font-medium' : ''}">
                        <span class="truncate pr-2 flex items-center gap-1.5">
                            <i class="fa-solid ${icon} text-[10px] shrink-0"></i>
                            <span class="truncate">${escapeHtml(previewText)}</span>
                        </span>
                        ${isMod ? '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Diedit"></span>' : ''}
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });
        html += '</div>';

        this.hierarchyEl.innerHTML = html;

        // Click listeners on hierarchy items
        this.hierarchyEl.querySelectorAll('.hierarchy-tree-node').forEach(node => {
            node.addEventListener('click', () => {
                const elId = node.dataset.elementId;
                if (onNodeClicked) {
                    onNodeClicked(elId);
                }
            });
        });
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
