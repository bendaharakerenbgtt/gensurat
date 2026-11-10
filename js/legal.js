/**
 * GenSurat — Formal Syarat & Ketentuan Layanan dan Kebijakan Privasi
 * Client-Side Only, Zero-Data Collection, 100% Local Storage Architecture
 */

(function () {
  'use strict';

  const LEGAL_STORAGE_KEY = 'gensurat_legal_accepted_v1';

  // Inject Legal Modals into DOM if not already present
  function injectLegalModals() {
    if (document.getElementById('modal_legal_onboarding')) return;

    const modalHTML = `
      <!-- ONBOARDING LEGAL MODAL (First Visit Entry) -->
      <div id="modal_legal_onboarding" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden items-center justify-center p-3 sm:p-5 transition-all duration-300">
        <div class="modal-card-box max-w-xl w-full rounded-2xl p-6 sm:p-7 shadow-2xl relative space-y-5 border text-left bg-neutral-900 border-neutral-800 text-white">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl shrink-0">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <span class="text-[10px] font-bold font-mono tracking-wider uppercase text-blue-400">Pemberitahuan Resmi</span>
              <h2 class="text-base sm:text-lg font-black tracking-tight mt-0.5">Syarat Ketentuan & Kebijakan Privasi</h2>
              <p class="text-xs text-neutral-400 mt-1">Selamat datang di GenSurat. Mohon tinjau prinsip keamanan data lokal dan tata naskah dinas kami sebelum menggunakan aplikasi.</p>
            </div>
          </div>

          <div class="space-y-3 py-1 text-xs">
            <!-- Poin 1: Lokal 100% -->
            <div class="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/60 modal-subcard flex items-start gap-3">
              <div class="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                <i class="fa-solid fa-lock"></i>
              </div>
              <div class="space-y-0.5">
                <h4 class="font-bold text-white text-[12px]">Penyimpanan Lokal 100% (Zero Server Storage)</h4>
                <p class="text-neutral-400 text-[11px] leading-relaxed">Seluruh berkas draf surat, logo kampus/organisasi, tanda tangan, nomor agenda, dan nota berita acara disimpan murni di peramban lokal perangkat Anda (LocalStorage & IndexedDB). <strong>Tidak ada peladen server backend yang menyimpan atau mengintip data Anda.</strong></p>
              </div>
            </div>

            <!-- Poin 2: Kerahasiaan & Privasi -->
            <div class="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/60 modal-subcard flex items-start gap-3">
              <div class="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                <i class="fa-solid fa-user-shield"></i>
              </div>
              <div class="space-y-0.5">
                <h4 class="font-bold text-white text-[12px]">Nol Pelacakan & Privasi Dokumen</h4>
                <p class="text-neutral-400 text-[11px] leading-relaxed">Kami tidak memungut data analitik pelacak (no telemetry) dan tidak menjual atau menyebarkan dokumen Anda kepada pihak ketiga manapun.</p>
              </div>
            </div>

            <!-- Poin 3: Tanggung Jawab Dokumen Resmi -->
            <div class="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/60 modal-subcard flex items-start gap-3">
              <div class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                <i class="fa-solid fa-scale-balanced"></i>
              </div>
              <div class="space-y-0.5">
                <h4 class="font-bold text-white text-[12px]">Tanggung Jawab Pembuatan & Legalitas Surat</h4>
                <p class="text-neutral-400 text-[11px] leading-relaxed">GenSurat adalah alat bantu tata naskah surat dinas. Pengguna bertanggung jawab penuh atas keabsahan nomor surat, perihal, dan tanda tangan resmi. <strong>Dilarang keras menyalahgunakan aplikasi untuk pemalsuan dokumen atau tindakan melanggar hukum.</strong></p>
              </div>
            </div>

            <!-- Poin 4: Pencadangan Mandiri -->
            <div class="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/60 modal-subcard flex items-start gap-3">
              <div class="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                <i class="fa-solid fa-file-export"></i>
              </div>
              <div class="space-y-0.5">
                <h4 class="font-bold text-white text-[12px]">Pencadangan Mandiri (Backup JSON)</h4>
                <p class="text-neutral-400 text-[11px] leading-relaxed">Karena data berada di peramban lokal, pembersihan cache browser dapat menghapus draf surat. Disarankan mengunduh berkas cadangan melalui menu <em>Cadangan JSON</em> secara teratur.</p>
              </div>
            </div>
          </div>

          <!-- Acceptance Checkbox -->
          <div class="pt-2 border-t border-neutral-800">
            <label class="flex items-center gap-2.5 cursor-pointer text-[11.5px] text-neutral-300 hover:text-white select-none">
              <input type="checkbox" id="legal_agree_checkbox" checked class="w-4 h-4 rounded border-neutral-700 text-blue-600 focus:ring-0 cursor-pointer">
              <span>Saya telah membaca, memahami, dan menyetujui Ketentuan Layanan serta Kebijakan Privasi GenSurat.</span>
            </label>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <button type="button" onclick="openLegalModal('terms')" class="text-xs text-neutral-400 hover:text-white underline underline-offset-4 font-mono transition-colors">
              Baca Dokumen Lengkap &raquo;
            </button>
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <button type="button" onclick="acceptLegalTerms()" class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white text-black font-black text-xs hover:bg-neutral-200 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-check text-xs"></i> Setujui &amp; Lanjutkan
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- COMPREHENSIVE FULL LEGAL MODAL (Terms & Conditions + Privacy Tabs) -->
      <div id="modal_terms_full" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md hidden items-center justify-center p-3 sm:p-5 transition-all duration-300">
        <div class="modal-card-box max-w-2xl w-full rounded-2xl p-5 sm:p-7 shadow-2xl relative space-y-4 border text-left bg-neutral-900 border-neutral-800 text-white max-h-[92vh] flex flex-col">
          
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white text-sm">
                <i class="fa-solid fa-scale-balanced"></i>
              </div>
              <div>
                <h3 class="text-sm sm:text-base font-black tracking-tight text-white">Dokumen Legalitas &amp; Privasi</h3>
                <p class="text-[11px] text-neutral-400 font-mono">Ketentuan Layanan dan Kebijakan Privasi Resmi GenSurat</p>
              </div>
            </div>
            <button type="button" onclick="closeLegalModal()" class="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors">
              <i class="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>

          <!-- Nav Tabs -->
          <div class="flex items-center gap-2 border-b border-neutral-800 pb-2 shrink-0">
            <button type="button" id="tab_btn_terms" onclick="switchLegalTab('terms')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-black shadow-xs">
              Syarat &amp; Ketentuan
            </button>
            <button type="button" id="tab_btn_privacy" onclick="switchLegalTab('privacy')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-neutral-400 hover:text-white">
              Kebijakan Privasi
            </button>
            <button type="button" id="tab_btn_security" onclick="switchLegalTab('security')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-neutral-400 hover:text-white">
              Arsitektur Keamanan Lokal
            </button>
          </div>

          <!-- Tab Content Scrollable -->
          <div class="flex-1 overflow-y-auto pr-1 space-y-4 text-xs leading-relaxed text-neutral-300">
            
            <!-- TAB 1: SYARAT & KETENTUAN -->
            <div id="legal_content_terms" class="space-y-4">
              <div class="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 modal-subcard">
                <p class="text-[11px] text-neutral-400">Terakhir diperbarui: 10 November 2026. Dengan mengakses atau menggunakan aplikasi web GenSurat, Anda menyatakan tunduk dan sepakat pada syarat dan ketentuan di bawah ini.</p>
              </div>

              <div>
                <h4 class="font-black text-white text-sm mb-1">Pasal 1 — Deskripsi dan Ruang Lingkup Layanan</h4>
                <p>GenSurat merupakan peranti lunak berbasis web mandiri (client-side web application) yang dirancang khusus untuk memfasilitasi pembuatan, penataan tata letak, dan pencetakan naskah dinas resmi organisasi seperti Surat Perizinan Kampus (SPZ) dan Surat Berita Acara (SBA) berstandar A4.</p>
              </div>

              <div>
                <h4 class="font-black text-white text-sm mb-1">Pasal 2 — Kepemilikan Data dan Hak Cipta</h4>
                <p>Seluruh materi naskah, nama organisasi, nomor surat, identitas penandatangan, stempel, logo instansi, serta lampiran kegiatan yang dibuat atau diunggah pengguna sepenuhnya merupakan hak milik eksklusif pengguna dan organisasinya. Pengembang GenSurat tidak mengklaim kepemilikan apapun atas isi surat yang dihasilkan.</p>
              </div>

              <div>
                <h4 class="font-black text-white text-sm mb-1">Pasal 3 — Integritas, Keaslian, dan Tanggung Jawab Hukum</h4>
                <ul class="list-disc pl-5 space-y-1.5 text-neutral-400 text-[11.5px]">
                  <li>Pengguna bertanggung jawab penuh atas validitas, kebenaran informasi, keabsahan nomor surat, dan legalitas tanda tangan yang dibubuhkan pada dokumen.</li>
                  <li>Dilarang menggunakan peranti ini untuk menerbitkan surat palsu, memanipulasi stempel atau tanda tangan pejabat tanpa wewenang yang sah, atau tindakan pemalsuan surat sebagaimana diatur dalam Pasal 263 Kitab Undang-Undang Hukum Pidana (KUHP).</li>
                  <li>GenSurat hanya berfungsi sebagai perancang format tata letak (formatting tool) dan tidak bertindak sebagai pihak yang mengesahkan atau memvalidasi keabsahan yuridis dokumen.</li>
                </ul>
              </div>

              <div>
                <h4 class="font-black text-white text-sm mb-1">Pasal 4 — Pembatasan Tanggung Jawab (Disclaimer)</h4>
                <p>Aplikasi ini disediakan secara "sebagaimana adanya" (as-is) tanpa jaminan apapun. Pengembang tidak bertanggung jawab atas kerugian langsung maupun tidak langsung, penolakan izin kegiatan oleh birokrasi, atau sengketa hukum yang terjadi akibat penerbitan naskah surat yang dibuat menggunakan GenSurat.</p>
              </div>

              <div>
                <h4 class="font-black text-white text-sm mb-1">Pasal 5 — Tanggung Jawab Pemeliharaan Cadangan Data</h4>
                <p>Mengingat aplikasi beroperasi tanpa database server awan terpusat, keselamatan data dokumen berada di bawah kendali pengguna. Pengguna berkewajiban melakukan ekspor berkas JSON cadangan secara mandiri untuk menghindari kehilangan data akibat kerusakan peramban atau pembersihan cache perangkat.</p>
              </div>
            </div>

            <!-- TAB 2: KEBIJAKAN PRIVASI -->
            <div id="legal_content_privacy" class="hidden space-y-4">
              <div class="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800 modal-subcard">
                <p class="text-[11px] text-neutral-400">Komitmen Privasi: Privasi dan keamanan data administrasi organisasi Anda adalah prioritas mutlak kami. Kami menerapkan prinsip <strong>Zero-Knowledge &amp; Zero Data Retention</strong>.</p>
              </div>

              <div>
                <h4 class="font-black text-white text-sm mb-1">1. Prinsip Nol Pengumpulan Data (Zero Collection)</h4>
                <p>GenSurat <strong>TIDAK MENGUMPULKAN</strong>, tidak merekam, tidak mentransmisikan, dan tidak menjual data pribadi, profil organisasi, alamat email, atau konten dokumen apapun ke server eksternal pengembang maupun pihak ketiga.</p>
              </div>

              <div>
                <h4 class="font-black text-white text-sm mb-1">2. Penyimpanan Berkas di Perangkat Lokal</h4>
                <p>Ketika Anda menyimpan draf surat atau mengunggah logo:
                <ul class="list-disc pl-5 mt-1 space-y-1 text-neutral-400 text-[11.5px]">
                  <li>Draf teks, nomor surat, dan profil disimpan di Web <code>localStorage</code> peramban Anda.</li>
                  <li>Berkas gambar logo resolusi tinggi, watermark PNG, dan foto nota disimpan di Web <code>IndexedDB</code> peramban Anda.</li>
                  <li>Semua proses rendering dokumen dan konversi ke kertas cetak A4 dilakukan 100% pada prosesor lokal komputer Anda tanpa lalu lintas jaringan internet.</li>
                </ul>
                </p>
              </div>

              <div>
                <h4 class="font-black text-white text-sm mb-1">3. Tanpa Kuki Pelacak dan Analitik Pihak Ketiga</h4>
                <p>GenSurat tidak menyematkan Google Analytics, Facebook Pixel, tracking cookie komersial, maupun layanan mata-mata jaringan lainnya. Hak kerahasiaan korespondensi internal Anda terjamin utuh.</p>
              </div>

              <div>
                <h4 class="font-black text-white text-sm mb-1">4. Hak Penghapusan dan Portabilitas Dokumen</h4>
                <p>Anda memegang kendali penuh atas data Anda kapan saja. Anda dapat:
                <ul class="list-disc pl-5 mt-1 space-y-1 text-neutral-400 text-[11.5px]">
                  <li>Mengunduh seluruh berkas arsip surat Anda ke dalam file cadangan <code>.json</code>.</li>
                  <li>Menghapus surat satu per satu atau menghapus seluruh profil instansi dengan membersihkan data situs di setelan peramban Anda.</li>
                </ul>
                </p>
              </div>
            </div>

            <!-- TAB 3: KEAMANAN LOKAL FAQ -->
            <div id="legal_content_security" class="hidden space-y-4">
              <div class="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 modal-subcard space-y-2">
                <h5 class="font-bold text-white text-xs flex items-center gap-1.5">
                  <i class="fa-solid fa-circle-question text-blue-400"></i> Apakah pengembang atau pihak luar bisa membaca draf surat saya?
                </h5>
                <p class="text-[11.5px] text-neutral-400">Tidak. Secara teknis arsitektur GenSurat adalah static web application. Tidak ada endpoint API pengirim data dokumen. Seluruh data berada di sandbox memori browser perangkat Anda sendiri.</p>
              </div>

              <div class="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 modal-subcard space-y-2">
                <h5 class="font-bold text-white text-xs flex items-center gap-1.5">
                  <i class="fa-solid fa-circle-question text-emerald-400"></i> Apakah GenSurat bisa digunakan secara offline tanpa internet?
                </h5>
                <p class="text-[11.5px] text-neutral-400">Ya. GenSurat dilengkapi Service Worker (PWA). Setelah halaman pertama kali dibuka, aplikasi dapat dibuka dan digunakan tanpa memerlukan kuota atau sambungan internet.</p>
              </div>

              <div class="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 modal-subcard space-y-2">
                <h5 class="font-bold text-white text-xs flex items-center gap-1.5">
                  <i class="fa-solid fa-circle-question text-amber-400"></i> Bagaimana cara memindahkan surat ke komputer/laptop lain?
                </h5>
                <p class="text-[11.5px] text-neutral-400">Gunakan tombol <strong>"Cadangan JSON"</strong> di bagian atas untuk mengunduh arsip surat. Lalu di perangkat baru Anda, buka GenSurat dan klik tombol <strong>"Pulihkan"</strong> untuk mengimpor berkas tersebut.</p>
              </div>
            </div>

          </div>

          <!-- Footer Buttons -->
          <div class="pt-3 border-t border-neutral-800 flex items-center justify-between shrink-0">
            <span class="text-[10px] text-neutral-500 font-mono">Keamanan &amp; Privasi Terverifikasi Lokal</span>
            <button type="button" onclick="closeLegalModal()" class="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors">
              Tutup
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  function checkFirstVisitLegal() {
    const isAccepted = localStorage.getItem(LEGAL_STORAGE_KEY);
    if (!isAccepted) {
      setTimeout(() => {
        const modal = document.getElementById('modal_legal_onboarding');
        if (modal) {
          modal.classList.remove('hidden');
          modal.classList.add('flex');
        }
      }, 350);
    }
  }

  function acceptLegalTerms() {
    const chk = document.getElementById('legal_agree_checkbox');
    if (chk && !chk.checked) {
      alert('Silakan centang persetujuan Syarat & Ketentuan terlebih dahulu.');
      return;
    }
    try {
      localStorage.setItem(LEGAL_STORAGE_KEY, 'true');
    } catch (e) {}

    const modal = document.getElementById('modal_legal_onboarding');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function openLegalModal(tab) {
    injectLegalModals();
    const modal = document.getElementById('modal_terms_full');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      switchLegalTab(tab || 'terms');
    }
  }

  function closeLegalModal() {
    const modal = document.getElementById('modal_terms_full');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function switchLegalTab(tab) {
    const tabs = ['terms', 'privacy', 'security'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tab_btn_${t}`);
      const content = document.getElementById(`legal_content_${t}`);
      const isTarget = t === tab;

      if (btn) {
        if (isTarget) {
          btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-black shadow-xs';
        } else {
          btn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-neutral-400 hover:text-white';
        }
      }
      if (content) {
        if (isTarget) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      }
    });
  }

  // Expose APIs to window
  window.GenSuratLegal = {
    open: openLegalModal,
    close: closeLegalModal,
    accept: acceptLegalTerms,
    switchTab: switchLegalTab
  };
  window.openLegalModal = openLegalModal;
  window.closeLegalModal = closeLegalModal;
  window.acceptLegalTerms = acceptLegalTerms;
  window.switchLegalTab = switchLegalTab;

  document.addEventListener('DOMContentLoaded', () => {
    injectLegalModals();
    checkFirstVisitLegal();
  });
})();
