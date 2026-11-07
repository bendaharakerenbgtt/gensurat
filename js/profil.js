/**
 * GenSurat - profil.js
 * Handles Organization Profile, Custom Logos, Watermark, and HTML Kop Builder.
 */

const DEFAULT_ORGANIZATION_PROFILE = {
    // 1. KAMPUS / INSTITUSI
    kampus_nama: 'POLITEKNIK NEGERI MEDIA KREATIF',
    kampus_alamat: 'Jalan Srengseng Sawah, Jagakarsa Jakarta Selatan 12640',
    kampus_logo: 'assets/logo_polimedia.png',
    kampus_logo_active: true,

    // 2. ORGANISASI
    org_wadah: 'UNIT KEGIATAN MAHASISWA',
    org_nama: 'NAMA ORGANISASI XXX',
    org_singkatan: 'XXX',
    org_kode_surat: 'XXX/XXX',
    org_email: 'email@xxx.com',
    org_logo: '',
    org_logo_active: false,

    // 3. KABINET / LOGO KEDUA
    kabinet_nama: '',
    kabinet_logo: '',
    kabinet_logo_active: false,

    // 4. WATERMARK
    watermark_image: '',
    watermark_active: false,
    watermark_opacity: 0.12,
    watermark_size: 345, // px

    // 5. PEJABAT KAMPUS (Default Asli Polimedia - Dapat Diedit)
    wadir_jabatan: 'Wakil Direktur Bidang Kemahasiswaan dan Alumni',
    wadir_nama: 'Nova Darmanto, S.Sos., M.Si.',
    wadir_nip: '197811052003121002',

    subbag_jabatan: 'Kepala Subbagian Umum',
    subbag_nama: 'Runny Wachyuni, S.Pd., M.M.',
    subbag_nip: '198106172005012004',

    // 6. DEFAULT PEJABAT ORGANISASI
    dosen_pembina_jabatan: 'Dosen Pembina XXX',
    dosen_pembina_nama: 'Nama Dosen Pembina',
    dosen_pembina_nip: 'NIP. XXXXXXXXXXXXXXXXXX',

    ketua_org_jabatan: 'Ketua XXX',
    ketua_org_nama: 'Nama Ketua',
    ketua_org_nim: 'NIM. XXXXXXXXX',

    ketua_mpm_jabatan: 'Ketua MPM PoliMedia',
    ketua_mpm_nama: 'Nama Ketua MPM',
    ketua_mpm_nim: 'NIM. XXXXXXXXX',

    ketua_bem_jabatan: 'Ketua BEM PoliMedia',
    ketua_bem_nama: 'Nama Ketua BEM',
    ketua_bem_nim: 'NIM. XXXXXXXXX',

    // 7. MODE KOP: 'builder' (HTML modular) atau 'banner' (satu gambar utuh)
    kop_mode: 'builder',
    kop_banner_image: ''
};

function getOrganizationProfile() {
    try {
        const raw = localStorage.getItem(PROFIL_STORAGE_KEY);
        if (!raw) return JSON.parse(JSON.stringify(DEFAULT_ORGANIZATION_PROFILE));
        const parsed = JSON.parse(raw);
        return Object.assign({}, DEFAULT_ORGANIZATION_PROFILE, parsed);
    } catch (e) {
        console.error('Error loading organization profile:', e);
        return JSON.parse(JSON.stringify(DEFAULT_ORGANIZATION_PROFILE));
    }
}

function saveOrganizationProfile(profile) {
    try {
        localStorage.setItem(PROFIL_STORAGE_KEY, JSON.stringify(profile));
        return true;
    } catch (e) {
        console.error('Error saving organization profile:', e);
        return false;
    }
}

function getCurrentDocumentProfile() {
    if (typeof getActiveDocument === 'function') {
        const doc = getActiveDocument();
        if (doc && doc.profile) {
            return Object.assign({}, DEFAULT_ORGANIZATION_PROFILE, doc.profile);
        }
    }
    return getOrganizationProfile();
}

// ==========================================
// KOP SURAT GENERATOR (HTML Modular & Customizable)
// ==========================================
function generateOfficialKopHtml(marginBottom = '18pt') {
    const useKopEl = document.getElementById('field_use_kop');
    if (useKopEl && !useKopEl.checked) return '';

    const prof = getCurrentDocumentProfile();

    // Mode Banner Utuh (Jika pengguna mengunggah gambar kop utuh)
    if (prof.kop_mode === 'banner' && prof.kop_banner_image) {
        return `
            <div class="spz-kop-container preview-editable" data-edit-target="field_use_kop" data-edit-label="Kop Surat Resmi" data-edit-type="kop" title="Klik untuk pengaturan Kop Surat" style="position: relative; margin-bottom: ${marginBottom}; width: 100%;">
                <img src="${prof.kop_banner_image}" alt="Kop Surat Resmi" style="width: 100%; height: auto; display: block; object-fit: contain;">
            </div>
        `;
    }

    // Mode Kop Builder Modular (Susunan HTML Presisi)
    const kampusLogoSrc = (prof.kampus_logo_active && prof.kampus_logo) ? prof.kampus_logo : '';
    const orgLogoSrc = (prof.org_logo_active && prof.org_logo) ? prof.org_logo : '';
    const kabinetLogoSrc = (prof.kabinet_logo_active && prof.kabinet_logo) ? prof.kabinet_logo : '';

    const leftColHtml = kampusLogoSrc ? `
        <td style="width: 110px; vertical-align: middle; text-align: left; padding-right: 12px;">
            <img src="${kampusLogoSrc}" alt="Logo Kampus" style="max-height: 95px; max-width: 105px; width: auto; height: auto; display: inline-block; object-fit: contain;">
        </td>
    ` : `<td style="width: 10px;"></td>`;

    let rightLogosHtml = '';
    if (orgLogoSrc || kabinetLogoSrc) {
        rightLogosHtml = `
            <td style="width: auto; vertical-align: middle; text-align: right; padding-left: 10px; white-space: nowrap;">
                <div style="display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end;">
                    ${orgLogoSrc ? `<img src="${orgLogoSrc}" alt="Logo Organisasi" style="max-height: 85px; max-width: 85px; width: auto; height: auto; object-fit: contain;">` : ''}
                    ${kabinetLogoSrc ? `<img src="${kabinetLogoSrc}" alt="Logo Kabinet" style="max-height: 85px; max-width: 85px; width: auto; height: auto; object-fit: contain;">` : ''}
                </div>
            </td>
        `;
    } else {
        // Biar teks tengah tetap terpusat simetris
        rightLogosHtml = leftColHtml !== '<td style="width: 10px;"></td>' ? `<td style="width: 110px;"></td>` : `<td style="width: 10px;"></td>`;
    }

    const wadah = (prof.org_wadah || '').trim();
    const orgNama = (prof.org_nama || '').trim();
    const kampusNama = (prof.kampus_nama || '').trim();
    const alamat = (prof.kampus_alamat || '').trim();
    const email = (prof.org_email || '').trim();

    return `
        <div class="spz-kop-container preview-editable" data-edit-target="field_use_kop" data-edit-label="Kop Surat Resmi" data-edit-type="kop" title="Klik untuk pengaturan Kop Surat" style="position: relative; margin-bottom: ${marginBottom}; width: 100%;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2pt;">
                <tr>
                    ${leftColHtml}
                    <td style="vertical-align: middle; text-align: center; font-family: 'Times New Roman', serif;">
                        ${wadah ? `<p style="margin: 0; font-size: 13pt; font-weight: bold; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.3px;">${escapeHtml(wadah)}</p>` : ''}
                        ${orgNama ? `<p style="margin: 0; font-size: 14pt; font-weight: bold; line-height: 1.25; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(orgNama)}</p>` : ''}
                        ${kampusNama ? `<p style="margin: 0; font-size: 13pt; font-weight: bold; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.3px;">${escapeHtml(kampusNama)}</p>` : ''}
                        ${alamat ? `<p style="margin: 2pt 0 0 0; font-size: 10pt; line-height: 1.25;">${escapeHtml(alamat)}</p>` : ''}
                        ${email ? `<p style="margin: 1pt 0 0 0; font-size: 10pt; line-height: 1.25;"><span style="color: #1d4ed8; text-decoration: underline;">${escapeHtml(email)}</span></p>` : ''}
                    </td>
                    ${rightLogosHtml}
                </tr>
            </table>
            <div class="kop-separator" style="border-top: 2.5px solid #000000; border-bottom: 0.8px solid #000000; height: 3px; margin: 4pt 0 10pt 0;"></div>
        </div>
    `;
}

function generateKopHtml() {
    return generateOfficialKopHtml('18pt');
}

function generateKopHtmlSpz(marginBottom = '8pt') {
    return generateOfficialKopHtml(marginBottom);
}

// ==========================================
// WATERMARK GENERATOR
// ==========================================
function getOfficialWatermarkHtml(topOffset = '145mm') {
    const prof = getCurrentDocumentProfile();
    if (!prof.watermark_active || !prof.watermark_image) {
        return '';
    }

    const size = prof.watermark_size || 345;
    const opacity = prof.watermark_opacity !== undefined ? prof.watermark_opacity : 0.12;

    return `
        <div class="spz-watermark-layer" style="position: absolute !important; top: ${topOffset} !important; left: 50% !important; transform: translate(-50%, -50%) !important; width: ${size}px !important; height: ${size}px !important; max-width: ${size}px !important; max-height: ${size}px !important; pointer-events: none !important; z-index: 1 !important; user-select: none !important; display: flex !important; align-items: center !important; justify-content: center !important; margin: 0 !important; padding: 0 !important;">
            <img src="${prof.watermark_image}" alt="Watermark" style="width: ${size}px !important; height: ${size}px !important; max-width: ${size}px !important; max-height: ${size}px !important; object-fit: contain !important; display: block !important; opacity: ${opacity} !important; border: 0 !important;">
        </div>
    `;
}

function getSpzWatermarkHtml(topOffset = '145mm') {
    return getOfficialWatermarkHtml(topOffset);
}

// ==========================================
// MODAL PENGATURAN PROFIL ORGANISASI (UI)
// ==========================================
function openProfileModal() {
    const modal = document.getElementById('modal_profil_organisasi');
    if (!modal) return;

    const prof = getCurrentDocumentProfile();
    
    // Fill Kampus Fields
    document.getElementById('prof_kampus_nama').value = prof.kampus_nama || '';
    document.getElementById('prof_kampus_alamat').value = prof.kampus_alamat || '';
    document.getElementById('prof_kampus_logo_active').checked = !!prof.kampus_logo_active;

    // Fill Org Fields
    document.getElementById('prof_org_wadah').value = prof.org_wadah || '';
    document.getElementById('prof_org_nama').value = prof.org_nama || '';
    document.getElementById('prof_org_singkatan').value = prof.org_singkatan || '';
    document.getElementById('prof_org_kode_surat').value = prof.org_kode_surat || '';
    document.getElementById('prof_org_email').value = prof.org_email || '';
    document.getElementById('prof_org_logo_active').checked = !!prof.org_logo_active;

    // Fill Kabinet Fields
    document.getElementById('prof_kabinet_nama').value = prof.kabinet_nama || '';
    document.getElementById('prof_kabinet_logo_active').checked = !!prof.kabinet_logo_active;

    // Fill Watermark Fields
    document.getElementById('prof_watermark_active').checked = !!prof.watermark_active;
    document.getElementById('prof_watermark_opacity').value = Math.round((prof.watermark_opacity || 0.12) * 100);
    document.getElementById('prof_watermark_opacity_label').innerText = `${Math.round((prof.watermark_opacity || 0.12) * 100)}%`;

    // Fill Pejabat Fields
    document.getElementById('prof_wadir_nama').value = prof.wadir_nama || '';
    document.getElementById('prof_wadir_nip').value = prof.wadir_nip || '';
    document.getElementById('prof_wadir_jabatan').value = prof.wadir_jabatan || '';

    document.getElementById('prof_subbag_nama').value = prof.subbag_nama || '';
    document.getElementById('prof_subbag_nip').value = prof.subbag_nip || '';

    document.getElementById('prof_dosen_nama').value = prof.dosen_pembina_nama || '';
    document.getElementById('prof_dosen_nip').value = prof.dosen_pembina_nip || '';
    document.getElementById('prof_dosen_jabatan').value = prof.dosen_pembina_jabatan || '';

    document.getElementById('prof_ketua_org_nama').value = prof.ketua_org_nama || '';
    document.getElementById('prof_ketua_org_nim').value = prof.ketua_org_nim || '';
    document.getElementById('prof_ketua_org_jabatan').value = prof.ketua_org_jabatan || '';

    // Update previews
    updateProfileLogoPreviews(prof);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeProfileModal() {
    const modal = document.getElementById('modal_profil_organisasi');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function updateProfileLogoPreviews(prof) {
    const kampusImg = document.getElementById('prev_kampus_logo');
    if (kampusImg) {
        kampusImg.src = prof.kampus_logo || 'assets/logo_polimedia.png';
        kampusImg.style.display = prof.kampus_logo ? 'block' : 'none';
    }

    const orgImg = document.getElementById('prev_org_logo');
    if (orgImg) {
        orgImg.src = prof.org_logo || '';
        orgImg.style.display = prof.org_logo ? 'block' : 'none';
    }

    const kabinetImg = document.getElementById('prev_kabinet_logo');
    if (kabinetImg) {
        kabinetImg.src = prof.kabinet_logo || '';
        kabinetImg.style.display = prof.kabinet_logo ? 'block' : 'none';
    }

    const wmImg = document.getElementById('prev_watermark_logo');
    if (wmImg) {
        wmImg.src = prof.watermark_image || '';
        wmImg.style.display = prof.watermark_image ? 'block' : 'none';
    }
}

function handleProfileImageUpload(event, fieldKey) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        const prof = getCurrentDocumentProfile();
        prof[fieldKey] = base64;
        
        // Auto enable corresponding checkbox
        if (fieldKey === 'org_logo') prof.org_logo_active = true;
        if (fieldKey === 'kabinet_logo') prof.kabinet_logo_active = true;
        if (fieldKey === 'watermark_image') prof.watermark_active = true;
        if (fieldKey === 'kampus_logo') prof.kampus_logo_active = true;

        saveOrganizationProfile(prof);
        
        // Save to active document too
        if (typeof getActiveDocument === 'function') {
            const doc = getActiveDocument();
            if (doc) {
                doc.profile = JSON.parse(JSON.stringify(prof));
                if (typeof triggerAutoSave === 'function') triggerAutoSave();
            }
        }

        updateProfileLogoPreviews(prof);
        if (typeof updatePreview === 'function') updatePreview();
        if (typeof showToast === 'function') showToast('Gambar berhasil diperbarui.', 'success');
    };
    reader.readAsDataURL(file);
}

function removeProfileImage(fieldKey) {
    const prof = getCurrentDocumentProfile();
    if (fieldKey === 'kampus_logo') {
        prof.kampus_logo = 'assets/logo_polimedia.png'; // reset to default polimedia
    } else {
        prof[fieldKey] = '';
    }

    saveOrganizationProfile(prof);
    if (typeof getActiveDocument === 'function') {
        const doc = getActiveDocument();
        if (doc) {
            doc.profile = JSON.parse(JSON.stringify(prof));
            if (typeof triggerAutoSave === 'function') triggerAutoSave();
        }
    }

    updateProfileLogoPreviews(prof);
    if (typeof updatePreview === 'function') updatePreview();
    if (typeof showToast === 'function') showToast('Gambar dihapus / direset.', 'info');
}

function handleSaveProfileSubmit(event) {
    if (event) event.preventDefault();

    const prof = getCurrentDocumentProfile();

    prof.kampus_nama = document.getElementById('prof_kampus_nama').value.trim();
    prof.kampus_alamat = document.getElementById('prof_kampus_alamat').value.trim();
    prof.kampus_logo_active = document.getElementById('prof_kampus_logo_active').checked;

    prof.org_wadah = document.getElementById('prof_org_wadah').value.trim();
    prof.org_nama = document.getElementById('prof_org_nama').value.trim();
    prof.org_singkatan = document.getElementById('prof_org_singkatan').value.trim();
    prof.org_kode_surat = document.getElementById('prof_org_kode_surat').value.trim();
    prof.org_email = document.getElementById('prof_org_email').value.trim();
    prof.org_logo_active = document.getElementById('prof_org_logo_active').checked;

    prof.kabinet_nama = document.getElementById('prof_kabinet_nama').value.trim();
    prof.kabinet_logo_active = document.getElementById('prof_kabinet_logo_active').checked;

    prof.watermark_active = document.getElementById('prof_watermark_active').checked;
    prof.watermark_opacity = parseInt(document.getElementById('prof_watermark_opacity').value, 10) / 100;

    prof.wadir_nama = document.getElementById('prof_wadir_nama').value.trim();
    prof.wadir_nip = document.getElementById('prof_wadir_nip').value.trim();
    prof.wadir_jabatan = document.getElementById('prof_wadir_jabatan').value.trim();

    prof.subbag_nama = document.getElementById('prof_subbag_nama').value.trim();
    prof.subbag_nip = document.getElementById('prof_subbag_nip').value.trim();

    prof.dosen_pembina_nama = document.getElementById('prof_dosen_nama').value.trim();
    prof.dosen_pembina_nip = document.getElementById('prof_dosen_nip').value.trim();
    prof.dosen_pembina_jabatan = document.getElementById('prof_dosen_jabatan').value.trim();

    prof.ketua_org_nama = document.getElementById('prof_ketua_org_nama').value.trim();
    prof.ketua_org_nim = document.getElementById('prof_ketua_org_nim').value.trim();
    prof.ketua_org_jabatan = document.getElementById('prof_ketua_org_jabatan').value.trim();

    // Simpan ke profil global (template default)
    saveOrganizationProfile(prof);

    // Terapkan ke dokumen aktif saat ini
    if (typeof getActiveDocument === 'function') {
        const doc = getActiveDocument();
        if (doc) {
            doc.profile = JSON.parse(JSON.stringify(prof));
            if (typeof triggerAutoSave === 'function') triggerAutoSave();
        }
    }

    closeProfileModal();
    if (typeof updatePreview === 'function') updatePreview();
    if (typeof showToast === 'function') showToast('Profil organisasi berhasil disimpan.', 'success');
}
