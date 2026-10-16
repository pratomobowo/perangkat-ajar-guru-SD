---
name: siapkan-semua
description: Menyiapkan seluruh perangkat ajar guru secara berurutan dari dokumen yang diberikan guru — membaca CP, kalender, jadwal, contoh RPP/template, KKTP, dan buku dari folder guru/masukan, lalu menyusun perangkat tahap demi tahap (perencanaan, KKTP, bahan ajar bergulir, asesmen, administrasi, kokurikuler) dengan laporan "selesai / perlu dicek / berikutnya" di setiap tahap, atau otomatis tanpa berhenti bila guru meminta. Gunakan saat guru mengetik /siapkan atau /status, berkata "siapkan semua", "buatkan semuanya", "ini dokumen dari sekolah", "sudah saya taruh di folder masukan", "jalankan semua", "lanjut", "apa yang belum", atau "sudah sampai mana".
---

# Siapkan Semua

Tujuan: guru cukup menyerahkan dokumen dan menjawab sedikit pertanyaan; asisten menyusun perangkat berurutan sesuai
ketergantungan (kalender → minggu efektif → CP → ATP/Prota/Promes → KKTP → bahan ajar → asesmen → administrasi →
kokurikuler) dan selalu menjelaskan **apa yang sudah jadi, apa yang perlu dicek, dan apa yang dibuat berikutnya**.
Alat `status_perangkat` adalah sumber kebenaran urutan; jangan menebak apa yang sudah ada.

## Mode
- **Bertahap (bawaan):** kerjakan satu tahap, laporkan, lalu tunggu guru menjawab "lanjut" (atau mengoreksi).
- **Otomatis:** jika guru berkata "jalankan semua", "langsung semua", atau "tidak usah tanya-tanya", kerjakan tahap demi tahap
  tanpa menunggu. Tetap berhenti jika alat mengembalikan `GAGAL` yang butuh keputusan guru, atau data penting tidak ada
  (tanyakan sekaligus di satu pesan). Di akhir, beri ringkasan semua tahap dan daftar `[PERLU GURU]`.
- Jika percakapan terputus, `/siapkan` lagi melanjutkan dari `status_perangkat`; tidak ada yang dibuat ulang tanpa diminta.

## Langkah 0 — Peta awal
Panggil `status_perangkat`. Sampaikan ringkas (≤ 6 baris): yang sudah ada, yang belum, dan 3 langkah berikutnya.

## Langkah 1 — Dokumen masukan
1. Panggil `baca_masukan` (tanpa argumen). Jika kosong, jelaskan: taruh dokumen sekolah di
   `Documents\AsistenGuru\guru\masukan` (PDF teks, Word, atau Excel), lalu bilang "sudah". Jika guru tidak punya dokumen,
   lanjut ke Langkah 2.
2. Baca lengkap setiap berkas yang relevan (`baca_masukan` dengan `berkas`), kenali jenisnya, lalu simpan:
   | Jenis | Simpan ke |
   |---|---|
   | Kalender pendidikan | `guru/kalender.json` (format di skill guru-setup); lalu `hitung_minggu_efektif` |
   | Jadwal pelajaran | `guru/jadwal-kelas.json` dan `jadwal` di `guru/profil.json`; lalu `buat_jadwal_kelas` |
   | Data guru/SK pembagian tugas | `guru/profil.json` (kelas, mapel, JP) — tanpa data murid |
   | Daftar siswa (Dapodik, format e-Rapor, daftar hadir lama) | otomatis oleh `baca_masukan` → Daftar Siswa (isi tidak ditampilkan); bila diminta rombel, tanyakan lalu `daftar_siswa` |
   | CP | Jika dokumen resmi Keputusan BSKAP 046/H/KR/2025 → `ambil_cp`. Jika dokumen CP sekolah → salin **kata per kata** ke `guru/referensi/cp/<kode>-fase-<fase>.md` dengan frontmatter seperti hasil `ambil_cp` (`elemen` persis, `sumber: Dokumen sekolah <nama berkas>`, `status: DARI-SEKOLAH`). Jika teksnya memakai "peserta didik"/"Profil Pelajar Pancasila", beri tahu bahwa itu kemungkinan CP versi lama dan tawarkan `ambil_cp` (CP 2025). |
   | ATP/TP dari sekolah | dasar untuk `guru/data/atp-<mapel>.json` (skill perencanaan-tahunan) |
   | KKTP sekolah | `guru/data/kktp-<mapel>.json` (format di skill asesmen) |
   | Contoh RPP/Modul/LKPD/format sekolah (.docx) | `simpan_template_word` dengan `berkas` dan `dokumen` (RPM, Modul Ajar, RPP, LKPD, …) |
   | Buku PDF | `baca_masukan` dengan `jadikan_buku: true` |
   | Lainnya | tanyakan satu kalimat untuk apa dokumen itu |
3. Laporkan dalam satu pesan: dokumen apa saja yang dikenali dan disimpan di mana, serta data yang masih kurang. Data
   pribadi murid di dokumen **tidak disalin** ke mana pun.

## Langkah 2 — Data dasar yang masih kurang
Lengkapi lewat skill `guru-setup` (paling banyak 3 pertanyaan sekaligus). Dalam mode otomatis, kumpulkan semua pertanyaan
di satu pesan sebelum mulai.

## Langkah 3 — Tahap demi tahap
Ikuti urutan "Langkah berikutnya" dari `status_perangkat`. Untuk tiap tahap, jalankan skill/alat yang disebutkan
(perencanaan-tahunan, asesmen, modul-ajar, administrasi-harian, kokurikuler, dan alat terkait). Aturan:
- **Buku resmi dulu:** sebelum bahan ajar dan soal, pastikan tiap mapel punya Buku Siswa dan Panduan Guru di pustaka
  (`cek_kesiapan` tugas `modul`). Jika belum ada: mode otomatis → langsung `unduh_buku` (kelas dan mapel guru); mode
  bertahap → tawarkan dulu. Jika unduhan gagal atau buku tidak ada di katalog, lanjut dengan `riset_materi` dan laporkan.
- **Bahan ajar bergulir:** buat modul/RPM, LKPD, kunci, dan media hanya untuk TP yang diajarkan dalam 2 minggu ke depan
  menurut Promes. Satu semester sekaligus hanya jika guru memintanya secara jelas.
- KKTP boleh dibuat untuk semua TP satu semester sekaligus dalam satu dokumen.
- STS/SAS dibuat jika tanggalnya ≤ 4 minggu lagi atau guru memintanya. Nama folder `STS <Mapel> Semester <n>` /
  `SAS <Mapel> Semester <n>` dan ulangan harian `UH <Mapel> <TP> <Topik>` (dipakai `status_perangkat`).
- Setelah tiap tahap, panggil `status_perangkat` lagi, lalu laporkan dengan format:
  ```
  ✔ Selesai: <tahap> — <berkas Word/Excel utama>
  ⚠ Perlu dicek: <hal penting, [PERLU GURU], label DRAF>
  ➜ Berikutnya: <tahap> — akan membuat <dokumen>; butuh <data/keputusan bila ada>
  ```
  Dalam mode bertahap, akhiri dengan "Ketik 'lanjut' untuk meneruskan, atau beri koreksi."
- Jika guru mengoreksi, perbaiki tahap itu dulu (ubah data lalu panggil alatnya lagi), baru lanjut.

## Langkah 4 — Penutup
Ringkas (≤ 8 baris): perangkat yang sudah lengkap, jumlah penanda `[PERLU GURU]` dan di berkas mana, label DRAF (misalnya
CP belum terverifikasi), dan jadwal berikutnya (bahan ajar 2 minggu ke depan, STS/SAS, absensi bulan depan). Sarankan
`/status` kapan saja untuk melihat peta perangkat.
