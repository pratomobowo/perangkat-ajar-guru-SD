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

## Cara mengulang
1. `cd fixture && bun uji-lib.ts && bun uji-alat.ts`, lalu `cd ../rumus && bun install && bun uji-rumus-fixture.ts ../fixture`.
2. E2E: siapkan salinan `AsistenGuru` + fixture sekolah yang sudah di-`git init` (`WS`), folder HOME kosong (`ISO`), lalu
   jalankan `jalankan.sh` per langkah. Pesan guru ada di `log-v02-final/*.pesan.txt`.
