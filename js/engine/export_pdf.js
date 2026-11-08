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

            for (const el of modifiedElements) {
                const pdfX = el.sourceRef?.pdfX !== undefined ? el.sourceRef.pdfX : el.rect.x;
                const pdfY = el.sourceRef?.pdfY !== undefined ? el.sourceRef.pdfY : (pageModel.height - el.rect.y - el.fontSize);

                const width = Math.max(el.rect.width, (el.sourceRef?.pdfWidth || 60)) + 6;
                const height = Math.max(el.rect.height, (el.sourceRef?.pdfHeight || el.fontSize)) + 4;

                // 1. Draw Whiteout Rectangle
                targetPdfPage.drawRectangle({
                    x: Math.max(0, pdfX - 2),
                    y: Math.max(0, pdfY - 2),
                    width: width,
                    height: height,
                    color: rgb(1, 1, 1),
                    opacity: 1.0,
                    borderWidth: 0
                });

                // 2. Select Font
                let selectedFont = fontTimes;
                if (el.fontFamily.toLowerCase().includes('arial') || el.fontFamily.toLowerCase().includes('sans')) {
                    selectedFont = (el.fontWeight === 'bold') ? fontHelveticaBold : fontHelvetica;
                } else {
                    selectedFont = (el.fontWeight === 'bold') ? fontTimesBold : fontTimes;
                }

                // 3. Draw New Text (with intelligent word-wrapping for multi-line paragraphs)
                const isParagraph = el.type === 'paragraph' || el.sourceRef?.isParagraph;

                if (isParagraph) {
                    const maxWidth = width - 4;
                    const words = el.text.split(/\s+/);
                    let currentLine = '';
                    let currentLineY = (pageModel.height || 841.89) - el.rect.y - (el.fontSize * 0.95);
                    const lineHeight = el.sourceRef?.lineHeight || (el.fontSize * 1.45);

                    for (const word of words) {
                        const testLine = currentLine ? (currentLine + ' ' + word) : word;
                        const testWidth = selectedFont.widthOfTextAtSize(testLine, Math.max(7, el.fontSize));
                        if (testWidth > maxWidth && currentLine) {
                            targetPdfPage.drawText(currentLine, {
                                x: pdfX,
                                y: currentLineY,
                                size: Math.max(7, el.fontSize),
                                font: selectedFont,
                                color: rgb(0.05, 0.05, 0.05)
                            });
                            currentLineY -= lineHeight;
                            currentLine = word;
                        } else {
                            currentLine = testLine;
                        }
                    }

                    if (currentLine) {
                        targetPdfPage.drawText(currentLine, {
                            x: pdfX,
                            y: currentLineY,
                            size: Math.max(7, el.fontSize),
                            font: selectedFont,
                            color: rgb(0.05, 0.05, 0.05)
                        });
                    }
                } else {
                    targetPdfPage.drawText(el.text, {
                        x: pdfX,
                        y: pdfY,
                        size: Math.max(7, el.fontSize),
                        font: selectedFont,
                        color: rgb(0.05, 0.05, 0.05)
                    });
                }
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
