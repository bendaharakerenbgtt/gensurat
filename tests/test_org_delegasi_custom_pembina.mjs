import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 8093;
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
        '.webp': 'image/webp'
    };
    res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
});

await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
});

try {
    const page = await browser.newPage();
    console.log('1. Loading buat-surat.html?editor=1...');
    await page.goto(`http://localhost:${PORT}/buat-surat.html?editor=1`);
    await page.waitForSelector('.spz-kop-container', { timeout: 15000 });

    // Test 1: Kode Organisasi / Delegasi default adalah ORG dan ada inputnya
    console.log('2. Checking kode organisasi field and default value...');
    const orgValue = await page.evaluate(() => {
        const input = document.getElementById('field_nomor_org');
        return input ? input.value : null;
    });
    assert.strictEqual(orgValue, 'ORG', 'Default kode organisasi di form utama harus ORG');

    const noSuratInitial = await page.evaluate(() => {
        return document.getElementById('field_nomor_surat')?.value;
    });
    console.log('Current Nomor Surat:', noSuratInitial);
    assert.ok(noSuratInitial.includes('/ORG/'), 'Nomor surat awal harus memuat /ORG/');

    // Test 2: Ganti kode delegasi jadi HMJ-TI dan verifikasi preview serta nomor surat
    console.log('3. Changing kode delegasi to HMJ-TI...');
    await page.evaluate(() => {
        handleOrgCodeInput('HMJ-TI');
    });
    await page.waitForTimeout(300);

    const updatedNoSurat = await page.evaluate(() => {
        return document.getElementById('field_nomor_surat')?.value;
    });
    console.log('Updated Nomor Surat:', updatedNoSurat);
    assert.ok(updatedNoSurat.includes('/HMJ-TI/'), 'Nomor surat harus otomatis berubah menyertakan /HMJ-TI/');

    // Test 3: Cek penyamaran NIM Ketua Pelaksana & Ketua Organisasi
    console.log('4. Verifying masked sample NIMs and names...');
    const ttd1Nama = await page.evaluate(() => document.getElementById('field_ttd1_nama')?.value);
    const ttd1Nim = await page.evaluate(() => document.getElementById('field_ttd1_nim_angka')?.value);
    const ttd2Nama = await page.evaluate(() => document.getElementById('field_ttd2_nama')?.value);
    const ttd2Nim = await page.evaluate(() => document.getElementById('field_ttd2_nim_angka')?.value);

    console.log('TTD1:', ttd1Nama, ttd1Nim);
    console.log('TTD2:', ttd2Nama, ttd2Nim);
    assert.ok(ttd1Nim.includes('x') || ttd1Nim.includes('X'), 'NIM Ketua Pelaksana contoh harus disamarkan dengan format x');
    assert.ok(ttd2Nim.includes('x') || ttd2Nim.includes('X'), 'NIM Ketua Organisasi contoh harus disamarkan dengan format x');

    // Test 4: Cek pejabat tetap (Ketua BEM, MPM, Wadir) TIDAK diubah
    console.log('5. Verifying BEM, MPM, and Wadir remains intact...');
    const bemNama = await page.evaluate(() => document.getElementById('field_ttd_bem_nama')?.value);
    const bemNim = await page.evaluate(() => document.getElementById('field_ttd_bem_nim_angka')?.value);
    const mpmNama = await page.evaluate(() => document.getElementById('field_ttd_mpm_nama')?.value);
    const mpmNim = await page.evaluate(() => document.getElementById('field_ttd_mpm_nim_angka')?.value);
    const wadirNama = await page.evaluate(() => document.getElementById('field_ttd_wadir_nama')?.value);

    console.log('BEM:', bemNama, bemNim);
    console.log('MPM:', mpmNama, mpmNim);
    console.log('Wadir:', wadirNama);

    assert.strictEqual(bemNama, 'Ujang Rahman', 'Nama Ketua BEM harus tetap Ujang Rahman');
    assert.strictEqual(bemNim, '2490343155', 'NIM Ketua BEM harus tetap 2490343155');
    assert.strictEqual(mpmNama, 'Sheyla Aulya', 'Nama Ketua MPM harus tetap Sheyla Aulya');
    assert.strictEqual(mpmNim, '2491345088', 'NIM Ketua MPM harus tetap 2491345088');
    assert.strictEqual(wadirNama, 'Dr. Dayu Sri Herti, S.Pd., M.Sn.', 'Nama Wadir harus tetap Dr. Dayu Sri Herti, S.Pd., M.Sn.');

    // Test 5: Kustomisasi Jabatan, Nama & NIP Dosen Pembina
    console.log('6. Verifying default Jabatan Dosen Pembina & customizing Jabatan, Name, and NIP...');
    const defaultDosenJabatan = await page.evaluate(() => document.getElementById('field_ttd3_jabatan')?.value);
    console.log('Default Dosen Jabatan:', JSON.stringify(defaultDosenJabatan));
    assert.strictEqual(defaultDosenJabatan, 'Dosen Pembina\nOrganisasi', 'Default jabatan harus Dosen Pembina\\nOrganisasi');

    await page.evaluate(() => {
        const j = document.getElementById('field_ttd3_jabatan');
        const n = document.getElementById('field_ttd3_nama');
        const a = document.getElementById('field_ttd3_nim_angka');
        if (j) j.value = 'Dosen Pembina\nUKM Riset & Teknologi';
        if (n) n.value = 'Prof. Ahmad Fauzi, M.T.';
        if (a) {
            a.value = '198501012015041002';
            handleNipInput('field_ttd3_nim_angka', 'field_ttd3_nim');
        }
        updatePreview();
        triggerAutoSave();
    });
    await page.waitForTimeout(300);

    const customDosenJabatan = await page.evaluate(() => document.getElementById('field_ttd3_jabatan')?.value);
    const customDosenNama = await page.evaluate(() => document.getElementById('field_ttd3_nama')?.value);
    const customDosenNim = await page.evaluate(() => document.getElementById('field_ttd3_nim')?.value);
    assert.strictEqual(customDosenJabatan, 'Dosen Pembina\nUKM Riset & Teknologi', 'Jabatan Dosen Pembina harus bisa diedit bebas');
    assert.strictEqual(customDosenNama, 'Prof. Ahmad Fauzi, M.T.', 'Nama Dosen Pembina harus bisa diganti bebas');
    assert.strictEqual(customDosenNim, 'NIP. 198501012015041002', 'NIP Dosen Pembina harus terupdate dinamis');

    // Test 6: Verifikasi Overlay Logo Kanan Kop TIDAK Menutupi "Jakarta Selatan 12640" & Kustomisasi Email Kop
    console.log('7. Verifying Kop Right Logos Overlay position & Custom Email Kop...');
    const kopCheck = await page.evaluate(() => {
        const rightOverlay = document.querySelector('.spz-kop-custom-right-logos');
        const emailOverlay = document.querySelector('.spz-kop-custom-email');
        const emailSpan = document.querySelector('.spz-kop-email-text');
        return {
            rightStyleLeft: rightOverlay ? rightOverlay.style.left : null,
            hasEmailOverlay: !!emailOverlay,
            defaultEmailText: emailSpan ? emailSpan.textContent.trim() : null
        };
    });
    console.log('Kop Check Initial:', kopCheck);
    assert.strictEqual(kopCheck.rightStyleLeft, '74.5%', 'Overlay logo kanan harus mulai dari left: 74.5% agar tidak menutupi teks Jakarta Selatan 12640 (yang berakhir di 72.06%)');
    assert.strictEqual(kopCheck.hasEmailOverlay, true, 'Overlay email kop harus tersedia di atas kop surat');
    assert.strictEqual(kopCheck.defaultEmailText, 'ldkimip@gmail.com', 'Default email kop harus ldkimip@gmail.com');

    // Ganti email kop dan cek sinkronisasi di preview, form, dan modal
    await page.evaluate(() => {
        handleKopEmailInput('humas.bem@polimedia.ac.id');
    });
    await page.waitForTimeout(450);

    const updatedEmailCheck = await page.evaluate(() => {
        return {
            previewText: document.querySelector('.spz-kop-email-text')?.textContent.trim(),
            formVal: document.getElementById('field_kop_email')?.value,
            modalVal: document.getElementById('modal_input_kop_email')?.value
        };
    });
    console.log('Updated Email Check:', updatedEmailCheck);
    assert.strictEqual(updatedEmailCheck.previewText, 'humas.bem@polimedia.ac.id', 'Teks email di preview kop harus berubah');
    assert.strictEqual(updatedEmailCheck.formVal, 'humas.bem@polimedia.ac.id', 'Input form email kop harus tersinkronisasi');
    assert.strictEqual(updatedEmailCheck.modalVal, 'humas.bem@polimedia.ac.id', 'Input modal email kop harus tersinkronisasi');

    // Test 7: Reload page and confirm persistence
    console.log('8. Testing persistence after reload...');
    await page.reload();
    await page.waitForSelector('.spz-kop-container', { timeout: 15000 });

    const persistedOrg = await page.evaluate(() => document.getElementById('field_nomor_org')?.value);
    const persistedDosenJabatan = await page.evaluate(() => document.getElementById('field_ttd3_jabatan')?.value);
    const persistedDosenNama = await page.evaluate(() => document.getElementById('field_ttd3_nama')?.value);
    const persistedKopEmail = await page.evaluate(() => document.querySelector('.spz-kop-email-text')?.textContent.trim());
    console.log('Persisted Org:', persistedOrg);
    console.log('Persisted Dosen Jabatan:', JSON.stringify(persistedDosenJabatan));
    console.log('Persisted Dosen:', persistedDosenNama);
    console.log('Persisted Kop Email:', persistedKopEmail);
    assert.strictEqual(persistedOrg, 'HMJ-TI', 'Kode delegasi HMJ-TI harus tersimpan dan persisten');
    assert.strictEqual(persistedDosenJabatan, 'Dosen Pembina\nUKM Riset & Teknologi', 'Jabatan custom dosen pembina harus tersimpan dan persisten');
    assert.strictEqual(persistedDosenNama, 'Prof. Ahmad Fauzi, M.T.', 'Nama custom dosen harus tersimpan dan persisten');
    assert.strictEqual(persistedKopEmail, 'humas.bem@polimedia.ac.id', 'Email kop kustom harus tersimpan dan persisten setelah reload');

    // Test 8: Verifikasi Tujuan SPZ, SPM, SBA, SUD memakai Politeknik Negeri Media Kreatif (bukan Sekretariat / Kampus)
    console.log('9. Verifying SPZ Tujuan, Subbag Umum, and other surat templates match authentic Polimedia format...');
    await page.evaluate(() => {
        selectSuratType('SPZ');
    });
    await page.waitForTimeout(350);

    const spzCheck = await page.evaluate(() => {
        const tujuanVal = document.getElementById('field_tujuan')?.value;
        const tujuanPreviewEl = document.querySelector('[data-edit-target="field_tujuan"]');
        const tujuanPreviewHtml = tujuanPreviewEl ? tujuanPreviewEl.innerHTML : '';
        const tujuanPreviewText = tujuanPreviewEl ? tujuanPreviewEl.innerText.replace(/\u00a0/g, ' ') : '';
        const allPreviewText = Array.from(document.querySelectorAll('.spz-page-sheet')).map(el => el.innerText).join('\n');
        return {
            tujuanVal,
            tujuanPreviewHtml,
            tujuanPreviewText,
            hasPolimediaSubbag: allPreviewText.includes('Kepala Subbagian Umum Politeknik Negeri Media Kreatif menyetujui'),
            hasKampusPoliMedia: allPreviewText.includes('berlaku di Kampus PoliMedia'),
            hasBemPoliMedia: allPreviewText.includes('Ketua BEM PoliMedia'),
            hasMpmPoliMedia: allPreviewText.includes('PoliMedia Periode 2026'),
            hasSekretariatKampus: allPreviewText.includes('Sekretariat / Kampus')
        };
    });
    console.log('SPZ Check:', spzCheck);
    assert.strictEqual(spzCheck.tujuanVal, 'Yth, Kepala Subbagian Umum\nPoliteknik Negeri Media Kreatif\nDi Tempat', 'Field tujuan SPZ harus persis sesuai contoh');
    assert.ok(spzCheck.tujuanPreviewText.includes('Yth,') && spzCheck.tujuanPreviewText.includes('Kepala Subbagian Umum'), 'Preview tujuan SPZ harus memuat Yth, Kepala Subbagian Umum');
    assert.ok(spzCheck.tujuanPreviewText.includes('Politeknik Negeri Media Kreatif'), 'Preview tujuan SPZ harus memuat Politeknik Negeri Media Kreatif');
    assert.ok(!spzCheck.tujuanPreviewHtml.includes('<strong style="font-weight: bold;">Kepala Subbagian Umum</strong>'), 'Kepala Subbagian Umum di SPZ tidak boleh dipaksa bold');
    assert.strictEqual(spzCheck.hasPolimediaSubbag, true, 'Halaman Subbag Umum SPZ harus menyebut Kepala Subbagian Umum Politeknik Negeri Media Kreatif');
    assert.strictEqual(spzCheck.hasKampusPoliMedia, true, 'Peraturan no 11 SPZ harus menyebut Kampus PoliMedia');
    assert.strictEqual(spzCheck.hasBemPoliMedia, true, 'Jabatan BEM harus Ketua BEM PoliMedia');
    assert.strictEqual(spzCheck.hasMpmPoliMedia, true, 'Jabatan MPM harus Ketua Umum MPM PoliMedia');
    assert.strictEqual(spzCheck.hasSekretariatKampus, false, 'Tidak boleh ada teks Sekretariat / Kampus di preview SPZ');

    // Cek SPM, SBA, SUD
    const otherTypesCheck = await page.evaluate(() => {
        selectSuratType('SPM');
        const spmTujuan = document.getElementById('field_tujuan')?.value;
        const spmPembuka = document.getElementById('field_pembuka')?.value;
        selectSuratType('SBA');
        const sbaPembuka = document.getElementById('field_pembuka')?.value;
        selectSuratType('SUD');
        const sudPembuka = document.getElementById('field_pembuka')?.value;
        const sudIsi = document.getElementById('field_isi_inti')?.value;
        return { spmTujuan, spmPembuka, sbaPembuka, sudPembuka, sudIsi };
    });
    console.log('Other Types Check:', otherTypesCheck);
    assert.ok(otherTypesCheck.spmTujuan.includes('Politeknik Negeri Media Kreatif Jakarta'), 'Tujuan SPM harus menyebut Politeknik Negeri Media Kreatif Jakarta');
    assert.ok(otherTypesCheck.spmPembuka.includes('**Unit Kegiatan Mahasiswa Organisasi**'), 'Pembuka SPM harus menyebut Unit Kegiatan Mahasiswa Organisasi');
    assert.ok(otherTypesCheck.sbaPembuka.includes('Politeknik Negeri Media Kreatif Jakarta'), 'Pembuka SBA harus menyebut Politeknik Negeri Media Kreatif Jakarta');
    assert.ok(otherTypesCheck.sudPembuka.includes('Politeknik Negeri Media Kreatif Jakarta'), 'Pembuka SUD harus menyebut Politeknik Negeri Media Kreatif Jakarta');
    assert.ok(!otherTypesCheck.sudIsi.includes('IMIP'), 'Isi SUD tidak boleh menyisakan mention IMIP');

    console.log('🎉 All 8 feature verification checks passed with 100% success!');
} finally {
    await browser.close();
    server.close();
}
