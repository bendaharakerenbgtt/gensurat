/**
 * Canvas Renderer - UDE-001
 * Manages Multi-page A4 Viewport, PDF background rendering, and interactive overlay targets.
 */

export class CanvasRenderer {
    constructor(containerEl, onElementSelected, onElementEdit) {
        this.container = containerEl;
        this.onElementSelected = onElementSelected;
        this.onElementEdit = onElementEdit;
        this.scale = 1.0;
        this.selectedElementId = null;
        this.docModel = null;
    }

    setScale(newScale) {
        this.scale = Math.max(0.4, Math.min(2.5, newScale));
        if (this.docModel) {
            this.render(this.docModel);
        }
    }

    async render(docModel) {
        this.docModel = docModel;
        this.container.innerHTML = '';

        if (!docModel || !docModel.pages || docModel.pages.length === 0) {
            this.container.innerHTML = `
                <div class="flex flex-col items-center justify-center p-16 text-neutral-500">
                    <i class="fa-regular fa-file text-5xl mb-3"></i>
                    <p class="text-sm">Tidak ada dokumen yang dimuat.</p>
                </div>
            `;
            return;
        }

        if (docModel.source.format === 'pdf') {
            await this.renderPdfPages(docModel);
        } else if (docModel.source.format === 'docx') {
            this.renderDocxPages(docModel);
        }
    }

    /**
     * Render PDF Mode: Background Canvas + Text Overlay Targets
     */
    async renderPdfPages(docModel) {
        // Load PDF Document instance from rawBytes
        const loadingTask = window.pdfjsLib.getDocument({
            data: new Uint8Array(docModel.source.rawBytes.slice(0))
        });
        const pdfDoc = await loadingTask.promise;

        for (let pIdx = 0; pIdx < docModel.pages.length; pIdx++) {
            const pageData = docModel.pages[pIdx];
            const pdfPage = await pdfDoc.getPage(pIdx + 1);

            // Create Page Sheet Wrapper
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'canvas-page-wrapper pdf-mode relative shadow-2xl bg-white mb-8 mx-auto';
            pageWrapper.style.width = (pageData.width * this.scale) + 'px';
            pageWrapper.style.height = (pageData.height * this.scale) + 'px';
            pageWrapper.dataset.pageIndex = pIdx;

            // Page Number Badge
            const pageBadge = document.createElement('div');
            pageBadge.className = 'absolute -top-6 left-0 text-[11px] font-mono text-neutral-400 font-bold';
            pageBadge.innerText = `Halaman ${pIdx + 1} / ${docModel.pages.length}`;
            pageWrapper.appendChild(pageBadge);

            // 1. Background Canvas
            const canvas = document.createElement('canvas');
            canvas.className = 'absolute inset-0 w-full h-full pointer-events-none';
            const pixelRatio = window.devicePixelRatio || 1.5;
            const viewport = pdfPage.getViewport({ scale: this.scale * pixelRatio });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            await pdfPage.render(renderContext).promise;
            pageWrapper.appendChild(canvas);

            // 2. Interactive Text Overlay
            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 w-full h-full z-10';

            pageData.elements.forEach((el) => {
                const target = document.createElement('div');
                target.id = 'target_' + el.id;
                target.className = 'pdf-interactive-target absolute cursor-pointer transition-all';
                target.style.left = (el.rect.x * this.scale) + 'px';
                target.style.top = (el.rect.y * this.scale) + 'px';
                target.style.width = Math.max(20, el.rect.width * this.scale) + 'px';
                target.style.height = (el.rect.height * this.scale) + 'px';
                target.title = el.text;

                if (this.selectedElementId === el.id) {
                    target.classList.add('active-selected');
                }

                // If element has been modified, render whiteout mask + updated text!
                if (el.isModified) {
                    target.classList.add('is-modified');
                    target.innerHTML = `
                        <div class="modified-whiteout-patch absolute inset-0 bg-white" style="z-index: 1;"></div>
                        <span class="relative z-10 text-neutral-900 truncate block font-sans" style="font-size: ${Math.max(9, el.fontSize * this.scale)}px; line-height: 1.1;">
                            ${escapeHtml(el.text)}
                        </span>
                    `;
                }

                // Click event
                target.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectElement(el.id, pageWrapper);
                });

                // Double click event -> Quick in-place edit
                target.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    if (this.onElementEdit) {
                        this.onElementEdit(el, target);
                    }
                });

                overlay.appendChild(target);
            });

            pageWrapper.appendChild(overlay);
            this.container.appendChild(pageWrapper);
        }
    }

    /**
     * Render DOCX Mode: Structured A4 Sheets with live DOM elements
     */
    renderDocxPages(docModel) {
        const setup = docModel.pageSetup || { width: 595.28, height: 841.89, marginTop: 72, marginBottom: 72, marginLeft: 72, marginRight: 72 };

        docModel.pages.forEach((pageData, pIdx) => {
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'canvas-page-wrapper docx-mode relative shadow-2xl bg-white mb-8 mx-auto text-neutral-900';
            pageWrapper.style.width = (setup.width * this.scale) + 'px';
            pageWrapper.style.minHeight = (setup.height * this.scale) + 'px';
            pageWrapper.style.padding = `${setup.marginTop * this.scale}px ${setup.marginRight * this.scale}px ${setup.marginBottom * this.scale}px ${setup.marginLeft * this.scale}px`;
            pageWrapper.dataset.pageIndex = pIdx;

            // Page Number Badge
            const pageBadge = document.createElement('div');
            pageBadge.className = 'absolute -top-6 left-0 text-[11px] font-mono text-neutral-400 font-bold';
            pageBadge.innerText = `Halaman ${pIdx + 1} / ${docModel.pages.length}`;
            pageWrapper.appendChild(pageBadge);

            pageData.elements.forEach((el) => {
                if (el.type === 'paragraph') {
                    const pEl = document.createElement('div');
                    pEl.id = 'target_' + el.id;
                    pEl.className = 'docx-interactive-paragraph cursor-pointer transition-all rounded px-1.5 py-0.5 hover:bg-blue-50/70';
                    pEl.style.fontSize = (el.fontSize * this.scale) + 'pt';
                    pEl.style.fontFamily = el.fontFamily || 'Times New Roman';
                    pEl.style.textAlign = el.alignment || 'left';
                    pEl.style.fontWeight = el.fontWeight || 'normal';
                    pEl.style.fontStyle = el.fontStyle || 'normal';
                    pEl.style.minHeight = (14 * this.scale) + 'px';
                    pEl.style.marginBottom = (4 * this.scale) + 'px';
                    pEl.innerText = el.text || ' ';

                    if (el.isModified) pEl.classList.add('is-modified');
                    if (this.selectedElementId === el.id) pEl.classList.add('active-selected');

                    pEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectElement(el.id, pageWrapper);
                    });

                    pEl.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        if (this.onElementEdit) this.onElementEdit(el, pEl);
                    });

                    pageWrapper.appendChild(pEl);
                } else if (el.type === 'table') {
                    const tblWrapper = document.createElement('div');
                    tblWrapper.id = 'target_' + el.id;
                    tblWrapper.className = 'docx-interactive-table cursor-pointer my-3 p-1 rounded hover:bg-blue-50/70 border border-neutral-300';
                    
                    const rows = el.extra?.rows || [];
                    let tableHtml = `<table style="width: 100%; border-collapse: collapse; font-size: ${10 * this.scale}pt; font-family: 'Times New Roman';">`;
                    rows.forEach(r => {
                        tableHtml += '<tr>';
                        r.forEach(c => {
                            tableHtml += `<td style="border: 1px solid #71717a; padding: ${3 * this.scale}px ${6 * this.scale}px; vertical-align: top;">${escapeHtml(c.text)}</td>`;
                        });
                        tableHtml += '</tr>';
                    });
                    tableHtml += '</table>';
                    tblWrapper.innerHTML = tableHtml;

                    if (this.selectedElementId === el.id) tblWrapper.classList.add('active-selected');

                    tblWrapper.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectElement(el.id, pageWrapper);
                    });

                    pageWrapper.appendChild(tblWrapper);
                }
            });

            this.container.appendChild(pageWrapper);
        });
    }

    selectElement(elementId, pageWrapper) {
        this.selectedElementId = elementId;

        // Remove active-selected from all
        this.container.querySelectorAll('.active-selected').forEach(el => el.classList.remove('active-selected'));

        const targetEl = document.getElementById('target_' + elementId);
        if (targetEl) {
            targetEl.classList.add('active-selected');
        }

        // Find element in model
        let foundEl = null;
        let foundPage = null;
        if (this.docModel) {
            for (const page of this.docModel.pages) {
                for (const el of page.elements) {
                    if (el.id === elementId) {
                        foundEl = el;
                        foundPage = page;
                        break;
                    }
                }
                if (foundEl) break;
            }
        }

        if (this.onElementSelected && foundEl) {
            this.onElementSelected(foundEl, foundPage);
        }
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
