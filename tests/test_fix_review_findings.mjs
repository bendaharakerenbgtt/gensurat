import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 8094;
const server = http.createServer((req, res) => {
    let filePath = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0]));
    if (filePath.endsWith('/') || filePath.endsWith('\\')) filePath += 'engine.html';
    if (!fs.existsSync(filePath)) { res.writeHead(404); return res.end('404'); }
    const ext = path.extname(filePath);
    const map = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
});

await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
});

const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/engine.html`);

const testResults = await page.evaluate(async () => {
    const results = {};

    // 1. Test Spilled Elements in calculateReflowAndPagination
    const { calculateReflowAndPagination } = await import('./js/engine/canvas_renderer.js');
    const overflowingElements = [
        { id: 'kop', y: 20, height: 60 },
        { id: 'p1', y: 250, height: 80, isModified: true, expandedHeight: 520 },
        { id: 'closing', y: 350, height: 30 },
        { id: 'sig', y: 400, height: 120 }
    ];

    const res = calculateReflowAndPagination(overflowingElements, 842, 50);
    const spilledSig = res.pages[1]?.elements?.find(el => el.id === 'sig');
    results.spillPageCount = res.pages.length;
    results.spilledSigExists = !!spilledSig;
    results.spilledSigIsModified = spilledSig?.isModified;
    results.spilledSigIsSpilled = spilledSig?.isSpilled;

    // 2. Test DOCX Logo Replacement in export_docx
    const { exportToDocx } = await import('./js/engine/export_docx.js');
    const zip = new window.JSZip();
    zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p></w:body></w:document>');
    zip.file('word/media/image1.png', new Uint8Array([1, 2, 3]));

    const docxModel = {
        metadata: { title: 'TestDocx' },
        source: {
            format: 'docx',
            zip: zip,
            xmlDoc: new DOMParser().parseFromString(await zip.file('word/document.xml').async('text'), 'application/xml')
        },
        pages: [{
            pageIndex: 0,
            elements: [{
                id: 'logo1',
                type: 'kop_logo',
                isModified: true,
                extra: {
                    mediaPath: 'word/media/image1.png',
                    imageBytes: new Uint8Array([9, 9, 9, 9])
                }
            }]
        }]
    };

    try {
        await exportToDocx(docxModel, 'test_out.docx');
        const updatedMedia = await zip.file('word/media/image1.png').async('uint8array');
        results.docxMediaUpdated = (updatedMedia && updatedMedia[0] === 9);
    } catch (e) {
        results.docxMediaError = e.message;
    }

    // 3. Test Metadata Unification in pdf_adapter
    const { parsePdfDocument } = await import('./js/engine/pdf_adapter.js');
    const spmRes = await fetch('/contoh/042_SPM_%20OPEN%20HOUSE%20LDK%20IMIP%202026.pdf');
    const spmBuf = await spmRes.arrayBuffer();
    const parsedPdf = await parsePdfDocument(spmBuf, '042.pdf');
    const halElement = parsedPdf.pages[0].elements.find(el => el.text && el.text.includes('Surat Permohonan Pemunduran'));
    results.halElementUnified = !!halElement && (halElement.text.startsWith('Hal') || halElement.text.includes('Hal :'));

    return results;
});

await browser.close();
server.close();

console.log('Test results:', testResults);

assert.strictEqual(testResults.spillPageCount, 2, 'Must have 2 pages');
assert.strictEqual(testResults.spilledSigIsSpilled, true, 'Spilled element must have isSpilled: true');
assert.strictEqual(testResults.spilledSigIsModified, true, 'Spilled element must have isModified: true');
assert.strictEqual(testResults.docxMediaUpdated, true, 'DOCX media must be updated in export_docx');
assert.strictEqual(testResults.halElementUnified, true, 'Metadata Hal must be unified into a single element');

console.log('✓ test_fix_review_findings passed all assertions!');
