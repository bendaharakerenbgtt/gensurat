/**
 * Main Controller - Universal Document Engine (UDE-001)
 * Coordinates file imports, visual canvas, mutations, inspector, and dual exports.
 */

import { parsePdfDocument } from './engine/pdf_adapter.js?v=2.2.0';
import { parseDocxDocument } from './engine/docx_adapter.js?v=2.2.0';
import { CanvasRenderer } from './engine/canvas_renderer.js?v=2.2.0';
import { MutationEngine } from './engine/mutation_engine.js?v=2.2.0';
import { InspectorPanel } from './engine/inspector.js?v=2.2.0';
import { exportToPdf } from './engine/export_pdf.js?v=2.2.0';
import { exportToDocx } from './engine/export_docx.js?v=2.2.0';

let currentDocModel = null;
let canvasRenderer = null;
let mutationEngine = null;
let inspectorPanel = null;
let currentZoom = 1.0;

document.addEventListener('DOMContentLoaded', () => {
    initEngine();
});

function initEngine() {
    const canvasContainer = document.getElementById('canvas_pages_container');
    const inspectorEl = document.getElementById('inspector_panel_content');
    const hierarchyEl = document.getElementById('hierarchy_panel_content');

    // 1. Initialize Inspector
    inspectorPanel = new InspectorPanel(
        inspectorEl,
        hierarchyEl,
        (elementId, newText) => {
            if (mutationEngine) {
                mutationEngine.updateElementText(elementId, newText);
            }
        },
        (tableId) => {
            if (mutationEngine) {
                mutationEngine.addTableRow(tableId);
                showStatusBadge('Baris baru berhasil ditambahkan ke tabel!');
            }
        },
        (elementId, dataUrl, imageBytes, mimeType) => {
            if (mutationEngine) {
                mutationEngine.updateKopLogo(elementId, dataUrl, imageBytes, mimeType);
                showStatusBadge('Logo Kop Surat berhasil diperbarui!');
            }
        },
        (elementId) => {
            if (mutationEngine) {
                mutationEngine.removeKopLogo(elementId);
                showStatusBadge('Logo Kop Surat dikosongkan.');
            }
        },
        (elementId) => {
            if (mutationEngine) {
                mutationEngine.resetKopLogo(elementId);
                showStatusBadge('Logo Kop dikembalikan ke asli.');
            }
        }
    );

    // 2. Initialize Canvas Renderer
    canvasRenderer = new CanvasRenderer(
        canvasContainer,
        (selectedElement, page) => {
            // Element selected
            inspectorPanel.renderElement(selectedElement, page);
            updateHierarchySelection(selectedElement.id);
        },
        (elementToEdit, targetDomEl) => {
            // Double click -> Quick in-place popover
            openQuickPopoverEdit(elementToEdit, targetDomEl);
        },
        (deletedImageId) => {
            if (mutationEngine) {
                mutationEngine.deleteSignatureImage(deletedImageId);
                showStatusBadge('Gambar / Tanda Tangan dihapus');
            }
        }
    );

    // 3. Initialize Mutation Engine
    mutationEngine = new MutationEngine(null, (docModel, mutationRecord) => {
        updateUndoRedoButtons();
        // Re-render canvas preserving scroll and selection
        canvasRenderer.render(docModel);
        inspectorPanel.renderHierarchy(docModel, (elId) => {
            canvasRenderer.selectElement(elId);
        });
        showStatusBadge('Perubahan disimpan');
    });
    window.mutationEngineInstance = mutationEngine;

    // 4. File Input & Drag/Drop
    setupFileInput();

    // 5. Toolbar Actions (Zoom, Undo, Redo, Export)
    setupToolbar();

    // 6. Check URL params (e.g. sample file or sample load)
    const urlParams = new URLSearchParams(window.location.search);
    const sampleParam = urlParams.get('sample');
    if (sampleParam) {
        loadSampleFile(sampleParam);
    }
}

function setupFileInput() {
    const fileInput = document.getElementById('document_file_input');
    const dropZone = document.getElementById('engine_drop_zone');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleUploadedFile(file);
        });
    }

    if (dropZone) {
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('border-blue-500', 'bg-blue-950/20');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('border-blue-500', 'bg-blue-950/20');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            if (file) handleUploadedFile(file);
        });
    }
}

export async function handleUploadedFile(file) {
    showLoading(true, `Membaca dokumen ${file.name}...`);
    try {
        const arrayBuffer = await file.arrayBuffer();
        const ext = file.name.split('.').pop().toLowerCase();

        let docModel = null;
        if (ext === 'pdf') {
            docModel = await parsePdfDocument(arrayBuffer.slice(0), file.name);
        } else if (ext === 'docx') {
            docModel = await parseDocxDocument(arrayBuffer.slice(0), file.name);
        } else {
            throw new Error('Format file tidak didukung. Harap upload file .pdf atau .docx.');
        }

        currentDocModel = docModel;
        mutationEngine.setDocument(docModel);

        // Update UI
        document.getElementById('doc_filename_title').innerText = file.name;
        document.getElementById('doc_format_badge').innerText = ext.toUpperCase();
        document.getElementById('doc_format_badge').className = ext === 'pdf'
            ? 'px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-red-950 text-red-400 border border-red-800'
            : 'px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-950 text-blue-400 border border-blue-800';

        document.getElementById('doc_page_count_badge').innerText = `${docModel.pages.length} Halaman`;

        // Render Canvas
        await canvasRenderer.render(docModel);

        // Render Hierarchy Tree
        inspectorPanel.renderHierarchy(docModel, (elId) => {
            canvasRenderer.selectElement(elId);
        });

        // Hide empty state dropzone, show canvas workspace
        document.getElementById('empty_workspace_state')?.classList.add('hidden');
        document.getElementById('canvas_viewport')?.classList.remove('hidden');

        updateUndoRedoButtons();
        showLoading(false);
        showStatusBadge(`Berhasil membuka ${file.name}`);

    } catch (err) {
        console.error('Error loading document:', err);
        showLoading(false);
        alert('Gagal membuka dokumen: ' + err.message);
    }
}

function setupToolbar() {
    // Zoom In / Out
    document.getElementById('btn_zoom_in')?.addEventListener('click', () => {
        currentZoom = Math.min(2.0, currentZoom + 0.15);
        applyZoom();
    });

    document.getElementById('btn_zoom_out')?.addEventListener('click', () => {
        currentZoom = Math.max(0.5, currentZoom - 0.15);
        applyZoom();
    });

    document.getElementById('btn_zoom_reset')?.addEventListener('click', () => {
        currentZoom = 1.0;
        applyZoom();
    });

    // Undo / Redo
    document.getElementById('btn_undo')?.addEventListener('click', () => {
        if (mutationEngine) mutationEngine.undo();
    });

    document.getElementById('btn_redo')?.addEventListener('click', () => {
        if (mutationEngine) mutationEngine.redo();
    });

    // Export PDF
    document.getElementById('btn_export_pdf')?.addEventListener('click', async () => {
        if (!currentDocModel) return;
        showLoading(true, 'Menyusun berkas PDF...');
        try {
            await exportToPdf(currentDocModel);
            showLoading(false);
            showStatusBadge('PDF berhasil diunduh!');
        } catch (err) {
            showLoading(false);
            alert('Gagal ekspor PDF: ' + err.message);
        }
    });

    // Export DOCX
    document.getElementById('btn_export_docx')?.addEventListener('click', async () => {
        if (!currentDocModel) return;
        showLoading(true, 'Menyusun berkas Microsoft Word (.docx)...');
        try {
            await exportToDocx(currentDocModel);
            showLoading(false);
            showStatusBadge('DOCX berhasil diunduh!');
        } catch (err) {
            showLoading(false);
            alert('Gagal ekspor DOCX: ' + err.message);
        }
    });

    // Signature & Image insertion
    const sigInput = document.getElementById('signature_file_input');
    const sigBtn = document.getElementById('btn_insert_signature');
    if (sigBtn && sigInput) {
        sigBtn.addEventListener('click', () => {
            if (!currentDocModel) {
                alert('Harap buka atau upload dokumen terlebih dahulu sebelum menyisipkan tanda tangan.');
                return;
            }
            sigInput.click();
        });

        sigInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !currentDocModel) return;

            const arrayBuffer = await file.arrayBuffer();
            const reader = new FileReader();
            reader.onload = (loadEv) => {
                const dataUrl = loadEv.target.result;
                const newImageObj = {
                    id: 'sig_' + Date.now(),
                    type: 'signature',
                    x: 80,
                    y: 350,
                    width: 140,
                    height: 70,
                    dataUrl: dataUrl,
                    bytes: new Uint8Array(arrayBuffer),
                    mimeType: file.type || 'image/png'
                };
                mutationEngine.addSignatureImage(0, newImageObj);
                showStatusBadge('Tanda tangan berhasil disisipkan. Anda dapat menggeser posisinya di atas kertas!');
            };
            reader.readAsDataURL(file);
            sigInput.value = '';
        });
    }
}

function applyZoom() {
    document.getElementById('zoom_level_label').innerText = `${Math.round(currentZoom * 100)}%`;
    if (canvasRenderer) {
        canvasRenderer.setScale(currentZoom);
    }
}

function updateUndoRedoButtons() {
    const btnUndo = document.getElementById('btn_undo');
    const btnRedo = document.getElementById('btn_redo');
    if (btnUndo) btnUndo.disabled = !mutationEngine?.canUndo();
    if (btnRedo) btnRedo.disabled = !mutationEngine?.canRedo();
}

function updateHierarchySelection(elementId) {
    document.querySelectorAll('.hierarchy-tree-node').forEach(node => {
        if (node.dataset.elementId === elementId) {
            node.classList.add('bg-blue-950/60', 'text-blue-300', 'font-medium');
        } else {
            node.classList.remove('bg-blue-950/60', 'text-blue-300', 'font-medium');
        }
    });
}

function openQuickPopoverEdit(element, targetDomEl) {
    const popover = document.getElementById('quick_edit_popover');
    const input = document.getElementById('quick_popover_input');
    if (!popover || !input) return;

    const rect = targetDomEl.getBoundingClientRect();
    popover.style.left = Math.max(10, rect.left) + 'px';
    popover.style.top = Math.max(10, rect.bottom + 6) + 'px';
    popover.classList.remove('hidden');

    input.value = element.text;
    input.focus();
    input.select();

    const applyChange = () => {
        if (input.value !== element.text) {
            if (element.isTableCell) {
                mutationEngine.updateTableCellText(element.id, element.rowIndex, element.colIndex, input.value);
            } else {
                mutationEngine.updateElementText(element.id, input.value);
            }
        }
        popover.classList.add('hidden');
    };

    // Save on Enter or button click
    const submitBtn = document.getElementById('quick_popover_submit');
    const cancelBtn = document.getElementById('quick_popover_cancel');

    submitBtn.onclick = applyChange;
    cancelBtn.onclick = () => popover.classList.add('hidden');

    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            applyChange();
        } else if (e.key === 'Escape') {
            popover.classList.add('hidden');
        }
    };
}

function showLoading(show, message = 'Memproses...') {
    const loader = document.getElementById('engine_loading_overlay');
    const label = document.getElementById('engine_loading_message');
    if (!loader) return;
    if (label) label.innerText = message;
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function showStatusBadge(msg) {
    const badge = document.getElementById('engine_status_pill');
    if (!badge) return;
    badge.innerText = msg;
    badge.classList.remove('opacity-0');
    setTimeout(() => badge.classList.add('opacity-0'), 3000);
}

// Window global helper for testing
window.handleUploadedFile = handleUploadedFile;
window.getCurrentDocModel = () => currentDocModel;
