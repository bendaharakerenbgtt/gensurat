/**
 * Document Mutation Engine - UDE-001
 * Deterministic mutator: applies changes to DIM, keeps undo/redo history,
 * and maintains live sync with DOCX XML DOM nodes.
 */

export class MutationEngine {
    constructor(docModel, onStateChanged) {
        this.docModel = docModel;
        this.onStateChanged = onStateChanged;
    }

    setDocument(docModel) {
        this.docModel = docModel;
    }

    updateElementText(elementId, newText) {
        if (!this.docModel) return;

        let targetEl = null;
        let targetPage = null;

        for (const page of this.docModel.pages) {
            for (const el of page.elements) {
                if (el.id === elementId) {
                    targetEl = el;
                    targetPage = page;
                    break;
                }
            }
            if (targetEl) break;
        }

        if (!targetEl) return;
        if (targetEl.text === newText) return;

        // Push to Undo Stack
        const mutationRecord = {
            elementId: elementId,
            type: 'UPDATE_TEXT',
            oldText: targetEl.text,
            newText: newText,
            timestamp: Date.now()
        };
        this.docModel.undoStack.push(mutationRecord);
        this.docModel.redoStack = []; // Clear redo

        // Apply mutation to DIM
        targetEl.text = newText;
        targetEl.isModified = true;

        // Record in document modifications list if not already there
        if (!this.docModel.modifications.includes(elementId)) {
            this.docModel.modifications.push(elementId);
        }

        // Live sync with DOCX XML if in docx mode
        if (this.docModel.source.format === 'docx' && targetEl.sourceRef && targetEl.sourceRef.xmlNode) {
            this.syncDocxXmlNode(targetEl.sourceRef.xmlNode, newText);
        }

        if (this.onStateChanged) {
            this.onStateChanged(this.docModel, mutationRecord);
        }
    }

    /**
     * Update <w:t> nodes inside paragraph or table cell XML
     */
    syncDocxXmlNode(xmlNode, newText) {
        try {
            const tNodes = xmlNode.getElementsByTagNameNS('*', 't');
            if (tNodes.length > 0) {
                // Set the first <w:t> to the new text and clear any subsequent fragmented <w:t> nodes in the same run
                tNodes[0].textContent = newText;
                for (let i = 1; i < tNodes.length; i++) {
                    tNodes[i].textContent = '';
                }
            }
        } catch (err) {
            console.warn('Failed to sync XML node:', err);
        }
    }

    undo() {
        if (!this.docModel || this.docModel.undoStack.length === 0) return;
        const lastAction = this.docModel.undoStack.pop();

        let targetEl = null;
        for (const page of this.docModel.pages) {
            for (const el of page.elements) {
                if (el.id === lastAction.elementId) {
                    targetEl = el;
                    break;
                }
            }
            if (targetEl) break;
        }

        if (targetEl) {
            if (lastAction.type === 'UPDATE_KOP_LOGO' || lastAction.type === 'REMOVE_KOP_LOGO') {
                targetEl.extra = targetEl.extra || {};
                targetEl.extra.newImageSrc = lastAction.oldSrc;
                targetEl.extra.imageBytes = lastAction.oldBytes;
                targetEl.extra.mimeType = lastAction.oldMime;
                targetEl.extra.isRemoved = lastAction.oldRemoved;
                targetEl.isModified = !!(lastAction.oldSrc || lastAction.oldRemoved);
            } else {
                targetEl.text = lastAction.oldText;
                targetEl.isModified = (targetEl.text !== targetEl.originalText);

                if (this.docModel.source.format === 'docx' && targetEl.sourceRef?.xmlNode) {
                    this.syncDocxXmlNode(targetEl.sourceRef.xmlNode, lastAction.oldText);
                }
            }

            this.docModel.redoStack.push(lastAction);

            if (this.onStateChanged) {
                this.onStateChanged(this.docModel, { type: 'UNDO', elementId: targetEl.id });
            }
        }
    }

    redo() {
        if (!this.docModel || this.docModel.redoStack.length === 0) return;
        const action = this.docModel.redoStack.pop();

        let targetEl = null;
        for (const page of this.docModel.pages) {
            for (const el of page.elements) {
                if (el.id === action.elementId) {
                    targetEl = el;
                    break;
                }
            }
            if (targetEl) break;
        }

        if (targetEl) {
            if (action.type === 'UPDATE_KOP_LOGO') {
                targetEl.extra = targetEl.extra || {};
                targetEl.extra.newImageSrc = action.newSrc;
                targetEl.extra.imageBytes = action.newBytes;
                targetEl.extra.mimeType = action.newMime;
                targetEl.extra.isRemoved = false;
                targetEl.isModified = true;
            } else if (action.type === 'REMOVE_KOP_LOGO') {
                targetEl.extra = targetEl.extra || {};
                targetEl.extra.isRemoved = true;
                targetEl.isModified = true;
            } else {
                targetEl.text = action.newText;
                targetEl.isModified = true;

                if (this.docModel.source.format === 'docx' && targetEl.sourceRef?.xmlNode) {
                    this.syncDocxXmlNode(targetEl.sourceRef.xmlNode, action.newText);
                }
            }

            this.docModel.undoStack.push(action);

            if (this.onStateChanged) {
                this.onStateChanged(this.docModel, { type: 'REDO', elementId: targetEl.id });
            }
        }
    }

    canUndo() {
        return this.docModel && this.docModel.undoStack && this.docModel.undoStack.length > 0;
    }

    canRedo() {
        return this.docModel && this.docModel.redoStack && this.docModel.redoStack.length > 0;
    }

    /**
     * Add a new row to an existing table
     */
    addTableRow(tableElementId) {
        if (!this.docModel) return;

        let tableEl = null;
        for (const page of this.docModel.pages) {
            for (const el of page.elements) {
                if (el.id === tableElementId && el.type === 'table') {
                    tableEl = el;
                    break;
                }
            }
            if (tableEl) break;
        }

        if (!tableEl || !tableEl.extra || !tableEl.extra.rows) return;

        const rows = tableEl.extra.rows;
        const colCount = tableEl.extra.colCount || (rows[0] ? rows[0].length : 1);
        const newRowIndex = rows.length;
        const newRow = [];

        // Clone XML row if in DOCX mode
        let clonedTr = null;
        if (this.docModel.source.format === 'docx' && tableEl.sourceRef?.xmlNode) {
            const trList = tableEl.sourceRef.xmlNode.getElementsByTagNameNS('*', 'tr');
            if (trList.length > 0) {
                clonedTr = trList[trList.length - 1].cloneNode(true);
                // Clear text in all <w:t> nodes of the cloned row
                const tNodes = clonedTr.getElementsByTagNameNS('*', 't');
                for (let i = 0; i < tNodes.length; i++) {
                    tNodes[i].textContent = '';
                }
                tableEl.sourceRef.xmlNode.appendChild(clonedTr);
            }
        }

        const tcList = clonedTr ? clonedTr.getElementsByTagNameNS('*', 'tc') : [];

        for (let c = 0; c < colCount; c++) {
            newRow.push({
                rowIndex: newRowIndex,
                colIndex: c,
                text: '',
                xmlNode: tcList[c] || null
            });
        }

        rows.push(newRow);
        tableEl.extra.rowCount = rows.length;
        tableEl.text = `[Tabel: ${rows.length} Baris x ${colCount} Kolom]`;
        tableEl.isModified = true;

        if (this.onStateChanged) {
            this.onStateChanged(this.docModel, { type: 'ADD_TABLE_ROW', tableId: tableElementId });
        }
    }

    /**
     * Update individual table cell text
     */
    updateTableCellText(tableElementId, rowIndex, colIndex, newText) {
        if (!this.docModel) return;

        let tableEl = null;
        for (const page of this.docModel.pages) {
            for (const el of page.elements) {
                if (el.id === tableElementId && el.type === 'table') {
                    tableEl = el;
                    break;
                }
            }
            if (tableEl) break;
        }

        if (!tableEl || !tableEl.extra || !tableEl.extra.rows) return;
        const cell = tableEl.extra.rows[rowIndex]?.[colIndex];
        if (!cell) return;

        cell.text = newText;
        tableEl.isModified = true;

        if (this.docModel.source.format === 'docx' && cell.xmlNode) {
            this.syncDocxXmlNode(cell.xmlNode, newText);
        }

        if (this.onStateChanged) {
            this.onStateChanged(this.docModel, { type: 'UPDATE_TABLE_CELL', tableId: tableElementId, rowIndex, colIndex });
        }
    }

    /**
     * Add a signature / stamp image onto a page
     */
    addSignatureImage(pageIndex, imageObj) {
        if (!this.docModel) return;
        const page = this.docModel.pages[pageIndex] || this.docModel.pages[0];
        if (!page) return;

        page.addedImages = page.addedImages || [];
        page.addedImages.push(imageObj);

        if (this.onStateChanged) {
            this.onStateChanged(this.docModel, { type: 'ADD_IMAGE', imageId: imageObj.id });
        }
    }

    /**
     * Delete an added signature / stamp image
     */
    deleteSignatureImage(imageId) {
        if (!this.docModel) return;
        for (const page of this.docModel.pages) {
            if (page.addedImages) {
                const idx = page.addedImages.findIndex(img => img.id === imageId);
                if (idx !== -1) {
                    page.addedImages.splice(idx, 1);
                    if (this.onStateChanged) {
                        this.onStateChanged(this.docModel, { type: 'DELETE_IMAGE', imageId });
                    }
                    return;
                }
            }
        }
    }

    /**
     * Update position/size of signature image
     */
    updateSignaturePosition(imageId, x, y, width, height) {
        if (!this.docModel) return;
        for (const page of this.docModel.pages) {
            if (page.addedImages) {
                const img = page.addedImages.find(i => i.id === imageId);
                if (img) {
                    img.x = Math.max(0, x);
                    img.y = Math.max(0, y);
                    if (width) img.width = width;
                    if (height) img.height = height;
                    return;
                }
            }
        }
    }

    /**
     * Update Kop Logo Image
     */
    updateKopLogo(elementId, newImageSrc, imageBytes, mimeType) {
        if (!this.docModel) return;
        let targetEl = null;
        for (const page of this.docModel.pages) {
            for (const el of page.elements) {
                if (el.id === elementId && el.type === 'kop_logo') {
                    targetEl = el;
                    break;
                }
            }
            if (targetEl) break;
        }
        if (!targetEl) return;

        const mutationRecord = {
            elementId,
            type: 'UPDATE_KOP_LOGO',
            oldSrc: targetEl.extra?.newImageSrc,
            oldBytes: targetEl.extra?.imageBytes,
            oldMime: targetEl.extra?.mimeType,
            oldRemoved: targetEl.extra?.isRemoved,
            newSrc: newImageSrc,
            newBytes: imageBytes,
            newMime: mimeType,
            timestamp: Date.now()
        };
        this.docModel.undoStack.push(mutationRecord);
        this.docModel.redoStack = [];

        targetEl.extra = targetEl.extra || {};
        targetEl.extra.newImageSrc = newImageSrc;
        targetEl.extra.imageBytes = imageBytes;
        targetEl.extra.mimeType = mimeType;
        targetEl.extra.isRemoved = false;
        targetEl.isModified = true;

        if (this.onStateChanged) {
            this.onStateChanged(this.docModel, mutationRecord);
        }
    }

    /**
     * Remove / Blank-out Kop Logo
     */
    removeKopLogo(elementId) {
        if (!this.docModel) return;
        let targetEl = null;
        for (const page of this.docModel.pages) {
            for (const el of page.elements) {
                if (el.id === elementId && el.type === 'kop_logo') {
                    targetEl = el;
                    break;
                }
            }
            if (targetEl) break;
        }
        if (!targetEl) return;

        const mutationRecord = {
            elementId,
            type: 'REMOVE_KOP_LOGO',
            oldSrc: targetEl.extra?.newImageSrc,
            oldBytes: targetEl.extra?.imageBytes,
            oldMime: targetEl.extra?.mimeType,
            oldRemoved: targetEl.extra?.isRemoved,
            newRemoved: true,
            timestamp: Date.now()
        };
        this.docModel.undoStack.push(mutationRecord);
        this.docModel.redoStack = [];

        targetEl.extra = targetEl.extra || {};
        targetEl.extra.isRemoved = true;
        targetEl.isModified = true;

        if (this.onStateChanged) {
            this.onStateChanged(this.docModel, mutationRecord);
        }
    }

    /**
     * Reset Kop Logo to original
     */
    resetKopLogo(elementId) {
        if (!this.docModel) return;
        let targetEl = null;
        for (const page of this.docModel.pages) {
            for (const el of page.elements) {
                if (el.id === elementId && el.type === 'kop_logo') {
                    targetEl = el;
                    break;
                }
            }
            if (targetEl) break;
        }
        if (!targetEl) return;

        delete targetEl.extra.newImageSrc;
        delete targetEl.extra.imageBytes;
        delete targetEl.extra.mimeType;
        delete targetEl.extra.isRemoved;
        targetEl.isModified = false;

        if (this.onStateChanged) {
            this.onStateChanged(this.docModel, { type: 'RESET_KOP_LOGO', elementId });
        }
    }
}
