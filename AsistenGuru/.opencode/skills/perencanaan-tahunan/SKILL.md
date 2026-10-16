---
name: perencanaan-tahunan
description: Menyusun perencanaan tahunan guru dari Capaian Pembelajaran (CP) — minggu efektif, Tujuan Pembelajaran (TP), Alur Tujuan Pembelajaran (ATP), Program Tahunan (Prota), dan Program Semester (Promes) — dalam bentuk Word. Gunakan setiap kali guru menyebut ATP, alur tujuan pembelajaran, TP, minggu efektif, prota, promes, program tahunan atau semester, atau meminta pembagian materi dan jam pelajaran untuk satu semester atau tahun ajaran, meskipun tidak memakai kata "perencanaan". Juga untuk merevisi perencanaan yang sudah ada.
---

# Perencanaan Tahunan

Pembagian kerja: **kamu** merumuskan TP dan urutannya (keputusan pedagogis). **Alat `susun_perencanaan`** menghitung
minggu efektif, memeriksa JP, lalu menyusun dokumen ATP, Prota, dan Promes. Jangan menulis tabel Prota/Promes atau
menghitung JP sendiri.

## 1. Prasyarat
- `guru/profil.json` dan `guru/kalender.json` ada. Jika belum → skill `guru-setup`.
- CP ada di `sekolah/referensi/cp/<kode-mapel>-fase-<fase>.md` (diutamakan) atau `guru/referensi/cp/` (diambil otomatis).
  Baca frontmatter-nya:
  - keduanya tidak ada atau CP sekolah `status: BELUM-TERISI` → tawarkan mengambil CP resmi otomatis dengan alat `ambil_cp`
    (dari Keputusan Kepala BSKAP 046/H/KR/2025). Jika guru menolak atau gagal, **berhenti**: jelaskan bahwa waka
    kurikulum/operator perlu mengisi CP, dan tawarkan menghitung minggu efektif (`hitung_minggu_efektif`).
  - status selain `TERVERIFIKASI` (misalnya `OTOMATIS-RESMI` atau `SEKUNDER`) → jelaskan dalam satu kalimat bahwa dokumen akan
    berlabel DRAF sampai CP dicocokkan dengan dokumen resmi, lalu lanjut jika guru setuju.
- Cek apakah sekolah sudah punya pembagian TP/ATP untuk fase ini (`sekolah/template/`, atau data lama di `guru/data/`).
  Jika ada, jadikan dasar. Jika tidak, tanyakan sekali: "Sekolah sudah punya pembagian materi kelas <x> dan <y>?"

## 2. Rumuskan TP lalu tulis data ATP
Tulis `guru/data/atp-<kode-mapel>.json` sesuai `references/format-data-atp.md`. Pedoman isi:
- **CP per fase, rencana per kelas.** Fase B = kelas 3–4, sehingga kelas 4 melanjutkan kelas 3. Bagi kedalaman materi
  (misalnya bilangan sampai 1.000 di kelas 3, sampai 10.000 di kelas 4). Elemen yang memang hanya diajarkan di kelas
  lain ditulis di `elemen_tidak_di_kelas_ini` beserta alasannya. Tandai usulan pembagian dengan `[PERLU GURU: ...]` di `catatan`.
- Rumusan TP memuat **kompetensi yang bisa diamati** (menjelaskan, menentukan, menyelesaikan masalah, menyajikan) dan
  **konten** yang spesifik. Hindari TP yang hanya "review" atau "latihan".
- Kata elemen harus persis sama dengan daftar `elemen` di frontmatter berkas CP.
- Urutkan sesuai prasyarat: konsep dasar dulu.
- JP tiap TP sebaiknya kelipatan JP per minggu. Sisakan cadangan JP untuk asesmen dan remedial (`cadangan_jp`), mengikuti
  `sekolah/kebijakan.json` jika ada. Jika tidak ada, usulkan sekitar 2 minggu per semester dan tandai `[PERLU GURU]`.
  Kapasitas JP dihitung alat; cukup perkirakan, alat akan memberi tahu jika berlebih.
- Isi `nilai_islam` hanya jika `sekolah/preferensi-sekolah.md` atau `guru/preferensi.md` memintanya. Isinya konteks dan
  kegiatan, tanpa dalil.

## 3. Susun dokumen
Panggil `susun_perencanaan` dengan nama mapel.
- Jika hasilnya `GAGAL`: perbaiki data ATP sesuai pesan (misalnya mengurangi JP atau menambah TP untuk elemen yang belum
  tercakup), lalu panggil lagi.
- Jika ada ✖ "JP belum terpakai", bagikan sisa itu ke TP yang paling butuh waktu (kelipatan JP per minggu), lalu panggil
  lagi sebelum melapor ke guru.
- Jika berhasil: sampaikan ringkasan dalam 5 baris, salin daftar validasi (✔/✖) apa adanya, lalu sebutkan folder Word-nya.
  Tanyakan apa yang ingin diubah.

## 4. Revisi
Setiap perubahan (urutan TP, JP, rumusan, pindah semester) dilakukan dengan mengubah data ATP, lalu memanggil
`susun_perencanaan` lagi. Jangan mengedit berkas Prota/Promes langsung, karena akan tertimpa dan tidak konsisten.
Arahan yang berlaku seterusnya → skill `umpan-balik-guru`.

Untuk pilot Matematika kelas 4, lihat juga `references/pilot-matematika-kelas4.md`.
