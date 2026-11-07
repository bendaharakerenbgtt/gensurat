# GenSurat - Universal Generator Surat Resmi & Berita Acara

Aplikasi web generator dokumen resmi organisasi berbasis peramban (client-side) 100% tanpa server atau backend. Dirancang untuk memudahkan organisasi kemahasiswaan, komunitas, dan lembaga dalam menyusun **Surat Perizinan (SPZ)** dan **Surat Berita Acara (SBA)** dengan standar tata letak resmi A4 presisi.

---

## 🌟 Fitur Utama

- **100% Client-Side & Privasi Penuh:** Seluruh data dokumen, rincian tanda tangan, nota keuangan, dan foto dokumentasi tersimpan secara lokal di peramban (`LocalStorage` + `IndexedDB`).
- **Kop Surat HTML Modular (Kop Builder):** Teks wadah organisasi, nama lembaga, kampus, alamat, kontak email, serta logo instansi, logo organisasi, dan logo kabinet dapat disesuaikan tanpa merusak susunan resmi.
- **Dukungan SPZ (Surat Perizinan):**
  - Permohonan fasilitas & sarana kampus
  - Lampiran peminjaman barang
  - Lampiran susunan kepanitiaan
  - Lampiran susunan acara (rundown)
  - Lembar persetujuan Subbag Umum dengan peraturan resmi kampus
- **Dukungan SBA (Surat Berita Acara):**
  - Identitas & pokok berita acara
  - Realisasi susunan kegiatan
  - Output kegiatan & capaian prestasi peserta
  - Hambatan & evaluasi kegiatan
  - Laporan keuangan (pemasukan, pengeluaran per kategori/divisi, & rekapitulasi saldo)
  - Lampiran bukti nota belanja
  - Lampiran foto dokumentasi kegiatan
- **Mekanik Pengesahan Fleksibel (Auto-Center):**
  - Pilihan aktif/nonaktif untuk Ketua Pelaksana, Ketua Organisasi, Dosen Pembina, Ketua MPM, Ketua BEM, dan Wakil Direktur.
  - Jika Ketua Pelaksana dinonaktifkan, posisi tanda tangan Ketua Organisasi otomatis berpindah ke tengah lembar secara proporsional.
- **Interactive Click-to-Edit (Floating Popover):** Klik langsung pada elemen di lembar pratinjau A4 untuk mengedit data secara instan.
- **Pengecekan Pra-Cetak (Preflight Check):** Sistem mendeteksi otomatis bagian wajib yang belum terisi sebelum dicetak atau diekspor ke Word.
- **Ekspor Dokumen:**
  - Cetak langsung / Simpan ke PDF presisi A4 (794px x 1123px / 12pt Times New Roman)
  - Ekspor Microsoft Word (`.doc`) terformat lengkap
  - Salin teks polos ke papan klip
  - Cadangan dan pemulihan arsip berbasis JSON
- **Desain & Tema:** Tampilan monokrom elegan dengan mode gelap (dark mode) dan mode terang (light mode) yang responsif untuk desktop maupun ponsel.

---

## 🚀 Menjalankan Aplikasi

Aplikasi ini tidak memerlukan instalasi dependensi, server, atau build tool. Cukup buka file:

```
index.html
```

langsung di peramban web modern (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).

---

## 📁 Struktur Direktori

```
├── index.html                   # Beranda arsip dokumen (Google Docs style)
├── buat-surat.html              # Editor surat dua kolom & pratinjau live
├── folder-surat.html            # Kompatibilitas redirect otomatis
├── css/
│   └── style.css                # Master stylesheet tema & format cetak A4
├── js/
│   ├── storage.js               # Manajemen penyimpanan lokal & IndexedDB
│   ├── profil.js                # Profil organisasi, logo, & Kop Builder
│   ├── spz.js                   # Generator & editor Surat Perizinan
│   ├── sba.js                   # Generator & editor Berita Acara
│   ├── quickedit.js             # Sistem popover edit langsung
│   ├── export.js                # Ekspor PDF, Word, & validasi pra-cetak
│   └── main.js                  # Controller utama & navigasi stepper
└── assets/
    └── logo_polimedia.png       # Aset logo instansi
```

---

## 📄 Lisensi

Didistribusikan untuk keperluan tata kelola administrasi organisasi terbuka.
