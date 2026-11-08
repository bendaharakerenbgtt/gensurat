import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 8090;
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
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('pageerror', err => console.error('PAGE ERROR:', err));
await page.goto(`http://localhost:${PORT}/engine.html`);

// Upload 042_SPM
const filePath = path.join(process.cwd(), 'contoh', '042_SPM_ OPEN HOUSE LDK IMIP 2026.pdf');
await page.locator('#document_file_input').setInputFiles(filePath);
await page.waitForSelector('.pdf-interactive-target', { timeout: 15000 });

// 1. Verify that email element in Kop is clickable and accessible
const emailEl = await page.evaluate(() => {
    const targets = Array.from(document.querySelectorAll('.pdf-interactive-target'));
    const email = targets.find(t => t.title && t.title.includes('ldkimip@gmail.com'));
    return email ? { id: email.id, title: email.title } : null;
});
assert.ok(emailEl, 'Email element in kop must exist and be accessible');

// Click email element
await page.click('#' + emailEl.id);
await page.waitForTimeout(300);

const inspectorTitle = await page.locator('#inspector_text_input').inputValue();
assert.strictEqual(inspectorTitle.trim(), 'ldkimip@gmail.com', 'Inspector must load email text on click');

// 2. Verify Word Toolbar Buttons exist in Inspector
const hasBoldBtn = await page.locator('#btn_format_bold').count();
const hasItalicBtn = await page.locator('#btn_format_italic').count();
const hasAlignLeft = await page.locator('#btn_align_left').count();
const hasAlignCenter = await page.locator('#btn_align_center').count();
const hasAlignRight = await page.locator('#btn_align_right').count();
const hasNudgeLeft = await page.locator('#btn_nudge_left').count();
const hasNudgeRight = await page.locator('#btn_nudge_right').count();

assert.strictEqual(hasBoldBtn, 1, 'Bold button must exist in inspector');
assert.strictEqual(hasItalicBtn, 1, 'Italic button must exist in inspector');
assert.strictEqual(hasAlignCenter, 1, 'Center alignment button must exist');
assert.strictEqual(hasNudgeLeft, 1, 'Nudge left button must exist');

// 3. Test Alignment changing to center
await page.locator('#btn_align_center').click();
await page.waitForTimeout(300);

const isCentered = await page.evaluate((targetId) => {
    const el = document.getElementById(targetId);
    return el ? (el.style.textAlign === 'center' || el.style.transform.includes('translateX(-50%)')) : false;
}, emailEl.id);
assert.ok(isCentered, 'Target element must be centered after clicking Align Center');

// 4. Test Zero Flickering on input typing
const renderCallCountBefore = await page.evaluate(() => window._renderCount || 0);
await page.locator('#inspector_text_input').type('updated@imip.ac.id');
const renderCallCountAfter = await page.evaluate(() => window._renderCount || 0);
assert.strictEqual(renderCallCountBefore, renderCallCountAfter, 'Typing in inspector must NOT trigger full canvas re-render (Zero Flickering)');

// 5. Test Strict Monotonic Page Ordering
const pageOrder = await page.evaluate(() => {
    const wrappers = Array.from(document.querySelectorAll('.canvas-page-wrapper'));
    return wrappers.map(w => parseInt(w.dataset.pageIndex, 10));
});
assert.deepStrictEqual(pageOrder, [0, 1], 'Pages must be rendered in strict monotonic order [0, 1]');

await browser.close();
server.close();

console.log('✓ test_word_environment passed all assertions!');
