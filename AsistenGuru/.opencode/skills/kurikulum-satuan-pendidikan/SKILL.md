---
name: kurikulum-satuan-pendidikan
description: Menyusun draf Kurikulum Satuan Pendidikan (KSP, dulu disebut KOSP) untuk SD sesuai Permendikbudristek 12/2024 Pasal 29, Permendikdasmen 13/2025, dan Panduan Pengembangan KSP Edisi Revisi 2025 — analisis karakteristik sekolah, visi-misi-tujuan, pengorganisasian pembelajaran (struktur kurikulum, kokurikuler, ekstrakurikuler), perencanaan pembelajaran, evaluasi dan pengembangan profesional, serta lembar penetapan. Gunakan saat pengguna (kepala sekolah, waka kurikulum, atau guru tim kurikulum) menyebut KSP, KOSP, kurikulum operasional, kurikulum sekolah, struktur kurikulum, atau dokumen 1 kurikulum.
---

# Kurikulum Satuan Pendidikan (KSP)

KSP adalah dokumen **sekolah** yang ditetapkan kepala sekolah, bukan dokumen guru kelas. Asisten hanya menyiapkan
**draf** untuk tim kurikulum. Baca `references/regulasi.md` dulu; angka struktur kurikulum diambil dari sana, bukan dikarang.

## Langkah
1. Sampaikan singkat: istilah resminya sekarang KSP; sekolah bebas menentukan bentuk dokumen; minimal memuat 4 komponen
   Pasal 29 (ditambah komponen evaluasi di panduan).
2. Kumpulkan data **sekolah** (bertahap, paling banyak 3 pertanyaan sekali). Hanya angka dan gambaran umum, **tanpa data
   pribadi murid atau guru**:
   - karakteristik: jumlah rombel dan murid per kelas, jumlah pendidik dan tenaga kependidikan, sarana penting, lingkungan
     sosial budaya, hasil Rapor Pendidikan yang menonjol (jika ada);
   - visi, misi, tujuan sekolah yang sudah ada (jika belum ada, usulkan draf yang selaras 8 dimensi profil lulusan dan
     tandai `[PERLU SEKOLAH]`);
   - kekhasan sekolah (misalnya SDIT: program keagamaan), muatan lokal, ekstrakurikuler, model pengorganisasian;
   - rencana kokurikuler setahun (tema per kelas) bila sudah ada.
3. Tulis `guru/draf/6 Dokumen Sekolah/Kurikulum Satuan Pendidikan <TA>.md`:
   ````
   # KURIKULUM SATUAN PENDIDIKAN
   ```identitas
   Satuan pendidikan: …
   Tahun pelajaran: …
   ```
   ## Lembar Penetapan
   ## 1. Analisis Karakteristik Satuan Pendidikan
   ## 2. Visi, Misi, dan Tujuan
   ## 3. Pengorganisasian Pembelajaran
   ### 3.1 Intrakurikuler (struktur kurikulum dan beban belajar)
   ### 3.2 Kokurikuler
   ### 3.3 Ekstrakurikuler
   ## 4. Perencanaan Pembelajaran
   ## 5. Evaluasi, Pengembangan Profesional, dan Pendampingan
   ## Lampiran
   ## Sumber
   ````
   - 3.1: tabel struktur kurikulum per kelas dari `references/regulasi.md` (sertakan pilihan seni, bahasa Inggris, muatan
     lokal, dan Koding & KA sesuai pilihan sekolah), serta JP per minggu bila sekolah memberikannya.
   - 3.2: alokasi JP kokurikuler per kelas, bentuk, dan tema per kelas (rujuk skill `kokurikuler`).
   - 3.3: minimal kepramukaan, ditambah ekstrakurikuler pilihan sekolah.
   - 4: cukup ringkasan dan daftar lampiran (ATP per mapel, rencana kokurikuler, beberapa contoh modul ajar/RPM). Jika
     dokumen perencanaan guru sudah ada di `hasil/`, sebutkan nama berkasnya sebagai lampiran.
   - 5: rencana evaluasi per semester/tahun, refleksi, supervisi, komunitas belajar, dan pendampingan.
   - Lembar Penetapan: kalimat penetapan oleh kepala sekolah untuk tahun pelajaran itu, dengan tempat tanda tangan.
   - Sumber: regulasi dan panduan yang dipakai.
4. Tandai `[PERLU SEKOLAH: …]` untuk semua data yang belum diberikan. Jangan mengarang angka murid, guru, atau hasil Rapor
   Pendidikan.
5. Ekspor dengan `ekspor_word`. Sampaikan: KSP perlu dibahas tim, melibatkan komite, lalu ditetapkan kepala sekolah.
