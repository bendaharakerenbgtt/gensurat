import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 8096;
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
await page.waitForFunction(() => window.pdfjsLib);

const result = await page.evaluate(async () => {
    const { parsePdfDocument } = await import('./js/engine/pdf_adapter.js?v=test_' + Date.now());
    const res = await fetch('/contoh/' + encodeURIComponent('042_SPM_ OPEN HOUSE LDK IMIP 2026.pdf'));
    const buf = await res.arrayBuffer();
    const docModel = await parsePdfDocument(buf, '042_SPM_ OPEN HOUSE LDK IMIP 2026.pdf');
    
    // Check elements on page 1
    const p1 = docModel.pages[0];
    const logos = p1.elements.filter(el => el.type === 'kop_logo');
    return {
        pageCount: docModel.pages.length,
        logoCount: logos.length,
        logos: logos.map(l => ({ x: l.rect.x, y: l.rect.y, w: l.rect.width, h: l.rect.height, extra: l.extra })),
        hasHardcodedCoords: logos.some(l => l.rect.x === 46 && l.rect.y === 5)
    };
});

await browser.close();
server.close();

console.log('Result:', JSON.stringify(result, null, 2));
assert.ok(result.logoCount >= 1, 'Should extract kop logos dynamically from PDF operator list');
assert.strictEqual(result.hasHardcodedCoords, false, 'Logos must NOT use hardcoded x:46, y:5 coordinates');

console.log('✓ test_pdf_logo_extraction passed!');
