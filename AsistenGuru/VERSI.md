# Versi Paket

**Versi:** 0.20.1
**Tanggal:** 2026-10-16

## Catatan perubahan
- 0.20.1 — Mode cek pemasang macOS/Linux hanya menampilkan disk sungguhan (tanpa mount Docker/snap/loop).
- 0.20.0 — **Pilih lokasi pemasangan** (misalnya drive D:). Saat guru meminta "pasang Asisten Guru", asisten AI menjalankan
  mode cek pemasang (`ASISTEN_GURU_CEK=1`: lokasi bawaan, daftar drive beserta sisa ruang, lokasi yang sudah terpasang),
  menanyakan lokasi dengan pilihan bernomor, lalu memasang ke `ASISTEN_GURU_DIR`. Pemasang membuat subfolder AsistenGuru
  bila yang disebut hanya drive atau folder yang sudah berisi berkas lain, menolak folder sistem, mengingatkan bila folder
  ikut OneDrive/Google Drive/Dropbox, dan mengingat lokasi sehingga pembaruan berikutnya ke folder yang sama. Plugin
  mencatat ulang lokasi setiap kali Asisten Guru dibuka, jadi folder boleh dipindah utuh kapan saja.
- 0.19.0 — **Semua Excel bawaan bisa mengikuti format sekolah atau guru** (aturan inti di AGENTS.md: format sekolah
  wajib > format guru > format sekolah > bawaan; Word sudah mengikutinya sejak 0.6.0). Alat `simpan_template_excel`
  menyimpan format untuk Daftar Hadir, Buku Nilai (boleh khusus mapel), Penilaian Kokurikuler, Analisis Butir Soal,
  Administrasi Wali Kelas, dan Kelompok — dari Excel sekolah di folder masukan atau Excel hasil asisten yang sudah diubah
  guru (baris siswa dikosongkan sebelum disimpan). Alat pembuat Excel lalu mengisi format itu: kolom dikenali dari judul
  (NO, NAMA, NIS, NISN, L/P, KELOMPOK, TP1…, UH, UTS/STS, UAS/SAS, SAKIT/IZIN/ALFA, judul bertingkat dan sel digabung),
  penanda `{{...}}` untuk bagian bebas (judul, denah, piket, struktur), rumus dan tampilan tidak diubah. Buku nilai dan
  daftar hadir berformat sekolah tetap terbaca oleh analisis siswa, refleksi, dan rekap. `baca_masukan` mengenali format
  Excel kosong dan menebak jenisnya.
  **Rekap nilai dari sekolah untuk rapor** (`isi_rekap_sekolah`): Excel rekap buatan sekolah/operator (diisi
  guru, lalu dimasukkan operator ke e-Rapor) diisi otomatis. Kolom dikenali dari judulnya (NAMA/NIS/NISN, nama mapel
  atau singkatannya, UH/TUGAS/UTS/STS/PTS/UAS/SAS/PAS, sakit/izin/alfa; judul bertingkat dan sel digabung didukung):
  UH = rata-rata nilai TP, UTS = STS, UAS = SAS dari buku nilai; kehadiran dari daftar hadir semester ini sampai tanggal
  yang ditentukan. Siswa dicocokkan lewat NISN/NIS/nama (urutan rekap boleh berbeda); templat kosong diisi identitas
  dari Daftar Siswa. Hanya sel kosong yang diisi, format sekolah dipertahankan, hasil berupa salinan baru di folder
  terkunci; kolom yang masih harus diisi guru (tugas, tahsin, ibadah, dll.) dilaporkan. `baca_masukan` mengenali berkas
  rekap dan menawarkan pengisian.
- 0.18.0 — **Refleksi diri guru per semester** (wajib menurut Permendikdasmen No. 1 Tahun 2026 tentang Standar Proses,
  Pasal 15: penilaian proses pembelajaran oleh guru melalui refleksi diri, minimal sekali per semester; standar proses
  lama Permendikbudristek 16/2022 dicabut). Alat `bahan_refleksi_semester` mengumpulkan data kelas tanpa nama siswa —
  rata-rata dan ketuntasan per TP dari buku nilai, tingkat kesukaran dan daya beda yang dihitung ulang dari jawaban di
  Excel analisis butir, kehadiran, catatan tindak lanjut jurnal — sebagai tabel siap tempel. Skill
  `refleksi-pembelajaran` (perintah `/refleksi`) mewawancarai guru lalu menyusun Word bagian A–G (data, perencanaan,
  pelaksanaan, keberhasilan, tantangan, rencana perbaikan, dukungan); kerangka dicek saat ekspor. Pengingat kewajiban
  muncul di awal percakapan dan di peta perangkat mulai 21 hari sebelum akhir semester sampai Word-nya dibuat.
- 0.17.0 — **Administrasi wali kelas** (`buat_administrasi_wali_kelas`): satu Excel berisi struktur organisasi kelas
  (nama dipilih dari daftar pilihan), jadwal piket (rata per hari sekolah, laki-laki/perempuan bercampur), denah tempat
  duduk (urut absen/acak/selang laki-laki-perempuan), dan kesepakatan kelas berkalimat positif. **Pembagian kelompok**
  (`buat_kelompok`): acak, laki-laki/perempuan seimbang, atau campuran kemampuan dari buku nilai (nilai tidak dicetak),
  siswa yang tidak hadir dikecualikan. **Analisis butir soal** (`buat_analisis_butir_excel`): guru mengisi kunci dan
  jawaban siswa, Excel menghitung skor, nilai, ketuntasan, tingkat kesukaran, daya beda (kelompok atas/bawah 27%),
  sebaran pilihan/pengecoh, dan keputusan tiap soal (kriteria Arikunto); jawaban salah otomatis merah. Nama siswa diisi
  alat dari Daftar Siswa ke folder `4 Administrasi` yang terkunci; asisten hanya menerima jumlah.
- 0.16.1 — Panduan pemasangan model pihak ketiga dihapus dari README-PASANG.
- 0.16.0 — **Ingatan lintas sesi** (pola Hermes Agent): asisten mengingat guru di sesi berikutnya. Ingatan inti kecil
  (`guru/ingatan/tentang-guru.md` 1.500 karakter, `catatan-kerja.md` 2.200 karakter, `pengingat.md`, plus aturan aktif
  `guru/preferensi.md`) dimuat otomatis ke setiap sesi lewat hook `context` plugin, satu salinan per sesi. Alat `ingat`
  (tambah/ganti/hapus/catat_riwayat) dipanggil asisten tanpa diminta; menolak nomor identitas, kunci API/kata sandi,
  pola injeksi, karakter tersembunyi, dan nama siswa bila `privasi.nama_ke_ai` bukan `true`; batas ukuran memaksa
  merangkum; panggilan paralel diantrekan dan ditulis atomik. Pengingat bertanggal disampaikan saat asisten dibuka
  (mulai 7 hari sebelumnya). Arsip riwayat `riwayat.db` (SQLite FTS5; cadangan `riwayat.md`) mencatat otomatis setiap
  dokumen yang dibuat alat, dicari dengan alat `cari_ingatan`. Folder ingatan dikunci dari edit langsung.
- 0.15.0 — **Pendamping PPG** untuk guru yang mengikuti PPG bagi Guru Tertentu, sesuai Petunjuk Teknis UKPPPG 2026: skill
  `pendamping-ppg` (perintah `/ppg`) menuntun perangkat Ujian Kinerja 2 JP dari ide dan kelas guru sendiri (aturan
  integritas juknis: perangkat hasil pengembangan sendiri, video direkam khusus, ujian tertulis dikerjakan mandiri),
  skenario video (rundown per menit, rencana video edit ±30 menit yang memperlihatkan ketujuh aspek), dan latihan PCK,
  SJT berbobot 1–5, serta uraian reflektif dengan umpan balik per empat komponen. Alat `berkas_ppg` membuat Word
  checklist UKPPPG (ketentuan perangkat, video, unggah, perangkat dan ruang ujian tertulis) dengan nama berkas resmi
  terisi nama dan NIM guru; alat `periksa_perangkat_ppg` memeriksa draf perangkat terhadap tujuh aspek ruang lingkup
  penilaian Ujian Kinerja, durasi 2 JP, dan instrumen asesmen. Folder hasil baru: `7 PPG`.
- 0.14.0 — Untuk guru yang baru pertama kali mengajar: alat `acuan_jp` (JP per minggu tiap mapel dari struktur kurikulum
  resmi Permendikdasmen 13/2025) dipakai bila guru belum tahu JP — sebelumnya model menebak; alat `libur_nasional` (libur
  nasional dan cuti bersama resmi SKB 3 Menteri 2026 dan 2027) dipakai untuk kalender perkiraan bila sekolah belum memberi
  kalender — sebelumnya libur Idulfitri dan lainnya terlewat sehingga minggu efektif terhitung terlalu banyak. Skill
  pendamping menampilkan daftar dokumen yang perlu disiapkan guru (dengan tanda mana yang dibuatkan asisten). Data
  kokurikuler dengan nama berkas berspasi tetap dikenali.
- 0.13.1 — Dari uji E2E mapel lain (Bahasa Indonesia kelas 2, IPAS kelas 5, Pendidikan Pancasila kelas 3): mode "jalankan
  semua" kini selalu mengunduh buku resmi tiap mapel sebelum membuat bahan ajar; aturan kejujuran sumber (halaman buku
  hanya dikutip bila benar-benar memuat isinya, jika buku tidak membahas topik ditulis terus terang); `daftar_siswa`
  menemukan otomatis berkas Dapodik yang sudah dipindah ke folder terkunci.
- 0.13.0 — **Pendamping guru awam**: alat `cek_kesiapan` memeriksa bahan sebelum membuat modul, soal, perencanaan, buku
  nilai, daftar hadir, kokurikuler, atau analisis — apa yang sudah ada, apa yang kurang, mana yang bisa diambilkan otomatis
  (CP resmi, buku resmi, susun ATP, buat buku nilai) dan mana yang perlu dari guru (dengan langkah Windows sederhana).
  Skill `pendamping-guru` (dan perintah `/bingung`): satu langkah per pesan, istilah dijelaskan dengan bahasa awam, pilihan
  bernomor, minta izin sebelum mengambilkan bahan, pesan GAGAL diterjemahkan menjadi langkah, lalu permintaan awal
  dilanjutkan otomatis setelah bahan lengkap. Asisten tidak lagi membuat dokumen dari bahan wajib yang belum ada.
- 0.12.1 — Bawaan kebijakan sekolah `privasi.nama_ke_ai` menjadi `true`: analisis siswa menyebut nama (untuk model AI
  berbayar yang tidak menyimpan data). Sekolah yang gurunya memakai model gratis mengubahnya ke `false`. Pembaruan paket
  tidak menimpa `sekolah/kebijakan.json` yang sudah ada.
- 0.12.0 — **Analisis siswa** (`analisis_siswa`): guru cukup bertanya "Budi kurangnya di mana?" atau "siapa yang perlu
  remedial TP3?". Alat membaca buku nilai, daftar hadir, dan penilaian kokurikuler yang sudah diisi guru di komputer guru,
  lalu memberi asisten data anak itu berlabel nomor absen: nilai tiap TP dibanding batas tuntas dan rata-rata kelas,
  STS/SAS/nilai rapor, TP terkuat/terlemah, kehadiran per bulan, kokurikuler. Analisis kelas memakai nomor absen dan
  menyimpan laporan Excel lengkap dengan nama di folder administrasi (terkunci dari asisten). Nama dicocokkan lokal
  (nama sebagian, nama ganda ditanyakan). Sekolah dengan persetujuan orang tua dan model AI yang tidak menyimpan data
  dapat mengaktifkan `privasi.nama_ke_ai` di kebijakan sekolah.
- 0.11.0 — **Format standar BSKAP** (Panduan Pembelajaran dan Asesmen Edisi Revisi 2025) sebagai bawaan bila sekolah tidak
  punya template: (1) RPM/RPP/Modul Ajar mengikuti contoh perencanaan SD Lampiran 7 — Identifikasi Murid, Dimensi Profil
  Lulusan (8 kotak centang), Tujuan Pembelajaran, Praktik Pedagogik, Mitra Pembelajaran, Lingkungan Pembelajaran,
  Pemanfaatan Digital, Langkah Pembelajaran (memahami–mengaplikasi–merefleksi), Asesmen dan Tindak Lanjut (tabel
  Memenuhi/Belum Memenuhi + rencana tindak lanjut); ekspor Word memeriksa bagian yang belum ada. (2) KKTP bawaan berbentuk
  Kriteria | Memenuhi | Belum Memenuhi (Lampiran 5 dan 7); rubrik 4 tingkat tetap tersedia bila sekolah memintanya.
  (3) Buku nilai Excel punya kolom **Draf Deskripsi Rapor** otomatis bergaya contoh rapor BSKAP ("Ananda sudah mampu …
  Ananda masih perlu bimbingan/penguatan dalam …") dari TP tertinggi dan terendah, dengan frasa TP yang bisa diubah di
  lembar Keterangan TP; catatan T/R untuk impor e-Rapor dan opsi rapor tanpa angka untuk Fase A. Template sekolah tetap
  diutamakan.
- 0.10.0 — **Daftar Siswa otomatis**: guru cukup menaruh berkas yang sudah ada (ekspor daftar peserta didik Dapodik,
  format nilai e-Rapor, daftar hadir lama yang berisi nama, atau CSV) di `guru/masukan`. Alat mengenalinya, menyaring
  rombel kelas guru, menyimpannya sebagai `hasil/4 Administrasi/Daftar Siswa.xlsx`, dan memindahkan berkas sumber ke
  folder yang terkunci dari asisten. Daftar hadir, buku nilai, dan penilaian kokurikuler kini terisi nama otomatis — tidak
  perlu mengetik ulang tiap bulan. Bila Daftar Siswa belum ada, dibuat otomatis dari Excel administrasi lama yang sudah
  berisi nama. Alat baru `daftar_siswa` (ringkasan jumlah, impor, ganti untuk siswa pindahan). Privasi diperketat: nama
  tidak pernah muncul di jawaban alat; asisten tidak bisa membaca berkas di folder administrasi, Excel penilaian
  kokurikuler, dan isi `guru/masukan` secara langsung (hanya lewat alat), dan pencarian isi berkas (grep) dimatikan;
  Word/PDF yang memuat NISN tidak ditampilkan.
- 0.9.2 — Media ajar interaktif HTML (0.9.0–0.9.1) ditiadakan; isi paket kembali sama dengan 0.8.0. Media tetap bisa
  dibuat sebagai kartu Word (blok `kartu` di `Media.md`).
- 0.8.0 — **Siapkan semua** (`/siapkan`, `/status`): guru menaruh dokumen sekolah (PDF teks, Word, Excel) di `guru/masukan`;
  asisten membaca dan mengenalinya (kalender, jadwal, CP, ATP, KKTP, format RPP/modul, buku), menyimpannya ke tempat yang
  benar, lalu menyusun perangkat tahap demi tahap dengan laporan "selesai / perlu dicek / berikutnya" — atau otomatis
  dengan "jalankan semua". Alat `baca_masukan` (Word → Markdown, Excel → tabel dengan tanggal) dan `status_perangkat`
  (peta perangkat dari berkas yang ada, penanda [PERLU GURU], dan langkah berikutnya sesuai ketergantungan dan tanggal).
  Bahan ajar dibuat bergulir untuk TP 2 minggu ke depan. CP versi lama dari dokumen sekolah dikenali dan ditawarkan
  pengganti CP 2025. Format RPP sekolah dipakai bila ada template bernama RPP.
- 0.7.0 — Melengkapi dokumen guru SD:
  - **Kokurikuler** (pengganti P5, Permendikdasmen 13/2025 dan Panduan Kokurikuler 2025): `/kokurikuler` untuk rencana
    tahunan, perencanaan kegiatan, jurnal, lembar pembiasaan 7 KAIH, dan Excel penilaian per dimensi profil lulusan yang
    menyusun draf deskripsi rapor otomatis.
  - **Kurikulum Satuan Pendidikan (KSP, dulu KOSP)**: draf 5 komponen sesuai Panduan Pengembangan KSP 2025 dan struktur
    kurikulum SD dari Permendikdasmen 13/2025.
  - **CP otomatis** (`ambil_cp`): CP resmi diambil dari PDF Keputusan Kepala BSKAP 046/H/KR/2025 bila CP sekolah belum
    diisi (status OTOMATIS-RESMI, dokumen tetap berlabel DRAF sampai diverifikasi). CP agama tidak didukung.
  - `/kalender` dan `/jadwal`: kalender pendidikan dan jadwal pelajaran kelas dalam Word (cek bentrok dan JP).
  - KKTP tersambung ke buku nilai: batas tuntas per TP dan kolom "TP Belum Tuntas" untuk remedial; cakupan STS/SAS dari Promes.
  - Media siap cetak: kartu besar dengan garis potong (blok `kartu`).
- 0.6.0 — Format Word milik guru, disimpan di `guru/` dan dipakai setiap ekspor berikutnya. (1) Gaya tampilan lewat chat
  atau `/format` (huruf, ukuran, spasi, margin, kertas, kop, tanda tangan, tabel, nomor halaman), untuk semua dokumen atau
  per jenis dokumen, bisa dibatalkan. (2) Kerangka bagian per jenis dokumen di `guru/template/<Dokumen>.md`. (3) Word contoh:
  Word milik guru atau Word hasil asisten yang sudah diedit guru menjadi dasar ekspor (gaya, kop di header, footer, ukuran
  halaman). Sekolah bisa memberi gaya bawaan, mengunci bagian tertentu, dan mewajibkan Word contoh sekolah.
- 0.5.0 — Perintah `/buku` dan alat `unduh_buku`: mencari Buku Siswa dan Panduan Guru Kurikulum Merdeka di katalog SIBI
  untuk kelas guru (mapel dari profil, sebutan seperti PAI/PPKn dikenali, edisi revisi diutamakan), lalu mengunduhnya ke
  `guru/buku/` setelah guru setuju. Asisten menawarkan unduhan saat pustaka kosong dan setelah `/mulai`.
- 0.4.0 — Riset materi dari sumber tepercaya. Alat `baca_buku` membaca dan mencari isi PDF buku resmi di
  `sekolah/referensi/buku/` dan `guru/buku/` (pdf.js disertakan, tanpa unduhan tambahan), lengkap dengan nomor halaman
  cetak. Alat `riset_materi` mencari di web tetapi hanya memakai situs tepercaya yang ditetapkan sekolah
  (`riset` di `sekolah/kebijakan.json`), dan bisa menyimpan PDF resmi ke pustaka guru. Skill `riset-materi`; modul, RPM,
  dan kunci jawaban kini mencantumkan bagian Sumber, dan isi tanpa sumber ditandai `[PERLU GURU]`.
- 0.3.0 — Untuk OpenCode 2 (OpenCode 1 tidak didukung lagi). Alat dipindah dari `.opencode/tools/` ke plugin
  `.opencode/plugins/asisten-guru.ts` tanpa paket npm. Konfigurasi dan izin memakai format OpenCode 2. Berkas yang disimpan
  Notepad Windows (BOM, CRLF), jalur dengan backslash, dan karakter yang dilarang Windows di nama berkas kini ditangani.
  Pemasang satu perintah (`pasang.ps1`, `pasang.sh`): guru cukup menempel link GitHub di OpenCode dan meminta dipasangkan.
  Perintah `/perbarui` dan skill `kelola-asisten` untuk cek versi, pembaruan aman (data guru dan sekolah tidak disentuh,
  paket lama dicadangkan), cadangan, dan pindah laptop. Versi paket kini di `.opencode/paket.json` dan `VERSI.md`.
- 0.2.0 — Agent "Asisten Guru" dengan menu slash; alat deterministik untuk minggu efektif, ATP/Prota/Promes, agenda
  harian, serta ekspor Word dan Excel tanpa perlu memasang program tambahan. Skill baru: modul-ajar, asesmen,
  administrasi-harian. Profil kini `guru/profil.json` dan `guru/kalender.json`. Kebijakan angka di `sekolah/kebijakan.json`.
- 0.1.0 — rilis awal untuk uji coba Matematika Kelas 4 (Fase B).
