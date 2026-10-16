---
name: administrasi-harian
description: Mengurus administrasi kelas harian dan bulanan — jadwal pelajaran kelas dalam Word, jurnal mengajar harian, daftar hadir/absensi siswa dalam Excel dengan rekap otomatis, buku nilai Excel per TP dengan rumus nilai rapor, serta kalimat deskripsi capaian rapor. Gunakan saat guru berkata "isi jurnal", "tadi saya mengajar ...", "absen", "daftar hadir", "rekap kehadiran", "buku nilai", "olah nilai", "nilai rapor", atau "deskripsi rapor".
---

# Administrasi Harian

Prinsip: **nama siswa tidak pernah lewat asisten.** Nama hanya diketik guru langsung di Excel. Rekap dihitung oleh rumus
Excel, bukan oleh asisten. Jangan membaca atau mengubah berkas Excel guru.

## Jurnal harian
1. Panggil `agenda_hari_ini` (atau dengan tanggal yang disebut guru) untuk mengetahui mapel dan TP yang dijadwalkan.
2. Dari cerita guru, ambil: tanggal, mapel dan jam ke, TP atau materi yang benar-benar diajarkan (bisa berbeda dari
   rencana; jika berbeda, catat), kegiatan singkat, ketidakhadiran (**angka saja**, misalnya "2 sakit"), dan catatan
   tindak lanjut (remedial, murid yang perlu pendampingan disebut "beberapa murid" atau nomor absen).
3. Jika ada informasi penting yang hilang (misalnya materi), tanyakan satu kali. Jangan mengarang kegiatan.
4. Tambahkan ke `guru/draf/4 Administrasi/Jurnal Mengajar <YYYY-MM>.md`. Jika berkas belum ada, buat dengan judul
   `# JURNAL MENGAJAR` lalu blok identitas (Kelas, Bulan, Tahun ajaran). Setiap hari memakai format:
   ```
   ## 2026-10-15 (Kamis)

   | Jam ke | Mapel | TP / materi | Kegiatan | Kehadiran | Catatan dan tindak lanjut |
   |---|---|---|---|---|---|
   | 1-2 | Matematika | TP4 Kalimat matematika | Diskusi kelompok, LKPD 1 | 26 hadir, 2 sakit | 3 murid perlu remedial pola bilangan |
   ```
   Judul `## YYYY-MM-DD` wajib persis begitu karena dipakai untuk pengingat jurnal.
5. Panggil `ekspor_word` untuk berkas jurnal bulan itu. Konfirmasi singkat ke guru.

## Jadwal pelajaran kelas
1. Jika `guru/jadwal-kelas.json` belum ada, tanyakan (paling banyak 3 hal sekaligus): jam masuk dan lama 1 JP, jam istirahat,
   lalu mapel tiap hari beserta jam ke- (termasuk mapel yang diajar guru lain, misalnya PJOK atau agama, dan nama
   gurunya bila ingin dicantumkan). Guru boleh menempelkan jadwal dari sekolah apa adanya.
2. Tulis `guru/jadwal-kelas.json` sesuai format di skill guru-setup (`references/format-profil.md`). Mapel yang diajar guru
   sendiri juga diperbarui di `jadwal` pada `guru/profil.json` supaya agenda harian ikut benar.
3. Panggil `buat_jadwal_kelas`. Sampaikan nama berkas Word dan hasil pemeriksaan (✔/✖) apa adanya; jika ada ✖ (bentrok jam
   atau JP tidak sesuai profil), tanyakan mana yang benar lalu perbaiki dan panggil lagi.

## Daftar hadir
1. Tentukan bulan (bawaan: bulan berjalan). Panggil `buat_absensi_excel`.
2. Sampaikan nama berkas dan cara pakainya: ketik nama siswa di Excel; isi S, I, atau A saja (kosong = hadir); rekap dan
   persentase terhitung otomatis; hari kegiatan sekolah diberi warna abu-abu.
3. Jika jumlah siswa belum ada di profil, tanyakan angkanya lalu simpan di `guru/profil.json`.

## Buku nilai
1. Butuh data ATP mapel itu. Jika belum ada, tawarkan perencanaan tahunan dulu.
2. Panggil `buat_nilai_excel` dengan mapel dan semester.
3. Sampaikan: nilai formatif diisi per TP, STS dan SAS di kolomnya, nilai rapor dihitung dengan bobot di bagian atas
   (bisa diubah), serta TP tertinggi dan terendah muncul otomatis untuk membantu deskripsi rapor.
   Jika bobot belum ditetapkan sekolah, tandai `[PERLU GURU]`.

## Deskripsi capaian rapor
Asisten tidak melihat nilai siswa. Yang dibuat adalah **bank kalimat** per TP, tanpa nama:
- Simpan di `guru/draf/4 Administrasi/Bank Deskripsi Rapor <Mapel> Semester <n>.md`. Untuk tiap TP, tulis dua kalimat:
  "Menunjukkan penguasaan yang baik dalam <kompetensi TP>." dan "Perlu bimbingan dalam <kompetensi TP>."
  Kalimat harus positif, spesifik, dan mudah dipahami orang tua.
- Jelaskan ke guru: di Excel nilai, lihat kolom TP tertinggi/terendah tiap murid, lalu salin kalimat yang sesuai ke aplikasi rapor.
- Panggil `ekspor_word`.
