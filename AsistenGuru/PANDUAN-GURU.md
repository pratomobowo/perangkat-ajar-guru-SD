# Panduan Singkat Asisten Guru

Asisten ini membantu administrasi pembelajaran supaya Bapak/Ibu bisa fokus mengajar.
Ketik perintah di bawah, atau bercerita biasa, misalnya "minggu depan saya mengajar pecahan, tolong siapkan bahannya".

| Ketik | Untuk |
|---|---|
| `/bingung` | Belum tahu harus mulai dari mana atau bahannya belum ada? Asisten menuntun pelan-pelan, satu langkah demi satu langkah, dan mengambilkan bahan resmi (CP, buku) bila Ibu/Bapak setuju |
| `/siapkan` | Taruh dokumen sekolah (CP, kalender, jadwal, contoh RPP, KKTP, daftar siswa dari Dapodik/e-Rapor) di folder `guru\masukan`, lalu semua perangkat disiapkan bertahap; bilang "jalankan semua" agar otomatis |
| `/status` | Melihat perangkat yang sudah dan belum ada, serta langkah berikutnya |
| `/mulai` | Menyiapkan profil, jadwal, dan kalender (sekali di awal tahun) |
| `/hari-ini` | Melihat agenda hari ini, rencana minggu ini, dan pengingat |
| `/rencana matematika` | Membuat minggu efektif, ATP, Prota, dan Promes |
| `/modul pecahan senilai` | Membuat modul ajar/RPM dan LKPD |
| `/kokurikuler` | Kegiatan kokurikuler (pengganti P5): perencanaan, jurnal, Excel penilaian, deskripsi rapor |
| `/kalender`, `/jadwal` | Kalender pendidikan dan jadwal pelajaran kelas (Word) |
| `/buku` | Mengunduh buku teks resmi (Buku Siswa dan Panduan Guru) kelas Anda ke pustaka |
| "carikan materi pecahan senilai" | Mencari isi materi di buku resmi dan situs tepercaya, lengkap dengan sumbernya |
| `/soal sumatif bab pecahan` | Membuat KKTP, kisi-kisi, soal, dan kunci |
| `/jurnal tadi mengajar TP3, 2 anak sakit` | Mencatat jurnal mengajar |
| `/absen oktober` | Membuat Excel daftar hadir (nama siswa terisi otomatis) |
| "Budi kurangnya di mana?" | Analisis satu anak dari buku nilai dan daftar hadir yang sudah Ibu/Bapak isi: TP yang kuat, TP yang perlu dibantu, kehadiran, dan saran. "Siapa yang perlu remedial TP3?" untuk satu kelas (laporan lengkap ada di Excel) |
| `/nilai matematika 1` | Membuat Excel buku nilai semester 1 |
| `/ppg` | Sedang ikut PPG Guru Tertentu? Checklist UKPPPG sesuai juknis 2026 (nama berkas resmi sudah terisi), pendampingan perangkat dan skenario video Ujian Kinerja 2 JP dari ide dan kelas Ibu/Bapak sendiri, latihan soal PCK, SJT, dan uraian reflektif. Hasil di folder `hasil\7 PPG` |
| `/ingat` | Melihat apa yang diingat asisten tentang Anda, pekerjaan yang sedang berjalan, pengingat, dan aturan Anda — bisa diubah atau dihapus |
| `/format` | Mengatur format Word Anda (huruf, margin, kop, atau pakai Word Anda sendiri sebagai contoh) |
| `/perbarui` | Mengecek versi dan memperbarui Asisten Guru (data Anda tetap aman) |
| `/bantuan` | Menampilkan menu ini |

## Perlu diingat
- **Semua hasil adalah draf.** Periksa dulu sebelum dicetak. Bagian berstabilo kuning `[PERLU GURU]` perlu keputusan Anda.
- Dokumen Word dan Excel ada di folder `hasil/`:
  `1 Perencanaan`, `2 Modul dan LKPD`, `3 Asesmen`, `4 Administrasi`. Kop sekolah, nomor halaman, dan kolom tanda tangan
  sudah otomatis, jadi tinggal dicetak.
- Materi diambil dari buku resmi di pustaka. Ketik `/buku` sekali di awal tahun supaya asisten mengunduh buku paket Anda.
  Sumber selalu dicantumkan di dokumen.
- Di Excel, isi sel kuning saja. Rumus dikunci agar tidak terhapus.
- **Jangan mengetik nama siswa ke asisten.** Cukup taruh sekali ekspor daftar siswa dari Dapodik, format nilai e-Rapor,
  atau daftar hadir lama yang sudah berisi nama di folder `guru\masukan`. Nama lalu terisi otomatis di semua daftar hadir,
  buku nilai, dan penilaian kokurikuler, tanpa dibaca asisten. Siswa pindahan: ubah langsung di
  `hasil\4 Administrasi\Daftar Siswa.xlsx`, atau taruh daftar baru di folder masukan.
- Ingin format Word sesuai selera? Katakan saja, misalnya "hurufnya Times New Roman 12", "LKPD tanpa kop", atau edit Word
  hasil asisten di Word lalu katakan "pakai yang ini sebagai contoh LKPD". Format itu dipakai untuk dokumen berikutnya.
- Ingin asisten selalu melakukan sesuatu? Katakan "mulai sekarang selalu ...", maka asisten akan mengingatnya.
- **Asisten ingat Anda di sesi berikutnya**: panggilan, kebiasaan kelas, pekerjaan yang belum selesai, dan dokumen
  yang sudah dibuat. Katakan "ingatkan saya tanggal 20 kumpul nilai" — pengingat muncul saat asisten dibuka (tidak ada
  notifikasi saat OpenCode tertutup). Tanya "minggu lalu kita bikin apa?" untuk melihat riwayat. Semua ingatan ada di
  folder `guru\ingatan` dan boleh dibuka/dihapus dengan Notepad.
- Jika asisten diam terlalu lama, tekan Esc lalu kirim ulang pesan Anda.
- Cadangkan folder **AsistenGuru** sesekali (salin ke flashdisk atau Google Drive), terutama folder `guru` dan `hasil`.
