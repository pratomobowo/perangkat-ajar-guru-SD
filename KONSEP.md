# Konsep: Asisten Guru di OpenCode

Asisten pribadi untuk guru SD/SDIT yang mengurus administrasi pembelajaran, supaya guru bisa fokus mengajar.
Guru cukup bercerita dan memeriksa hasilnya. Penyiapan dokumen, perhitungan, dan pengingat diurus asisten.

## 1. Prinsip

1. **Guru memutuskan, asisten menyiapkan.** Semua dokumen berupa draf yang diperiksa guru. Keputusan pedagogis,
   kondisi nyata murid, dan nilai asli tetap milik guru.
2. **Angka dihitung alat, bukan ditebak model.** Minggu efektif, alokasi JP, Prota, Promes, rekap absensi,
   dan nilai dihitung oleh tool atau rumus Excel. Uji v0.1 membuktikan model bisa membuat ATP dan Prota yang
   angkanya saling bertentangan, lalu tetap memvalidasinya dengan ✔.
3. **Satu sumber data, banyak dokumen.** Profil, kalender, dan data ATP disimpan sekali dalam `guru/`. Semua dokumen
   turunan dibuat ulang dari sana, sehingga ATP, Prota, Promes, daftar nilai, dan agenda harian selalu konsisten.
4. **Regulasi hanya dari sumber sekolah.** CP diambil dari `sekolah/referensi/`, bukan dari ingatan model atau
   internet. Jika belum terverifikasi, dokumen otomatis berlabel DRAF.
5. **Nama murid tidak pernah dikirim ke AI.** Nama hanya diketik guru langsung di berkas Excel di laptopnya.
   Asisten bekerja dengan nomor absen dan angka. Ini penting karena model gratis bisa menyimpan percakapan.
6. **Hanya buat yang diminta, seringkas yang diizinkan.** Pemerintah sedang mengurangi beban administrasi guru,
   jadi asisten tidak boleh menambah dokumen yang tidak perlu.
7. **Ramah guru non-teknis.** Bahasa sederhana, perintah singkat (`/hari-ini`), hasil berupa Word dan Excel
   yang siap cetak, bukan berkas teknis.

## 2. Pengalaman guru

| Kapan | Guru mengetik | Asisten melakukan |
|---|---|---|
| Sekali di awal tahun | `/mulai` | Wawancara singkat: kelas, mapel, JP, jadwal, kalender. Menyimpan profil. |
| Awal tahun/semester | `/rencana matematika` | Menghitung minggu efektif, menyusun TP/ATP dari CP, lalu Prota dan Promes. Hasil dalam Word. |
| Setiap pagi | `/hari-ini` | Memberi tahu pelajaran hari ini, TP yang dijadwalkan Promes, kegiatan sekolah 2 minggu ke depan, dan jurnal yang belum diisi. |
| Menjelang mengajar | `/modul pecahan senilai` | Menyiapkan Modul Ajar/RPM, LKPD siap fotokopi (kunci terpisah), dan ide media. |
| Menjelang ulangan | `/soal sumatif bab pecahan` | Menyiapkan KKTP, kisi-kisi, soal, dan kunci yang sudah dicek ulang. |
| Setelah mengajar | `/jurnal tadi TP3, 2 anak sakit, perlu remedial` | Mencatat jurnal harian, dilengkapi TP dari Promes. |
| Awal bulan | `/absen oktober` | Membuat Excel daftar hadir dengan tanggal efektif dan rumus rekap otomatis. |
| Awal semester | `/nilai matematika 1` | Membuat Excel buku nilai per TP, STS, SAS, dengan rumus nilai rapor. |
| Kapan saja | “mulai sekarang selalu …” | Mengingat preferensi guru untuk sesi berikutnya. |
| Kapan saja | `/bantuan` | Menampilkan menu. |

Guru juga bisa bicara bebas tanpa perintah slash, misalnya “minggu depan saya ngajar pecahan, bantu siapkan”. Skill
akan terpicu dari kata kuncinya.

## 3. Arsitektur

```
AsistenGuru/                      ← satu folder per guru, dibuka dengan OpenCode
├─ opencode.json                  agent bawaan = asisten-guru, agent lain dimatikan, share dimatikan
├─ AGENTS.md                      aturan inti yang selalu aktif
├─ .opencode/
│  ├─ agents/asisten-guru.md      persona, peta tugas, izin (hanya boleh menulis guru/ dan hasil/, tanpa shell/internet)
│  ├─ commands/*.md               menu slash untuk guru: /mulai /hari-ini /rencana /modul /soal /jurnal /absen /nilai /ingat /word /bantuan
│  ├─ skills/<nama>/SKILL.md      pengetahuan per tugas (dimuat saat dibutuhkan)
│  ├─ tools/*.ts                  alat deterministik: hitung, susun, ekspor Word/Excel, agenda
│  └─ lib/*.ts                    pustaka bersama: kalender, docx, xlsx, zip
├─ sekolah/        (milik sekolah, diganti saat pembaruan)
│  ├─ kebijakan.json              angka kebijakan: aturan minggu efektif, cadangan JP, bobot nilai
│  ├─ preferensi-sekolah.md       kebijakan naratif: format RPM/Modul, kekhasan SDIT
│  ├─ referensi/cp/*.md           CP resmi per mapel dan fase
│  └─ template/                   contoh format sekolah
├─ guru/           (milik guru, tidak pernah ditimpa)
│  ├─ profil.json, kalender.json  hasil /mulai
│  ├─ preferensi.md               aturan pribadi guru
│  ├─ data/                       data ATP dan Promes (sumber kebenaran untuk dokumen turunan)
│  └─ draf/                       draf Markdown yang bisa direvisi asisten
└─ hasil/          (hanya Word dan Excel siap cetak)
   ├─ 1 Perencanaan/   2 Modul dan LKPD/   3 Asesmen/   4 Administrasi/
```

### Standar dokumen
Guru seharusnya tidak perlu merapikan apa pun. Kop, identitas, nomor halaman, tanda tangan, ukuran kertas, dan orientasi diatur
alat dari `sekolah/kebijakan.json` dan `guru/profil.json`. Model hanya menulis isi dengan beberapa konvensi Markdown (blok
identitas, opsi `A.`, garis `______`, `<!-- halaman-baru -->`). Rincian standar dan hasil verifikasinya ada di
`uji-e2e/LAPORAN-v02.md`.

### Pembagian kerja model dan alat

| Pekerjaan | Model (LLM) | Tool deterministik |
|---|---|---|
| Wawancara guru, memahami bahasa santai | ✔ | |
| Merumuskan TP dari CP, urutan pedagogis | ✔ | |
| Modul ajar, LKPD, soal, jurnal | ✔ | |
| Minggu efektif, kapasitas JP | | `hitung_minggu_efektif` |
| Validasi ATP, menyusun Prota dan Promes | | `susun_perencanaan` |
| Agenda harian dan pengingat | | `agenda_hari_ini` |
| Word dan Excel | | `ekspor_word`, `buat_absensi_excel`, `buat_nilai_excel` |
| Rekap absensi dan nilai | | Rumus di Excel |

### Batas keamanan
- Agent hanya boleh menulis di `guru/` dan `hasil/`. Perintah shell, akses internet, dan berbagi sesi dimatikan.
- Tool menolak menulis di luar `guru/` dan `hasil/`.
- Urutan prioritas aturan: regulasi resmi > kebijakan sekolah > preferensi guru > bawaan skill.

## 4. Peran

| Peran | Tugas |
|---|---|
| **Pengembang paket** | Merawat skill, tool, dan pengujian, lalu merilis versi baru. |
| **Operator / waka kurikulum** | Mengisi CP resmi dan memverifikasinya, mengisi `kebijakan.json` dan `preferensi-sekolah.md`, menaruh template, membagikan paket. |
| **Guru** | Menjalankan `/mulai` sekali, memakai sehari-hari, memeriksa hasil, memberi umpan balik. |

Pembaruan paket hanya mengganti `.opencode/`, `sekolah/`, `AGENTS.md`, dan `opencode.json`. Folder `guru/` dan
`hasil/` tidak disentuh.

## 5. Model AI

- **Gratis** (misalnya Muse Spark): sudah cukup untuk alur ini setelah hitungan dipindah ke tool. Risikonya, server
  kadang macet, dan percakapan bisa dipakai penyedia. Karena itu nama murid tidak pernah masuk percakapan.
- **Berbayar** (langganan sekolah): lebih stabil dan lebih baik untuk menulis TP dan soal. Disarankan untuk produksi.
- Paket tidak mengunci model. Sekolah memilih model di konfigurasi OpenCode.

## 6. Peta jalan

| Versi | Isi |
|---|---|
| v0.1 | Skill perencanaan, profil, umpan balik. Uji e2e: pemicuan dan pagar CP lulus, tetapi hitungan tidak konsisten. |
| **v0.2** ✔ | Agent khusus, menu slash, tool deterministik (minggu efektif, Prota, Promes, agenda), Word/Excel siap cetak, skill modul ajar, asesmen, dan administrasi harian. Uji e2e 12/12 lulus dengan model gratis. |
| v0.3 | Mengisi template Word milik sekolah, deskripsi capaian rapor dari nomor absen dan level TP, KKTP yang tersambung ke buku nilai. |
| v0.4 | Banyak mapel untuk guru kelas, kokurikuler mengikuti kebijakan terbaru, varian MI (Kemenag). |
| v1.0 | CP resmi terpusat (`skills.urls`) supaya sekolah tidak menyalin manual, panduan instalasi satu klik, dan antarmuka OpenCode desktop/web untuk guru. |

## 7. Ukuran keberhasilan pilot

- Waktu menyusun ATP, Prota, dan Promes satu mapel: target kurang dari 30 menit termasuk pemeriksaan guru.
- Jumlah koreksi angka oleh guru pada dokumen perencanaan: target 0.
- Persentase permintaan yang memicu skill yang benar (uji e2e): target ≥ 90%.
- Guru masih memakai `/hari-ini` dan `/jurnal` setelah 4 minggu.
