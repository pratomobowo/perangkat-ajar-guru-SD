# Asisten Guru SD

**Asisten pribadi untuk guru SD/MI/SDIT** yang berjalan di aplikasi [OpenCode](https://opencode.ai).
Guru cukup mengobrol seperti biasa, asisten menyiapkan perangkat ajar dan administrasi kelas dalam bentuk
**Word dan Excel yang siap cetak**.

> Versi **0.19.0** · tahap uji coba · untuk OpenCode 2 (Desktop atau terminal), utamanya laptop Windows.

---

## Apa saja yang bisa dibantu?

| Kebutuhan guru | Yang disiapkan asisten |
|---|---|
| Perencanaan setahun | Minggu efektif, ATP, Prota, Promes |
| Persiapan mengajar | Modul Ajar / RPM / RPP, LKPD, kunci jawaban, kartu media |
| Penilaian | KKTP, kisi-kisi, soal ulangan harian, STS, SAS, beserta kuncinya; analisis butir soal (tingkat kesukaran, daya beda, pengecoh) |
| Format sekolah atau guru | Semua Word dan Excel bawaan bisa diganti format sekolah atau format guru; nama siswa dan data tetap terisi otomatis |
| Rekap nilai untuk rapor | Excel rekap dari sekolah/operator diisi otomatis dari buku nilai dan daftar hadir (format sekolah tidak berubah) |
| Refleksi semester (wajib) | Refleksi diri guru sesuai Permendikdasmen 1/2026, dari data nilai, analisis soal, kehadiran, dan jurnal; diingatkan menjelang akhir semester |
| Administrasi kelas | Daftar hadir, buku nilai (nilai rapor dan deskripsi rapor otomatis), jurnal mengajar, jadwal pelajaran, kalender pendidikan |
| Wali kelas | Struktur organisasi kelas, jadwal piket, denah tempat duduk, kesepakatan kelas, pembagian kelompok — nama siswa terisi otomatis |
| Kokurikuler | Rencana kegiatan, jurnal, penilaian per dimensi profil lulusan, deskripsi rapor |
| Memahami murid | "Budi kurangnya di mana?", "Siapa yang perlu remedial?" |
| Bahan pelajaran | Mengunduh Buku Siswa dan Panduan Guru resmi, mencari materi dari sumber tepercaya |
| Mengingat Anda | Panggilan, kebiasaan kelas, pekerjaan yang belum selesai, pengingat bertanggal, dan riwayat dokumen — terbawa ke sesi berikutnya |
| Sedang PPG | Checklist UKPPPG sesuai juknis 2026, pendampingan perangkat dan skenario video Ujian Kinerja, latihan PCK/SJT/uraian reflektif |

Sudah diuji untuk **Matematika, Bahasa Indonesia, IPAS, dan Pendidikan Pancasila** di kelas 2, 3, 4, dan 5.

---

## Cara memasang (± 5 menit)

1. Unduh dan pasang **OpenCode Desktop** dari [opencode.ai/download](https://opencode.ai/download), lalu buka.
2. Salin link halaman ini, tempel ke kolom chat OpenCode, lalu ketik:
   **"Tolong pasang Asisten Guru dari link ini."**
   Jika OpenCode meminta izin, pilih **izinkan**.
3. Setelah selesai, buka folder **Documents › AsistenGuru** di OpenCode (menu **Open Project**).

Selesai. Untuk memperbarui di kemudian hari, ketik saja **"tolong perbarui asisten"**. Data Anda tetap aman.

---

## Cara memakai

**Cukup mengobrol biasa.** Tidak perlu menghafal perintah. Contoh:

- *"Minggu depan saya mengajar pecahan, tolong siapkan bahannya."*
- *"Buatkan soal ulangan harian 10 soal pilihan ganda."*
- *"Absen bulan November dong."*
- *"Hari ini saya mengajar apa?"*
- *"Daffa nilai matematikanya kenapa ya, kok turun?"*

**Baru pertama kali, atau bingung harus mulai dari mana?** Ketik **`/bingung`**. Asisten akan menuntun pelan-pelan,
satu langkah demi satu langkah, dan menjelaskan istilah (CP, ATP, KKTP, dan lainnya) dengan bahasa sehari-hari.

**Sedang ikut PPG?** Ketik **`/ppg`**. Asisten menyiapkan checklist resmi UKPPPG dan mendampingi Ibu/Bapak menyusun
perangkat dan rencana video Ujian Kinerja dari ide dan kelas sendiri (sesuai juknis, perangkat wajib hasil pengembangan
sendiri), lalu mengajak latihan soal.

**Punya dokumen dari sekolah?** Taruh di folder **Documents › AsistenGuru › guru › masukan**, misalnya kalender
pendidikan, jadwal, contoh RPP sekolah, atau daftar siswa dari Dapodik/e-Rapor. Lalu ketik
*"Siapkan semua perangkat saya, jalankan semua."* Asisten membaca dokumennya dan menyusun semuanya sekaligus.

**Hasilnya di mana?** Di folder **Documents › AsistenGuru › hasil**, sudah dikelompokkan:
1 Perencanaan, 2 Modul dan LKPD, 3 Asesmen, 4 Administrasi, 5 Kokurikuler (dan 7 PPG bagi peserta PPG).

Ketik **`/bantuan`** kapan saja untuk melihat menu.

---

## Hal yang perlu diketahui

- **Semua hasil adalah draf.** Guru tetap memeriksa isinya. Bagian yang perlu keputusan guru diberi **stabilo kuning**
  bertanda `[PERLU GURU]`, dan dokumen berlabel **DRAF** sampai CP-nya dicocokkan dengan dokumen resmi.
- **Bahan diambil dari sumber resmi.** CP diambil dari Keputusan BSKAP 046/2025, materi dari buku resmi Kemendikdasmen,
  dan sumbernya dicantumkan. Jika sekolah tidak punya format sendiri, dokumen mengikuti contoh resmi BSKAP (Panduan
  Pembelajaran dan Asesmen 2025).
- **Angka dihitung alat, bukan ditebak AI.** Minggu efektif, JP, nilai rapor, dan rekap absen dihitung oleh program dan
  rumus Excel.
- **Nama siswa:** cukup diberikan sekali lewat berkas (Dapodik/e-Rapor/absen lama) dan otomatis terisi di semua Excel.
  Daftar siswa, absensi, dan buku nilai tidak bisa dibaca langsung oleh AI. Pengaturan bawaan mengizinkan nama disebut
  saat guru bertanya analisis seorang anak. **Jika guru memakai model AI gratis**, operator sebaiknya mengubah
  `nama_ke_ai` menjadi `false` di `sekolah/kebijakan.json`, karena model gratis bisa memakai data untuk pelatihan.
  Pemrosesan data anak juga memerlukan persetujuan orang tua (UU 27/2022).
- **Butuh internet** untuk AI-nya, serta untuk mengambil CP dan buku resmi.
- **Belum didukung:** CP Pendidikan Agama (dari Kemenag) belum bisa diambil otomatis, dan impor langsung ke e-Rapor
  masih dikembangkan.
- **Jika asisten diam lama:** tekan **Esc**, lalu kirim ulang pesannya. Model gratis kadang lambat.

---

## Untuk operator sekolah

Asisten bisa langsung dipakai tanpa pengaturan. Agar dokumen memakai identitas sekolah, isi
**`sekolah/kebijakan.json`** (nama sekolah, kepala sekolah, kertas A4/F4, bobot nilai, batas tuntas). Sekolah juga bisa
menaruh template Word sendiri. Panduan lengkap: [`AsistenGuru/README-PASANG.md`](AsistenGuru/README-PASANG.md).

Pemasangan manual: salin folder `AsistenGuru/` ke `Documents\AsistenGuru` di laptop guru, buka di OpenCode 2
(versi 2.0.30 atau lebih baru), pilih model dengan `/models`, lalu ketik `/mulai`. Tidak perlu Python, Node.js, atau
Office untuk membuat berkas.

---

## Petunjuk untuk asisten AI

Bagian ini untuk asisten AI (misalnya OpenCode) yang diminta memasang atau memperbarui Asisten Guru dari repositori ini.

1. **Jangan meng-clone repositori atau menyalin berkas satu per satu.** Jalankan satu perintah pemasang resmi sesuai sistem
   operasi pengguna. Pemasang mengunduh rilis bertag terbaru dan memasangnya ke `Documents/AsistenGuru`.
   - Windows (bisa dari PowerShell, cmd, maupun bash):
     ```
     powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/pratomobowo/perangkat-ajar-guru-SD/main/pasang.ps1 | iex"
     ```
   - macOS dan Linux:
     ```
     curl -fsSL https://raw.githubusercontent.com/pratomobowo/perangkat-ajar-guru-SD/main/pasang.sh | bash
     ```
   Sebelum menjalankannya, jelaskan ke pengguna dalam satu kalimat bahwa perintah ini mengunduh dan memasang Asisten Guru
   ke folder Documents, lalu minta izin.
2. **Berhasil** jika keluaran memuat baris `ASISTEN_GURU_SELESAI versi=<versi> folder=<folder>`. Jika gagal, sampaikan
   pesan bertanda `[Asisten Guru]` apa adanya dengan bahasa sederhana. Jangan memperbaiki dengan cara lain, misalnya
   menyalin berkas manual.
3. Pemasang yang sama dipakai untuk **memperbarui**. Aman diulang: `.opencode/` dan berkas paket diganti (yang lama
   dicadangkan di `.cadangan/`), `sekolah/` hanya ditambah berkas baru, sedangkan `guru/` dan `hasil/` tidak disentuh.
4. Setelah berhasil, sampaikan ke pengguna (guru, bukan orang teknis) dengan singkat:
   - letak folder (dari baris `ASISTEN_GURU_SELESAI`);
   - cara membuka: di OpenCode Desktop pilih **Open Project** lalu folder itu; di terminal `cd` ke folder itu lalu `opencode`;
   - setelah terbuka, ketik `/mulai` untuk menyiapkan profil, `/bingung` bila belum tahu harus mulai dari mana, atau
     `/bantuan` untuk melihat menu;
   - jika `[Asisten Guru] PERHATIAN` menyebut OpenCode 1, minta pengguna memasang OpenCode 2 dulu.
5. Asisten Guru butuh **OpenCode 2**. Di dalam folder AsistenGuru, agent `asisten-guru` dan aturan di `AGENTS.md`
   yang mengurus pemakaian sehari-hari. Jangan mengubah berkas di folder itu dari sesi lain.

---

## Untuk pengembang

<details>
<summary>Isi repositori, pengujian, dan catatan teknis</summary>

### Isi repositori

```
AsistenGuru/            paket yang dipasang di laptop guru
├─ .opencode/
│  ├─ agents/           persona asisten dan peta tugas
│  ├─ skills/           panduan kerja per tugas (modul-ajar, asesmen, pendamping-guru, siapkan-semua, …)
│  ├─ commands/         menu perintah (/bingung, /siapkan, /modul, /absen, …)
│  ├─ plugins/          plugin OpenCode 2 yang mendaftarkan 33 alat (tanpa paket npm)
│  ├─ alat/  lib/       alat dan pustaka: kalender, perencanaan, Word/Excel, pembaca PDF/Word/Excel, daftar siswa, analisis, …
│  └─ vendor/pdfjs/     pdf.js (Apache-2.0) untuk membaca PDF buku
├─ sekolah/             milik sekolah: kebijakan.json, referensi CP dan buku, template
├─ guru/                milik guru: profil, kalender, data perencanaan, draf, buku, folder masukan
├─ hasil/               Word dan Excel siap cetak
├─ AGENTS.md            aturan inti (privasi, sumber, batas kerja)
└─ VERSI.md             catatan perubahan
pasang.ps1, pasang.sh   pemasang dan pembaru satu perintah (memilih tag rilis tertinggi)
KONSEP.md               konsep produk dan peta jalan
uji-e2e/                skrip uji dan laporan (LAPORAN-v03.md)
```

### Pengujian

Semua uji di `uji-e2e/fixture` dijalankan dengan `bun <nama>.ts`:

| Uji | Isi |
|---|---|
| `uji-lib.ts` | minggu efektif, ATP, Prota/Promes, agenda, Word dan Excel |
| `uji-alat.ts` | seluruh alat lewat plugin OpenCode 2, termasuk berkas ala Notepad Windows dan jalur Windows |
| `uji-masukan.ts` | pembaca Word/Excel/PDF dari sekolah dan peta perangkat |
| `uji-cp.ts` | pengambil CP dari PDF Keputusan BSKAP 046/H/KR/2025 |
| `uji-template.ts` | format Word milik guru/sekolah (`SOFFICE=…` untuk membuka hasil di LibreOffice) |
| `uji-siswa.ts` | daftar siswa otomatis (Dapodik, e-Rapor, absen lama, CSV) dan privasi |
| `uji-analisis.ts` | analisis siswa dan kelas |
| `uji-kesiapan.ts` | cek bahan sebelum membuat perangkat |
| `uji-acuan.ts` | JP resmi per kelas/mapel dan libur nasional 2026/2027 |
| `uji-ppg.ts` | pemeriksa tujuh aspek Ujian Kinerja dan checklist UKPPPG |
| `uji-format.ts` | format Excel sekolah/guru untuk semua jenis Excel, penanda, prioritas wajib, pembaca data berformat sekolah |
| `uji-rekap.ts` | pengisian rekap nilai sekolah (templat tiruan berstruktur asli), pencocokan NISN, format dipertahankan |
| `uji-refleksi.ts` | bahan refleksi semester, analisis butir dari jawaban, pengingat kewajiban, kerangka Word |
| `uji-walikelas.ts` | administrasi wali kelas, pembagian kelompok, Excel analisis butir, privasi nama |
| `uji-ingatan.ts` | ingatan lintas sesi: batas, privasi, injeksi, pengingat, arsip SQLite/Markdown, hook plugin, panggilan paralel |

Ditambah: `uji-e2e/rumus` (rumus Excel dihitung HyperFormula, termasuk `uji-rumus-butir.ts`), `uji-e2e/pasang/uji-pasang.sh` (pemasang sh dan ps1),
`uji-e2e/jalankan.sh` (OpenCode terisolasi dengan skenario guru), dan `uji-e2e/rute/jalankan-rute.sh` (16 permintaan
bahasa sehari-hari → alat yang tepat). Hasil uji end-to-end per versi ada di
[`uji-e2e/LAPORAN-v03.md`](uji-e2e/LAPORAN-v03.md).

### Keterbatasan teknis

- Berkas Word/Excel diuji dengan LibreOffice dan validasi skema, belum dengan Microsoft Office langsung.
- Belum diuji di laptop Windows sungguhan dan dengan banyak model AI (uji memakai satu model gratis).
- Kualitas pedagogis rumusan TP dan isi materi tetap perlu dinilai guru.

### Peta jalan

Impor ke e-Rapor (menunggu template resmi dari sekolah), CP Pendidikan Agama, varian MI (Kemenag), uji coba guru di
Windows. Lihat [`KONSEP.md`](KONSEP.md).

</details>
