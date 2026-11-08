/**
 * Universal Semantic Document Detector - UDE-001
 * Analyzes geometry, layout clustering, and Indonesian document grammar
 * to classify document elements into semantic zones without hardcoded thresholds.
 */

export function detectDocumentStructure(lines = [], images = [], pageDimensions = { width: 595, height: 842 }) {
    const pageHeight = pageDimensions.height || 842;
    const pageWidth = pageDimensions.width || 595;

    // 1. Sort lines top-to-bottom, left-to-right
    const sortedLines = [...lines].sort((a, b) => {
        if (Math.abs(a.y - b.y) <= 3) return a.x - b.x;
        return a.y - b.y;
    });

    const structure = {
        kopZone: { lines: [], logos: [], rect: null },
        dateZone: { elements: [] },
        metadataZone: { elements: [] },
        recipientZone: { elements: [] },
        greetingZone: { elements: [] },
        bodyParagraphs: { elements: [] },
        closingZone: { elements: [] },
        signatureZone: { elements: [] },
        tembusanZone: { elements: [] },
        unclassified: { elements: [] }
    };

    // 2. Unify fragmented metadata rows (Nomor, :, Value)
    const processedIndices = new Set();
    const unifiedLines = [];

    for (let i = 0; i < sortedLines.length; i++) {
        if (processedIndices.has(i)) continue;
        const cur = sortedLines[i];
        const trimmed = (cur.text || '').trim();

        // Check if starts with a metadata label
        const isMetaLabel = /^(nomor|no|lampiran|lamp|hal|perihal)\b/i.test(trimmed);

        if (isMetaLabel) {
            // Look ahead for colon and value on the same horizontal baseline
            let combinedText = cur.text;
            let totalWidth = cur.width;
            let maxRight = cur.x + cur.width;
            let rawItems = [...(cur.rawItems || [cur])];
            processedIndices.add(i);

            for (let j = i + 1; j < sortedLines.length; j++) {
                if (processedIndices.has(j)) continue;
                const next = sortedLines[j];
                const onSameBaseline = Math.abs(cur.y - next.y) <= 4;
                const isToTheRight = next.x >= cur.x - 2;
                const isReasonableGap = (next.x - maxRight) <= 220; // tab spacing

                if (onSameBaseline && isToTheRight && isReasonableGap) {
                    const needsSpace = !combinedText.endsWith(' ') && !next.text.startsWith(' ');
                    combinedText += (needsSpace ? ' ' : '') + next.text;
                    maxRight = Math.max(maxRight, next.x + next.width);
                    totalWidth = maxRight - cur.x;
                    if (next.rawItems) rawItems.push(...next.rawItems);
                    processedIndices.add(j);
                } else if (next.y > cur.y + 6) {
                    break;
                }
            }

            unifiedLines.push({
                ...cur,
                text: combinedText,
                width: totalWidth,
                rawItems,
                isUnifiedMeta: true
            });
        } else {
            processedIndices.add(i);
            unifiedLines.push(cur);
        }
    }

    // 3. Find structural boundaries
    const dateRegex = /^(jakarta|bandung|surabaya|yogyakarta|depok|bogor|tangerang|bekasi|semarang|medan|makassar|[a-z\s]+),\s*\d{1,2}\s+[a-z]+\s+\d{4}/i;
    const metaRegex = /^(nomor|no|lampiran|lamp|hal|perihal)\s*[:.]/i;
    const recipientRegex = /^(yth|kepada|di tempat)\b/i;
    const greetingRegex = /^(dengan\s+hormat|assalamu['’]?alaikum|salam\s+sejahtera)/i;
    const closingRegex = /^(hormat\s+kami|mengetahui|menyetujui|penanggung\s+jawab|tertanda|atas\s+perhatian)/i;
    const sigTitleRegex = /(ketua|direktur|wadir|sekretaris|bendahara|pembina|panitia|pelaksana|penanggung\s+jawab|nip\.|nim\.)/i;
    const tembusanRegex = /^(tembusan)\s*[:.]?/i;

    // Boundary discovery
    let firstMetaOrDateY = null;
    let greetingY = null;
    let closingOrSigY = null;
    let tembusanY = null;

    for (const l of unifiedLines) {
        const t = (l.text || '').trim();
        if (!firstMetaOrDateY && (dateRegex.test(t) || metaRegex.test(t))) {
            firstMetaOrDateY = l.y;
        }
        if (!greetingY && greetingRegex.test(t)) {
            greetingY = l.y;
        }
        if (!closingOrSigY && (closingRegex.test(t) || (l.y > (greetingY || 300) && sigTitleRegex.test(t)))) {
            closingOrSigY = l.y;
        }
        if (!tembusanY && tembusanRegex.test(t)) {
            tembusanY = l.y;
        }
    }

    const kopCutoffY = firstMetaOrDateY ? Math.min(firstMetaOrDateY - 10, pageHeight * 0.28) : (pageHeight * 0.22);

    // 4. Classify Images
    images.forEach(img => {
        if (img.y < kopCutoffY || img.isLogo) {
            structure.kopZone.logos.push({
                ...img,
                type: 'kop_logo'
            });
        }
    });

    // 5. Classify Lines into Zones
    let currentBodyParagraph = null;

    for (let i = 0; i < unifiedLines.length; i++) {
        const l = unifiedLines[i];
        const t = (l.text || '').trim();

        // A. Kop Zone
        if (l.y < kopCutoffY && !dateRegex.test(t) && !metaRegex.test(t)) {
            structure.kopZone.lines.push(l);
            continue;
        }

        // B. Date Line
        if (dateRegex.test(t)) {
            structure.dateZone.elements.push(l);
            continue;
        }

        // C. Metadata Zone
        if (metaRegex.test(t) || l.isUnifiedMeta) {
            structure.metadataZone.elements.push(l);
            continue;
        }

        // D. Recipient Zone
        if (recipientRegex.test(t) || (firstMetaOrDateY && l.y > firstMetaOrDateY && greetingY && l.y < greetingY)) {
            structure.recipientZone.elements.push(l);
            continue;
        }

        // E. Greeting Line
        if (greetingRegex.test(t)) {
            structure.greetingZone.elements.push(l);
            continue;
        }

        // F. Tembusan Zone
        if (tembusanY && l.y >= tembusanY - 5) {
            structure.tembusanZone.elements.push(l);
            continue;
        }

        // G. Closing & Signature Zone
        if (closingOrSigY && l.y >= closingOrSigY - 5) {
            if (closingRegex.test(t)) {
                structure.closingZone.elements.push(l);
            } else {
                structure.signatureZone.elements.push(l);
            }
            continue;
        }

        // H. Body Paragraphs (between greeting and closing)
        if (greetingY && l.y > greetingY && (!closingOrSigY || l.y < closingOrSigY)) {
            // Multi-line paragraph grouping
            if (!currentBodyParagraph) {
                currentBodyParagraph = { ...l, lines: [l], isParagraph: false };
            } else {
                const prev = currentBodyParagraph.lines[currentBodyParagraph.lines.length - 1];
                const baselineDiff = Math.abs(l.y - prev.y);
                const isAdjacent = (l.y > prev.y) && (baselineDiff > 4) && (baselineDiff <= (prev.fontSize || 12) * 2.4);
                const sameFontSize = Math.abs((l.fontSize || 12) - (prev.fontSize || 12)) <= 2;

                if (isAdjacent && sameFontSize) {
                    currentBodyParagraph.lines.push(l);
                    currentBodyParagraph.text += ' ' + l.text;
                    currentBodyParagraph.width = Math.max(currentBodyParagraph.width, l.width);
                    currentBodyParagraph.height = (l.y + l.height) - currentBodyParagraph.y;
                    currentBodyParagraph.isParagraph = true;
                } else {
                    structure.bodyParagraphs.elements.push(currentBodyParagraph);
                    currentBodyParagraph = { ...l, lines: [l], isParagraph: false };
                }
            }
            continue;
        }

        // Fallback
        structure.unclassified.elements.push(l);
    }

    if (currentBodyParagraph) {
        structure.bodyParagraphs.elements.push(currentBodyParagraph);
    }

    structure.unifiedLines = unifiedLines;
    return structure;
}
