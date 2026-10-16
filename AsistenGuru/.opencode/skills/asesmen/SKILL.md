---
name: asesmen
description: Menyusun instrumen penilaian dalam bentuk Word — KKTP (Kriteria Ketercapaian Tujuan Pembelajaran), asesmen formatif (ulangan harian, kuis, rubrik, lembar observasi), asesmen sumatif (STS, SAS, SAT), kisi-kisi, soal pilihan ganda/isian/uraian, serta kunci jawaban dan pedoman penskoran. Gunakan saat guru meminta soal, ulangan, ujian, penilaian, kisi-kisi, KKTP, rubrik, atau kunci jawaban.
---

# Asesmen

## 1. Tentukan cakupan
- Ambil TP dari `guru/data/atp-<mapel>.json`. Untuk STS/SAS, cakupannya TP yang sudah diajarkan menurut
  `guru/data/promes-<mapel>.json` sampai minggu asesmen (lihat tanggal STS/SAS di `guru/kalender.json`; Promes mencatat
  minggu tiap TP). STS = TP dari awal semester sampai sebelum STS; SAS = semua TP semester itu (atau sesuai kebijakan
  sekolah). Konfirmasi daftar TP ke guru.
- Untuk STS/SAS, sebaran soal per TP sebanding dengan JP tiap TP (sebutkan perhitungannya di kisi-kisi).
- Tanyakan paling banyak 3 hal: jenis asesmen, jumlah dan bentuk soal, serta waktu pengerjaan. Jika sekolah punya
  ketentuan di `sekolah/preferensi-sekolah.md`, ikuti tanpa bertanya.

Sebelum membuat soal, panggil `cek_kesiapan` (tugas `soal`, mapel). Jika BELUM SIAP, lengkapi bahannya dulu bersama guru
(skill `pendamping-guru`).

## 2. KKTP (jika diminta atau belum ada untuk TP itu)
Ikuti bentuk KKTP sekolah. Jika tidak diatur, pakai bentuk **contoh resmi BSKAP** (Panduan Pembelajaran dan Asesmen 2025,
Lampiran 5 dan 7): satu tabel per mapel/semester dengan kolom **Tujuan Pembelajaran | Kriteria Ketercapaian | Memenuhi |
Belum Memenuhi**; baris terakhir **di tabel yang sama**: `| Rencana tindak lanjut | | <pengayaan bagi yang memenuhi> |
<bimbingan bagi yang belum> |`.
Kriteria ditulis sebagai perilaku/hasil kerja yang bisa diamati, bukan sekadar angka. Batas angka tuntas diambil dari
`batas_ketuntasan` di kebijakan sekolah; jika belum ada, tulis `[PERLU GURU: batas nilai tuntas]`.
Bila sekolah meminta rubrik bertingkat, pakai 4 tingkat: *Perlu bimbingan*, *Cukup*, *Baik*, *Sangat baik*.

Selain dokumen KKTP, simpan juga datanya di `guru/data/kktp-<kode-mapel>.json` supaya buku nilai Excel memakai batas
tuntas per TP dan menandai TP yang perlu remedial. Gabungkan dengan isi lama (jangan menghapus TP lain):
```json
{ "mapel": "Matematika", "tp": { "TP3": { "batas": 75, "kriteria": "Memenuhi: menyelesaikan soal cerita perkalian dengan langkah yang benar" } } }
```
`batas` = nilai minimal dianggap tuntas (0–100) sesuai rentang KKTP; `kriteria` = ringkasan kriteria "Memenuhi" satu kalimat.
Setelah itu tawarkan membuat ulang buku nilai (`/nilai`) bila sudah ada.

## 3. Riset materi
Untuk soal, ikuti skill `riset-materi`: cocokkan istilah, notasi, dan tingkat kesulitan dengan buku resmi (`baca_buku`).
Soal cerita dengan data nyata (harga, cuaca, jumlah penduduk) memakai data dari sumber, bukan karangan.

## 4. Kisi-kisi dan soal
Simpan draf di `guru/draf/3 Asesmen/<Jenis> <Mapel> <Topik>/` (misalnya `UH Matematika TP3 Perkalian`; untuk sumatif
`STS Matematika Semester 1` atau `SAS Matematika Semester 1`). Pola nama ini dipakai untuk melacak perangkat.
- `Kisi-kisi.md` — tabel: No, TP, indikator soal, level kognitif (L1 pemahaman, L2 aplikasi, L3 penalaran), bentuk soal, nomor soal.
- `Soal.md` — lembar soal siswa: identitas (blok identitas), kolom nama, petunjuk, soal bernomor. Tanpa kunci.
  Opsi pilihan ganda ditulis `A. ...` per baris. Jangan menyisipkan `<!-- halaman-baru -->` di antara soal; pembagian
  halaman diatur otomatis dan soal tidak akan terpisah dari pilihannya.
- `Kunci dan Penskoran.md` — kunci jawaban, pembahasan singkat, pedoman penskoran (skor per soal dan skor maksimal),
  dan `## Sumber` di akhir.
- `KKTP.md` — jika dibuat.

Pedoman soal:
- Setiap soal mengukur satu indikator, dengan bahasa sesuai usia dan konteks dekat dengan murid.
- Pilihan ganda: 4 opsi, satu jawaban benar, pengecoh masuk akal, posisi jawaban benar bervariasi.
- Sebagian soal L2/L3 (soal cerita atau penalaran), jangan semuanya hafalan.

## 5. Periksa sebelum menyerahkan (wajib)
- Kerjakan ulang **setiap** soal tanpa melihat kunci. Untuk hitungan, tulis langkahnya. Jika berbeda dari kunci, perbaiki soal atau kunci.
- Pastikan tidak ada soal pilihan ganda dengan dua jawaban benar atau tanpa jawaban benar.
- Cocokkan kisi-kisi dengan soal: jumlah soal per TP dan nomor soal sama persis.
- Hitung ulang total skor maksimal di pedoman penskoran.

## 6. Serahkan
Panggil `ekspor_word` untuk semua berkas. Sampaikan ringkas: jumlah soal per TP, sebaran level, berkas Word, dan bagian
`[PERLU GURU]`. Ingatkan bahwa nilai bisa dimasukkan ke buku nilai Excel (perintah `/nilai`).
