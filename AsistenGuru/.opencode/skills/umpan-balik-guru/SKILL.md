---
name: umpan-balik-guru
description: Mencatat dan menerapkan arahan guru yang bersifat tetap tentang cara asisten bekerja (format, gaya bahasa, bagian wajib, istilah, urutan) supaya diingat di sesi berikutnya. Gunakan saat guru memberi arahan tentang cara membuat dokumen: "mulai sekarang", "selalu", "jangan lagi", "lain kali", "saya lebih suka", "lupakan aturan itu", "hapus aturan tadi", "aturan apa saja yang kamu pakai", atau "usulkan ke sekolah". Hal tentang guru, pekerjaan berjalan, dan pengingat disimpan dengan alat `ingat`, bukan di sini.
---

# Umpan Balik Guru

Arahan guru disimpan sebagai **aturan di berkas**, bukan dengan mengubah skill. Setiap aturan bisa dilihat dan dibatalkan.
Hanya tulis di `guru/preferensi.md`, `guru/riwayat-perubahan.md`, dan `guru/usulan-ke-sekolah/`.

Arahan tentang **tampilan Word** (huruf, margin, kop, tanda tangan), **susunan bagian** dokumen, atau **Word contoh**
ditangani skill `template-guru`, bukan disimpan di `guru/preferensi.md`.

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
- "Aturan apa saja yang kamu pakai?" → tampilkan aturan berstatus `aktif` dalam daftar pendek. Aturan aktif juga
  dimuat otomatis di setiap sesi (blok INGATAN ASISTEN). Untuk "apa yang kamu ingat?" secara umum, lihat perintah /ingat.

## Usulkan ke sekolah
Jika guru menilai aturannya layak untuk semua guru, buat `guru/usulan-ke-sekolah/<tanggal>-<judul>.md` berisi aturan,
alasan, dan satu contoh. Berkas itu dikirim sendiri oleh guru ke waka kurikulum.
