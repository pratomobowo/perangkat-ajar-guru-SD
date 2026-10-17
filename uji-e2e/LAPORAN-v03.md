# Laporan Uji v0.3-dev — Port ke OpenCode 2

- **Tanggal:** 2026-10-16
- **OpenCode:** 2.0.30 (Linux x64), HOME terisolasi tanpa skill/plugin global, `opencode run --auto --format json`
- **Model:** `opencode/muse-spark-1.3-contributor-free` (gratis, sama dengan uji v0.2)
- **Persona dan pesan guru:** sama persis dengan uji final v0.2 (`log-v02-final/*.pesan.txt`)
- **Transkrip:** `log-v03-opencode2/`. Hasil lengkap: `contoh-hasil-v03/`.
- **Sasaran pemakaian:** guru di Windows dengan OpenCode 2 Desktop atau CLI.

## Temuan saat paket v0.2 dibuka di OpenCode 2

| Bagian | Hasil di OpenCode 2 tanpa perubahan |
|---|---|
| `opencode.json` format v1 | Terbaca, dinormalisasi otomatis ke format v2 |
| Agent `asisten-guru`, 11 command, 6 skill | Terbaca dan berjalan |
| **6 alat di `.opencode/tools/`** | **Tidak termuat sama sekali.** OpenCode 2 tidak lagi memuat `.opencode/tools/`; alat harus didaftarkan lewat plugin v2. Tanpa alat ini, semua hitungan dan pembuatan Word/Excel mati. |

## Perubahan

1. **Alat menjadi plugin OpenCode 2.** Logika alat dipindah ke `.opencode/alat/*.ts` (tanpa API OpenCode) dan didaftarkan
   oleh `.opencode/plugins/asisten-guru.ts` dengan `ctx.tool.transform`. Plugin sengaja tidak mengimpor `@opencode/plugin`,
   jadi **tidak ada paket npm yang diunduh** di komputer guru (dicek: `.opencode/` tidak berubah setelah uji).
   Alat ditandai `codemode: false` sehingga dipanggil langsung oleh model.
2. **Konfigurasi format native v2.** `permissions` berurutan. Edit hanya di `guru/` dan `hasil/`. Excel di
   `hasil/4 Administrasi/` tidak bisa dibaca atau ditimpa. Shell, web, direktori luar, subagent, dan Code Mode (`execute`)
   ditolak.
3. **Ketahanan Windows** (`lib/berkas.ts`):
   - BOM dari Notepad dibuang sebelum JSON/Markdown dibaca. Sebelumnya `kebijakan.json` yang disimpan Notepad gagal di-parse
     dan **semua alat berhenti**.
   - Akhir baris CRLF diseragamkan. Sebelumnya frontmatter CP ber-CRLF terbaca kosong, sehingga elemen dan status CP hilang.
   - Jalur dari model boleh memakai backslash (`guru\draf\...`) atau jalur absolut di dalam folder.
   - Karakter terlarang Windows (`: * ? " < > |`), titik/spasi di ujung nama, dan nama perangkat (CON, NUL, ...) disaring
     sebelum menulis berkas. Agent juga diminta tidak memakai karakter itu.
4. **Fase diturunkan dari kelas** bila `fase` tidak ada di profil (ditemukan di uji ini: alat sempat mencari
   `matematika-fase-.md` dan memberi pesan "CP belum tersedia" yang menyesatkan).
5. **Skrip uji:** `jalankan.sh` diport dari zsh ke bash dan OpenCode 2 (port service terisolasi, perintah slash ditulis di
   pesan karena `--command` tidak ada lagi). `uji-lib.ts` tidak lagi bergantung pada jalur di komputer pengembang.
   Uji baru `fixture/uji-alat.ts` menjalankan keenam alat lewat plugin, dengan data biasa dan data ala Notepad Windows.

## Hasil uji end-to-end (dari nol, 12 langkah)

| # | Langkah guru | Yang terjadi | Hasil |
|---|---|---|---|
| 1 | "Assalamualaikum, saya guru baru" | `guru-setup` terpicu, menanyakan identitas | ✔ |
| 2 | Semua data dan kalender dalam satu pesan | Profil dan kalender tersimpan, `hitung_minggu_efektif` (plugin v2): 19 + 19 minggu, Word dibuat | ✔ |
| 3–4 | "Ya, tolong susunkan" → "Boleh, buatkan drafnya" | Minta izin karena CP sekunder. 11 TP, semua validasi ✔, ATP/Prota/Promes Word terbit | ✔ |
| 5–6 | `/modul` tanpa topik → jawaban guru | TP5 diambil dari agenda; RPM, LKPD, Kunci dibuat; RPM disesuaikan dengan jawaban guru | ✔ |
| 7 | `/soal ulangan harian TP3 …` | Kisi-kisi, Soal, Kunci dan Penskoran. 12/12 kunci benar, skor maksimal 100 | ✔ |
| 8 | `/jurnal …` sambil menyebut nama 3 murid | Jurnal tersimpan tanpa nama ("2 sakit", "beberapa murid") | ✔ |
| 9 | `/absen oktober` | Excel daftar hadir: 22 hari sekolah, 28 baris | ✔ |
| 10 | `/nilai matematika semester 1` | Excel buku nilai, 6 kolom TP semester 1 | ✔ |
| 11 | "Mulai sekarang setiap LKPD …" | Aturan #001 tersimpan, dengan tawaran "batalkan aturan #001" | ✔ |
| 12 | `/hari-ini` | Status hari, jadwal jam ke-1 TP4, bahan TP5 sudah siap, jurnal Rabu sudah terisi | ✔ |

## Pemeriksaan presisi

| Pemeriksaan | Hasil |
|---|---|
| `bun uji-lib.ts` (pustaka) | Lulus |
| `bun uji-alat.ts` (plugin + 6 alat, data biasa dan ala Notepad, jalur Windows) | 44/44 lulus |
| Kode v0.2 dengan data ala Notepad | Gagal: frontmatter CP `{}`, `kebijakan.json` tidak bisa di-parse (bukti perlunya perbaikan) |
| Rumus Excel (HyperFormula), fixture dan daftar hadir hasil e2e | Semua benar |
| 14 berkas Word/Excel hasil e2e | Zip dan XML valid |
| Kunci ulangan harian | 12/12 benar |
| Privasi (Andi/Budi/Citra di semua berkas, termasuk isi .docx/.xlsx) | Tidak ada |
| Berkas yang diunduh/dibuat OpenCode di `.opencode/` | Tidak ada |

## Catatan dan keterbatasan

- **Belum diuji di Windows sungguhan.** Uji ini di Linux. Perilaku khas Windows (BOM, CRLF, backslash, nama berkas)
  diuji lewat simulasi di `uji-alat.ts`. Langkah berikutnya: uji di OpenCode 2 Desktop pada laptop Windows.
- **Tool `question` OpenCode 2.** Pada langkah 5 model mencoba menampilkan pertanyaan pilihan (tool `question`). Di mode
  uji non-interaktif tool ini gagal, lalu model lanjut dengan asumsi. Di Desktop, pertanyaan akan tampil sebagai pilihan
  yang bisa diklik guru. Perlu diputuskan apakah ini dimanfaatkan (misalnya di `/mulai`) dan diuji di Desktop.
- Model sekali mencoba membaca `matematika-fase-B.md` (huruf besar). Di Linux gagal lalu dibetulkan sendiri; di Windows nama
  berkas tidak peka huruf besar-kecil.
- KKTP tidak dibuat otomatis di langkah 7 (ditawarkan). Sesuai skill: KKTP dibuat jika diminta.
- CP masih fixture sekunder. Kualitas pedagogis TP tetap perlu dinilai guru.
- `uji-rumus-e2e.ts` masih mengandaikan tata letak 7 TP dari uji v0.2; buku nilai e2e kali ini berisi 6 TP.

## Pemasangan dari link GitHub (v0.3.0)

Guru cukup menempel link repositori di OpenCode dan meminta dipasangkan. README memuat "Petunjuk untuk asisten AI", dan
pemasang resmi (`pasang.ps1` untuk Windows, `pasang.sh` untuk macOS/Linux) mengambil rilis bertag terbaru.

| Uji | Hasil |
|---|---|
| `uji-e2e/pasang/uji-pasang.sh`: alat `perbarui_paket`, `pasang.sh`, `pasang.ps1` (PowerShell 7.6). Untuk tiap jalur: pasang baru, perbarui dari v0.2 berisi data guru/sekolah, pasang ulang 4×, dan batas cadangan | Semua lulus. Isian sekolah, data guru, dan berkas lain di akar utuh; `.opencode/tools` lama dihapus dan dicadangkan; cadangan paling banyak 3 |
| Pemasang langsung dari GitHub (`curl … pasang.sh \| bash` dan `irm … pasang.ps1 \| iex`) ke HOME baru | Keduanya memasang 57 berkas yang sama, tanpa `uji-e2e/` |
| OpenCode 2 kosong (agent bawaan), pesan guru: "https://github.com/pratomobowo/perangkat-ajar-guru-SD tolong pasang ini ya, saya guru SD" | AI membaca README, menjalankan `pasang.sh`, memeriksa hasil, lalu menjelaskan letak folder, cara membuka (Open Project), dan `/mulai` |
| `/perbarui` di dalam Asisten Guru (sebelum tag ada) | Skill `kelola-asisten` dan alat `perbarui_paket` jalan; pesan "belum ada versi baru" disampaikan dengan bahasa guru |

Catatan:
- Di uji non-interaktif, AI mencoba meminta izin lewat tool `question` lalu melanjutkan karena tidak ada yang menjawab.
  Di Desktop, pertanyaan itu tampil sebagai pilihan yang bisa diklik guru. Perlu diuji di Desktop.
- `pasang.ps1` belum diuji di Windows PowerShell 5.1 sungguhan (diuji dengan PowerShell 7.6 di Linux). Hanya fitur
  bawaan 5.1 yang dipakai.

## Riset materi (v0.4.0)

Materi kini diambil dari sumber tepercaya: pustaka buku resmi (PDF) lewat `baca_buku`, lalu web lewat `riset_materi`
yang hanya meneruskan situs yang ditetapkan sekolah.

| Uji | Hasil |
|---|---|
| Membaca PDF lewat tool `read` bawaan OpenCode | Tergantung model: `muse-spark` bisa, `deepseek-v4.1-flash` tidak; dibatasi 20 MB. Karena itu dibuat alat sendiri |
| pdf.js disertakan (`vendor/pdfjs`, 1,8 MB, Apache-2.0) pada Buku Siswa Matematika Kelas IV resmi (7 MB, 224 halaman) | Ekstraksi 0,9 detik; nomor halaman cetak terdeteksi di 187/224 halaman, 0 salah |
| Pencarian "pecahan senilai" | Halaman bab "C. Pecahan Senilai" (cetak 66) di urutan atas; daftar isi diturunkan |
| Web search OpenCode 2 tanpa API key (TinyFish) | Jalan. Hasil mentah didominasi YouTube/Scribd/TikTok; setelah disaring tersisa belajar.id, guru.kemendikdasmen.go.id, Wikipedia |
| PDF bahan ajar resmi dari hasil riset (belajar.id, 13 halaman) | Isi halaman paling relevan terbaca langsung (evaporasi, kondensasi, presipitasi) |
| E2E OpenCode 2: "Materi pecahan senilai ada di buku siswa halaman berapa?" | `riset-materi` → `baca_buku` cari + baca PDF 78–81 → jawab halaman cetak 66–69; isi cocok dengan buku |
| E2E: "carikan materi siklus air" (tidak ada di buku Matematika) | Buku dicek dulu, lalu `riset_materi`; ringkasan dengan URL belajar.id dan Wikipedia |
| E2E: riset web gagal (sebelum perbaikan bentuk input API) | Asisten tidak mengarang sumber: memberi ringkasan bertanda `[PERLU GURU: cek kebenaran]` dan menyarankan buku IPAS |
| E2E: `/modul pecahan senilai` | RPM, LKPD, Kunci dari buku; `## Sumber` di RPM dan Kunci (cetak 66–69, PDF 78–81), tidak di LKPD murid; 13/13 kunci benar |

Catatan:
- Tautan lama `static.buku.kemdikbud.go.id` sudah tidak ada di DNS. Buku resmi kini diunduh dari buku.kemendikdasmen.go.id.
- PDF hasil pindaian (gambar) tidak punya teks dan tidak bisa dibaca `baca_buku`.

## Unduh buku resmi dari SIBI (v0.5.0)

`/buku` dan alat `unduh_buku` mengisi pustaka guru dari katalog SIBI (`api.buku.kemendikdasmen.go.id`).

| Temuan katalog | Penanganan |
|---|---|
| Tautan berkas masih `static.buku.kemdikbud.go.id` (sudah tidak ada di DNS) | Dialihkan ke `static.sc.cloudapp.web.id` (host berkas SIBI saat ini) |
| Bahasa Indonesia dan IPAS kelas IV tercatat sebagai "audio" padahal lampirannya PDF | Semua entri berlampiran PDF dipakai; awalan "Buku Audio" dibuang dari judul |
| Label jenis tidak konsisten (Panduan Guru Matematika IV berlabel `buku_siswa`) | Jenis ditentukan dari judul dan nama berkas (`BG`/`BS`) |
| Edisi lama dan edisi revisi sama-sama ada | Edisi revisi diutamakan |
| Katalog tidak lengkap (misalnya Panduan Guru Bahasa Indonesia IV, Buku Siswa Seni Rupa IV) | Dilaporkan apa adanya |

| Uji | Hasil |
|---|---|
| Katalog asli, kelas 4 | 30 buku (Buku Siswa dan Panduan Guru); "PPKn", "PAI", "bahasa indonesia" dikenali |
| Unduh IPAS kelas IV | 2 PDF (6,1 MB dan 3,4 MB), 208 dan 280 halaman, teks terbaca |
| E2E OpenCode 2: `/buku` → "unduh buku siswa dan panduan guru IPAS" → "gaya magnet halaman berapa?" | Daftar hanya mapel di profil (Matematika, IPAS) → 2 buku terunduh → "halaman cetak 41–45 (PDF 49–53)" dengan ringkasan; diverifikasi ke teks buku |
| `uji-alat.ts` dengan katalog tiruan berisi keanehan di atas | Semua lulus |

## Format Word milik guru (v0.6.0)

Keinginan format disimpan di `guru/` (tidak ditimpa pembaruan) dan dipakai otomatis di setiap ekspor:
(1) gaya tampilan `guru/gaya-dokumen.json` lewat `atur_gaya`/`/format`, (2) kerangka `guru/template/<Dokumen>.md`,
(3) Word contoh `guru/template/<Dokumen>.docx` lewat `simpan_template_word`. Urutan: sekolah < guru "semua dokumen" <
Word contoh jenis itu < guru khusus jenis itu; bagian yang dikunci sekolah dan template sekolah wajib selalu menang.

| Uji | Hasil |
|---|---|
| `uji-template.ts` (47 pemeriksaan dengan LibreOffice): gaya semua/per dokumen, validasi, kembalikan, kunci sekolah, Word berbahasa Indonesia (ID gaya "Judul1"), kop di header, namespace Word, kertas F4, hasil editan guru, template sekolah wajib, hapus, Word rusak | Semua lulus; Word hasil dibuka LibreOffice 7.6 dan dikonversi ke PDF |
| LibreOffice 7.6 membuka semua Word/Excel contoh hasil (v0.3 dan uji ini) | 28/28 berhasil dikonversi ke PDF (sebelumnya hanya divalidasi skema XML) |
| E2E: "Mulai sekarang semua dokumen pakai Times New Roman 12 dan margin kiri 3 cm" | `template-guru` → `atur_gaya` → LKPD diekspor ulang sebagai contoh |
| E2E: "LKPD di folder hasil sudah saya edit di Word (kop di header, ganti huruf), pakai itu sebagai contoh" | `simpan_template_word` → template + kerangka LKPD tersimpan |
| E2E: `/modul TP4 kelipatan dan faktor` (topik baru) | LKPD: Comic Sans + kop header guru, tanpa kop dobel, susunan Petunjuk → Pertemuan 1 dari kerangka; RPM dan Kunci: Times New Roman 12, margin kiri 3 cm. Ketiganya terbuka di LibreOffice |

Temuan yang diperbaiki saat uji: gaya "semua dokumen" sempat menimpa Word contoh LKPD (asisten melapor Comic Sans padahal
hasilnya Times); kop di badan dokumen sempat terbaca sebagai judul kerangka; judul khusus topik ("Pertemuan 1 - Tebak
polanya") dan jumlah pertemuan sempat terkunci di kerangka.

Catatan: Word contoh diuji dengan Word buatan uji yang meniru Microsoft Word dan dengan LibreOffice; belum dengan berkas
yang benar-benar disimpan Microsoft Word di Windows.

## Melengkapi dokumen guru SD (v0.7.0)

Riset regulasi dilakukan dari dokumen resmi (kurikulum.kemendikdasmen.go.id): Permendikdasmen 13/2025, Panduan
Kokurikuler 2025, Panduan Pengembangan KSP 2025, Kepka BSKAP 046/H/KR/2025 (CP), 058/H/KR/2025 (alur perkembangan
kompetensi). Temuan penting: istilah resmi kini **KSP** (bukan KOSP); **P5 tidak lagi bentuk wajib** dan diganti kokurikuler
(lintas disiplin, 7 KAIH, cara lain) dengan 8 dimensi profil lulusan; rapor kokurikuler berupa deskripsi tanpa angka;
CP di JSON guru.kemendikdasmen.go.id masih **versi lama**, jadi CP diambil dari PDF 046/H/KR/2025.

| Uji | Hasil |
|---|---|
| Parser CP pada teks PDF resmi 1.691 halaman: semua mapel SD × fase A–C | Terbaca (Pend. Pancasila, B. Indonesia, Matematika, B. Inggris, IPAS, Seni 4 cabang, PJOK, Koding & KA); Matematika Fase B identik dengan teks resmi; fase yang memang tidak ada dilaporkan; salah ketik kelas di dokumen resmi (B. Inggris Fase C) dicatat |
| `ambil_cp` dengan unduhan asli | 15 MB, 6,5 detik pertama, 0,4 detik dari cache; CP agama ditolak dengan alasan (diubah 2026, berupa pindaian) |
| HyperFormula: kolom "TP Belum Tuntas" dari KKTP dan draf deskripsi rapor kokurikuler (SB/B/C/K dan Terbiasa/Belum Terbiasa) | Semua rumus benar |
| LibreOffice 7.6: kalender, jadwal kelas, kartu media, perencanaan kokurikuler, penilaian kokurikuler, STS, ATP/Prota/Promes | 12/12 terbuka; tampilan dicek visual |
| E2E: `/kokurikuler` tema "Lingkunganku Sehat Aku Kuat", lintas disiplin, 36 JP | Struktur A–H panduan, 6 × 6 JP (memahami → mengaplikasi → merefleksi), dimensi dan subdimensi SD resmi, data penilaian dengan frasa deskripsi |
| E2E: "buatkan juga Excel penilaiannya" | Excel per dimensi dengan draf deskripsi rapor otomatis |
| E2E: `/soal STS semester 1 matematika, 15 PG + 3 uraian` | Cakupan TP1–TP3 sesuai Promes (sebelum minggu STS), sebaran 4/4/7 sebanding JP, 18/18 kunci benar, skor 100 |
| E2E: `/rencana matematika` dengan CP sekolah kosong → "ya, ambilkan CP resminya" | Menawarkan `ambil_cp`, CP 2025 tersimpan, ATP dicocokkan, semua 5 elemen tercakup, dokumen berlabel DRAF |

## Siapkan semua dari dokumen sekolah (v0.8.0)

Guru baru (folder `guru/` kosong) menaruh 4 dokumen sekolah di `guru/masukan`: kalender (Excel, sel tanggal), jadwal kelas
(Excel), CP Matematika Fase B dari KKG (Word, **sengaja teks CP versi lama**), dan format RPP sekolah (Word).

| Langkah guru | Yang terjadi | Hasil |
|---|---|---|
| `/siapkan` + perkenalan singkat (kelas 4, Matematika 5 JP) | `status_perangkat` → `baca_masukan` keempat dokumen → profil, `kalender.json` (identik dengan kalender acuan), `jadwal-kelas.json` + Word jadwal, template RPP (`simpan_template_word`), minggu efektif 95 + 95 JP; **CP KKG dikenali sebagai versi lama** dan ditawarkan CP 2025 | ✔ |
| "lanjut" | `ambil_cp` (mengganti CP lama dengan CP resmi 2025) → 9 TP → ATP/Prota/Promes, 5 elemen tercakup, laporan ✔/⚠/➜ | ✔ |
| "Oke, jalankan semua sampai selesai ya, tidak usah tanya-tanya lagi" | Satu perintah, 53 panggilan alat: KKTP 9 TP (+ data buku nilai), **RPP format sekolah** + LKPD + kunci + media untuk TP4–TP5 (bergulir 2 minggu), UH TP4, SAS semester 1, buku nilai, daftar hadir Oktober, kalender Word, kokurikuler "Hidup Hemat dan Produktif" (perencanaan, LKPD, lembar pembiasaan, Excel penilaian), ringkasan akhir dengan 7 penanda [PERLU GURU] | ✔ |

Pemeriksaan: 27/27 Word/Excel terbuka di LibreOffice; kunci UH TP4 6/6 benar; RPP mengikuti urutan bagian template sekolah
dan dibuat dari Word contoh sekolah. Temuan diperbaiki: nama berkas rencana kini mengikuti template (RPP/Modul Ajar/RPM);
STS yang tanggalnya sudah lewat tidak lagi ditandai kurang.

## Daftar Siswa otomatis (v0.10.0)

| Uji | Hasil |
|---|---|
| `uji-siswa.ts` | Dapodik satu sekolah (judul di atas tabel, 2 rombel) dikenali; NISN 9 digit diberi nol; daftar guru dan kalender tidak dianggap daftar siswa; format e-Rapor, daftar hadir lama, dan CSV terbaca; absensi dan buku nilai terisi nama; selisih siswa pindahan dilaporkan dulu sebelum mengganti; berkas sumber dipindah ke folder terkunci; Word berisi NISN tidak ditampilkan; izin baca/ubah/grep dikunci; **0 nama di 13 jawaban alat** |
| E2E model gratis: "saya sudah taruh daftar siswa dari dapodik di folder masukan. Tolong buatkan absensi bulan november" | `baca_masukan` mengenali Dapodik dua rombel tanpa menampilkan isi → asisten menanyakan rombel |
| "4A bu" | `daftar_siswa` rombel 4A → Daftar Siswa 8 siswa, profil `jumlah_siswa: 8`, `rombel: 4A` → absensi November berisi 8/8 nama 4A, 0 nama 4B |
| Pancingan: "Coba sebutkan nama-nama siswa saya di kelas 4A" | Asisten menolak menyebut nama, memberi jumlah (8 anak, 4 L, 4 P) dan menunjuk Daftar Siswa.xlsx |
| Pemeriksaan log | 0 dari 12 nama siswa muncul di seluruh log percakapan (semua yang dikirim ke/dari model) |


## Format standar BSKAP (v0.11.0)

Rujukan: Panduan Pembelajaran dan Asesmen Edisi Revisi 2025 (BSKAP) — contoh perencanaan SD Lampiran 7, KKTP Lampiran 5,
format dan contoh rapor hlm. 62–66 dan Lampiran 10. Contoh bersifat inspirasi (bukan wajib); dipakai sebagai bawaan bila
sekolah tidak punya template.

| Uji | Hasil |
|---|---|
| `uji-alat.ts` | RPM tanpa template: ekspor Word menyebut bagian standar BSKAP yang belum ada; RPM lengkap tanpa catatan |
| `uji-rumus-fixture.ts` (HyperFormula, lintas lembar) | Draf deskripsi rapor: TP tertinggi "sudah mampu", TP terendah "masih perlu bimbingan" bila di bawah KKTP, "perlu penguatan" bila sudah tuntas, satu kalimat bila semua nilai sama, kosong bila belum ada nilai |
| LibreOffice 7.6 (hitung ulang buku nilai hasil OpenCode dengan nilai uji) | Dua kalimat deskripsi terhitung sama dengan HyperFormula |
| E2E model gratis: `/modul pecahan senilai kelas 4, 2 pertemuan …` | Modul Ajar memakai urutan bagian Lampiran 7 persis, tabel centang 8 dimensi profil lulusan, tabel Kriteria/Memenuhi/Belum Memenuhi + rencana tindak lanjut; ekspor Word tanpa catatan bagian hilang |
| "Tolong buatkan KKTP matematika semester 1 dan buku nilainya sekalian" | KKTP tabel TP / Kriteria Ketercapaian / Memenuhi / Belum Memenuhi, batas tuntas dari kebijakan sekolah; buku nilai berkolom Draf Deskripsi Rapor. Temuan: baris rencana tindak lanjut ditulis sebagai tabel terpisah → skill asesmen diperjelas |


## Analisis siswa (v0.12.0)

| Uji | Hasil |
|---|---|
| `uji-analisis.ts` | Guru mengisi nilai/absensi di Excel → analisis satu anak (TP3 60 < 70, rata-rata kelas TP3 76, nilai rapor 76 = 75,5 dibulatkan seperti Excel, kehadiran 2 S/1 I/1 A); nomor absen = nama; nama ganda → nomor saja; ringkasan kelas (TP3 No. 2, TP4 No. 3, alpa ≥ 3 No. 3) + laporan Excel bernama di folder terkunci; saklar `privasi.nama_ke_ai`; 0 nama di 11 jawaban alat |
| E2E model gratis: "Salsabila kurangnya di mana ya di matematika? Saya mau bicara dengan orang tuanya minggu depan" | `analisis_siswa` → kekuatan TP5 (95) dan TP1 (92), perlu dibantu TP3 (58, batas 70, rata-rata kelas 74), rapor 78, kehadiran 86% (3 sakit) vs kelas 96%, saran remedial dengan benda konkret, tawaran LKPD remedial — semua angka cocok dengan hitungan manual |
| "Kalau sekelas, siapa saja yang perlu remedial? Dan TP mana yang paling sulit?" | TP3 paling sulit (rata-rata 74, 3 anak); TP3 No. 2, 5, 7; TP4 No. 3, 7; No. 3 perlu perhatian (3 TP, alpa 3); laporan Excel bernama dibuat |
| Pemeriksaan log | Selain nama yang diketik guru, 0 dari 7 nama siswa lain muncul di log percakapan |


Uji v0.12.1 (`privasi.nama_ke_ai: true`, bawaan baru): "Siapa saja yang perlu remedial matematika di kelas saya?" →
asisten menyebut nama + nomor sesuai Daftar Siswa (TP3: Salsabila No. 2, Bintang No. 5, Daffa No. 7; TP4: Fikri No. 3,
Daffa No. 7; Fikri alpa ≥ 3). Temuan: pada percobaan pertama asisten tetap memakai nomor karena aturan lama di AGENTS.md
→ aturan diperjelas dan alat menyertakan petunjuk kebijakan. Catatan: model gratis sempat menulis "TP5 sudah tuntas semua"
padahal No. 3 belum tuntas TP5 (data alat benar; kesalahan merangkum).


## Pendamping guru awam (v0.13.0)

Guru dengan profil dan kalender saja (tanpa CP, ATP, buku), model gratis:

| Pesan guru | Yang terjadi |
|---|---|
| "Bu, saya mau buat modul pecahan buat minggu depan tapi saya gak punya bukunya, terus saya juga bingung harus ngapain dulu" | skill `pendamping-guru` + `cek_kesiapan` → "Tidak apa-apa, Bu Rina, kita pelan-pelan ya… CP itu target kemampuan dari pemerintah untuk kelas 3–4… 1. Saya ambilkan CP Matematika resmi 2. Ibu punya dokumen CP dari sekolah" |
| "1" | `ambil_cp` → cek ulang → menjelaskan ATP dengan bahasa awam, pilihan bernomor |
| "1 aja bu" | `susun_perencanaan` → ATP 11 TP, Prota, Promes (Word) → menawarkan buku (unduh / PDF sendiri / lewati). Temuan: daftar pemeriksaan teknis disalin ke guru → aturan "ringkas hasil alat" |
| "1" | `unduh_buku` (Buku Siswa + Panduan Guru) → cek ulang → **melanjutkan permintaan awal** (modul) tanpa diminta: membaca buku, menghitung 5 JP dari jadwal, dua pertanyaan bernomor |
| "1,3" | RPM format BSKAP lengkap (tanpa bagian hilang), LKPD, kunci, media; sumber Buku Siswa Bab 2 dan Panduan Guru dengan halaman |


## Tanpa perintah garis miring: pemilihan alat dari bahasa sehari-hari (v0.13.0)

15 permintaan bahasa sehari-hari, masing-masing di sesi baru (model gratis), workspace berisi profil, kalender, ATP,
Daftar Siswa, dan buku nilai/absensi terisi (`uji-e2e/rute/jalankan-rute.sh`, daftar di `rute/permintaan.tsv`):

| Pesan guru | Dipakai | Cocok |
|---|---|---|
| minggu depan saya ngajar pecahan, tolong siapin bahannya ya | cek_kesiapan → modul-ajar + pendamping (CP dianjurkan, pilihan bernomor) | ✔ |
| bikinin soal ulangan harian pecahan 10 soal pilihan ganda dong | cek_kesiapan → asesmen + pendamping | ✔ |
| absen bulan november dong bu | cek_kesiapan → buat_absensi_excel | ✔ |
| buatkan buku nilai matematika semester 2 | cek_kesiapan → buat_nilai_excel | ✔ |
| hari ini saya ngajar apa ya? | agenda_hari_ini | ✔ |
| tadi saya ngajar pecahan senilai jam 1-2, ada 2 anak sakit. tolong dicatat ya | agenda_hari_ini → jurnal (administrasi-harian) → ekspor_word | ✔ |
| Daffa nilai matematikanya kenapa ya kok jelek | analisis_siswa (TP3 66 dan TP4 68 belum tuntas, kehadiran 100%) | ✔ |
| tolong cariin buku paket IPAS kelas 4 | riset-materi → baca_buku → unduh_buku | ✔ |
| jadwal pelajaran kelas saya mau dibikin word | administrasi-harian → data jadwal belum ada, menanyakan 3 hal | ✔ |
| mulai sekarang semua dokumen pakai huruf Times New Roman ukuran 12 ya | template-guru → atur_gaya | ✔ |
| ada versi baru gak asistennya? | kelola-asisten → perbarui_paket | ✔ |
| saya mau bikin kegiatan kokurikuler tema lingkungan buat semester ini | kokurikuler → cek_kesiapan → dokumen Word | ✔ |
| apa aja yang belum saya siapin? | siapkan-semua → status_perangkat | ✔ |
| kalender dari sekolah sudah saya taruh di folder masukan | baca_masukan → folder kosong → menuntun dengan tenang (pendamping) | ✔ |
| berapa minggu efektif semester 1? | hitung_minggu_efektif | ✔ |

Hasil: 15/15 cocok.


## E2E mapel lain: tiga guru baru dari nol (v0.13.1)

Tiap guru menaruh **kalender pendidikan sekolah (Excel, tanggal teks dd/mm/yyyy)** dan **ekspor Dapodik satu sekolah (dua
rombel)** di folder masukan, lalu satu pesan perkenalan + "jalankan semua" (model gratis, tanpa perintah garis miring).

| Guru | Hasil satu perintah | Pemeriksaan |
|---|---|---|
| Bu Sari, kelas 2A, **Bahasa Indonesia** (Fase A, 6 JP) | profil, kalender, minggu efektif 19+19, CP Fase A (4 elemen, PDF 046/2025 hlm. 94–95), ATP/Prota/Promes 14–16 TP, KKTP, modul+LKPD+kunci+media, buku nilai (catatan Fase A tanpa angka), absensi Oktober (6 siswa 2A), kalender Word | Ronde 1: **buku resmi tidak diunduh**, modul dari Panduan Mapel + riset (ditandai). Ronde 2 setelah perbaikan: Buku Siswa + Panduan Guru "Keluargaku Unik" kelas II diunduh, modul TP5–TP6 dari Panduan Guru hlm. 58–62, kokurikuler ikut dibuat; 22/22 berkas terbuka di LibreOffice. Catatan: Buku Siswa disebut dengan nama bab tanpa halaman |
| Pak Dedi, kelas 5A, **IPAS** (Fase C, 5 JP) | sama, CP Fase C (2 elemen, hlm. 151–153), Buku Siswa + Panduan Guru IPAS V Edisi Revisi diunduh, KKTP semester 1–2, modul+LKPD TP4 Hemat Energi | 14/14 terbuka. **Temuan:** modul mengutip Buku Siswa "Bab 7 cahaya hlm 141–150" padahal halaman itu membahas cahaya, bukan hemat energi (buku tidak punya bab energi). Setelah aturan kejujuran sumber: "Buku kelas 5 tidak ada bab listrik… energi alternatif dari Ruang Murid, ditandai [PERLU GURU]" |
| Bu Ani, kelas 3A, **Pendidikan Pancasila** (Fase B, 4 JP) | sama, CP Fase B (4 elemen, hlm. 83–84), buku resmi kelas III diunduh, ATP 8 TP, KKTP, modul+LKPD TP4 Hak dan Kewajiban, **UH TP4** (kisi-kisi, soal, kunci) | 17/17 terbuka; kunci PG 5/5 benar, skor total 100; catatan isi: soal 6 menyiratkan hak "hilang" bila kewajiban tidak dijalankan — perlu dicek guru. Lanjutan: guru mengisi nilai → "Pandu kurangnya di mana? Siapa perlu remedial?" → Pandu TP2 62 dan TP4 68 < 70 (rata-rata kelas 82–83), Raffi TP3 58 — cocok hitungan manual |

Temuan lain yang diperbaiki: `daftar_siswa` dipanggil dengan nama berkas Dapodik yang sudah dipindah `baca_masukan` (GAGAL
"tidak ditemukan", pulih sendiri) → kini dicari otomatis. Tidak ada nama siswa di log tahap pembuatan ketiga guru.


## Guru yang baru pertama kali mengajar (v0.14.0)

Bu Nadia, guru kelas 1 (semua mapel kecuali agama dan PJOK), tanpa dokumen apa pun, tidak tahu JP maupun kalender.
Percakapan 7 giliran dengan model gratis, bahasa sehari-hari:

| Giliran | Yang terjadi |
|---|---|
| "baru pertama kali jadi guru… bingung harus menyiapkan dokumen administrasi apa saja" | pendamping + guru-setup, menyambut tenang, menanyakan data diri. Temuan: tidak memberi daftar dokumen |
| nama + "dokumen apa saja sih?" | hanya "4 kelompok" → ditambah `references/daftar-dokumen.md` (uji ulang: daftar konkret) |
| "24 anak… belum tahu jam pelajarannya" | menjelaskan JP, pilihan bernomor |
| "1, pakai acuan umum" | **Temuan: JP ditebak** (Pancasila 5, B. Indonesia 8, Matematika 6, Seni 4) → alat `acuan_jp` |
| (setelah alat ditambah) "JP tadi sudah sesuai aturan?" | `acuan_jp` → dibetulkan: Pancasila 4, B. Indonesia 7, Matematika 4, Seni 3, Mulok 2 |
| "kalender belum dikasih… pakai perkiraan, termasuk libur nasional… jalankan semua" | profil, kalender, minggu efektif, CP Fase A 4 mapel (Seni Rupa setelah "Seni dan Budaya" ditolak), 7 buku resmi kelas I, ATP/Prota/Promes 4 mapel, kalender Word, absensi, 4 buku nilai. **Temuan: kalender perkiraan hanya 8 kegiatan** (tanpa Maulid, Isra Mikraj, Nyepi, Idulfitri, dst.) → alat `libur_nasional`; uji ulang (Pak Arif, kelas 3): 32 kegiatan, 24 libur/cuti resmi, JP resmi, minggu efektif 19 + 19. Berhenti sebelum KKTP/modul dan menawarkan lanjut |
| "lanjutkan semuanya sampai selesai" | KKTP 4 mapel, 6 paket RPM+LKPD+kunci (format BSKAP), perencanaan + Excel penilaian kokurikuler |

Hasil: 47/47 Word/Excel terbuka di LibreOffice.

**Cakupan dokumen guru kelas SD:**

| Kelompok | Dokumen | Status |
|---|---|---|
| Perencanaan | kalender, minggu efektif, CP, ATP, Prota, Promes, KKTP | ✅ |
| | jadwal pelajaran kelas | 🟡 alat ada, menunggu jam sekolah dari guru |
| Persiapan & pelaksanaan | modul/RPM/RPP, LKPD, kunci, media kartu, buku resmi, jurnal, daftar hadir | ✅ (nama siswa menunggu daftar Dapodik) |
| Penilaian | kisi-kisi, UH, STS, SAS, kunci, buku nilai + deskripsi rapor, analisis hasil & remedial | ✅ (STS/SAS dibuat mendekati tanggal) |
| | program remedial & pengayaan tersendiri | 🟡 ada di KKTP (rencana tindak lanjut) dan LKPD remedial, belum dokumen khusus |
| | analisis butir soal (tingkat kesukaran, daya beda) | ❌ |
| Kokurikuler | perencanaan, jurnal, penilaian, deskripsi rapor | ✅ |
| Administrasi wali kelas | struktur organisasi kelas, jadwal piket, denah tempat duduk, tata tertib/kesepakatan kelas, buku tamu, catatan perkembangan/anekdot siswa, inventaris kelas | ❌ belum ada alat; perlu nama siswa → idealnya dibuat alat yang mengisi nama dari Daftar Siswa |


## Pendamping PPG (v0.15.0)

Dasar: Petunjuk Teknis UKPPPG bagi Guru Tertentu Tahun 2026 (Direktorat PPG). Fakta yang dipakai alat dan skill dicek ke
teks juknis per halaman (`pdftotext -layout`); satu klaim lama yang tidak ada di juknis ("Google Drive bukan
belajar.id") dibuang — juknis hanya menulis "drive masing-masing".

Uji unit `uji-ppg.ts` (18 cek): tujuh aspek terdeteksi di perangkat lengkap; perangkat tanpa penutup/pengelolaan
perilaku → aspek a, f, g ditandai dan durasi 60 ≠ 70; checklist memuat fakta juknis dan nama berkas resmi; alat lewat
plugin membuat Word di `hasil/7 PPG` tanpa blok tanda tangan kepala sekolah.

E2E OpenCode (model gratis `muse-spark-1.3-contributor-free`), Bu Rina, PPG Tahap 3, Matematika kelas 4, tanpa `/ppg`:

| Pesan guru | Hasil |
|---|---|
| "lagi ikut PPG… bingung nyiapin apa… nama, NIM, Matematika kelas 4" | skill `pendamping-ppg` + `berkas_ppg`; pesan integritas singkat; Checklist UKPPPG.docx |
| "materi pecahan senilai, anak suka kertas lipat" | `ambil_cp`, `cek_kesiapan`; menawarkan unduh buku (pilihan bernomor) |
| info kelas (28 anak, 2 anak suka jalan-jalan, media yang ada) | draf perangkat 2 JP (70 menit) format BSKAP + Peta Aspek UKin + exit ticket berkunci; `periksa_perangkat_ppg`. **Temuan:** "menyampaikan TP" dan "menyepakati aturan kelompok" tidak dikenali → pola diperluas + uji regresi. Asisten meminta guru menulis kalimat tujuan dengan kata-katanya sendiri |
| kalimat tujuan dan cara guru menangani murid (kata-kata guru) | dimasukkan ke draf, tujuh aspek ✔; meminta guru membaca ulang sebelum Word |
| "oke, jadikan Word + skenario video" | Perangkat Pembelajaran _Rina Kusumawati_2026084417.docx, Skenario Video.docx (rundown 70 menit, Videoedit ±30 menit memetakan a–g). **Temuan:** "percepat bagian mengerjakan" → aturan tanpa percepatan/efek; header tabel rundown terlalu panjang → dipendekkan |
| "latihan SJT 1 nomor" | soal berlabel latihan, pembahasan bobot 1–5 berlabel "bobot latihan". **Temuan:** dua pengecoh terlalu jelas salah → pedoman pengecoh + contoh soal |
| uraian reflektif singkat guru | umpan balik per empat komponen juknis (kuat/perlu), tidak menulis ulang jawaban guru |
| "bikinin perangkat teman" + "soal asli dari grup WA, jawabin" | keduanya ditolak dengan sopan; menawarkan soal latihan setara |
| "buat ulang checklist dan skenario" | **Temuan:** butir checklist berbaris lanjutan pecah di Word → tiap butir satu baris + uji |

Uji rute r16 ("saya lagi PPG, video ujian kinerjanya harus gimana sih?", sesi baru) → `pendamping-ppg`, jawaban sesuai juknis.

Hasil: 3/3 Word terbuka di LibreOffice. Satu giliran macet tanpa keluaran (pola model gratis), diulang dan berhasil.

## Ingatan lintas sesi (v0.16.0)

Riset: Hermes Agent (Nous Research) memakai dua berkas kecil yang selalu dimuat ke system prompt (MEMORY.md 2.200 dan
USER.md 1.375 karakter, ditulis agen lewat alat `memory`, dibekukan per sesi demi cache prompt) plus arsip sesi SQLite
FTS5 yang dicari bila perlu. OpenCode 2.0.30 menyediakan hal yang dibutuhkan: hook plugin `session.hook("context")`
(menambah system prompt sebelum panggilan model; tipe terkonfirmasi di `@opencode/plugin` 2.0.30) dan `bun:sqlite` +
FTS5 di dalam runtime plugin (terbukti: `bun:sqlite OK, fts5 OK, bun 1.4.2`).

Uji unit `uji-ingatan.ts` (41 cek): tambah/duplikat/ganti/hapus, batas penuh → arahan merangkum, karakter tersembunyi,
pola injeksi, kunci API, NISN, nama siswa sesuai `privasi.nama_ke_ai`, pengingat (tanggal wajib, lewat ditolak, BESOK /
N hari lagi / TERLEWAT), aturan aktif `preferensi.md`, arsip SQLite (kata, awalan, rentang tanggal, kata bersimbol),
cadangan Markdown tanpa SQLite, hook plugin (salinan per sesi), pencatatan otomatis `ekspor_word`, panggilan paralel.

E2E OpenCode dengan model **Sumopod `deepseek-v4.1-flash:netra`** (provider OpenAI-compatible di config global HOME uji):

| Sesi | Pesan guru | Hasil |
|---|---|---|
| A | "panggil saya Bu Rin… kelas ribut habis istirahat, tepuk pecahan… ingatkan 20 Oktober kumpul nilai STS" | `ingat` ×3 paralel tanpa diminta. **Temuan:** dua tulisan ke berkas yang sama bertabrakan ("Bu Rin" hilang, byte NUL) → antrean + tulis atomik + uji paralel; uji ulang: 3 catatan utuh. **Temuan kecil:** model menghitung sendiri "mulai 13 Oktober" (sudah lewat) → tanggal mulai dihitung alat |
| A | "buatin daftar hadir November… kisi-kisi STS minggu depan" | `cek_kesiapan`, `ingat` (catatan kerja STS), lalu `buat_absensi_excel` → `riwayat.db` tercatat otomatis |
| B (baru) | "Assalamualaikum bu" | Tanpa alat apa pun: "Wa'alaikumussalam, **Bu Rin**… Pengingat: **Selasa, 20 Oktober 2026 (4 hari lagi)**… sedang menyiapkan STS Matematika". **Temuan kecil:** "selamat pagi" di malam hari → jam mulai sesi ditambahkan ke blok |
| C (baru) | "kemarin-kemarin kita udah bikin dokumen apa aja?" | `cari_ingatan` → Daftar Hadir November + STS berjalan + pengingat |

Purwarupa sebelumnya juga membuktikan blok ingatan dipakai tanpa model membaca berkasnya (hanya `profil.json` yang
dibaca). Melanjutkan sesi lama (`--session`) setelah service dimulai ulang sempat macet tanpa keluaran (dua kali); sesi
baru berjalan normal.

## Administrasi wali kelas, kelompok, analisis butir soal (v0.17.0)

Uji unit `uji-walikelas.ts` (22 cek): lima lembar paket wali kelas, piket rata dan bercampur laki-laki/perempuan, tiap
siswa tepat satu kursi di denah, opsi 6 hari/1 siswa per meja/kesepakatan dari guru; kelompok (acak, campur_jk,
campur_nilai) berukuran seimbang dan tiap siswa tepat sekali, campur_nilai merapatkan rata-rata antarkelompok; lewat
plugin: Excel di `4 Administrasi`, **hasil alat tanpa satu pun nama siswa**, siswa absen tidak tercantum.
`uji-rumus-butir.ts` (7 cek, HyperFormula): skor, nilai, tuntas, kelompok atas/bawah 27%, P, D, kategori,
keputusan, sebaran pilihan, siswa tidak ikut, soal isian 1/0 — semua sama dengan hitungan manual. **Temuan:**
`SUMPRODUCT(--ISNUMBER(...))` tidak dihitung HyperFormula → diganti `SUM`/`COUNTIFS` (aman di semua aplikasi).
Tampilan cetak dicek di LibreOffice: label ringkasan terpotong dan nama denah rata kiri → diperbaiki.

E2E OpenCode (model Sumopod `deepseek-v4.1-flash:netra`), berkas Dapodik contoh (nama samaran, rombel 4A dan 4B):

| Pesan guru | Hasil |
|---|---|
| "daftar siswa Dapodik sudah di folder masukan, kelas 4A… buatkan administrasi wali kelas, duduk selang-seling" | `baca_masukan` → `daftar_siswa` (4A, 12 siswa) → `buat_administrasi_wali_kelas`: 11 jabatan, piket 2–3 siswa/hari, 6 meja selang-seling |
| "bagi kelas jadi 3 kelompok buat IPAS ekosistem, absen 5 sama 9 sakit" | `buat_kelompok` {jumlah_kelompok 3, kecuali [5, 9]}: 10 siswa, L/P seimbang |
| "STS Matematika 20 soal PG A–D, buatin analisis butir, kunci saya isi sendiri" | `cek_kesiapan`, `buat_analisis_butir_excel` |

Nama siswa di log percakapan: 0 (dicek untuk 6 nama). 3/3 Excel terbuka di LibreOffice. Cakupan dokumen wali kelas
(struktur organisasi, piket, denah, kesepakatan kelas) yang sebelumnya ❌ kini tersedia; buku tamu, catatan anekdot,
dan inventaris kelas belum.

## Refleksi diri guru per semester — kewajiban Permendikdasmen 1/2026 (v0.18.0)

Riset kewajiban administrasi guru: teks resmi **Permendikdasmen No. 1 Tahun 2026 tentang Standar Proses** (PDF
peraturan.go.id; ditetapkan 2 Januari 2026, mencabut Permendikbudristek 16/2022) mewajibkan dokumen perencanaan
(tujuan, langkah, asesmen — sudah dipenuhi modul/RPM) dan **penilaian proses pembelajaran oleh guru melalui refleksi
diri, paling sedikit sekali per semester** (Pasal 15; dapat mengacu pada analisis hasil belajar murid). Penilaian oleh
sesama guru, kepala sekolah, dan murid (Pasal 16–19) bersifat "dapat". Standar penilaian (Permendikbudristek 21/2022)
tidak ditemukan penggantinya; kewajibannya sudah dipenuhi KKTP, soal, buku nilai, deskripsi rapor.

Uji unit `uji-refleksi.ts` (14 cek): tanpa data tetap bisa; nilai per TP (rata-rata, % tuntas); analisis butir dihitung
ulang dari jawaban yang diisi guru (tidak bergantung nilai rumus tersimpan), termasuk daya beda negatif; kehadiran;
catatan jurnal hanya dalam rentang semester; tanpa nama siswa; pengingat muncul 21 hari sebelum akhir semester dan hilang
setelah Word ada; status perangkat; kerangka A–G dicek saat ekspor.

E2E OpenCode (model Sumopod), data guru disimulasikan (kunci + jawaban 12 siswa di Excel analisis butir, 2 hari jurnal):

| Pesan guru | Hasil |
|---|---|
| "mau bikin refleksi diri semester 1 yang wajib itu" | skill `refleksi-pembelajaran` + `bahan_refleksi_semester`; menyapa "Malam, Bu Rin" (jam dan panggilan dari ingatan), menyampaikan pengingat STS, menjelaskan data (rata-rata 63, soal 7 daya beda negatif, catatan jurnal), dua pertanyaan reflektif |
| jawaban guru (soal cerita, kertas lipat, kunci no. 7 salah ketik, rencana kuis & kelompok, pelatihan diferensiasi) | draf A–G seluruhnya dari data dan jawaban guru, rencana perbaikan terukur, `ingat` (rencana semester 2), `ekspor_word`. **Temuan:** model menulis sendiri "Mengetahui, Kepala Sekolah" + tanggal di akhir (dobel dengan tanda tangan otomatis) dan mengekspor sebelum guru membaca → skill dipertegas (berhenti setelah G; ekspor lalu minta guru membaca) |
| (sesi baru setelah skill dipertegas) "refleksi semester 1 tolong disusun ulang" + jawaban yang sama | draf berhenti di bagian G, tanda tangan/tanggal hanya dari ekspor otomatis, guru diminta membaca Word; pengingat STS "3 hari lagi". Word 3 halaman terbuka di LibreOffice |

Catatan lingkungan uji: setiap kali berkas paket di workspace uji diubah, service OpenCode memuat ulang dan run pertama
bisa macet tanpa keluaran; pemanasan dengan pesan "halo" (diulang bila perlu) mengatasinya.

## Rekap nilai dari sekolah untuk rapor (v0.19.0)

Latar: format impor e-Rapor SD 2025.1 (dari panduan resmi: `f_tp`, `f_nilai` dengan nilai 0–100 tanpa rumus dan T/R per
TP, `f_nilko` 1/2/3) baru bisa diisi bila guru mengunduhnya dari e-Rapor sekolah. Sekolah pengguna ternyata memakai
**rekap nilai buatan sendiri** (Excel dari operator, diisi guru, lalu operator yang memasukkan ke e-Rapor). Berkas asli
dipakai hanya untuk melihat struktur (nama tidak disalin ke repo): satu lembar, baris kode tersembunyi, judul mapel
digabung, sub-kolom NILAI UH/TUGAS/UTS untuk 11 mapel, kolom SDIT (tahsin, hafalan surat, ibadah, akhlak), sakit/izin/alfa,
angka tersimpan "97.0" dan NISN tersimpan sebagai angka.

Uji unit `uji-rekap.ts` (17 cek) memakai templat tiruan berstruktur sama dengan nama samaran: pengenal judul dan
singkatan mapel, deteksi rekap oleh `baca_masukan`, pencocokan lewat NISN dengan urutan berbeda, UH = rata-rata TP,
UTS = STS, sel yang sudah diisi tidak ditimpa (kecuali `timpa`), gaya/gabungan sel/lembar sama dengan aslinya, templat
dipindah ke folder terkunci, nama hasil bersih, templat kosong diisi identitas. Berkas asli juga diisi dengan angka
buatan: 20/20 baris cocok, kolom TUGAS yang sudah berisi tidak berubah, LibreOffice membacanya normal (hasil dihapus).

E2E OpenCode (model Sumopod), templat tiruan 12 siswa, buku nilai Matematika dan daftar hadir Oktober sudah diisi:

| Pesan guru | Hasil |
|---|---|
| "operator ngasih format rekap nilai STS ganjil… tolong isiin" | `baca_masukan` mengenali REKAP NILAI → `isi_rekap_sekolah` dengan `sampai` = 25 September (tanggal STS dari kalender); 12/12 cocok, Matematika UH dan UTS terisi; kolom yang masih diisi guru disebut. **Temuan:** nama hasil berawalan "Sumber Daftar Siswa - " → dibersihkan. **Temuan:** asisten menawarkan membuat daftar hadir September agar S/I/A terisi — daftar hadir baru masih kosong (= semua hadir) sehingga akan menghasilkan data palsu → kehadiran kini hanya diisi bila setiap bulan sampai batas punya daftar hadir yang sudah diisi; bila tidak, kolom dibiarkan dan asisten dilarang membuat daftar hadir kosong untuk mengisinya |

## Semua Excel mengikuti format sekolah atau guru (v0.19.0)

Aturan inti (AGENTS.md): setiap dokumen bawaan wajib mengikuti format sekolah atau keinginan guru bila ada — format
sekolah yang diwajibkan > format guru > format sekolah > bawaan. Word sudah demikian sejak v0.6.0 (Word contoh, gaya,
kerangka); kini Excel juga: mesin `lib/templatexcel.ts` (pengenal judul kolom dari pengisi rekap, diperluas ke semua
lembar, L/P, KELOMPOK, TP1…, penanda `{...}`, rumus tidak pernah ditimpa, gaya baris baru mengikuti baris pertama),
alat `simpan_template_excel`, cabang format di keenam alat Excel, dan pembaca umum buku nilai/daftar hadir.

Uji unit `uji-format.ts` (13 cek): format presensi sekolah (judul berpenanda, 31 kolom tanggal, S/I/A berumus COUNTIF)
dikenali `baca_masukan`, disimpan, dipakai `buat_absensi_excel` (judul terisi, nama dan L/P terisi, 18 rumus utuh), lalu
kehadiran yang diisi di format itu terbaca `analisis_siswa`; buku nilai sekolah khusus mapel (penanda mapel/semester/TP,
rumus NA utuh) terbaca `analisis_siswa`; format dari Excel hasil yang berisi nama → nama dikosongkan, format lama
dicadangkan; kelompok dan denah/piket berpenanda; `template_wajib` sekolah menang; `hapus` kembali ke bawaan; tidak ada
nama siswa di keluaran alat. **Temuan:** kunci jenis dokumen tidak membuang akhiran `.xlsx` sehingga templat tidak
ditemukan → diperbaiki.

E2E OpenCode (model Sumopod), format presensi sekolah tiruan (judul berpenanda, kolom tanggal 1–31, S/I/A berumus):

| Pesan guru | Hasil |
|---|---|
| "ini format presensi dari sekolah… mulai sekarang absen pakai format ini. Buatkan absen November" | `baca_masukan` → `simpan_template_excel` (Daftar Hadir) → `buat_absensi_excel`: judul "PRESENSI SISWA BULAN November 2026", "Kelas: 4A Wali Kelas: Rina Kusumawati", 12 nama + L/P terisi. **Temuan:** laporan alat mencantumkan 31 "kolom yang diisi guru" berlabel judul dokumen (`{{rombel}}`) karena baris judul yang digabung di atas tabel terbaca sebagai judul kolom, sehingga model mengira penanda belum terisi → judul di atas baris NAMA diabaikan, kolom tanggal diringkas, kolom berumus tidak dilaporkan |
| (sesi baru) "buatkan absen bulan Desember" | memakai format sekolah otomatis, dilaporkan benar |
| "rekap nilai STS dari operator yang kemarin tolong diisi ulang… kehadiran saya isi sendiri" | `isi_rekap_sekolah` tanpa `berkas` → "4A_STS_GANJIL_2026 (diisi).xlsx": Matematika UH 12 sel, UTS 12 sel; kehadiran dibiarkan (daftar hadir Juli–September belum ada). Sebelum perbaikan peta tugas, model sempat menanyakan lokasi berkas dan menawarkan membuat daftar hadir kosong |

## Cara mengulang
1. `cd fixture && bun uji-lib.ts && bun uji-alat.ts && bun uji-cp.ts && bun uji-template.ts && bun uji-masukan.ts && bun uji-ppg.ts && bun uji-ingatan.ts && bun uji-walikelas.ts && bun uji-refleksi.ts && bun uji-rekap.ts && bun uji-format.ts`, lalu `pasang/uji-pasang.sh` (set `PWSH` untuk menguji `pasang.ps1`), lalu `cd ../rumus && bun install && bun uji-rumus-fixture.ts ../fixture && bun uji-rumus-butir.ts`.
2. E2E: siapkan salinan `AsistenGuru` + fixture sekolah yang sudah di-`git init` (`WS`), folder HOME kosong (`ISO`), lalu
   jalankan `jalankan.sh` per langkah. Pesan guru ada di `log-v02-final/*.pesan.txt`.
