---
name: riset-materi
description: Meriset isi materi pelajaran dari sumber tepercaya sebelum menulis modul, LKPD, bahan bacaan, atau soal — buku resmi di pustaka (baca_buku) lalu situs tepercaya (riset_materi) — dan mencantumkan sumbernya. Gunakan saat guru meminta "cari materi", "riset", "referensi", "sumber", "buku paket", "buku siswa/buku guru halaman berapa", "apa kata buku tentang ...", "materi terbaru", "data terbaru", atau ketika skill modul-ajar/asesmen membutuhkan isi materi. Juga untuk mencari dan mengunduh buku teks resmi (SIBI) ke pustaka guru, misalnya "unduh buku paket", "isi pustaka".
---

# Riset Materi

Tujuan: isi materi mengikuti **buku resmi** dan **sumber tepercaya**, bukan ingatan model, dan guru bisa mengecek asalnya.
CP tetap hanya dari `sekolah/referensi/cp/` atau alat `ambil_cp` (PDF resmi), bukan dari riset web.

## Urutan sumber
1. **Pustaka buku** (`baca_buku`). Selalu coba dulu.
   - `baca_buku` dengan `cari: "<topik>"` → pilih 1–3 halaman teratas yang memang membahas topik (bukan daftar isi),
     lalu baca lengkap dengan `buku` + `halaman` (boleh rentang, misalnya "78-81").
   - Ikuti istilah, urutan konsep, contoh, dan tingkat kesulitan buku sesuai kelas guru.
2. **Situs tepercaya** (`riset_materi`). Jika pustaka kosong, topik tidak ada di buku, atau butuh data/peristiwa terbaru.
   - Pertanyaan berisi topik dan jenjang, misalnya "siklus air kelas 5 SD". **Jangan** memasukkan nama murid, nama sekolah,
     atau data pribadi.
   - Alat hanya mengembalikan situs yang ditetapkan sekolah. Jangan mencari dengan cara lain.
   - Jika hasilnya PDF buku resmi yang berguna, tawarkan ke guru untuk disimpan (`riset_materi` dengan `simpan_pdf`), supaya
     berikutnya bisa dibaca lewat `baca_buku`.
3. **Pengetahuan umum model**: hanya jika 1 dan 2 tidak menghasilkan apa pun. Tandai bagian itu
   `[PERLU GURU: cek kebenaran, belum ada sumber]`.

## Menulis dari sumber
- Tulis ulang dengan bahasa sesuai usia murid. Jangan menyalin paragraf panjang. Gambar di buku tidak terbaca; jika kegiatan
  di buku bergantung pada gambar, jelaskan dengan kata-kata atau sebut "lihat gambar di buku halaman ...".
- Angka, definisi, dan fakta harus sama dengan sumber. Jika sumber saling berbeda, pakai buku resmi dan sebutkan bedanya ke guru.
- Untuk topik agama (dalil, ayat, hadis) tetap ikuti AGENTS.md: hanya dari guru, selain itu `[PERLU DIVERIFIKASI guru agama]`.

## Bagian Sumber (wajib di modul, RPM, bahan bacaan, dan kunci jawaban)
Tambahkan di akhir dokumen guru (bukan di lembar murid):
```
## Sumber
- Buku Siswa Matematika untuk SD/MI Kelas IV, halaman 66–69 (PDF 78–81).
- Ruang GTK Kemendikdasmen, "Judul Halaman", https://guru.kemendikdasmen.go.id/...
```
Gunakan nomor halaman cetak bila alat menyebutkannya; selain itu tulis "halaman PDF n".

**Kejujuran sumber:** cantumkan halaman buku hanya bila halaman itu sudah dibaca dan **benar-benar memuat** isi yang
dipakai di dokumen. Jika buku resmi tidak membahas topik itu (hasil pencarian hanya daftar tujuan, daftar isi, atau bab
lain), tulis terus terang di Sumber: `- Buku Siswa … tidak memuat topik ini.`, lalu pakai `riset_materi` dan tandai isi
yang tidak bersumber buku dengan `[PERLU GURU: cek kebenaran]`. Jangan mengutip halaman bab lain sebagai sumber.

## Mengisi pustaka
- `unduh_buku` mencari buku teks resmi Kurikulum Merdeka (Buku Siswa dan Panduan Guru) di katalog SIBI untuk kelas guru.
  Panggil dulu **tanpa** `unduh` untuk menampilkan daftar, lalu tanyakan buku mana yang mau diunduh. Setelah guru setuju,
  panggil dengan `unduh: true` dan `mapel` (serta `jenis` bila perlu). Buku tersimpan di `guru/buku/`.
- Sarankan Buku Siswa untuk isi materi murid, dan Panduan Guru untuk langkah pembelajaran, kunci, dan asesmen.
- Jika pustaka kosong saat dibutuhkan, tawarkan sekali: "Mau saya unduhkan buku resmi <mapel> kelas <x> dulu?"

## Jika guru bertanya langsung
- "Materi X ada di buku halaman berapa?" → `baca_buku` dengan `cari`, jawab buku dan halamannya.
- "Tolong carikan materi X" → ringkas temuan dalam ≤ 6 baris beserta sumbernya, lalu tawarkan dibuatkan bahan ajar/LKPD.
- Pustaka kosong → tawarkan mengunduh buku resmi dengan `unduh_buku` (lihat Mengisi pustaka). Jika guru menolak atau
  unduhan gagal, lanjutkan dengan riset web.
