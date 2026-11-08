/**
 * DOCX Import Adapter - UDE-001
 * Uses JSZip and DOMParser to parse Word OOXML document.xml, headers, styles, and media.
 */
import { createDocumentModel, createPageModel, createElementModel } from './dim.js';

export async function parseDocxDocument(arrayBuffer, filename) {
    if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip library is not loaded. Please check CDN connection.');
    }

    const zip = await window.JSZip.loadAsync(arrayBuffer);
    const docModel = createDocumentModel('docx', filename, arrayBuffer);

    // Save zip instance for Round-Trip Preservation
    docModel.source.zip = zip;

    // Check for word/document.xml
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
        throw new Error('Invalid DOCX file: word/document.xml not found.');
    }

    const docXmlStr = await docXmlFile.async('string');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXmlStr, 'application/xml');
    docModel.source.xmlDoc = xmlDoc;

    // Extract relationships (to resolve images)
    const relsFile = zip.file('word/_rels/document.xml.rels');
    const relsMap = {};
    if (relsFile) {
        const relsStr = await relsFile.async('string');
        const relsDoc = parser.parseFromString(relsStr, 'application/xml');
        const relNodes = relsDoc.getElementsByTagName('Relationship');
        for (let i = 0; i < relNodes.length; i++) {
            const id = relNodes[i].getAttribute('Id');
            const target = relNodes[i].getAttribute('Target');
            relsMap[id] = target;
        }
    }
    docModel.source.relsMap = relsMap;

    // Page setup from sectPr (default A4: 595.28 x 841.89 pt)
    let pageWidth = 595.28;
    let pageHeight = 841.89;
    let marginTop = 72; // 1 inch = 72 pt = 1440 twips
    let marginBottom = 72;
    let marginLeft = 72;
    let marginRight = 72;

    const sectPrNodes = xmlDoc.getElementsByTagNameNS('*', 'sectPr');
    if (sectPrNodes.length > 0) {
        const pgSz = sectPrNodes[0].getElementsByTagNameNS('*', 'pgSz')[0];
        if (pgSz) {
            const wTwips = parseInt(pgSz.getAttribute('w:w') || pgSz.getAttribute('w') || '11906', 10);
            const hTwips = parseInt(pgSz.getAttribute('h:h') || pgSz.getAttribute('h') || '16838', 10);
            pageWidth = Math.round(wTwips / 20 * 100) / 100;
            pageHeight = Math.round(hTwips / 20 * 100) / 100;
        }
        const pgMar = sectPrNodes[0].getElementsByTagNameNS('*', 'pgMar')[0];
        if (pgMar) {
            marginTop = Math.round(parseInt(pgMar.getAttribute('w:top') || '1440', 10) / 20);
            marginBottom = Math.round(parseInt(pgMar.getAttribute('w:bottom') || '1440', 10) / 20);
            marginLeft = Math.round(parseInt(pgMar.getAttribute('w:left') || '1440', 10) / 20);
            marginRight = Math.round(parseInt(pgMar.getAttribute('w:right') || '1440', 10) / 20);
        }
    }

    docModel.pageSetup = {
        width: pageWidth,
        height: pageHeight,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight
    };

    // Body parsing
    const body = xmlDoc.getElementsByTagNameNS('*', 'body')[0];
    if (!body) {
        throw new Error('Invalid DOCX: <w:body> not found.');
    }

    // Initialize first page
    let currentPageIndex = 0;
    let currentPage = createPageModel(currentPageIndex, pageWidth, pageHeight);
    docModel.pages.push(currentPage);

    // 1. Extract Headers (Kop Logos and Kop text from word/header*.xml)
    const headerElements = await parseDocxHeaders(zip, parser);
    if (headerElements.length > 0) {
        currentPage.elements.push(...headerElements);
    }

    // 2. Extract Body Elements
    let elementIndex = 0;
    const childNodes = body.childNodes;

    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType !== 1) continue; // Only elements

        const localName = node.localName || node.nodeName.split(':').pop();

        if (localName === 'p') {
            // Check for page break
            const pageBreak = node.getElementsByTagNameNS('*', 'br');
            for (let b = 0; b < pageBreak.length; b++) {
                if (pageBreak[b].getAttribute('w:type') === 'page') {
                    currentPageIndex++;
                    currentPage = createPageModel(currentPageIndex, pageWidth, pageHeight);
                    docModel.pages.push(currentPage);
                    break;
                }
            }

            // Paragraph element
            const pInfo = parseParagraphNode(node, elementIndex++);
            if (pInfo) {
                pInfo.sourceRef = {
                    nodeIndex: i,
                    localName: 'p',
                    xmlNode: node
                };
                currentPage.elements.push(pInfo);
            }
        } else if (localName === 'tbl') {
            // Table element
            const tblInfo = parseTableNode(node, elementIndex++);
            if (tblInfo) {
                tblInfo.sourceRef = {
                    nodeIndex: i,
                    localName: 'tbl',
                    xmlNode: node
                };
                currentPage.elements.push(tblInfo);
            }
        }
    }

    docModel.metadata.pageCount = docModel.pages.length;
    return docModel;
}

async function parseDocxHeaders(zip, parser) {
    const headerElements = [];
    const headerFiles = Object.keys(zip.files).filter(k => /^word\/header\d+\.xml$/i.test(k));

    for (const hPath of headerFiles) {
        const hFile = zip.file(hPath);
        if (!hFile) continue;
        const hXmlStr = await hFile.async('string');
        const hDoc = parser.parseFromString(hXmlStr, 'application/xml');

        // Check for header relationships
        const relsPath = hPath.replace('word/', 'word/_rels/') + '.rels';
        const relsFile = zip.file(relsPath);
        const relsMap = {};
        if (relsFile) {
            const relsStr = await relsFile.async('string');
            const relsDoc = parser.parseFromString(relsStr, 'application/xml');
            const relNodes = relsDoc.getElementsByTagName('Relationship');
            for (let i = 0; i < relNodes.length; i++) {
                relsMap[relNodes[i].getAttribute('Id')] = relNodes[i].getAttribute('Target');
            }
        }

        // 1. Look for drawing images (Kop logos & watermarks)
        const blipNodes = hDoc.getElementsByTagNameNS('*', 'blip');
        for (let i = 0; i < blipNodes.length; i++) {
            const embedId = blipNodes[i].getAttribute('r:embed') || blipNodes[i].getAttribute('embed');
            const target = relsMap[embedId];
            if (target) {
                const mediaPath = target.startsWith('media/') ? ('word/' + target) : (target.startsWith('word/') ? target : ('word/media/' + target.split('/').pop()));
                const mediaFile = zip.file(mediaPath);
                if (mediaFile) {
                    const u8 = await mediaFile.async('uint8array');
                    const b64 = uint8ToBase64(u8);
                    const ext = mediaPath.split('.').pop().toLowerCase();
                    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
                    const dataUrl = `data:${mime};base64,${b64}`;

                    const isLeft = (i === 0);
                    const logoEl = createElementModel('kop_logo', {
                        text: isLeft ? 'Logo Kampus (Kiri)' : 'Logo Organisasi (Kanan)',
                        x: isLeft ? 50 : 450,
                        y: 15,
                        width: 80,
                        height: 75,
                        extra: {
                            isHeader: true,
                            headerFile: hPath,
                            relId: embedId,
                            mediaPath: mediaPath,
                            imageBytes: u8,
                            mimeType: mime,
                            newImageSrc: dataUrl,
                            title: isLeft ? 'Logo Kiri (Kampus / Instansi)' : 'Logo Kanan (Organisasi / Kabinet)'
                        }
                    });
                    logoEl.id = 'docx_header_logo_' + i;
                    headerElements.push(logoEl);
                }
            }
        }

        // 2. Look for header text paragraphs
        const pNodes = hDoc.getElementsByTagNameNS('*', 'p');
        for (let pIdx = 0; pIdx < pNodes.length; pIdx++) {
            const pInfo = parseParagraphNode(pNodes[pIdx], 'hdr_' + pIdx);
            if (pInfo && pInfo.text && pInfo.text.trim()) {
                pInfo.extra = { ...(pInfo.extra || {}), isHeader: true, headerFile: hPath };
                headerElements.push(pInfo);
            }
        }
    }

    return headerElements;
}

function uint8ToBase64(u8) {
    let binary = '';
    const len = u8.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(u8[i]);
    }
    return window.btoa(binary);
}

function parseParagraphNode(pNode, index) {
    const textNodes = pNode.getElementsByTagNameNS('*', 't');
    let fullText = '';
    for (let t = 0; t < textNodes.length; t++) {
        fullText += textNodes[t].textContent;
    }

    // Paragraph properties
    let alignment = 'left';
    let fontSize = 12;
    let fontFamily = 'Times New Roman';
    let isBold = false;
    let isItalic = false;

    const jcNode = pNode.getElementsByTagNameNS('*', 'jc')[0];
    if (jcNode) {
        const val = jcNode.getAttribute('w:val') || jcNode.getAttribute('val');
        if (val === 'center') alignment = 'center';
        else if (val === 'right') alignment = 'right';
        else if (val === 'both') alignment = 'justify';
    }

    const rPrNodes = pNode.getElementsByTagNameNS('*', 'rPr');
    if (rPrNodes.length > 0) {
        const bNode = rPrNodes[0].getElementsByTagNameNS('*', 'b')[0];
        if (bNode && (bNode.getAttribute('w:val') !== '0')) isBold = true;

        const iNode = rPrNodes[0].getElementsByTagNameNS('*', 'i')[0];
        if (iNode && (iNode.getAttribute('w:val') !== '0')) isItalic = true;

        const szNode = rPrNodes[0].getElementsByTagNameNS('*', 'sz')[0];
        if (szNode) {
            const szVal = parseInt(szNode.getAttribute('w:val') || '24', 10);
            fontSize = Math.round(szVal / 2);
        }

        const rFontsNode = rPrNodes[0].getElementsByTagNameNS('*', 'rFonts')[0];
        if (rFontsNode) {
            fontFamily = rFontsNode.getAttribute('w:ascii') || rFontsNode.getAttribute('w:hAnsi') || fontFamily;
        }
    }

    const el = createElementModel('paragraph', {
        text: fullText,
        fontSize,
        fontFamily,
        alignment,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        extra: {
            hasDrawing: pNode.getElementsByTagNameNS('*', 'drawing').length > 0
        }
    });
    el.id = 'docx_p_' + index;
    return el;
}

function parseTableNode(tblNode, index) {
    const rows = [];
    const trNodes = tblNode.getElementsByTagNameNS('*', 'tr');

    for (let r = 0; r < trNodes.length; r++) {
        const rowCells = [];
        const tcNodes = trNodes[r].getElementsByTagNameNS('*', 'tc');

        for (let c = 0; c < tcNodes.length; c++) {
            const pNodes = tcNodes[c].getElementsByTagNameNS('*', 'p');
            let cellText = '';
            for (let p = 0; p < pNodes.length; p++) {
                const tNodes = pNodes[p].getElementsByTagNameNS('*', 't');
                for (let t = 0; t < tNodes.length; t++) {
                    cellText += tNodes[t].textContent;
                }
                if (p < pNodes.length - 1) cellText += '\n';
            }

            rowCells.push({
                rowIndex: r,
                colIndex: c,
                text: cellText,
                xmlNode: tcNodes[c]
            });
        }
        rows.push(rowCells);
    }

    const el = createElementModel('table', {
        text: `[Tabel: ${rows.length} Baris x ${rows[0] ? rows[0].length : 0} Kolom]`,
        extra: {
            rows: rows,
            rowCount: rows.length,
            colCount: rows[0] ? rows[0].length : 0
        }
    });
    el.id = 'docx_tbl_' + index;
    return el;
}
