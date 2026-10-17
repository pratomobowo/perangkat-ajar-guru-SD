# Memasang Asisten Guru (untuk operator sekolah)

Paket ini untuk **OpenCode 2** (versi 2.0.30 atau lebih baru). OpenCode 1 tidak didukung lagi, karena alat hitung dan
pembuat Word/Excel memakai sistem plugin OpenCode 2.

## Sekali per sekolah
1. Isi CP resmi di `sekolah/referensi/cp/` (lihat `sekolah/referensi/README.md`) dan ubah statusnya setelah diverifikasi.
   Jika belum diisi, asisten bisa mengambil CP otomatis dari PDF Keputusan BSKAP 046/H/KR/2025 ke `guru/referensi/cp/`
   (status OTOMATIS-RESMI); CP sekolah tetap diutamakan. CP Pendidikan Agama harus diisi manual.
2. Isi `sekolah/kebijakan.json`: nama, alamat, dan kota sekolah, nama dan NIP kepala sekolah (untuk kop dan tanda tangan),
   ukuran kertas (A4/F4), aturan minggu efektif, cadangan JP, bobot nilai rapor, dan batas ketuntasan. Lalu lengkapi bagian
   `[ISI]` di `sekolah/preferensi-sekolah.md`.
   Boleh diedit dengan Notepad. Pastikan tanda kutip dan koma JSON tetap utuh.
3. Taruh contoh format sekolah di `sekolah/template/` jika ada.
4. Taruh PDF buku teks resmi (Buku Siswa dan Buku Guru) di `sekolah/referensi/buku/` (lihat README di folder itu).
   Asisten memakainya sebagai sumber utama materi dan mencantumkan halamannya.
5. Format dokumen sekolah (opsional): taruh Word contoh resmi di `sekolah/template/<Dokumen>.docx` (misalnya `RPM.docx`,
   dengan kop di Header Word) dan/atau isi `gaya_dokumen` di `kebijakan.json`. Bagian yang tidak boleh diubah guru ditulis di
   `gaya_dikunci`; `template_wajib: true` membuat Word contoh sekolah wajib dipakai.
6. Riset web: bawaan hanya memakai situs resmi dan tepercaya. Ubah daftarnya di `riset.domain_tepercaya` pada
   `sekolah/kebijakan.json`, atau matikan dengan `"web": false`.

## Di komputer guru (Windows)
Cara termudah: buka OpenCode, tempel link https://github.com/pratomobowo/perangkat-ajar-guru-SD lalu ketik
"Tolong pasang Asisten Guru dari link ini". OpenCode menanyakan lokasi (Documents, drive D:, atau folder lain), lalu
menjalankan pemasang resmi. Lokasi diingat untuk pembaruan berikutnya; folder boleh dipindah utuh kapan saja.
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
- Nama siswa tidak pernah dikirim ke AI. Guru menaruh ekspor Dapodik/e-Rapor atau daftar hadir lama di `guru\masukan`;
  alat di komputer guru memindahkannya ke `hasil\4 Administrasi` (terkunci dari asisten: baca, ubah, dan grep ditolak)
  dan mengisi nama di semua Excel administrasi. Asisten hanya menerima jumlah siswa. Dokumen Word/PDF yang memuat NISN
  tidak ditampilkan ke asisten.
- Analisis siswa (`analisis_siswa`) dihitung di komputer guru dari Excel yang sudah diisi. Ke asisten hanya dikirim data
  anak yang ditanyakan, berlabel nomor absen (tanpa nama, tanpa NISN); analisis kelas memakai nomor absen dan laporan
  bernama disimpan di `hasil\4 Administrasi`. **Bawaan paket: `"privasi": { "nama_ke_ai": true }`** di
  `sekolah/kebijakan.json`, artinya analisis menyebut nama siswa ke AI — untuk sekolah yang memakai model AI berbayar yang
  tidak menyimpan/melatih data dan sudah punya persetujuan orang tua (UU 27/2022 Pasal 25). **Ubah ke `false` bila guru
  memakai model gratis** (model gratis di OpenCode Zen dapat memakai data untuk perbaikan model): analisis lalu memakai
  nomor absen dan nama hanya ada di laporan Excel. Daftar Siswa, daftar hadir, dan buku nilai tetap tidak bisa dibaca
  langsung oleh asisten di kedua pilihan.

## Ingatan asisten
- Asisten menyimpan ingatan di `guru\ingatan\` (per guru, di laptop guru): `tentang-guru.md`, `catatan-kerja.md`,
  `pengingat.md` (Markdown, bisa dibuka di Notepad) dan `riwayat.db` (arsip riwayat kerja, SQLite; bila SQLite tidak
  tersedia otomatis memakai `riwayat.md`). Ingatan inti dimuat otomatis di setiap sesi lewat plugin.
- Asisten hanya bisa menulis ingatan lewat alat `ingat` (izin edit folder ini ditolak), yang menolak nomor identitas,
  kata sandi/kunci API, perintah tersembunyi, dan nama siswa bila `privasi.nama_ke_ai` bukan `true`.
- Menghapus ingatan: hapus barisnya di Notepad, atau hapus folder `guru\ingatan` untuk mulai dari nol.

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
