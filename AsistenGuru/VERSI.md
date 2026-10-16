# Versi Paket

**Versi:** 0.9.2
**Tanggal:** 2026-10-16

## Catatan perubahan
- 0.9.2 — Media ajar interaktif HTML (0.9.0–0.9.1) ditiadakan; isi paket kembali sama dengan 0.8.0. Media tetap bisa
  dibuat sebagai kartu Word (blok `kartu` di `Media.md`).
- 0.8.0 — **Siapkan semua** (`/siapkan`, `/status`): guru menaruh dokumen sekolah (PDF teks, Word, Excel) di `guru/masukan`;
  asisten membaca dan mengenalinya (kalender, jadwal, CP, ATP, KKTP, format RPP/modul, buku), menyimpannya ke tempat yang
  benar, lalu menyusun perangkat tahap demi tahap dengan laporan "selesai / perlu dicek / berikutnya" — atau otomatis
  dengan "jalankan semua". Alat `baca_masukan` (Word → Markdown, Excel → tabel dengan tanggal) dan `status_perangkat`
  (peta perangkat dari berkas yang ada, penanda [PERLU GURU], dan langkah berikutnya sesuai ketergantungan dan tanggal).
  Bahan ajar dibuat bergulir untuk TP 2 minggu ke depan. CP versi lama dari dokumen sekolah dikenali dan ditawarkan
  pengganti CP 2025. Format RPP sekolah dipakai bila ada template bernama RPP.
- 0.7.0 — Melengkapi dokumen guru SD:
  - **Kokurikuler** (pengganti P5, Permendikdasmen 13/2025 dan Panduan Kokurikuler 2025): `/kokurikuler` untuk rencana
    tahunan, perencanaan kegiatan, jurnal, lembar pembiasaan 7 KAIH, dan Excel penilaian per dimensi profil lulusan yang
    menyusun draf deskripsi rapor otomatis.
  - **Kurikulum Satuan Pendidikan (KSP, dulu KOSP)**: draf 5 komponen sesuai Panduan Pengembangan KSP 2025 dan struktur
    kurikulum SD dari Permendikdasmen 13/2025.
  - **CP otomatis** (`ambil_cp`): CP resmi diambil dari PDF Keputusan Kepala BSKAP 046/H/KR/2025 bila CP sekolah belum
    diisi (status OTOMATIS-RESMI, dokumen tetap berlabel DRAF sampai diverifikasi). CP agama tidak didukung.
  - `/kalender` dan `/jadwal`: kalender pendidikan dan jadwal pelajaran kelas dalam Word (cek bentrok dan JP).
  - KKTP tersambung ke buku nilai: batas tuntas per TP dan kolom "TP Belum Tuntas" untuk remedial; cakupan STS/SAS dari Promes.
  - Media siap cetak: kartu besar dengan garis potong (blok `kartu`).
- 0.6.0 — Format Word milik guru, disimpan di `guru/` dan dipakai setiap ekspor berikutnya. (1) Gaya tampilan lewat chat
  atau `/format` (huruf, ukuran, spasi, margin, kertas, kop, tanda tangan, tabel, nomor halaman), untuk semua dokumen atau
  per jenis dokumen, bisa dibatalkan. (2) Kerangka bagian per jenis dokumen di `guru/template/<Dokumen>.md`. (3) Word contoh:
  Word milik guru atau Word hasil asisten yang sudah diedit guru menjadi dasar ekspor (gaya, kop di header, footer, ukuran
  halaman). Sekolah bisa memberi gaya bawaan, mengunci bagian tertentu, dan mewajibkan Word contoh sekolah.
- 0.5.0 — Perintah `/buku` dan alat `unduh_buku`: mencari Buku Siswa dan Panduan Guru Kurikulum Merdeka di katalog SIBI
  untuk kelas guru (mapel dari profil, sebutan seperti PAI/PPKn dikenali, edisi revisi diutamakan), lalu mengunduhnya ke
  `guru/buku/` setelah guru setuju. Asisten menawarkan unduhan saat pustaka kosong dan setelah `/mulai`.
- 0.4.0 — Riset materi dari sumber tepercaya. Alat `baca_buku` membaca dan mencari isi PDF buku resmi di
  `sekolah/referensi/buku/` dan `guru/buku/` (pdf.js disertakan, tanpa unduhan tambahan), lengkap dengan nomor halaman
  cetak. Alat `riset_materi` mencari di web tetapi hanya memakai situs tepercaya yang ditetapkan sekolah
  (`riset` di `sekolah/kebijakan.json`), dan bisa menyimpan PDF resmi ke pustaka guru. Skill `riset-materi`; modul, RPM,
  dan kunci jawaban kini mencantumkan bagian Sumber, dan isi tanpa sumber ditandai `[PERLU GURU]`.
- 0.3.0 — Untuk OpenCode 2 (OpenCode 1 tidak didukung lagi). Alat dipindah dari `.opencode/tools/` ke plugin
  `.opencode/plugins/asisten-guru.ts` tanpa paket npm. Konfigurasi dan izin memakai format OpenCode 2. Berkas yang disimpan
  Notepad Windows (BOM, CRLF), jalur dengan backslash, dan karakter yang dilarang Windows di nama berkas kini ditangani.
  Pemasang satu perintah (`pasang.ps1`, `pasang.sh`): guru cukup menempel link GitHub di OpenCode dan meminta dipasangkan.
  Perintah `/perbarui` dan skill `kelola-asisten` untuk cek versi, pembaruan aman (data guru dan sekolah tidak disentuh,
  paket lama dicadangkan), cadangan, dan pindah laptop. Versi paket kini di `.opencode/paket.json` dan `VERSI.md`.
- 0.2.0 — Agent "Asisten Guru" dengan menu slash; alat deterministik untuk minggu efektif, ATP/Prota/Promes, agenda
  harian, serta ekspor Word dan Excel tanpa perlu memasang program tambahan. Skill baru: modul-ajar, asesmen,
  administrasi-harian. Profil kini `guru/profil.json` dan `guru/kalender.json`. Kebijakan angka di `sekolah/kebijakan.json`.
- 0.1.0 — rilis awal untuk uji coba Matematika Kelas 4 (Fase B).
