import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 8092;
const server = http.createServer((req, res) => {
    let filePath = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0]));
    if (filePath.endsWith('/') || filePath.endsWith('\\')) filePath += 'buat-surat.html';
    if (!fs.existsSync(filePath)) { res.writeHead(404); return res.end('404'); }
    const ext = path.extname(filePath);
    const map = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpeg': 'image/jpeg',
        '.jpg': 'image/jpeg',
        '.webp': 'image/webp',
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
page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
page.on('pageerror', err => console.error('PAGE ERROR:', err));

console.log('1. Loading buat-surat.html?editor=1...');
await page.goto(`http://localhost:${PORT}/buat-surat.html?editor=1`);
await page.waitForSelector('.spz-kop-container', { timeout: 15000 });

// Verify initial kop container and watermark exist
const initialKopCount = await page.locator('.spz-kop-container').count();
assert.ok(initialKopCount >= 1, 'Kop container must exist on rendered sheet');

const initialWmCount = await page.locator('.spz-watermark-layer').count();
assert.ok(initialWmCount >= 1, 'Watermark layer must exist on rendered sheet');

console.log('✓ Initial Kop & Watermark verified');

// 2. Open Modal Kustomisasi Logo & Background
console.log('2. Opening Modal Kustomisasi Gambar Kabinet...');
await page.evaluate(() => {
    if (typeof bukaModalKustomisasiLogo === 'function') {
        bukaModalKustomisasiLogo();
    }
});

await page.waitForTimeout(300);
const modalVisible = await page.evaluate(() => {
    const m = document.getElementById('modal_kustomisasi_logo');
    return m && !m.classList.contains('hidden');
});
assert.strictEqual(modalVisible, true, 'Modal kustomisasi logo must be open and visible');
console.log('✓ Modal kustomisasi opened successfully');

// 3. Test changing watermark background to preset 'assetkabinet/logokabinetblur.png'
console.log('3. Setting custom watermark preset (assetkabinet/logokabinetblur.png)...');
await page.evaluate(() => {
    setWatermarkPreset('assetkabinet/logokabinetblur.png', '0.25');
});

// Verify watermark image source changed in DOM
const updatedWmSrc = await page.evaluate(() => {
    const img = document.querySelector('.spz-watermark-layer img');
    return img ? img.getAttribute('src') : null;
});
assert.strictEqual(updatedWmSrc, 'assetkabinet/logokabinetblur.png', 'Watermark src on paper must update to custom preset');
console.log('✓ Paper background watermark successfully changed to custom kabinet blur');

// 4. Test setting custom logo kabinet & logo IMIP
console.log('4. Setting custom logo kabinet and logo IMIP...');
await page.evaluate(() => {
    localStorage.setItem('custom_logo_kabinet', 'assetkabinet/bintangorange.png');
    localStorage.setItem('custom_logo_imip', 'IMIP.png');
    updatePreview();
});

await page.waitForTimeout(400);

// Verify top-right overlay on Kop Surat
const overlayInfo = await page.evaluate(() => {
    const overlay = document.querySelector('.spz-kop-custom-right-logos');
    if (!overlay) return null;
    const imgs = Array.from(overlay.querySelectorAll('img')).map(i => i.getAttribute('src'));
    return { exists: true, imgs };
});

assert.ok(overlayInfo && overlayInfo.exists, 'Top-right custom logo overlay must exist in Kop Surat');
assert.ok(overlayInfo.imgs.includes('assetkabinet/bintangorange.png'), 'Overlay must contain custom logo kabinet');
assert.ok(overlayInfo.imgs.includes('IMIP.png'), 'Overlay must contain custom logo IMIP');
console.log('✓ Kop Surat top-right logos successfully customized with kabinet & IMIP images');

// 5. Test Close Modal and persistence
console.log('5. Closing modal and checking persistence...');
await page.evaluate(() => {
    tutupModalKustomisasiLogo();
});

const isModalClosed = await page.evaluate(() => {
    const m = document.getElementById('modal_kustomisasi_logo');
    return m ? m.classList.contains('hidden') : false;
});
assert.strictEqual(isModalClosed, true, 'Modal must close cleanly');

// Check that paper still has custom images after close
const finalPaperCheck = await page.evaluate(() => {
    const wm = document.querySelector('.spz-watermark-layer img')?.getAttribute('src');
    const overlay = document.querySelector('.spz-kop-custom-right-logos');
    return { wm, hasOverlay: !!overlay };
});
assert.strictEqual(finalPaperCheck.wm, 'assetkabinet/logokabinetblur.png', 'Watermark remains custom after modal closed');
assert.strictEqual(finalPaperCheck.hasOverlay, true, 'Kop custom overlay remains active after modal closed');

// Take a verification screenshot
await page.screenshot({ path: 'test_screenshot_custom_kabinet.png', fullPage: false });
console.log('✓ Verification screenshot saved to test_screenshot_custom_kabinet.png');

console.log('✓ All assertions passed cleanly!');

// 6. Test folder-surat.html and index.html loads
console.log('6. Testing folder-surat.html & index.html navigation...');
let folderError = false;
page.on('pageerror', () => { folderError = true; });

await page.goto(`http://localhost:${PORT}/folder-surat.html`);
await page.waitForTimeout(500);
const folderTitle = await page.title();
assert.ok(folderTitle.includes('Folder Surat'), 'folder-surat.html must load correctly');

await page.goto(`http://localhost:${PORT}/index.html`);
await page.waitForTimeout(500);
const indexTitle = await page.title();
assert.ok(indexTitle.includes('Surat') || indexTitle.includes('GenSurat') || indexTitle.includes('DanaIMIP'), 'index.html must load correctly');

console.log('✓ folder-surat.html and index.html verified!');

await browser.close();
server.close();
console.log('🎉 test_surat_kabinet_customizer completed successfully!');
