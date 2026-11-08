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
            targetEl.text = lastAction.oldText;
            targetEl.isModified = (targetEl.text !== targetEl.originalText);

            if (this.docModel.source.format === 'docx' && targetEl.sourceRef?.xmlNode) {
                this.syncDocxXmlNode(targetEl.sourceRef.xmlNode, lastAction.oldText);
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
            targetEl.text = action.newText;
            targetEl.isModified = true;

            if (this.docModel.source.format === 'docx' && targetEl.sourceRef?.xmlNode) {
                this.syncDocxXmlNode(targetEl.sourceRef.xmlNode, action.newText);
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
}
