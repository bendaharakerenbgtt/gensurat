import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 8099;
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
const consoleErrors = [];
page.on('console', msg => {
    if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
    }
});

const files = [
    '016_SUD_SARAH MUTHIAH WIDAD.docx',
    '019_SUD_MUHAMMAD JAISYUL HAQ.pdf',
    '022_SUD_ALUMNI LDK IMIP.docx',
    '025_SPZ QURMEDIA 2026.pdf',
    '026_SBA_DAUROH 2026.docx',
    '034_SBA STUBAN 2026.pdf',
    '042_SPM_ OPEN HOUSE LDK IMIP 2026.pdf',
    'TEMPLATE_SBA MUHARRIK 2026.docx',
    'TEMPLATE_SPM MUHARRIK 2026.docx',
    'TEMPLATE_SPZ MUHARRIK 2026.docx',
    'TEMPLATE_SUD MUHARRIK 2026.docx'
];

console.log(`Starting automated E2E validation across ${files.length} documents...`);

for (const fileName of files) {
    const filePath = path.join(process.cwd(), 'contoh', fileName);
    assert.ok(fs.existsSync(filePath), `Sample file ${fileName} must exist`);

    await page.goto(`http://localhost:${PORT}/engine.html`);
    const fileInput = page.locator('#document_file_input');
    await fileInput.setInputFiles(filePath);

    // Wait for canvas viewport to show
    await page.waitForSelector('#canvas_viewport:not(.hidden)', { timeout: 15000 });

    const isPdf = fileName.endsWith('.pdf');
    if (isPdf) {
        await page.waitForSelector('.pdf-interactive-target', { timeout: 15000 });
        const targetsCount = await page.locator('.pdf-interactive-target').count();
        assert.ok(targetsCount >= 5, `PDF ${fileName} should render at least 5 interactive targets`);
    } else {
        await page.waitForSelector('.docx-interactive-paragraph', { timeout: 15000 });
        const pCount = await page.locator('.docx-interactive-paragraph').count();
        assert.ok(pCount >= 5, `DOCX ${fileName} should render at least 5 interactive paragraphs`);
    }

    console.log(`✓ Loaded and parsed: ${fileName}`);
}

// Special Reflow & Overlap Test on 042_SPM
console.log('Testing reflow and overlap prevention on 042_SPM...');
await page.goto(`http://localhost:${PORT}/engine.html`);
const spmPath = path.join(process.cwd(), 'contoh', '042_SPM_ OPEN HOUSE LDK IMIP 2026.pdf');
await page.locator('#document_file_input').setInputFiles(spmPath);
await page.waitForSelector('.pdf-interactive-target', { timeout: 15000 });

const pTargetId = await page.evaluate(() => {
    const targets = Array.from(document.querySelectorAll('.pdf-interactive-target'));
    const pt = targets.find(t => t.title && t.title.includes('Melalui surat ini'));
    return pt ? pt.id : null;
});
assert.ok(pTargetId, 'Paragraph target must be found');

await page.click('#' + pTargetId);
await page.waitForTimeout(400);

const origText = await page.locator('#inspector_text_input').inputValue();
// Append 5 extra lines
const expandedText = origText + '\n\nTambahan penjelasan poin penting acara untuk kelancaran kegiatan.';
await page.locator('#inspector_text_input').fill(expandedText);
await page.locator('#btn_apply_inspector').click();
await page.waitForTimeout(600);

// Check that no overlap exists between paragraph and 'Besar harapan kami'
const checkOverlap = await page.evaluate(() => {
    const targets = Array.from(document.querySelectorAll('.pdf-interactive-target'));
    const pEl = targets.find(t => t.title && t.title.includes('Melalui surat ini'));
    const nextEl = targets.find(t => t.title && t.title.includes('Besar harapan'));
    if (!pEl || !nextEl) return { valid: false };

    const pRect = pEl.getBoundingClientRect();
    const nextRect = nextEl.getBoundingClientRect();
    return {
        valid: true,
        pBottom: pRect.bottom,
        nextTop: nextRect.top,
        isSeparated: nextRect.top >= pRect.bottom - 2 // Next element sits cleanly below or equals
    };
});

assert.ok(checkOverlap.valid, 'Both paragraph and next element must exist in DOM');
assert.ok(checkOverlap.isSeparated, `Next element top (${checkOverlap.nextTop}) must sit below paragraph bottom (${checkOverlap.pBottom})`);
console.log('✓ In-place paragraph reflow verified with zero text overlap!');

await browser.close();
server.close();

console.log('🎉 ALL 11 DOCUMENTS AND E2E REFLOW TESTS PASSED CLEANLY!');
