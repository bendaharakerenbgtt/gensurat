/**
 * Properties Inspector & Element Hierarchy Panel - UDE-001
 */

export class InspectorPanel {
    constructor(inspectorEl, hierarchyEl, onTextUpdated) {
        this.inspectorEl = inspectorEl;
        this.hierarchyEl = hierarchyEl;
        this.onTextUpdated = onTextUpdated;
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

        const isModified = element.isModified;
        const typeLabel = element.type === 'paragraph' ? 'Paragraf Word' : (element.type === 'table' ? 'Tabel' : 'Teks PDF');

        this.inspectorEl.innerHTML = `
            <div class="space-y-4">
                <!-- Header Info -->
                <div class="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div>
                        <span class="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded ${isModified ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-neutral-800 text-neutral-400'} font-semibold">
                            ${typeLabel} ${isModified ? '&bull; Diedit' : ''}
                        </span>
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

        if (textarea && applyBtn) {
            applyBtn.addEventListener('click', () => {
                if (this.onTextUpdated) {
                    this.onTextUpdated(element.id, textarea.value);
                }
            });

            // Live sync on Enter or input debounce
            textarea.addEventListener('input', () => {
                if (this.onTextUpdated) {
                    this.onTextUpdated(element.id, textarea.value);
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (this.onTextUpdated) {
                    this.onTextUpdated(element.id, element.originalText);
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
                const previewText = el.text ? el.text.substring(0, 32) + (el.text.length > 32 ? '...' : '') : '[Kosong]';
                const isMod = el.isModified;
                html += `
                    <div data-element-id="${el.id}" class="hierarchy-tree-node px-2.5 py-1.5 rounded text-xs text-neutral-400 hover:text-white hover:bg-neutral-800/60 cursor-pointer flex items-center justify-between transition-colors ${this.currentElement?.id === el.id ? 'bg-blue-950/60 text-blue-300 font-medium' : ''}">
                        <span class="truncate pr-2">${escapeHtml(previewText)}</span>
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
