---
name: guru-setup
description: Menyiapkan profil guru, jadwal pelajaran, dan kalender pendidikan untuk pertama kali atau saat ada perubahan. Gunakan ketika guru baru memakai asisten, berkata "saya guru baru", "siapkan profil saya", "ganti kelas", "tahun ajaran baru", "kalender berubah", "jadwal berubah", atau ketika guru/profil.json belum ada. Hasilnya dipakai semua perangkat lain.
---

# Setup Profil Guru

Tujuan: mengumpulkan informasi sekali saja supaya guru tidak ditanya hal yang sama berulang-ulang.

## Langkah

1. Jika `guru/profil.json` sudah ada, tampilkan ringkasannya dan tanyakan apa yang berubah. Jangan mewawancarai ulang.
2. Wawancarai **satu topik per giliran**, singkat. Jika guru menjawab beberapa hal sekaligus, terima semuanya dan lanjut ke topik yang belum terjawab.
   1. Nama panggilan, nama lengkap dengan gelar (untuk tanda tangan dokumen), NIP jika ada, dan nama sekolah.
   2. Kelas yang diampu, tahun ajaran, dan jumlah siswa (angka saja).
   3. Mata pelajaran yang ingin dibantu dan JP per minggu tiap mapel (serta menit per JP).
   4. Jadwal: hari dan jam ke berapa tiap mapel diajarkan. Ini opsional; jika guru belum tahu, lewati.
   5. Kalender pendidikan: minta guru menempelkan kalender sekolah, atau menyebut tanggal mulai dan akhir tiap semester,
      hari libur, dan kegiatan tidak efektif (MPLS, STS, SAS/SAT, class meeting, bagi rapor). Jangan menebak tanggal.
      Jika ada keterangan berubah (misalnya "STS dimajukan"), pakai tanggal yang terakhir.
3. Jangan menanyakan nama siswa atau data pribadi siswa.
4. Tulis `guru/profil.json` dan `guru/kalender.json` mengikuti `references/format-profil.md`. Yang belum diketahui diisi `null`.
5. Buat `guru/preferensi.md` (judul "# Preferensi <nama>") dan `guru/riwayat-perubahan.md` (judul "# Riwayat Perubahan") bila belum ada.
6. Panggil alat `hitung_minggu_efektif` untuk memeriksa kalender. Jika hasilnya `GAGAL`, perbaiki berkas lalu ulangi.
7. Tampilkan ringkasan profil dan jumlah minggu efektif per semester, lalu minta guru memeriksa. Tawarkan langkah berikutnya:
   "Mau saya susunkan perencanaan tahunan (ATP, Prota, Promes)?"
8. Jika `baca_buku` belum menemukan buku untuk mapel guru, tawarkan sekali mengunduh buku resmi (alat `unduh_buku`, tampilkan
   daftar dulu). Buku ini dipakai sebagai sumber materi.
