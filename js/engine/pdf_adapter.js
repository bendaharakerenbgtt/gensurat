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

        // Group into lines then group adjacent lines into semantic paragraphs
        const rawItems = textContent.items || [];
        const lines = groupTextItemsIntoLines(rawItems, viewport.height);
        const elements = groupLinesIntoParagraphs(lines, viewport.height);

        // Detect if page has Kop Surat (header lines at y < 95)
        const hasKopHeader = lines.some(l => l.y < 95);
        if (hasKopHeader) {
            // Add Interactive Logo Kiri (Logo Kampus)
            pageModel.elements.push(createElementModel('kop_logo', {
                text: 'Logo Kampus (Kiri)',
                x: 46,
                y: 5,
                width: 98,
                height: 90,
                extra: {
                    logoPosition: 'left',
                    title: 'Logo Kiri (Kampus / Instansi)'
                }
            }));

            // Add Interactive Logo Kanan (Logo Organisasi / Kabinet)
            pageModel.elements.push(createElementModel('kop_logo', {
                text: 'Logo Organisasi (Kanan)',
                x: 448,
                y: 5,
                width: 98,
                height: 90,
                extra: {
                    logoPosition: 'right',
                    title: 'Logo Kanan (Organisasi / Kabinet)'
                }
            }));
        }

        elements.forEach((elData, idx) => {
            const el = createElementModel(elData.isParagraph ? 'paragraph' : 'text', {
                text: elData.text,
                x: elData.x,
                y: elData.y,
                width: elData.width,
                height: elData.height,
                fontSize: elData.fontSize,
                fontFamily: mapPdfFontFamily(elData.fontName),
                sourceRef: {
                    pageIndex: pageNum - 1,
                    elementIndex: idx,
                    rawItems: elData.rawItems,
                    pdfX: elData.pdfX,
                    pdfY: elData.pdfY,
                    pdfWidth: elData.width,
                    pdfHeight: elData.height,
                    lineHeight: elData.lineHeight || (elData.fontSize * 1.45),
                    isParagraph: elData.isParagraph,
                    linesCount: elData.lines?.length || 1,
                    firstLineIndent: Math.max(0, (elData.lines?.[0]?.x || elData.x) - elData.x)
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

    items.forEach((it) => {
        if (!it.str && it.width === 0) return;

        const tx = it.transform[4];
        const ty = it.transform[5];
        const fontSize = Math.max(8, Math.round(Math.hypot(it.transform[2], it.transform[3])));
        const itemHeight = it.height || fontSize;
        const itemWidth = it.width || (it.str.length * fontSize * 0.55);
        const webY = pageHeight - ty - (fontSize * 0.85);

        // Preserve whitespace
        if (it.str === ' ' || it.str === '\u00A0') {
            if (currentLine && !currentLine.text.endsWith(' ')) {
                currentLine.text += ' ';
            }
            return;
        }

        if (it.str.trim().length === 0) return;

        if (currentLine &&
            Math.abs(currentLine.pdfY - ty) <= 3 && // Same horizontal baseline
            (tx - (currentLine.x + currentLine.width)) <= (fontSize * 2.0) &&
            (tx >= currentLine.x - 2)) {
            // Check if space needed between words
            const gap = tx - (currentLine.x + currentLine.width);
            const needsSpace = (gap >= 1.0) && !currentLine.text.endsWith(' ') && !it.str.startsWith(' ');
            currentLine.text += (needsSpace ? ' ' : '') + it.str;
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

/**
 * Intelligent Layout-Aware Paragraph Grouping:
 * Merges consecutive lines that belong to the same body paragraph
 * so that users can edit entire paragraphs with natural text reflow like in Word.
 */
function groupLinesIntoParagraphs(lines, pageHeight) {
    if (!lines || lines.length === 0) return [];

    // Sort lines by vertical position (y) ascending
    const sortedLines = [...lines].sort((a, b) => {
        if (Math.abs(a.y - b.y) <= 3) return a.x - b.x;
        return a.y - b.y;
    });

    const paragraphs = [];
    let current = null;

    const isLabelOrMetadata = (str) => {
        const trimmed = (str || '').trim();
        return /^(nomor|hal|lampiran|perihal|tembusan|yth|di tempat|kepada)\b/i.test(trimmed) ||
               /^(nomor|hal|lampiran|perihal)\s*:/i.test(trimmed) ||
               /^(\d+\.|\([a-z0-9]+\))\s+/i.test(trimmed);
    };

    for (const line of sortedLines) {
        if (!current) {
            current = { ...line, lines: [line], isParagraph: false };
            continue;
        }

        const prev = current.lines[current.lines.length - 1];
        const baselineDiff = Math.abs(prev.pdfY - line.pdfY);
        const isVerticallyAdjacent = (line.y > prev.y) && (baselineDiff > 5) && (baselineDiff <= prev.fontSize * 2.2);
        const sameLeftMargin = Math.abs(line.x - prev.x) <= 35;
        const bothAreWide = (line.width > 220 || prev.width > 220);
        const sameFontSize = Math.abs(line.fontSize - prev.fontSize) <= 1.5;

        // Never merge Kop Surat (top 95pt) into a prose paragraph!
        const isKopSurat = (line.y < 95 || prev.y < 95);
        // Never merge labels, letterheads, or metadata lines
        const hasLabel = isLabelOrMetadata(line.text) || isLabelOrMetadata(prev.text) || isKopSurat;

        if (isVerticallyAdjacent && sameFontSize && !hasLabel && (bothAreWide || (sameLeftMargin && line.text.length > 30))) {
            // Merge into current paragraph
            current.lines.push(line);
            current.text += ' ' + line.text;
            current.rawItems.push(...line.rawItems);
            current.x = Math.min(current.x, line.x);
            current.width = Math.max(current.width, (line.x + line.width) - current.x);
            current.height = (line.y + line.height) - current.y;
            current.pdfY = Math.min(current.pdfY, line.pdfY); // Lowest pdfY baseline
            current.lineHeight = baselineDiff;
            current.isParagraph = true;
        } else {
            paragraphs.push(current);
            current = { ...line, lines: [line], isParagraph: false };
        }
    }

    if (current) {
        paragraphs.push(current);
    }

    return paragraphs;
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
