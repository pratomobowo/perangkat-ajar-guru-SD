---
name: umpan-balik-guru
description: Mencatat dan menerapkan arahan guru yang bersifat tetap tentang cara asisten bekerja (format, gaya bahasa, bagian wajib, istilah, urutan) supaya diingat di sesi berikutnya. Gunakan saat guru berkata "mulai sekarang", "selalu", "jangan lagi", "lain kali", "tolong ingat", "saya lebih suka", "lupakan aturan itu", "hapus aturan tadi", "apa yang kamu ingat", atau "usulkan ke sekolah".
---

# Umpan Balik Guru

Arahan guru disimpan sebagai **aturan di berkas**, bukan dengan mengubah skill. Setiap aturan bisa dilihat dan dibatalkan.
Hanya tulis di `guru/preferensi.md`, `guru/riwayat-perubahan.md`, dan `guru/usulan-ke-sekolah/`.

## Langkah
1. **Bedakan** arahan tetap ("mulai sekarang", "selalu", "jangan lagi") dari permintaan sekali pakai ("kali ini ...").
   Jika cakupannya ragu (semua dokumen atau satu jenis saja?), tanyakan satu kalimat **sebelum** menyimpan.
2. **Cek bentrokan** (regulasi > sekolah > guru):
   - Bertentangan dengan CP atau regulasi resmi → jangan simpan; jelaskan alasannya.
   - Bertentangan dengan `sekolah/preferensi-sekolah.md` atau `sekolah/kebijakan.json` → jangan simpan; jelaskan bahwa aturan
     sekolah berlaku dan tawarkan "usulkan ke sekolah".
   - Bertentangan dengan aturan guru yang sudah ada → ganti yang lama (status `diganti`) dan sebutkan ke guru.
3. **Simpan** di `guru/preferensi.md` dengan format di `references/format-aturan.md`. Catat satu baris di `guru/riwayat-perubahan.md`.
4. **Laporkan** dalam satu kalimat: isi aturan dan cakupannya, lalu "Jika keliru, bilang saja 'batalkan aturan #<nomor>'."
5. **Terapkan segera** pada dokumen yang sedang dikerjakan, hanya sesuai cakupan aturan. Dokumen perencanaan diubah lewat
   data ATP lalu `susun_perencanaan`.

## Membatalkan dan melihat aturan
- "Lupakan aturan tadi" / "batalkan aturan 3" → ubah statusnya menjadi `dibatalkan`. Jangan menghapus barisnya.
- "Apa yang kamu ingat?" → tampilkan aturan berstatus `aktif` dalam daftar pendek.

## Usulkan ke sekolah
Jika guru menilai aturannya layak untuk semua guru, buat `guru/usulan-ke-sekolah/<tanggal>-<judul>.md` berisi aturan,
alasan, dan satu contoh. Berkas itu dikirim sendiri oleh guru ke waka kurikulum.
