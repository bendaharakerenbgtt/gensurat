/**
 * PDF Import Adapter - UDE-001
 * Uses PDF.js to parse PDF pages, extract text coordinates, and render background canvas.
 */
import { createDocumentModel, createPageModel, createElementModel } from './dim.js';

export async function parsePdfDocument(arrayBuffer, filename) {
    if (typeof window.pdfjsLib === 'undefined') {
        throw new Error('PDF.js library is not loaded. Please check CDN connection.');
    }

    // Configure PDF.js worker
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const loadingTask = window.pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer.slice(0)),
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true
    });

    const pdfDoc = await loadingTask.promise;
    const docModel = createDocumentModel('pdf', filename, arrayBuffer.slice(0));
    docModel.metadata.pageCount = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });

        const pageModel = createPageModel(
            pageNum - 1,
            viewport.width,
            viewport.height,
            viewport.width > viewport.height ? 'landscape' : 'portrait'
        );

        // Extract Text Content with Coordinates
        const textContent = await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false
        });

        // Group into lines or keep individual semantic text runs
        const rawItems = textContent.items || [];
        const lines = groupTextItemsIntoLines(rawItems, viewport.height);

        lines.forEach((line, idx) => {
            const el = createElementModel('text', {
                text: line.text,
                x: line.x,
                y: line.y,
                width: line.width,
                height: line.height,
                fontSize: line.fontSize,
                fontFamily: mapPdfFontFamily(line.fontName),
                sourceRef: {
                    pageIndex: pageNum - 1,
                    lineIndex: idx,
                    rawItems: line.rawItems,
                    pdfX: line.pdfX,
                    pdfY: line.pdfY,
                    pdfWidth: line.width,
                    pdfHeight: line.height
                }
            });
            pageModel.elements.push(el);
        });

        docModel.pages.push(pageModel);
    }

    return docModel;
}

/**
 * Intelligent grouping of text items into single lines
 * to make in-place clicking feel natural like selecting words/sentences.
 */
function groupTextItemsIntoLines(items, pageHeight) {
    if (!items || items.length === 0) return [];

    const lines = [];
    let currentLine = null;

    // Filter out completely whitespace items
    const validItems = items.filter(it => it.str && it.str.trim().length > 0);

    validItems.forEach((it, idx) => {
        const tx = it.transform[4];
        const ty = it.transform[5];
        // Calculate font size from vertical transform scale
        const fontSize = Math.max(8, Math.round(Math.hypot(it.transform[2], it.transform[3])));
        const itemHeight = it.height || fontSize;
        const itemWidth = it.width || (it.str.length * fontSize * 0.55);

        // Convert PDF coordinates (origin bottom-left) to Web Canvas coordinates (origin top-left)
        const webY = pageHeight - ty - (fontSize * 0.85);

        if (currentLine &&
            Math.abs(currentLine.pdfY - ty) <= 3 && // Same horizontal baseline
            (tx - (currentLine.x + currentLine.width)) <= (fontSize * 1.5) && // Reasonably close horizontally
            (tx >= currentLine.x - 2)) {
            // Merge into current line
            const spaceNeeded = (tx - (currentLine.x + currentLine.width)) > (fontSize * 0.25) ? ' ' : '';
            currentLine.text += spaceNeeded + it.str;
            currentLine.width = (tx + itemWidth) - currentLine.x;
            currentLine.height = Math.max(currentLine.height, itemHeight);
            currentLine.rawItems.push({ ...it, webY, fontSize, tx, ty });
        } else {
            // Start a new line
            if (currentLine) {
                lines.push(currentLine);
            }
            currentLine = {
                text: it.str,
                x: tx,
                y: webY,
                pdfX: tx,
                pdfY: ty,
                width: itemWidth,
                height: itemHeight,
                fontSize: fontSize,
                fontName: it.fontName || '',
                rawItems: [{ ...it, webY, fontSize, tx, ty }]
            };
        }
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

function mapPdfFontFamily(pdfFontName) {
    if (!pdfFontName) return 'Times New Roman';
    const lower = pdfFontName.toLowerCase();
    if (lower.includes('times') || lower.includes('serif') || lower.includes('cambria') || lower.includes('georgia')) {
        return 'Times New Roman';
    }
    if (lower.includes('arial') || lower.includes('helvetica') || lower.includes('calibri') || lower.includes('sans')) {
        return 'Arial';
    }
    if (lower.includes('courier') || lower.includes('mono') || lower.includes('consolas')) {
        return 'Courier New';
    }
    return 'Times New Roman';
}
