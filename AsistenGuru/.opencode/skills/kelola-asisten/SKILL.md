---
name: kelola-asisten
description: Mengelola paket Asisten Guru itu sendiri — cek versi, memperbarui ke rilis terbaru, cadangan, pindah ke laptop baru, mengembalikan versi lama, menjelaskan pengaturan sekolah (kebijakan.json, CP), dan mengatasi masalah (alat tidak muncul, OpenCode versi lama). Gunakan saat guru bertanya "versi berapa", "ada pembaruan?", "tolong perbarui asisten", "update", "cara backup", "ganti laptop", "pindah komputer", "asisten error", "alatnya tidak ada", atau bertanya cara mengatur data sekolah.
---

# Kelola Asisten Guru

Folder Asisten Guru terdiri dari:
- `.opencode/`, `AGENTS.md`, `opencode.json`, `VERSI.md`, panduan: **paket** (diganti saat pembaruan).
- `sekolah/`: isian sekolah (CP, kebijakan, template). Diisi operator/waka kurikulum, tidak ditimpa pembaruan.
- `guru/` dan `hasil/`: milik guru (profil, data, draf, Word, Excel). Tidak pernah disentuh pembaruan.
- `.cadangan/`: salinan berkas paket lama dari 3 pembaruan terakhir.

## Versi dan pembaruan
1. Guru bertanya versi atau pembaruan → panggil `perbarui_paket` dengan `cek_saja: true`, lalu sampaikan hasilnya dalam
   satu atau dua kalimat.
2. Jika ada versi baru, tanyakan dulu: "Mau saya perbarui sekarang? Data Ibu/Bapak tetap aman." Jika guru sudah meminta
   pembaruan ("tolong perbarui", `/perbarui`), tidak perlu cek dan tanya lagi.
3. Untuk memperbarui → panggil `perbarui_paket` tanpa `cek_saja`. Sampaikan: versi lama ke baru, data tetap aman, dan minta guru
   **menutup lalu membuka lagi OpenCode**. Jika guru ingin tahu isinya, baca ringkasan versi terbaru di `VERSI.md`.
4. Jika hasilnya `GAGAL` (misalnya tidak ada internet), sampaikan dengan bahasa sederhana dan sarankan mencoba lagi nanti.

## Cadangan dan pindah laptop
- Cadangan paling sederhana: salin **seluruh folder AsistenGuru** ke flashdisk atau Google Drive. Yang terpenting adalah folder
  `guru/` dan `hasil/`.
- Pindah ke laptop baru: pasang OpenCode 2, salin seluruh folder AsistenGuru ke `Documents` di laptop baru, lalu buka di
  OpenCode. Jika folder lama hilang, minta operator memasang ulang paket, lalu salin `guru/` dan `hasil/` dari cadangan.
- Mengembalikan versi lama setelah pembaruan bermasalah: berkas paket lama ada di `.cadangan/<tanggal> v<versi>/`. Asisten
  tidak boleh menyalinnya sendiri; jelaskan ke guru agar operator menyalin isi folder cadangan itu kembali ke folder
  AsistenGuru saat OpenCode tertutup.

## Pengaturan sekolah
Asisten tidak boleh mengubah `sekolah/`. Jika guru bertanya:
- Kop surat, kepala sekolah, ukuran kertas, aturan minggu efektif, bobot nilai, batas ketuntasan: diatur operator di
  `sekolah/kebijakan.json`. Sebutkan bagian yang relevan saja.
- CP: diisi operator di `sekolah/referensi/cp/` dan diberi status `TERVERIFIKASI` setelah diperiksa.
- Jika guru ingin mengusulkan perubahan aturan untuk semua guru → skill `umpan-balik-guru`, bagian "Usulkan ke sekolah".

## Masalah umum
- Asisten berkata alat tidak tersedia, atau Word/Excel tidak bisa dibuat: minta guru memastikan OpenCode versi 2, lalu menutup
  dan membuka lagi OpenCode. Jika masih gagal, sarankan memperbarui paket.
- Asisten lambat atau diam: tekan Esc lalu kirim ulang pesan. Server model gratis kadang macet.
