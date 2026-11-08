/**
 * Canvas Renderer - UDE-001
 * Manages Multi-page A4 Viewport, PDF background rendering, and interactive overlay targets.
 */

export class CanvasRenderer {
    constructor(containerEl, onElementSelected, onElementEdit, onDeleteImage) {
        this.container = containerEl;
        this.onElementSelected = onElementSelected;
        this.onElementEdit = onElementEdit;
        this.onDeleteImage = onDeleteImage;
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
            let pdfPage = null;
            if (pIdx + 1 <= pdfDoc.numPages) {
                pdfPage = await pdfDoc.getPage(pIdx + 1);
            }

            // Create Page Sheet Wrapper
            const pageWrapper = document.createElement('div');
            pageWrapper.className = 'canvas-page-wrapper pdf-mode relative shadow-2xl bg-white mb-8 mx-auto shrink-0';
            pageWrapper.style.width = (pageData.width * this.scale) + 'px';
            pageWrapper.style.height = (pageData.height * this.scale) + 'px';
            pageWrapper.style.minWidth = (pageData.width * this.scale) + 'px';
            pageWrapper.style.minHeight = (pageData.height * this.scale) + 'px';
            pageWrapper.dataset.pageIndex = pIdx;

            // Page Number Badge
            const pageBadge = document.createElement('div');
            pageBadge.className = 'absolute -top-6 left-0 text-[11px] font-mono text-neutral-400 font-bold';
            pageBadge.innerText = `Halaman ${pIdx + 1} / ${docModel.pages.length}`;
            pageWrapper.appendChild(pageBadge);

            // 1. Background Canvas
            const canvas = document.createElement('canvas');
            canvas.className = 'absolute inset-0 w-full h-full pointer-events-none';
            if (pdfPage) {
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
            } else {
                canvas.style.backgroundColor = '#ffffff';
            }
            pageWrapper.appendChild(canvas);

            // 2. Interactive Text Overlay & Flowable Layout
            const overlay = document.createElement('div');
            overlay.className = 'absolute inset-0 w-full h-full z-10';

            let cumulativeShift = 0;

            pageData.elements.forEach((el) => {
                // A. Handle Kop Logo Target
                if (el.type === 'kop_logo') {
                    const logoBox = document.createElement('div');
                    logoBox.id = 'target_' + el.id;
                    logoBox.className = 'pdf-interactive-target kop-logo-target absolute cursor-pointer border-2 border-dashed border-blue-400/80 bg-blue-500/10 hover:bg-blue-500/25 rounded flex items-center justify-center p-1 transition-all z-20';
                    logoBox.style.left = (el.rect.x * this.scale) + 'px';
                    logoBox.style.top = (el.rect.y * this.scale) + 'px';
                    logoBox.style.width = (el.rect.width * this.scale) + 'px';
                    logoBox.style.height = (el.rect.height * this.scale) + 'px';
                    logoBox.title = el.extra?.title || 'Logo Kop Surat';

                    if (this.selectedElementId === el.id) logoBox.classList.add('active-selected');

                    if (el.extra?.isRemoved) {
                        logoBox.innerHTML = `
                            <div class="modified-whiteout-patch absolute -inset-1 bg-white" style="z-index: 1;"></div>
                            <span class="text-[9px] font-bold text-neutral-400 text-center leading-tight relative z-10">
                                <i class="fa-solid fa-ban mb-0.5 block text-xs text-neutral-500"></i>
                                Logo Dihapus
                            </span>
                        `;
                    } else if (el.extra?.newImageSrc) {
                        logoBox.innerHTML = `
                            <div class="modified-whiteout-patch absolute -inset-1 bg-white" style="z-index: 1;"></div>
                            <img src="${el.extra.newImageSrc}" style="width: 100%; height: 100%; object-fit: contain; position: relative; z-index: 2;">
                        `;
                    } else {
                        logoBox.innerHTML = `
                            <span class="text-[9px] font-bold text-blue-300 text-center leading-tight">
                                <i class="fa-solid fa-camera mb-0.5 block text-xs"></i>
                                ${el.extra?.title || 'Logo Kop'}
                            </span>
                        `;
                    }

                    logoBox.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.selectElement(el.id, pageWrapper);
                    });

                    // Direct Drag & Drop replacement on paper
                    logoBox.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        logoBox.classList.add('border-emerald-400', 'bg-emerald-500/20');
                    });
                    logoBox.addEventListener('dragleave', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        logoBox.classList.remove('border-emerald-400', 'bg-emerald-500/20');
                    });
                    logoBox.addEventListener('drop', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        logoBox.classList.remove('border-emerald-400', 'bg-emerald-500/20');
                        const file = e.dataTransfer.files[0];
                        if (file && file.type.startsWith('image/')) {
                            const arrayBuffer = await file.arrayBuffer();
                            const reader = new FileReader();
                            reader.onload = (loadEv) => {
                                const dataUrl = loadEv.target.result;
                                if (window.mutationEngineInstance) {
                                    window.mutationEngineInstance.updateKopLogo(el.id, dataUrl, new Uint8Array(arrayBuffer), file.type || 'image/png');
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                    });

                    overlay.appendChild(logoBox);
                    return;
                }

                // B. Handle Flowable Paragraphs & Subsequent Elements
                let currentHeight = el.rect.height;
                let isExpanded = false;

                if (el.isModified && (el.type === 'paragraph' || el.sourceRef?.isParagraph)) {
                    const fontFam = el.fontFamily || 'Times New Roman';
                    const lineHeightRatio = 1.45;
                    const calculatedHeight = measureParagraphHeight(el.text, el.rect.width, el.fontSize, fontFam, lineHeightRatio);

                    if (calculatedHeight > el.rect.height) {
                        currentHeight = calculatedHeight;
                        isExpanded = true;
                    }
                }

                const effectiveY = el.rect.y + cumulativeShift;
                const isParagraph = el.type === 'paragraph' || el.sourceRef?.isParagraph;
                const isKopText = (el.rect.y < 95);
                const fontFam = el.fontFamily || 'Times New Roman';
                const alignment = isKopText ? 'center' : (isParagraph ? 'justify' : 'left');

                let targetWidth = Math.max(20, el.rect.width * this.scale) + 'px';
                let targetLeft = (el.rect.x * this.scale) + 'px';
                let targetTop = (effectiveY * this.scale) + 'px';
                let targetHeight = (currentHeight * this.scale) + 'px';

                const target = document.createElement('div');
                target.id = 'target_' + el.id;
                target.className = 'pdf-interactive-target absolute cursor-pointer transition-all';
                target.style.left = targetLeft;
                target.style.top = targetTop;
                target.style.width = targetWidth;
                target.style.height = targetHeight;
                target.style.zIndex = '10';
                target.title = el.text;

                if (el.isModified && isKopText) {
                    target.style.left = ((pageData.width * this.scale) / 2) + 'px';
                    target.style.transform = 'translateX(-50%)';
                    target.style.width = 'auto';
                    target.style.minWidth = (el.rect.width * this.scale + 16) + 'px';
                    target.style.height = (el.rect.height * this.scale) + 'px';
                    target.style.top = (effectiveY * this.scale) + 'px';
                } else if (el.isModified && !isParagraph) {
                    target.style.width = 'auto';
                    target.style.minWidth = (el.rect.width * this.scale + 10) + 'px';
                    target.style.height = (el.rect.height * this.scale) + 'px';
                    target.style.top = (effectiveY * this.scale) + 'px';
                }

                if (this.selectedElementId === el.id) {
                    target.classList.add('active-selected');
                }

                const isPushedDown = cumulativeShift > 0 && !el.isModified;

                // Render whiteout & text for modified or pushed down elements
                if (el.isModified || isPushedDown) {
                    target.classList.add('is-modified');

                    // Erase old position from canvas background if element was pushed down OR modified
                    const oldPosWhiteout = document.createElement('div');
                    oldPosWhiteout.className = 'absolute bg-white pointer-events-none';
                    oldPosWhiteout.style.left = (el.rect.x * this.scale - 4) + 'px';
                    oldPosWhiteout.style.top = (el.rect.y * this.scale - 1) + 'px';
                    oldPosWhiteout.style.width = (el.rect.width * this.scale + 8) + 'px';
                    oldPosWhiteout.style.height = (el.rect.height * this.scale + 2) + 'px';
                    oldPosWhiteout.style.zIndex = '5';
                    overlay.appendChild(oldPosWhiteout);

                    target.innerHTML = `
                        <div class="modified-whiteout-patch absolute inset-0 bg-white" style="z-index: 1;"></div>
                        <div class="relative z-10 text-neutral-900" style="font-size: ${Math.max(8, el.fontSize * this.scale)}px; font-family: '${fontFam}', serif; line-height: ${isParagraph ? '1.45' : '1.1'}; text-align: ${alignment}; word-break: break-word; white-space: ${isParagraph ? 'normal' : 'nowrap'}; padding: 0;">
                            ${escapeHtml(el.text)}
                        </div>
                    `;
                }

                if (isExpanded) {
                    const deltaH = currentHeight - el.rect.height;
                    cumulativeShift += deltaH;
                    el.effectiveShift = deltaH;
                    el.expandedHeight = currentHeight;
                } else if (cumulativeShift > 0) {
                    el.shiftedY = effectiveY;
                    el.cumulativeShift = cumulativeShift;
                } else {
                    el.shiftedY = undefined;
                    el.cumulativeShift = 0;
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

            // 3. Render Added Signatures / Stamps / Images
            this.renderAddedImages(pageWrapper, pageData, pIdx);

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
            pageWrapper.className = 'canvas-page-wrapper docx-mode relative shadow-2xl bg-white mb-8 mx-auto text-neutral-900 shrink-0';
            pageWrapper.style.width = (setup.width * this.scale) + 'px';
            pageWrapper.style.minWidth = (setup.width * this.scale) + 'px';
            pageWrapper.style.height = (setup.height * this.scale) + 'px';
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
                    pEl.style.fontSize = (el.fontSize * this.scale) + 'px';
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
                    tblWrapper.className = 'docx-interactive-table my-3 p-1 rounded border border-neutral-300';
                    
                    const rows = el.extra?.rows || [];
                    let tableHtml = `<table style="width: 100%; border-collapse: collapse; font-size: ${10 * this.scale}pt; font-family: 'Times New Roman';">`;
                    rows.forEach((r, rIdx) => {
                        tableHtml += '<tr>';
                        r.forEach((c, cIdx) => {
                            tableHtml += `<td class="docx-interactive-cell cursor-pointer hover:bg-blue-100/70 transition-colors p-1" data-row="${rIdx}" data-col="${cIdx}" style="border: 1px solid #71717a; padding: ${3 * this.scale}px ${6 * this.scale}px; vertical-align: top;">${escapeHtml(c.text)}</td>`;
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

                    // Cell click listener
                    tblWrapper.querySelectorAll('.docx-interactive-cell').forEach(cellEl => {
                        cellEl.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.selectElement(el.id, pageWrapper);
                            const rIdx = parseInt(cellEl.dataset.row, 10);
                            const cIdx = parseInt(cellEl.dataset.col, 10);
                            const cellData = rows[rIdx]?.[cIdx];
                            if (cellData && this.onElementEdit) {
                                this.onElementEdit({
                                    id: el.id,
                                    text: cellData.text,
                                    isTableCell: true,
                                    rowIndex: rIdx,
                                    colIndex: cIdx
                                }, cellEl);
                            }
                        });
                    });

                    pageWrapper.appendChild(tblWrapper);
                }
            });

            // Render Added Signatures / Stamps / Images for DOCX
            this.renderAddedImages(pageWrapper, pageData, pIdx);

            this.container.appendChild(pageWrapper);
        });
    }

    renderAddedImages(pageWrapper, pageData, pIdx) {
        if (!pageData.addedImages || pageData.addedImages.length === 0) return;

        pageData.addedImages.forEach(img => {
            const box = document.createElement('div');
            box.className = 'canvas-added-image-box absolute border-2 border-dashed border-blue-400 bg-blue-500/10 cursor-move z-30 group rounded select-none shadow-lg';
            box.style.left = (img.x * this.scale) + 'px';
            box.style.top = (img.y * this.scale) + 'px';
            box.style.width = (img.width * this.scale) + 'px';
            box.style.height = (img.height * this.scale) + 'px';

            box.innerHTML = `
                <img src="${img.dataUrl}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
                <button type="button" class="btn-del-img absolute -top-2.5 -right-2.5 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full text-[10px] items-center justify-center hidden group-hover:flex shadow z-40 transition-transform active:scale-90" title="Hapus Gambar / TTD">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;

            // Delete button
            const delBtn = box.querySelector('.btn-del-img');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onDeleteImage) {
                    this.onDeleteImage(img.id);
                }
            });

            // Drag to position
            let isDragging = false;
            let startX = 0, startY = 0, origLeft = 0, origTop = 0;

            box.addEventListener('mousedown', (e) => {
                if (e.target.closest('.btn-del-img')) return;
                e.preventDefault();
                e.stopPropagation();
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                origLeft = parseFloat(box.style.left) || 0;
                origTop = parseFloat(box.style.top) || 0;

                const onMouseMove = (moveEv) => {
                    if (!isDragging) return;
                    const dx = moveEv.clientX - startX;
                    const dy = moveEv.clientY - startY;
                    const newLeft = Math.max(0, origLeft + dx);
                    const newTop = Math.max(0, origTop + dy);
                    box.style.left = newLeft + 'px';
                    box.style.top = newTop + 'px';
                    img.x = newLeft / this.scale;
                    img.y = newTop / this.scale;
                };

                const onMouseUp = () => {
                    isDragging = false;
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });

            pageWrapper.appendChild(box);
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

function measureParagraphHeight(text, widthPt, fontSizePt, fontFamily = 'Times New Roman', lineHeightRatio = 1.45) {
    if (!text) return fontSizePt * lineHeightRatio;
    let measurer = document.getElementById('ude_text_measurer');
    if (!measurer) {
        measurer = document.createElement('div');
        measurer.id = 'ude_text_measurer';
        measurer.style.cssText = `
            position: absolute;
            left: -9999px;
            top: -9999px;
            visibility: hidden;
            pointer-events: none;
            word-break: break-word;
            white-space: normal;
            text-align: justify;
            box-sizing: border-box;
            padding: 0;
            margin: 0;
        `;
        document.body.appendChild(measurer);
    }
    measurer.style.width = widthPt + 'px';
    measurer.style.fontSize = fontSizePt + 'px';
    measurer.style.fontFamily = `"${fontFamily}", serif`;
    measurer.style.lineHeight = String(lineHeightRatio);
    measurer.innerText = text;
    const measuredHeight = measurer.getBoundingClientRect().height;
    return Math.ceil(measuredHeight) + 8;
}

/**
 * Universal Sub-Pixel Reflow & Multi-Page Pagination Calculator
 * Reflows downstream elements when paragraphs expand, and spills overflowing
 * elements onto Page 2 when y + height > pageHeight - marginBottom.
 */
export function calculateReflowAndPagination(elements, pageHeight = 842, marginBottom = 50) {
    if (!elements || elements.length === 0) {
        return { pages: [{ pageIndex: 0, elements: [] }] };
    }

    const getY = (el) => (el.rect ? el.rect.y : el.y) || 0;
    const getHeight = (el) => (el.rect ? el.rect.height : el.height) || 0;

    let cumulativeShift = 0;
    const page1Elements = [];
    const page2Elements = [];
    let firstSpillY = null;
    const page2MarginTop = 50;

    for (const el of elements) {
        const origY = getY(el);
        const origH = getHeight(el);
        const isModified = Boolean(el.isModified);
        const expandedH = (isModified && el.expandedHeight) ? el.expandedHeight : origH;
        const currentH = expandedH;

        const effectiveY = origY + cumulativeShift;

        // Check if this element triggers vertical shift downstream
        if (isModified && el.expandedHeight && el.expandedHeight > origH) {
            const deltaH = el.expandedHeight - origH;
            cumulativeShift += deltaH;
        }

        // Determine if element overflows Page 1
        // Element overflows if effectiveY > (pageHeight - marginBottom) OR bottom exceeds pageHeight
        const isOverflow = (effectiveY > (pageHeight - marginBottom)) || ((effectiveY + currentH) > pageHeight);

        if (isOverflow || page2Elements.length > 0) {
            if (firstSpillY === null) {
                firstSpillY = effectiveY;
            }
            const relativeOffset = effectiveY - firstSpillY;
            const newY = page2MarginTop + relativeOffset;

            const spilledEl = {
                ...el,
                y: newY,
                shiftedY: newY,
                originalPage: 0,
                pageIndex: 1
            };
            if (spilledEl.rect) {
                spilledEl.rect = { ...spilledEl.rect, y: newY };
            }
            page2Elements.push(spilledEl);
        } else {
            const page1El = {
                ...el,
                shiftedY: cumulativeShift > 0 && !isModified ? effectiveY : (isModified ? effectiveY : undefined),
                cumulativeShift: cumulativeShift
            };
            page1Elements.push(page1El);
        }
    }

    const pages = [{ pageIndex: 0, elements: page1Elements }];
    if (page2Elements.length > 0) {
        pages.push({ pageIndex: 1, elements: page2Elements });
    }

    return { pages };
}
