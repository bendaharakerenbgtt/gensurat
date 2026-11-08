/**
 * DOCX Export Adapter - UDE-001
 * Implements Round-Trip Preservation for DOCX and Synthetic OOXML Packaging for PDF.
 */

export async function exportToDocx(docModel, customFilename) {
    if (typeof window.JSZip === 'undefined') {
        throw new Error('JSZip is not loaded. Please check CDN connection.');
    }

    const filename = customFilename || (docModel.metadata.title + '_revisi.docx');

    if (docModel.source.format === 'docx' && docModel.source.zip && docModel.source.xmlDoc) {
        // ==========================================
        // ALUR 1: DOCX ➔ DOCX (Round-Trip Preservation)
        // ==========================================
        const serializer = new XMLSerializer();
        const updatedXmlStr = serializer.serializeToString(docModel.source.xmlDoc);

        // Update word/document.xml inside zip
        docModel.source.zip.file('word/document.xml', updatedXmlStr);

        // Generate final docx blob
        const docxBlob = await docModel.source.zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        triggerDownload(docxBlob, filename);
        return { success: true, filename };

    } else {
        // ==========================================
        // ALUR 2: PDF ➔ DOCX (Synthetic OOXML Package)
        // ==========================================
        const zip = new window.JSZip();

        // 1. [Content_Types].xml
        zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

        // 2. _rels/.rels
        zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

        // 3. word/_rels/document.xml.rels
        zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

        // 4. word/styles.xml
        zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>
        <w:sz w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

        // 5. Build word/document.xml from DIM elements
        let paragraphsXml = '';
        docModel.pages.forEach((page, pIdx) => {
            page.elements.forEach(el => {
                if (el.text && el.text.trim()) {
                    const escaped = escapeXml(el.text);
                    const sz = Math.round((el.fontSize || 12) * 2);
                    const isBold = el.fontWeight === 'bold';
                    const font = el.fontFamily || 'Times New Roman';

                    paragraphsXml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="${el.alignment || 'left'}"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>
          <w:sz w:val="${sz}"/>
          ${isBold ? '<w:b/>' : ''}
        </w:rPr>
        <w:t xml:space="preserve">${escaped}</w:t>
      </w:r>
    </w:p>`;
                }
            });

            // Page break between pages (except last)
            if (pIdx < docModel.pages.length - 1) {
                paragraphsXml += `
    <w:p>
      <w:r><w:br w:type="page"/></w:r>
    </w:p>`;
            }
        });

        const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphsXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

        zip.file('word/document.xml', documentXml);

        const docxBlob = await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        triggerDownload(docxBlob, filename);
        return { success: true, filename };
    }
}

function escapeXml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
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
