# Memasang Asisten Guru (untuk operator sekolah)

Paket ini untuk **OpenCode 2** (versi 2.0.30 atau lebih baru). OpenCode 1 tidak didukung lagi, karena alat hitung dan
pembuat Word/Excel memakai sistem plugin OpenCode 2.

## Sekali per sekolah
1. Isi CP resmi di `sekolah/referensi/cp/` (lihat `sekolah/referensi/README.md`) dan ubah statusnya setelah diverifikasi.
2. Isi `sekolah/kebijakan.json`: nama, alamat, dan kota sekolah, nama dan NIP kepala sekolah (untuk kop dan tanda tangan),
   ukuran kertas (A4/F4), aturan minggu efektif, cadangan JP, bobot nilai rapor, dan batas ketuntasan. Lalu lengkapi bagian
   `[ISI]` di `sekolah/preferensi-sekolah.md`.
   Boleh diedit dengan Notepad. Pastikan tanda kutip dan koma JSON tetap utuh.
3. Taruh contoh format sekolah di `sekolah/template/` jika ada.
4. Taruh PDF buku teks resmi (Buku Siswa dan Buku Guru) di `sekolah/referensi/buku/` (lihat README di folder itu).
   Asisten memakainya sebagai sumber utama materi dan mencantumkan halamannya.
5. Riset web: bawaan hanya memakai situs resmi dan tepercaya. Ubah daftarnya di `riset.domain_tepercaya` pada
   `sekolah/kebijakan.json`, atau matikan dengan `"web": false`.

## Di komputer guru (Windows)
Cara termudah: buka OpenCode, tempel link https://github.com/pratomobowo/perangkat-ajar-guru-SD lalu ketik
"Tolong pasang Asisten Guru dari link ini". OpenCode menjalankan pemasang resmi dan memasang ke `Documents\AsistenGuru`.
Isian sekolah bisa disalin ke `sekolah\` sesudahnya.

Cara manual:
1. Unduh dan pasang **OpenCode Desktop** untuk Windows (x64, atau ARM64 untuk laptop ARM) dari opencode.ai/download.
   Jika lebih suka terminal, unduh binary CLI Windows dari halaman yang sama. Winget, Scoop, dan Chocolatey tidak didukung.
2. Salin folder `AsistenGuru` ke komputer guru, misalnya ke `Documents\AsistenGuru`. **Satu folder untuk satu guru.**
   Hindari folder yang disinkronkan OneDrive jika memungkinkan, karena sinkronisasi bisa mengunci berkas Word/Excel.
3. Buka OpenCode Desktop, lalu buka folder `AsistenGuru` sebagai proyek. Untuk CLI: buka PowerShell di folder itu dan
   ketik `opencode`. Tidak ada komponen yang perlu diunduh saat pembukaan pertama.
4. Pilih model AI (perintah `/models`). Model gratis bisa dipakai. Model berbayar lebih stabil.
5. Guru mengetik `/mulai`, atau `/bantuan` untuk melihat menu. Panduan singkat untuk guru ada di `PANDUAN-GURU.md`.

Tidak perlu memasang Python, Node.js, pandoc, atau Office untuk membuat berkas. Word dan Excel dibuat oleh asisten sendiri.
Guru hanya perlu aplikasi untuk membukanya (Word/Excel, WPS, LibreOffice, atau Google Drive).

## Keamanan bawaan
- Asisten hanya bisa menulis di `guru/` dan `hasil/`. Perintah terminal, akses internet, subagent, dan berbagi sesi dimatikan.
  Akses internet asisten hanya lewat dua alat: pembaruan (hanya GitHub repositori Asisten Guru) dan riset materi (hasilnya
  disaring ke situs tepercaya yang ditetapkan sekolah). Pencarian memakai penyedia TinyFish bawaan OpenCode, tanpa akun.
- Asisten tidak bisa membaca atau menimpa Excel di `hasil/4 Administrasi/` (berisi nama siswa).
- Nama siswa tidak pernah dikirim ke AI. Nama diketik guru langsung di berkas Excel.

## Memperbarui paket
- Guru cukup mengetik `/perbarui` (atau "tolong perbarui asisten") di Asisten Guru. Untuk paket versi 0.2 yang belum punya
  perintah itu, jalankan lagi pemasang (lihat README repositori) atau minta OpenCode memasangnya dari link GitHub.
- Pembaruan mengganti `.opencode/`, `AGENTS.md`, `opencode.json`, `VERSI.md`, dan panduan; berkas lama dicadangkan di
  `.cadangan/`. `sekolah/` hanya ditambah berkas yang belum ada. `guru/` dan `hasil/` tidak pernah disentuh.
- Untuk membagikan isian sekolah (CP, kebijakan) ke banyak guru, salin isi `sekolah/` ke folder AsistenGuru tiap guru.

## Jika ada masalah
- Asisten diam lebih dari 5 menit: tekan Esc, lalu kirim ulang pesannya. Server model gratis kadang macet.
- Asisten berkata tidak bisa membuat Word/Excel atau alatnya tidak ada: pastikan OpenCode versi 2 (menu Help/About atau
  `opencode --version`), lalu tutup dan buka lagi OpenCode.
- Usulan aturan dari guru ada di `guru/usulan-ke-sekolah/`. Jika disetujui, masukkan ke `sekolah/` di versi berikutnya.
