# Memasang Asisten Guru (untuk operator sekolah)

## Sekali per sekolah
1. Isi CP resmi di `sekolah/referensi/cp/` (lihat `sekolah/referensi/README.md`) dan ubah statusnya setelah diverifikasi.
2. Isi `sekolah/kebijakan.json`: nama, alamat, dan kota sekolah, nama dan NIP kepala sekolah (untuk kop dan tanda tangan),
   ukuran kertas (A4/F4), aturan minggu efektif, cadangan JP, bobot nilai rapor, dan batas ketuntasan. Lalu lengkapi bagian
   `[ISI]` di `sekolah/preferensi-sekolah.md`.
3. Taruh contoh format sekolah di `sekolah/template/` jika ada.

## Di komputer guru
1. Pasang OpenCode dari opencode.ai.
2. Salin folder `AsistenGuru` ke komputer guru, misalnya ke Documents. **Satu folder untuk satu guru.**
3. Buka terminal di folder itu lalu ketik `opencode`. Pembukaan pertama butuh internet karena OpenCode memasang
   komponen alat secara otomatis (sekitar satu menit).
4. Pilih model AI di OpenCode (perintah `/models`). Model gratis bisa dipakai. Model berbayar lebih stabil.
5. Guru mengetik `/mulai`, atau `/bantuan` untuk melihat menu. Panduan singkat untuk guru ada di `PANDUAN-GURU.md`.

Tidak perlu memasang Python, pandoc, atau Office di komputer guru untuk membuat berkas. Word dan Excel dibuat oleh
asisten sendiri. Guru hanya perlu aplikasi untuk membukanya (Word/Excel, WPS, LibreOffice, atau Google Drive).

## Keamanan bawaan
- Asisten hanya bisa menulis di `guru/` dan `hasil/`. Perintah terminal, akses internet, dan berbagi sesi dimatikan.
- Nama siswa tidak pernah dikirim ke AI. Nama diketik guru langsung di berkas Excel.

## Memperbarui paket
Ganti **hanya** `.opencode/` (kecuali `node_modules`), `sekolah/`, `AGENTS.md`, `opencode.json`, dan berkas panduan.
**Jangan** menyentuh `guru/` dan `hasil/`, karena di sana ada profil, data, dan dokumen milik guru.

## Jika ada masalah
- Asisten diam lebih dari 5 menit: tekan Esc, lalu kirim ulang pesannya. Server model gratis kadang macet.
- Alat tidak muncul setelah pembaruan: tutup OpenCode lalu buka lagi.
- Usulan aturan dari guru ada di `guru/usulan-ke-sekolah/`. Jika disetujui, masukkan ke `sekolah/` di versi berikutnya.
