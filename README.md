# Asisten Guru — Perangkat Ajar Guru SD untuk OpenCode

Asisten pribadi guru SD/SDIT berbasis [OpenCode 2](https://opencode.ai) yang mengurus administrasi pembelajaran dari hulu ke hilir:
kalender → minggu efektif → ATP → Prota/Promes → modul ajar/RPM dan LKPD → asesmen → jurnal, daftar hadir, dan buku nilai.
Guru cukup bercerita dan memeriksa. Dokumen Word dan Excel yang rapi dan siap cetak disiapkan oleh asisten.

> Status: **v0.3-dev**, port ke OpenCode 2 untuk guru pengguna Windows (Desktop atau CLI). Uji coba Matematika Kelas 4 (Fase B).
> Lihat [`uji-e2e/LAPORAN-v03.md`](uji-e2e/LAPORAN-v03.md) dan, untuk versi OpenCode 1, [`uji-e2e/LAPORAN-v02.md`](uji-e2e/LAPORAN-v02.md).

## Fitur

| Guru mengetik | Asisten menyiapkan |
|---|---|
| `/mulai` | Profil guru, jadwal pelajaran, dan kalender pendidikan (sekali di awal tahun) |
| `/hari-ini` | Agenda: status hari, jadwal, TP minggu ini dan depan, bahan yang belum dibuat, pengingat jurnal |
| `/rencana matematika` | Rincian minggu efektif, ATP, Prota, dan Promes (Word) |
| `/modul pecahan senilai` | Modul Ajar/RPM, LKPD siap fotokopi, dan kunci terpisah (Word) |
| `/soal ulangan harian TP3` | KKTP, kisi-kisi, lembar soal, serta kunci dan penskoran (Word) |
| `/jurnal tadi mengajar …` | Jurnal mengajar bulanan (Word) |
| `/absen oktober` | Daftar hadir bulanan dengan rekap otomatis (Excel) |
| `/nilai matematika 1` | Buku nilai per TP dengan rumus nilai rapor (Excel) |
| "mulai sekarang selalu …" | Mengingat preferensi guru untuk sesi berikutnya |

Guru juga bisa bercerita biasa tanpa perintah, misalnya "minggu depan saya mengajar pecahan, tolong siapkan bahannya".

## Prinsip

1. **Guru memutuskan, asisten menyiapkan.** Semua hasil adalah draf. Bagian yang butuh keputusan guru diberi stabilo `[PERLU GURU]`.
2. **Angka dihitung alat, bukan ditebak model.** Minggu efektif, JP, Prota, Promes, dan agenda dihitung tool TypeScript.
   Rekap absensi dan nilai dihitung rumus Excel.
3. **Satu sumber data, banyak dokumen.** ATP, Prota, dan Promes dibuat dari data yang sama sehingga selalu konsisten.
4. **Regulasi hanya dari sumber sekolah.** CP diambil dari `sekolah/referensi/cp/`, bukan dari ingatan model.
   Jika belum terverifikasi, dokumen otomatis berlabel DRAF.
5. **Nama murid tidak pernah dikirim ke AI.** Nama hanya diketik guru langsung di Excel.
6. **Siap cetak tanpa diedit.** Kop sekolah, identitas, nomor halaman, tanda tangan, ukuran kertas A4/F4, dan orientasi diatur otomatis.

## Struktur repositori

```
AsistenGuru/                 ← paket yang disalin ke komputer guru (satu folder per guru)
├─ opencode.json             agent bawaan, izin, share dimatikan
├─ AGENTS.md                 aturan inti
├─ .opencode/
│  ├─ agents/asisten-guru.md persona, peta tugas, format draf, izin (tulis hanya guru/ dan hasil/)
│  ├─ commands/              menu slash
│  ├─ skills/                guru-setup, perencanaan-tahunan, modul-ajar, asesmen, administrasi-harian, umpan-balik-guru
│  ├─ plugins/asisten-guru.ts plugin OpenCode 2 yang mendaftarkan alat (tanpa paket npm)
│  ├─ alat/                  hitung_minggu_efektif, susun_perencanaan, agenda_hari_ini, ekspor_word,
│  │                         buat_absensi_excel, buat_nilai_excel
│  └─ lib/                   kalender, perencanaan, penulis .docx/.xlsx/.zip tanpa dependensi
├─ sekolah/                  milik sekolah: kebijakan.json, preferensi-sekolah.md, referensi CP, template
├─ guru/                     milik guru: profil, kalender, preferensi, data ATP/Promes, draf
├─ hasil/                    Word dan Excel siap cetak (1 Perencanaan, 2 Modul dan LKPD, 3 Asesmen, 4 Administrasi)
├─ README-PASANG.md          panduan operator sekolah
└─ PANDUAN-GURU.md           panduan satu halaman untuk guru
KONSEP.md                    konsep produk, arsitektur, peran, dan peta jalan
uji-e2e/                     skrip uji, transkrip, contoh hasil, dan laporan v0.1 serta v0.2
```

## Memasang

Kebutuhan: [OpenCode 2](https://opencode.ai/download) (Desktop atau CLI, versi 2.0.30 atau lebih baru) dan koneksi internet
untuk model AI. Tidak perlu Python, Node.js, pandoc, atau Office untuk membuat berkas, karena alat berjalan di runtime bawaan
OpenCode dan tidak memakai paket npm. OpenCode 1 tidak didukung lagi.

1. Salin folder `AsistenGuru/` ke komputer guru, misalnya ke `Documents\AsistenGuru` di Windows.
2. Operator atau waka kurikulum mengisi:
   - `sekolah/referensi/cp/<mapel>-fase-<x>.md` dengan CP resmi (Keputusan Kepala BSKAP No. 046/H/KR/2025). Isi `elemen`
     dan ubah `status` menjadi `TERVERIFIKASI` setelah diperiksa.
   - `sekolah/kebijakan.json`: identitas sekolah, kepala sekolah, kertas A4/F4, aturan minggu efektif, cadangan JP,
     bobot nilai, dan batas ketuntasan.
   - Bagian `[ISI]` di `sekolah/preferensi-sekolah.md`.
3. Buka folder itu di OpenCode Desktop, atau jalankan `opencode` dari terminal di folder itu.
4. Pilih model dengan `/models`, lalu guru mengetik `/mulai` atau `/bantuan`.

Rincian ada di [`AsistenGuru/README-PASANG.md`](AsistenGuru/README-PASANG.md).

## Pengujian

| Uji | Perintah | Isi |
|---|---|---|
| Pustaka | `cd uji-e2e/fixture && bun uji-lib.ts` | Minggu efektif, validasi ATP, Prota/Promes, agenda, Word dan Excel |
| Alat dan plugin | `cd uji-e2e/fixture && bun uji-alat.ts` | Keenam alat lewat plugin OpenCode 2, termasuk berkas ala Notepad Windows (BOM, CRLF) dan jalur Windows |
| Rumus Excel | `cd uji-e2e/rumus && bun install && bun uji-rumus-fixture.ts ../fixture` | Menghitung rumus dengan HyperFormula dan membandingkannya dengan nilai harapan |
| End-to-end | `uji-e2e/jalankan.sh` | Menjalankan OpenCode 2 terisolasi dengan skenario guru (lihat komentar di skrip) |

Hasil uji v0.2: kalender dan minggu efektif cocok dengan hitungan manual, 28/28 kunci jawaban benar, semua rumus Excel benar,
dan 0 pelanggaran skema OOXML pada 15 berkas. Tidak ada nama murid yang tersimpan.

## Keterbatasan

- CP dalam repositori ini masih **kosong** (`BELUM-TERISI`). Uji memakai ringkasan sekunder (`uji-e2e/contoh-hasil-v01/fixture-cp-sekunder.md`),
  bukan teks resmi.
- Berkas belum diverifikasi dengan membukanya langsung di Microsoft Office. Verifikasi memakai validasi skema, HyperFormula,
  Quick Look, dan docx-preview.
- Kualitas pedagogis rumusan TP dan pembagian materi antarkelas dalam satu fase tetap perlu dinilai guru.
- Server model gratis kadang lambat atau macet. Solusinya, tekan Esc lalu kirim ulang.

## Peta jalan

Mengisi template Word milik sekolah, deskripsi capaian rapor, KKTP yang tersambung ke buku nilai, banyak mapel untuk guru kelas,
kokurikuler, varian MI (Kemenag), dan CP resmi terpusat. Lihat [`KONSEP.md`](KONSEP.md).
