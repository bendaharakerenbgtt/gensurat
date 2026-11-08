/**
 * PDF Import Adapter - UDE-001
 * Uses PDF.js to parse PDF pages, extract text coordinates, images, and render background canvas.
 */
import { createDocumentModel, createPageModel, createElementModel } from './dim.js';
import { detectDocumentStructure } from './semantic_detector.js';

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

        // 1. Extract Real Image Bounding Boxes from Operator List
        const extractedImages = await extractPdfImages(page, viewport);

        // 2. Extract Text Content with Coordinates
        const textContent = await page.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false
        });

        // Group into lines
        const rawItems = textContent.items || [];
        const lines = groupTextItemsIntoLines(rawItems, viewport.height);

        // 3. Run Universal Semantic Zone Detector
        const structure = detectDocumentStructure(lines, extractedImages, { width: viewport.width, height: viewport.height });

        // 4. Add Dynamic Kop Logos (Derived from actual images in top zone)
        const logoCandidates = extractedImages.filter(img => img.isLogo);

        if (logoCandidates.length > 0) {
            // Sort left-to-right
            logoCandidates.sort((a, b) => a.x - b.x);
            logoCandidates.forEach((img, idx) => {
                const isLeft = img.x < (viewport.width / 2);
                const title = isLeft ? 'Logo Kiri (Kampus / Instansi)' : 'Logo Kanan (Organisasi / Kabinet)';
                pageModel.elements.push(createElementModel('kop_logo', {
                    text: isLeft ? 'Logo Kampus (Kiri)' : 'Logo Organisasi (Kanan)',
                    x: img.x,
                    y: img.y,
                    width: img.width,
                    height: img.height,
                    extra: {
                        logoPosition: isLeft ? 'left' : 'right',
                        title: title,
                        objId: img.objId,
                        pdfX: img.pdfX,
                        pdfY: img.pdfY
                    }
                }));
            });
        } else if (structure.kopZone.lines.length > 0) {
            // Fallback for documents with text kop but vector/missing images
            pageModel.elements.push(createElementModel('kop_logo', {
                text: 'Logo Kampus (Kiri)',
                x: 45,
                y: Math.max(10, structure.kopZone.lines[0]?.y - 15 || 15),
                width: 80,
                height: 80,
                extra: { logoPosition: 'left', title: 'Logo Kiri (Kampus / Instansi)' }
            }));
        }

        // 5. Add Structured Lines and Flowable Paragraphs using Unified Semantic Lines
        const linesToGroup = (structure && structure.unifiedLines && structure.unifiedLines.length > 0) ? structure.unifiedLines : lines;
        const elements = groupLinesIntoParagraphs(linesToGroup, viewport.height);

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
 * Traverses PDF.js operator list to recover exact dimensions and positions of embedded images.
 */
export async function extractPdfImages(page, viewport) {
    if (!page.getOperatorList) return [];
    try {
        const ops = await page.getOperatorList();
        const OPS = window.pdfjsLib?.OPS || {};
        const images = [];

        let ctm = [1, 0, 0, 1, 0, 0];
        const stack = [];

        for (let i = 0; i < ops.fnArray.length; i++) {
            const fn = ops.fnArray[i];
            const args = ops.argsArray[i];

            if (fn === OPS.save) {
                stack.push([...ctm]);
            } else if (fn === OPS.restore) {
                if (stack.length > 0) ctm = stack.pop();
            } else if (fn === OPS.transform) {
                ctm = multiplyTransform(ctm, args);
            } else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintJpegXObject) {
                const objId = args?.[0] || ('img_' + i);
                const pdfWidth = Math.round(Math.hypot(ctm[0], ctm[1]));
                const pdfHeight = Math.round(Math.hypot(ctm[2], ctm[3]));
                const pdfX = ctm[4];
                const pdfY = ctm[5];

                const webY = Math.round(viewport.height - (pdfY + pdfHeight));
                const webX = Math.round(pdfX);

                if (pdfWidth >= 16 && pdfHeight >= 16) {
                    const isTopArea = (webY < viewport.height * 0.28);
                    const isWatermark = (pdfWidth > viewport.width * 0.4 && pdfHeight > viewport.height * 0.25);
                    const isLogo = isTopArea && !isWatermark;

                    images.push({
                        objId,
                        x: Math.max(0, webX),
                        y: Math.max(0, webY),
                        width: pdfWidth,
                        height: pdfHeight,
                        pdfX,
                        pdfY,
                        isLogo,
                        isWatermark
                    });
                }
            }
        }
        return images;
    } catch (err) {
        console.warn('Operator list image extraction fallback:', err);
        return [];
    }
}

function multiplyTransform(m1, m2) {
    return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
    ];
}

/**
 * Intelligent grouping of text items into single lines
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
 */
function groupLinesIntoParagraphs(lines, pageHeight) {
    if (!lines || lines.length === 0) return [];

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

        // Never merge Kop Surat (top 25% of page) into a prose paragraph
        const isKopSurat = (line.y < pageHeight * 0.22 || prev.y < pageHeight * 0.22);
        const hasLabel = isLabelOrMetadata(line.text) || isLabelOrMetadata(prev.text) || isKopSurat;

        if (isVerticallyAdjacent && sameFontSize && !hasLabel && (bothAreWide || (sameLeftMargin && line.text.length > 30))) {
            current.lines.push(line);
            current.text += ' ' + line.text;
            current.rawItems.push(...line.rawItems);
            current.x = Math.min(current.x, line.x);
            current.width = Math.max(current.width, (line.x + line.width) - current.x);
            current.height = (line.y + line.height) - current.y;
            current.pdfY = Math.min(current.pdfY, line.pdfY);
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
