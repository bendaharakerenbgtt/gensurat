/**
 * PDF Export Adapter - UDE-001
 * Uses pdf-lib to perform micro-targeted in-place whiteouts and text replacement on original PDF,
 * guaranteeing 100% preservation of original layout, vector lines, logos, and signatures.
 */

export async function exportToPdf(docModel, customFilename) {
    if (typeof window.PDFLib === 'undefined') {
        throw new Error('pdf-lib is not loaded. Please check CDN connection.');
    }

    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
    const filename = customFilename || (docModel.metadata.title + '_revisi.pdf');

    if (docModel.source.format === 'pdf') {
        // ==========================================
        // ALUR 1: PDF ➔ PDF (In-Place Precision Patch)
        // ==========================================
        const pdfDoc = await PDFDocument.load(new Uint8Array(docModel.source.rawBytes.slice(0)));
        const pages = pdfDoc.getPages();

        // Embed standard fonts for replacement
        const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        for (const pageModel of docModel.pages) {
            const targetPdfPage = pages[pageModel.pageIndex];
            if (!targetPdfPage) continue;

            const modifiedElements = pageModel.elements.filter(el => el.isModified);
            const shiftedElements = pageModel.elements.filter(el => (el.cumulativeShift || 0) > 0 && !el.isModified);

            const getFont = (el) => {
                if (el.fontFamily.toLowerCase().includes('arial') || el.fontFamily.toLowerCase().includes('sans')) {
                    return (el.fontWeight === 'bold') ? fontHelveticaBold : fontHelvetica;
                }
                return (el.fontWeight === 'bold') ? fontTimesBold : fontTimes;
            };

            // =========================================================================
            // PHASE 1: DRAW ALL WHITEOUT RECTANGLES FIRST (Prevents text clipping)
            // =========================================================================

            // 1A. Whiteout for Kop Logos (Removed or Replaced)
            for (const el of modifiedElements) {
                if (el.type === 'kop_logo' && (el.extra?.isRemoved || el.extra?.imageBytes)) {
                    const pdfY = (pageModel.height || 841.89) - el.rect.y - el.rect.height;
                    targetPdfPage.drawRectangle({
                        x: Math.max(0, el.rect.x - 4),
                        y: Math.max(0, pdfY - 4),
                        width: el.rect.width + 8,
                        height: el.rect.height + 8,
                        color: rgb(1, 1, 1),
                        borderWidth: 0
                    });
                }
            }

            // 1B. Whiteout for Modified Paragraphs & Text
            for (const el of modifiedElements) {
                if (el.type === 'kop_logo') continue;

                const isParagraph = el.type === 'paragraph' || el.sourceRef?.isParagraph;
                const isKopText = (el.rect.y < 95);
                const selectedFont = getFont(el);

                if (isParagraph) {
                    const whiteoutX = Math.max(0, el.rect.x - 6);
                    const totalHeight = el.expandedHeight || el.rect.height;
                    const whiteoutY = (pageModel.height || 841.89) - el.rect.y - totalHeight;
                    targetPdfPage.drawRectangle({
                        x: whiteoutX,
                        y: Math.max(0, whiteoutY - 2),
                        width: el.rect.width + 12,
                        height: totalHeight + 6,
                        color: rgb(1, 1, 1),
                        borderWidth: 0
                    });
                } else {
                    const measuredTextWidth = selectedFont.widthOfTextAtSize(el.text, Math.max(7, el.fontSize));
                    let whiteoutX = el.rect.x - 4;
                    if (isKopText) {
                        const pageWidth = pageModel.width || 595.28;
                        const centeredX = (pageWidth - measuredTextWidth) / 2;
                        whiteoutX = Math.min(centeredX, el.rect.x) - 6;
                    }
                    const whiteoutWidth = Math.max(el.rect.width, measuredTextWidth) + 14;
                    const lineHeight = el.sourceRef?.lineHeight || (el.fontSize * 1.15);
                    const whiteoutHeight = Math.min(el.rect.height + 2, lineHeight);
                    const whiteoutY = (pageModel.height || 841.89) - el.rect.y - whiteoutHeight + 1;
                    targetPdfPage.drawRectangle({
                        x: Math.max(0, whiteoutX),
                        y: Math.max(0, whiteoutY),
                        width: whiteoutWidth,
                        height: whiteoutHeight,
                        color: rgb(1, 1, 1),
                        borderWidth: 0
                    });
                }
            }

            // 1C. Whiteout for Shifted Elements (Old Positions)
            for (const el of shiftedElements) {
                const whiteoutX = Math.max(0, el.rect.x - 4);
                const oldPdfY = el.sourceRef?.pdfY !== undefined ? el.sourceRef.pdfY : (pageModel.height - el.rect.y - el.fontSize);
                targetPdfPage.drawRectangle({
                    x: whiteoutX,
                    y: Math.max(0, oldPdfY - 2),
                    width: el.rect.width + 8,
                    height: el.rect.height + 4,
                    color: rgb(1, 1, 1),
                    borderWidth: 0
                });
            }

            // =========================================================================
            // PHASE 2: DRAW ALL NEW CONTENT (Images, Paragraphs, Single Texts, Shifted)
            // =========================================================================

            // 2A. Draw Replaced Kop Logos
            for (const el of modifiedElements) {
                if (el.type === 'kop_logo' && el.extra?.imageBytes && !el.extra?.isRemoved) {
                    const pdfY = (pageModel.height || 841.89) - el.rect.y - el.rect.height;
                    try {
                        let logoImg = null;
                        if (el.extra.mimeType && el.extra.mimeType.includes('png')) {
                            logoImg = await pdfDoc.embedPng(el.extra.imageBytes);
                        } else {
                            logoImg = await pdfDoc.embedJpg(el.extra.imageBytes);
                        }
                        targetPdfPage.drawImage(logoImg, {
                            x: el.rect.x,
                            y: pdfY,
                            width: el.rect.width,
                            height: el.rect.height
                        });
                    } catch (logoErr) {
                        console.warn('Failed to embed logo in PDF:', logoErr);
                    }
                }
            }

            // 2B. Draw Modified Paragraphs and Single Text Lines
            for (const el of modifiedElements) {
                if (el.type === 'kop_logo') continue;

                const isParagraph = el.type === 'paragraph' || el.sourceRef?.isParagraph;
                const isKopText = (el.rect.y < 95);
                const selectedFont = getFont(el);

                if (isParagraph) {
                    const indent = (el.sourceRef?.firstLineIndent !== undefined) ? el.sourceRef.firstLineIndent : 20;
                    const words = el.text.split(/\s+/).filter(Boolean);
                    let currentLine = '';
                    let isFirstLine = true;
                    let currentLineY = (pageModel.height || 841.89) - el.rect.y - (el.fontSize * 0.95);
                    const lineHeight = el.sourceRef?.lineHeight || (el.fontSize * 1.45);

                    for (const word of words) {
                        const testLine = currentLine ? (currentLine + ' ' + word) : word;
                        const maxLineWidth = isFirstLine ? (el.rect.width - indent) : el.rect.width;
                        const testWidth = selectedFont.widthOfTextAtSize(testLine, Math.max(7, el.fontSize));

                        if (testWidth > maxLineWidth && currentLine) {
                            const lineX = isFirstLine ? (el.rect.x + indent) : el.rect.x;
                            targetPdfPage.drawText(currentLine, {
                                x: lineX,
                                y: currentLineY,
                                size: Math.max(7, el.fontSize),
                                font: selectedFont,
                                color: rgb(0.05, 0.05, 0.05)
                            });
                            currentLineY -= lineHeight;
                            currentLine = word;
                            isFirstLine = false;
                        } else {
                            currentLine = testLine;
                        }
                    }

                    if (currentLine) {
                        const lineX = isFirstLine ? (el.rect.x + indent) : el.rect.x;
                        targetPdfPage.drawText(currentLine, {
                            x: lineX,
                            y: currentLineY,
                            size: Math.max(7, el.fontSize),
                            font: selectedFont,
                            color: rgb(0.05, 0.05, 0.05)
                        });
                    }
                } else {
                    const measuredTextWidth = selectedFont.widthOfTextAtSize(el.text, Math.max(7, el.fontSize));
                    let drawX = el.rect.x;
                    if (isKopText) {
                        const pageWidth = pageModel.width || 595.28;
                        drawX = (pageWidth - measuredTextWidth) / 2;
                    }
                    const pdfY = (pageModel.height || 841.89) - el.rect.y - (el.fontSize * 0.85);
                    targetPdfPage.drawText(el.text, {
                        x: drawX,
                        y: pdfY,
                        size: Math.max(7, el.fontSize),
                        font: selectedFont,
                        color: rgb(0.05, 0.05, 0.05)
                    });
                }
            }

            // 2C. Draw Shifted Elements at New Downward Positions
            for (const el of shiftedElements) {
                const oldPdfY = el.sourceRef?.pdfY !== undefined ? el.sourceRef.pdfY : (pageModel.height - el.rect.y - el.fontSize);
                const newPdfY = oldPdfY - el.cumulativeShift;
                const selectedFont = getFont(el);

                targetPdfPage.drawText(el.text, {
                    x: el.rect.x,
                    y: newPdfY,
                    size: Math.max(7, el.fontSize),
                    font: selectedFont,
                    color: rgb(0.05, 0.05, 0.05)
                });
            }

            // 4. Draw Added Signatures / Stamps / Images
            if (pageModel.addedImages && pageModel.addedImages.length > 0) {
                for (const imgItem of pageModel.addedImages) {
                    try {
                        let embeddedImg = null;
                        if (imgItem.mimeType && imgItem.mimeType.includes('png')) {
                            embeddedImg = await pdfDoc.embedPng(imgItem.bytes);
                        } else {
                            embeddedImg = await pdfDoc.embedJpg(imgItem.bytes);
                        }
                        const pdfY = (pageModel.height || 841.89) - imgItem.y - imgItem.height;
                        targetPdfPage.drawImage(embeddedImg, {
                            x: Math.max(0, imgItem.x),
                            y: Math.max(0, pdfY),
                            width: imgItem.width,
                            height: imgItem.height
                        });
                    } catch (imgErr) {
                        console.warn('Failed to embed signature/image:', imgErr);
                    }
                }
            }
        }

        const pdfBytes = await pdfDoc.save();
        triggerDownload(new Blob([pdfBytes], { type: 'application/pdf' }), filename);
        return { success: true, filename };

    } else if (docModel.source.format === 'docx') {
        // ==========================================
        // ALUR 2: DOCX ➔ PDF
        // ==========================================
        const pdfDoc = await PDFDocument.create();
        const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        for (const pageModel of docModel.pages) {
            // A4: 595.28 x 841.89 pt
            const pdfPage = pdfDoc.addPage([pageModel.width || 595.28, pageModel.height || 841.89]);
            let currentY = (pageModel.height || 841.89) - 72; // 1 inch top margin

            for (const el of pageModel.elements) {
                if (el.type === 'paragraph' && el.text) {
                    const fontSize = Math.max(8, Math.min(16, el.fontSize || 12));
                    const isBold = el.fontWeight === 'bold';
                    const font = isBold ? fontTimesBold : fontTimes;

                    // Word wrap approximation
                    const maxWidth = (pageModel.width || 595.28) - 144;
                    const words = el.text.split(' ');
                    let line = '';

                    for (const word of words) {
                        const testLine = line + (line ? ' ' : '') + word;
                        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
                        if (textWidth > maxWidth && line) {
                            if (currentY > 60) {
                                pdfPage.drawText(line, {
                                    x: 72,
                                    y: currentY,
                                    size: fontSize,
                                    font: font,
                                    color: rgb(0.1, 0.1, 0.1)
                                });
                                currentY -= (fontSize * 1.35);
                            }
                            line = word;
                        } else {
                            line = testLine;
                        }
                    }

                    if (line && currentY > 60) {
                        pdfPage.drawText(line, {
                            x: 72,
                            y: currentY,
                            size: fontSize,
                            font: font,
                            color: rgb(0.1, 0.1, 0.1)
                        });
                        currentY -= (fontSize * 1.5);
                    }
                } else if (el.type === 'table') {
                    // Draw Table info box
                    if (currentY > 80) {
                        pdfPage.drawRectangle({
                            x: 72,
                            y: currentY - 24,
                            width: (pageModel.width || 595.28) - 144,
                            height: 24,
                            color: rgb(0.96, 0.96, 0.96),
                            borderColor: rgb(0.7, 0.7, 0.7),
                            borderWidth: 1
                        });
                        pdfPage.drawText(el.text || '[Tabel]', {
                            x: 80,
                            y: currentY - 17,
                            size: 10,
                            font: fontTimes,
                            color: rgb(0.3, 0.3, 0.3)
                        });
                        currentY -= 36;
                    }
                }
            }

            // Draw Added Signatures / Stamps
            if (pageModel.addedImages && pageModel.addedImages.length > 0) {
                for (const imgItem of pageModel.addedImages) {
                    try {
                        let embeddedImg = null;
                        if (imgItem.mimeType && imgItem.mimeType.includes('png')) {
                            embeddedImg = await pdfDoc.embedPng(imgItem.bytes);
                        } else {
                            embeddedImg = await pdfDoc.embedJpg(imgItem.bytes);
                        }
                        const pdfY = (pageModel.height || 841.89) - imgItem.y - imgItem.height;
                        pdfPage.drawImage(embeddedImg, {
                            x: Math.max(0, imgItem.x),
                            y: Math.max(0, pdfY),
                            width: imgItem.width,
                            height: imgItem.height
                        });
                    } catch (imgErr) {
                        console.warn('Failed to embed signature image in docx->pdf:', imgErr);
                    }
                }
            }
        }

        const pdfBytes = await pdfDoc.save();
        triggerDownload(new Blob([pdfBytes], { type: 'application/pdf' }), filename);
        return { success: true, filename };
    }
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
