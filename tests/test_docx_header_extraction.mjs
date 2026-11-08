import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 8097;
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
await page.waitForFunction(() => window.JSZip);

const result = await page.evaluate(async () => {
    const { parseDocxDocument } = await import('./js/engine/docx_adapter.js?v=test_' + Date.now());
    const res = await fetch('/contoh/' + encodeURIComponent('016_SUD_SARAH MUTHIAH WIDAD.docx'));
    const buf = await res.arrayBuffer();
    const docModel = await parseDocxDocument(buf, '016_SUD_SARAH MUTHIAH WIDAD.docx');
    
    const p1 = docModel.pages[0];
    const headerLogos = p1.elements.filter(el => el.type === 'kop_logo');
    const headerParagraphs = p1.elements.filter(el => el.extra?.isHeader);
    
    return {
        totalElements: p1.elements.length,
        headerLogosCount: headerLogos.length,
        headerParagraphsCount: headerParagraphs.length,
        firstLogo: headerLogos[0] || null
    };
});

await browser.close();
server.close();

console.log('DOCX Result:', JSON.stringify(result, null, 2));
assert.ok(result.headerLogosCount >= 1, 'Should extract kop logos from word/header*.xml');
assert.ok(result.headerParagraphsCount >= 1, 'Should extract header text paragraphs from word/header*.xml');

console.log('✓ test_docx_header_extraction passed!');
