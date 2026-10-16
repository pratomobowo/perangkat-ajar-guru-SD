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

## Cara mengulang
1. `cd fixture && bun uji-lib.ts && bun uji-alat.ts`, lalu `pasang/uji-pasang.sh` (set `PWSH` untuk menguji `pasang.ps1`), lalu `cd ../rumus && bun install && bun uji-rumus-fixture.ts ../fixture`.
2. E2E: siapkan salinan `AsistenGuru` + fixture sekolah yang sudah di-`git init` (`WS`), folder HOME kosong (`ISO`), lalu
   jalankan `jalankan.sh` per langkah. Pesan guru ada di `log-v02-final/*.pesan.txt`.
