---
name: kokurikuler
description: Menyiapkan kegiatan kokurikuler SD sesuai Permendikdasmen 13/2025 dan Panduan Kokurikuler 2025 (pengganti P5) — rencana tahunan kokurikuler, perencanaan kegiatan (dimensi profil lulusan, tema, bentuk, tujuan, alokasi waktu, kegiatan, asesmen), jurnal pelaksanaan, lembar pembiasaan 7 Kebiasaan Anak Indonesia Hebat, Excel penilaian per dimensi, dan deskripsi rapor kokurikuler. Gunakan saat guru menyebut kokurikuler, P5, projek, projek profil, tema projek, 7 kebiasaan anak Indonesia hebat, G7KAIH, dimensi profil lulusan, penilaian projek, jurnal projek, atau deskripsi kokurikuler di rapor.
---

# Kokurikuler

Baca `references/regulasi.md` sebelum menyusun apa pun. Isinya ringkasan resmi yang wajib diikuti: bentuk kegiatan,
alokasi JP, 8 dimensi dan subdimensi SD, 7 KAIH, serta aturan asesmen dan rapor. Jangan mengarang aturan di luar itu.

## Jika guru menyebut P5
Jelaskan satu kalimat: sejak Permendikdasmen 13/2025, P5 tidak lagi menjadi bentuk wajib. Kegiatan bergaya projek tetap
bisa dilakukan sebagai kokurikuler lintas disiplin dengan 8 dimensi profil lulusan. Jika `sekolah/preferensi-sekolah.md`
atau template sekolah masih memakai format P5, ikuti sekolah (urutan prioritas AGENTS.md) dan sebutkan bahwa format itu
pilihan sekolah.

## 1. Rencana tahunan (jika diminta, biasanya oleh tim/koordinator kokurikuler)
Tabel per kelas: No | Kelas | Fokus Dimensi Profil Lulusan | Tema | Jenis Kokurikuler | Bentuk Kegiatan | Mata Pelajaran
Terkait | Alokasi Waktu. Jumlah JP satu tahun untuk satu kelas = alokasi di `regulasi.md` (kelas IV: 252 JP); periksa
jumlahnya dan tuliskan. Simpan `guru/draf/5 Kokurikuler/Rencana Tahunan Kokurikuler <TA>.md`, lalu `ekspor_word`.

## 2. Perencanaan satu kegiatan
1. Tanyakan paling banyak 3 hal yang belum diketahui: tema (atau masalah nyata di sekitar sekolah), bentuk kegiatan, dan
   alokasi JP serta lama pelaksanaan. Mapel terkait dan kelas diambil dari profil.
2. Pilih 1–3 dimensi beserta subdimensi SD yang paling sesuai tema; jelaskan alasannya singkat.
3. Tulis `guru/draf/5 Kokurikuler/<Tema>/Perencanaan Kokurikuler.md` dengan susunan contoh Panduan (inspirasi, bukan
   format wajib; ikuti template sekolah jika ada):
   ````
   # PERENCANAAN KOKURIKULER
   ```identitas
   Nama satuan pendidikan: …
   Kelas: …
   Tema kegiatan: …
   Bentuk kegiatan: …
   Alokasi waktu: … JP (… pertemuan)
   Lokasi kegiatan: …
   ```
   ## A. Dimensi Profil Lulusan
   ## B. Tujuan Pembelajaran
   ## C. Praktik Pedagogis
   ## D. Lingkungan Pembelajaran
   ## E. Kemitraan Pembelajaran
   ## F. Pemanfaatan Digital
   ## G. Kegiatan
   ## H. Asesmen
   ## Sumber
   ````
   - Tujuan pembelajaran: perilaku yang bisa diamati, terkait dimensi/subdimensi dan muatan mapel terkait.
   - Kegiatan: per pertemuan dengan JP, mengikuti alur memahami → mengaplikasi → merefleksi; jumlah JP harus sama dengan
     alokasi.
   - G7KAIH: bagian G memuat kesepakatan guru–murid, pelaksanaan kebiasaan dengan jurnal harian, diseminasi, dan kemitraan
     dengan orang tua.
   - Asesmen: formatif (teknik + instrumen) dan sumatif (teknik + rubrik per dimensi dengan skala yang dipakai).
   - Muatan materi mapel mengikuti skill `riset-materi` (buku resmi), dan cantumkan Sumber termasuk Panduan Kokurikuler 2025.
4. Simpan data penilaian `guru/data/kokurikuler-<tema>.json` sesuai `references/format-data.md` (dimensi, subdimensi,
   frasa deskripsi, skala).
5. Ekspor dengan `ekspor_word`. Sampaikan ringkas: dimensi, bentuk, JP, berkas Word, dan bagian `[PERLU GURU]`.

## 3. Lembar kerja murid dan lembar pembiasaan
- Lembar kerja/refleksi murid: `guru/draf/5 Kokurikuler/<Tema>/LKPD.md` (aturan LKPD di skill `modul-ajar`).
- G7KAIH: `Lembar Pembiasaan.md` berupa tabel pekan × kebiasaan dengan kolom paraf orang tua; tanpa nama murid (ada isian
  nama untuk ditulis murid sendiri).

## 4. Jurnal pelaksanaan
Catat di `guru/draf/5 Kokurikuler/<Tema>/Jurnal Kokurikuler.md`, satu bagian per pertemuan (`## YYYY-MM-DD`): kegiatan,
dimensi yang diamati, temuan kelas secara umum, kendala, dan tindak lanjut. **Tanpa nama murid** (pakai "beberapa murid"
atau nomor absen). Ekspor setelah diperbarui.

## 5. Penilaian dan rapor
1. Panggil `buat_penilaian_kokurikuler_excel` dengan tema. Excel berisi kolom per dimensi (pilihan sesuai skala), catatan
   pendidik, dimensi menguat, perlu penguatan, dan **draf deskripsi rapor** otomatis.
2. Sampaikan: nama murid diketik guru sendiri di Excel; draf deskripsi perlu dibaca ulang lalu disalin ke kolom
   Kokurikuler di rapor (tanpa angka). Jika ada beberapa kegiatan dalam satu semester, guru menggabungkan menjadi satu
   deskripsi per semester.
3. Jika guru meminta bank kalimat, buat `guru/draf/5 Kokurikuler/<Tema>/Bank Deskripsi Kokurikuler.md`: untuk tiap
   dimensi, satu kalimat "sudah baik dalam …" dan satu "masih perlu pendampingan dalam …" yang spesifik pada kegiatan.
