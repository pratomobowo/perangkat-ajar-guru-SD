---
name: template-guru
description: Menyimpan dan menerapkan keinginan guru tentang format dokumen Word supaya dipakai di setiap ekspor berikutnya — tampilan (huruf, ukuran, spasi, margin, kertas, kop, tanda tangan, warna tabel, nomor halaman), susunan bagian dokumen (kerangka RPM/LKPD/soal), dan Word contoh milik guru atau Word hasil asisten yang sudah diedit guru. Gunakan saat guru berkata "hurufnya ...", "margin ...", "tanpa kop", "format saya", "template", "pakai format Word saya", "pakai yang sudah saya edit sebagai contoh", "seperti contoh ini", "RPM saya selalu ada bagian ...", "lihat format", "kembalikan format", atau mengetik /format.
---

# Template Guru

Keinginan format disimpan di folder `guru/` (tidak ditimpa pembaruan) dan dipakai **otomatis** oleh `ekspor_word`,
`susun_perencanaan`, dan `hitung_minggu_efektif`. Ada tiga lapis; pilih yang sesuai permintaan guru:

| Guru ingin | Lapis | Cara |
|---|---|---|
| Huruf, ukuran, spasi, rata, kertas, orientasi, margin, kop, tanda tangan, warna/huruf tabel, nomor halaman | 1. Gaya | alat `atur_gaya` |
| Bagian wajib, urutan bagian, kolom tabel, isian identitas | 2. Kerangka | berkas `guru/template/<Dokumen>.md` |
| "Pakai format Word saya", "pakai yang sudah saya edit" | 3. Word contoh | alat `simpan_template_word` |

Nama dokumen yang dipakai: LKPD, RPM, Modul Ajar, Soal, Kunci LKPD, Kunci dan Penskoran, Kisi-kisi, KKTP, Jurnal Mengajar,
ATP, Prota, Promes, Minggu Efektif (sama dengan nama berkas draf).

## Langkah
1. **Cakupan.** Semua dokumen atau satu jenis saja? Jika tidak jelas, tanyakan satu kalimat ("Untuk semua dokumen atau
   LKPD saja?"). Arahan isi (apa yang ditulis) tetap ke skill `umpan-balik-guru`; skill ini untuk format dan susunan.
2. **Terapkan.**
   - Lapis 1: `atur_gaya` dengan `dokumen` dan `ubah` (hanya bagian yang diminta). Ukuran dalam pt, margin dalam cm.
     Contoh: "huruf Times 12, margin kiri 3" → `{"dokumen":"semua","ubah":{"huruf":"Times New Roman","ukuran":12,"margin":{"kiri":3}}}`.
   - Lapis 2: tulis/ubah `guru/template/<Dokumen>.md`. Jika belum ada, salin susunan judul dari draf terbaru jenis itu lalu
     ubah sesuai permintaan. Formatnya Markdown biasa: `# JUDUL`, blok `identitas` berisi label (`Label: `), judul bagian
     `##` sesuai urutan, dan baris kepala tabel jika ada kolom tetap. Catat satu baris di `guru/riwayat-perubahan.md`:
     `YYYY-MM-DD | template | <Dokumen> | <perubahan>`.
   - Lapis 3: guru menyimpan Word-nya **di dalam folder AsistenGuru** (misalnya `guru/contoh/`), atau memakai Word hasil
     asisten di `hasil/` yang sudah ia edit. Minta guru **menutup Word dulu**, lalu panggil `simpan_template_word` dengan
     `berkas` dan `dokumen`. Alat juga menyimpan kerangkanya (lapis 2). Kop sebaiknya ada di Header Word supaya tidak dobel.
3. **Tunjukkan hasilnya.** Ekspor ulang draf terbaru jenis itu dengan `ekspor_word`, lalu sebutkan nama berkas Word-nya.
   Sampaikan catatan dari alat (misalnya bagian kerangka yang belum ada di draf).
4. **Laporkan singkat** (≤ 3 baris): apa yang disimpan dan cakupannya, lalu "Jika keliru, bilang 'kembalikan format tadi'".

## Menulis draf mengikuti kerangka
Sebelum menulis draf jenis apa pun, cek `guru/template/<Dokumen>.md` lalu `sekolah/template/<Dokumen>.md`. Jika ada, ikuti
jenis dan urutan bagian, blok identitas, dan kolom tabelnya; judul yang khusus topik (misalnya "Pertemuan 1: ...")
disesuaikan dengan topik baru. Isi tetap dari skill terkait. Jika `ekspor_word` melaporkan bagian yang
belum ada di draf, lengkapi lalu ekspor ulang.

## Melihat, membatalkan, menghapus
- "Formatnya apa saja sekarang?" / `/format` → `atur_gaya` tanpa argumen; ringkas dalam daftar pendek.
- "Kembalikan format tadi" → `atur_gaya` dengan `kembalikan: true` (gaya), atau kembalikan kerangka dari riwayat/cadangan.
- "Margin balik ke bawaan" → `atur_gaya` dengan `hapus: ["margin"]`.
- "Jangan pakai Word contoh lagi untuk RPM" → `simpan_template_word` dengan `dokumen: "RPM"`, `hapus: true`.

## Urutan yang berlaku
Gaya sekolah < gaya guru "semua dokumen" < Word contoh jenis itu < gaya guru khusus jenis itu. Bagian yang dikunci sekolah
selalu berlaku. Jadi jika guru memberi Word contoh LKPD lalu berkata "LKPD hurufnya 14", pakai `atur_gaya` dengan
`dokumen: "LKPD"` (bukan "semua").

## Aturan sekolah
Jika alat menolak karena bagian dikunci sekolah atau template sekolah wajib, jelaskan satu kalimat dan tawarkan
"usulkan ke sekolah" (skill `umpan-balik-guru`). Jangan mengakali aturan sekolah.
