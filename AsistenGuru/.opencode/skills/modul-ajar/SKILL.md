---
name: modul-ajar
description: Menyiapkan bahan mengajar untuk satu topik atau TP — Modul Ajar, RPM (Rencana Pembelajaran Mendalam), RPP, LKPD siap fotokopi beserta kunci jawaban, bahan bacaan, dan ide media/alat peraga — dalam bentuk Word. Gunakan saat guru meminta modul ajar, RPM, RPP, LKPD, lembar kerja, bahan ajar, media pembelajaran, atau berkata "minggu depan saya mengajar ...", "bantu siapkan bahan", "apa yang perlu saya bawa ke kelas".
---

# Modul Ajar / RPM dan LKPD

## 1. Tentukan TP dan konteks
- Cari TP yang dimaksud di `guru/data/atp-<mapel>.json`. Jika guru tidak menyebut topik, panggil `agenda_hari_ini` dan
  usulkan TP minggu ini atau minggu depan.
- Jika ATP belum ada, jelaskan bahwa modul tetap bisa dibuat, tetapi TP-nya ditulis sementara dan ditandai
  `[PERLU GURU: TP belum dari ATP]`. Tawarkan menyusun perencanaan tahunan nanti.
- Format: ikuti `sekolah/preferensi-sekolah.md` (Modul Ajar, RPM, RPP, atau keduanya) dan template di `sekolah/template/`
  atau `guru/template/`. Nama berkas draf mengikuti nama template yang ada: jika ada `RPP.md`/`RPP.docx`, draf rencana
  ditulis sebagai `RPP.md` dengan susunan kerangka itu; jika `Modul Ajar.*`, sebagai `Modul Ajar.md`; selain itu `RPM.md`.
  Jika tidak diatur, pakai **kerangka standar BSKAP** (`references/kerangka.md`, dari Panduan Pembelajaran dan Asesmen 2025
  Lampiran 7) dan salin judul `##`-nya persis — ekspor Word memeriksanya dan melaporkan bagian yang belum ada.
- Tanyakan paling banyak 3 hal yang tidak bisa diturunkan: jumlah pertemuan dan JP per pertemuan, kemampuan awal murid,
  serta sarana yang tersedia (fotokopi, proyektor, alat peraga).

## 2. Riset materi
Sebelum menulis, ikuti skill `riset-materi`: cari topiknya di pustaka buku (`baca_buku`) dan baca halaman yang relevan;
jika tidak ada, pakai `riset_materi`. Catat sumber yang dipakai.

## 3. Tulis dokumen
Simpan draf di `guru/draf/2 Modul dan LKPD/<Mapel> <Kode TP> <Topik Singkat>/` (ikuti "Format draf" di instruksi agent):
- `Modul Ajar.md` (atau `RPM.md`/`RPP.md` sesuai istilah sekolah) — perencanaan pembelajaran. Jumlah menit kegiatan per
  pertemuan harus sama dengan JP × menit per JP dari profil. Sertakan daftar "Yang perlu dibawa ke kelas" berupa
  checklist (`- [ ]`) dan bagian `## Sumber` di akhir.
- `LKPD.md` — lembar siswa siap fotokopi: kolom nama, petunjuk singkat, soal bertahap dari mudah ke menantang.
  Pisahkan tiap pertemuan dengan `<!-- halaman-baru -->`. **Jangan** memasukkan kunci jawaban di berkas ini.
- `Kunci LKPD.md` — kunci dan pembahasan singkat untuk guru.
- `Media.md` (jika kegiatan memakai kartu, gambar, atau papan permainan yang bisa dicetak) — media siap cetak dan gunting.
  Tulis kartu dengan blok `kartu` (satu baris satu kartu; `||` untuk keterangan kecil; opsi `kolom`, `ukuran` pt,
  `tinggi` cm), lalu petunjuk singkat cara memakai, jumlah set yang dicetak, dan bahan (karton, gunting). Contoh:
  ````
  ```kartu kolom=3 ukuran=40 tinggi=5
  1/2 || setengah
  2/4 || dua perempat
  ```
  ````
  Gambar tidak bisa dibuat; untuk gambar, tulis deskripsi singkat yang bisa digambar tangan atau rujuk gambar di buku.

Pedoman isi:
- Bahasa untuk murid sesuai usia: kalimat pendek dan contoh dekat dengan kehidupan anak.
- Konteks nilai Islam hanya jika diminta kebijakan sekolah atau aturan guru, dan tanpa dalil.
- Diferensiasi singkat: bantuan untuk yang belum lancar, tantangan untuk yang cepat.
- Tanpa nama murid sungguhan. Untuk soal cerita, pakai nama umum.

## 4. Periksa sebelum menyerahkan
- Kerjakan ulang setiap soal LKPD tanpa melihat kunci. Jika jawabanmu berbeda dari kunci, perbaiki.
- Cocokkan: setiap kegiatan mendukung TP, total menit pas, dan setiap soal di LKPD punya kunci.
- Definisi, angka, dan fakta sama dengan sumber. Isi tanpa sumber sudah ditandai `[PERLU GURU: cek kebenaran ...]`.

## 5. Serahkan
Panggil `ekspor_word` untuk ketiga draf (jenis ditebak otomatis dari nama berkas). Sampaikan dalam paling banyak 5 baris: isi tiap berkas Word, barang yang perlu
dibawa, sumber utama (buku dan halaman), dan bagian `[PERLU GURU]`. Tanyakan apa yang ingin diubah.
