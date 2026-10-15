# Laporan Uji E2E v0.1 — PerangkatAjar di OpenCode

- **Tanggal:** 2026-10-15
- **OpenCode:** 1.18.30, mode `opencode run --pure --auto`
- **Model:** `opencode/muse-spark-1.3-contributor-free` (gratis)
- **Lingkungan:** HOME terisolasi, tanpa skill atau plugin global milik pengembang, jadi kondisinya mirip laptop guru yang baru dipasangi OpenCode.
- **Persona:** Bu Rina, wali kelas 4, Matematika 5 JP/minggu, TA 2026/2027.
- **CP:** awalnya `BELUM-TERISI`, lalu diisi fixture sekunder berstatus `SEKUNDER` (lihat `contoh-hasil-v01/fixture-cp-sekunder.md`). Fixture ini **bukan teks resmi** dan tidak dimasukkan ke paket `PerangkatAjar/`.

Cara mengulang uji: lihat `jalankan.sh`. Transkrip tiap skenario ada di `log-v01/<skenario>.md`.

## Hasil per skenario

| # | Skenario | Skill terpicu | Hasil |
|---|---|---|---|
| 1 | “Saya guru baru, siapkan profil” → wawancara 4 giliran | guru-setup | ✔ Satu pertanyaan per giliran. `profil.yaml` akurat, termasuk “STS dimajukan” yang menjebak. Tanggal tidak ditebak. |
| 2 | Minta ATP + Prota, CP `BELUM-TERISI` | perencanaan-tahunan, asisten-perangkat-ajar | ✔ Berhenti, menyebut nama berkas CP, tidak mengarang, tidak menulis berkas. |
| 3a | Minta ATP + Prota, CP `SEKUNDER` | sama | ✔ Minta persetujuan draf dan tanya pembagian kelas 3/4. |
| 3b | Setuju draf | (lanjutan) | ⚠ Dokumen jadi dan berlabel DRAF dengan “Sumber dan asumsi”, **tetapi angka ATP dan Prota tidak konsisten dan validasinya palsu** (lihat Temuan 1). |
| 4a | “Mulai sekarang selalu tambah kolom integrasi nilai Islam di ATP” | umpan-balik-guru | ✔ Aturan #001 tersimpan, langsung diterapkan, riwayat tercatat, tanpa dalil karangan. ⚠ Disimpan **sebelum** minta konfirmasi. |
| 4b | Sesi baru: “aturan apa yang kamu ingat?” | umpan-balik-guru | ✔ Aturan #001 disebutkan dengan tepat. |
| 5 | “Buatkan rekap absensi 28 siswa” | — (tidak ada) | ✖ Menurut desain v0.1 harus ditolak, tetapi model langsung membuatkan rekap (tanpa nama siswa) (lihat Temuan 3). |
| 6 | “Minggu depan ngajar pecahan senilai, 2 pertemuan, bantu siapkan” (bahasa santai) | asisten-perangkat-ajar | ✔ Terpicu tanpa kata “modul ajar”, menemukan TP5 dari ATP sebelumnya, maksimal 3 pertanyaan. Modul dan LKPD diberi label “versi awal”, **semua kunci jawaban benar** (dicek manual). |

Ringkasnya, pemicuan skill, pagar CP, memori lintas sesi, dan rantai hulu ke hilir (profil → ATP → modul/LKPD) **berfungsi** dengan model gratis. Kelemahan utamanya ada di **hitungan dan konsistensi antardokumen**.

## Temuan

### 1. Angka ATP dan Prota saling bertentangan, tapi divalidasi ✔ (prioritas tinggi)
- Total minggu efektif 18 + 18 = 36 (180 JP) **cocok** dengan hitungan independen per minggu Senin–Jumat.
- ATP menulis TP9 = 16 JP dan TP11 = 14 JP (semester 2 = 84 JP). Prota diam-diam mengubah TP9 menjadi 14 dan TP11 menjadi 12. Teks penjelasannya bilang hanya TP11 yang dikurangi, sedangkan judulnya bilang TP12.
- Penempatan bulan di Prota tidak masuk akal. TP6 tertulis “Juli–Nov tersebar / November”. TP11 (12 JP) dijejalkan ke 1 minggu Juni (5 JP). TP12 “review akhir tahun” ditaruh di Mei, sebelum TP10 dan TP11.
- Daftar centang tetap menulis ✔ “JP pas”, padahal model memeriksa pekerjaannya sendiri.

**Usulan:** pindahkan aritmetika ke skrip. Model hanya menulis data ATP (kode TP, rumusan, elemen, JP) ke satu berkas data. Skrip lalu menghitung minggu efektif, membagi TP ke minggu efektif (Prota/Promes), dan menjalankan validasi yang sebenarnya. Model tidak lagi menyalin angka antardokumen.

### 2. Konvensi minggu efektif diambil diam-diam (sedang)
Ada tiga konvensi yang dipilih model tanpa tanda `[PERLU GURU]`: minggu MPLS 3 hari dianggap tidak efektif penuh, minggu bagi rapor (hanya 1 hari acara) dianggap tidak efektif, dan libur Ramadan 3 hari dihitung satu minggu tidak efektif. Sementara itu, libur 1 hari tetap dihitung efektif.
**Usulan:** tetapkan aturannya di `sekolah/preferensi-sekolah.md`, misalnya “minggu dengan ≥3 hari tidak efektif = tidak efektif”. Skrip lalu menerapkannya secara konsisten.

### 3. Cakupan absensi, jurnal, dan nilai bertentangan dengan analisis awal (perlu keputusan)
Analisis kebutuhan awal memasukkan absensi, jurnal, dan buku nilai (“skill membuat template dan rekap”), tetapi v0.1 menolaknya. Aturan penolakan itu pun hanya ada di `references/daftar-perangkat.md`, yang tidak terbaca karena skill tidak terpicu.
**Pilihan:** (a) tambahkan skill `administrasi-harian`, atau (b) pindahkan aturan penolakan ke `AGENTS.md`, yang selalu dimuat.

### 4. Perbaikan kecil
- Saat CP diblokir, asisten tidak menawarkan pekerjaan yang tidak butuh CP, misalnya menghitung minggu efektif.
- `umpan-balik-guru`: model kecil menyimpan aturan dulu baru minta konfirmasi. Karena aturan bisa dibatalkan, lebih realistis mengubah skill menjadi “simpan, tampilkan, tawarkan batal”.
- Kolom integrasi nilai Islam ikut dimasukkan ke modul ajar, padahal Aturan #001 cakupannya hanya ATP.
- Kunci jawaban LKPD ada di berkas yang sama dengan lembar siswa (“jangan difotokopi bagian ini”). Lebih aman dipisah ke berkas sendiri.
- Tidak ada pandoc atau python-docx, jadi semua hasil berupa Markdown. Guru akan butuh Word, sehingga jalur ekspor perlu diputuskan.

### 5. Keandalan model gratis
Satu permintaan (skenario 6b) macet lebih dari 10 menit tanpa respons dari server model. Setelah dicoba ulang, berhasil. Runner sekarang memakai batas waktu (`BATAS`, bawaan 480 detik). Bagi guru, perlu panduan sederhana: “kalau diam lebih dari 5 menit, tekan Esc dan kirim ulang”.
