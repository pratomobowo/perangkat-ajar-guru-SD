# Laporan Uji E2E v0.2 — Asisten Guru di OpenCode

- **Tanggal:** 2026-10-16
- **OpenCode:** 1.18.30, lingkungan terisolasi (tanpa skill/plugin global), mode `opencode run --pure --auto`
- **Model:** `opencode/muse-spark-1.3-contributor-free` (gratis)
- **Persona:** Bu Rina (Rina Kartika, S.Pd.), wali kelas 4 SDIT Al Hikmah, Matematika 5 JP/minggu, 28 murid, TA 2026/2027
- **Sekolah:** `kebijakan.json` diisi seperti oleh operator. CP memakai fixture sekunder berstatus `SEKUNDER` (bukan teks resmi).
- **Transkrip:** `log-v02-final/` (uji final dari nol) dan `log-v02/` (uji pengembangan). Hasil lengkap ada di `contoh-hasil-v02/`.

## Hasil uji final (dari nol, 12 langkah)

| # | Langkah guru | Yang terjadi | Hasil |
|---|---|---|---|
| 1 | "Assalamualaikum, saya guru baru" | `guru-setup` terpicu, menanyakan identitas | ✔ |
| 2 | Semua data plus kalender dalam **satu pesan** | Profil dan kalender tersimpan, minggu efektif dihitung alat (19 + 19), Word dibuat | ✔ |
| 3–4 | "Ya, tolong susunkan" → "Boleh, buatkan drafnya" | Minta izin karena CP sekunder. 14 TP, alat memvalidasi, lalu ATP/Prota/Promes Word terbit | ✔ |
| 5–6 | `/modul` **tanpa topik** → menjawab 3 pertanyaan | Mengambil TP5 dari agenda, membuat RPM, LKPD, dan Kunci. 16/16 jawaban benar, menit pas (70+70+35) | ✔ |
| 7 | `/soal ulangan harian TP3 …` | Kisi-kisi, Soal, Kunci, KKTP. 12/12 kunci benar, skor konsisten | ✔ |
| 8 | `/jurnal …` sambil menyebut nama 3 murid | Jurnal tersimpan **tanpa nama** ("2 sakit", "beberapa murid") | ✔ |
| 9 | `/absen oktober` | Excel daftar hadir: 22 hari sekolah, 28 baris | ✔ |
| 10 | `/nilai matematika semester 1` | Excel buku nilai, 7 kolom TP | ✔ |
| 11 | "Mulai sekarang setiap LKPD …" | Aturan #001 tersimpan dengan cakupan LKPD, plus tawaran "batalkan aturan #1" | ✔ |
| 12 | `/hari-ini` | Status hari, jadwal jam ke-1, TP minggu ini, jurnal terakhir sudah terisi | ✔ |

## Pemeriksaan presisi

| Pemeriksaan | Cara | Hasil |
|---|---|---|
| Minggu efektif | Dihitung manual per minggu Senin–Jumat dan dibandingkan dengan alat | Sama: 19 + 19 |
| Kalender yang ditulis model | Dibandingkan dengan kalender acuan | Identik (libur antarsemester boleh dilewati) |
| Konsistensi ATP, Prota, Promes | Ketiganya dibuat alat dari satu data | Terjamin; revisi guru mengubah ketiganya serentak |
| Rumus Excel | Dihitung dengan HyperFormula (mesin kompatibel Excel) memakai data contoh, termasuk bobot diubah guru | Semua benar (`rumus/`) |
| Struktur Word dan Excel | Urutan elemen XML dicek terhadap skema OOXML untuk 15 berkas hasil e2e | 0 pelanggaran |
| Isi soal dan LKPD | Semua kunci dikerjakan ulang manual | 28/28 benar |
| Privasi | Mencari nama murid di semua berkas | Tidak ada |

## Standar format yang diterapkan

**Word:** A4 atau F4 (dari kebijakan sekolah); margin 2 cm dan kiri 2,5 cm; huruf Arial; kop sekolah bergaris; judul kapital di tengah;
identitas dengan titik dua sejajar; lebar kolom tabel mengikuti isi; kolom angka rata tengah; judul kolom berulang di tiap halaman;
baris tabel tidak terpotong; minggu tidak efektif berwarna abu-abu; tabel ≥ 7 kolom otomatis lanskap; nomor "Halaman X dari Y";
tanda tangan Kepala Sekolah dan Guru (nama, NIP jika ada, kota, tanggal); label DRAF merah; `[PERLU GURU]` berstabilo kuning.
- **Lembar siswa** (LKPD, Soal): huruf 12 pt, jarak baris longgar, tanpa tanda tangan, pilihan A–D berjajar, soal tidak terpisah dari pilihannya.
- **Kunci:** kotak "KUNCI JAWABAN — UNTUK GURU, JANGAN DIBAGIKAN".
- **Jurnal:** tanggal tampil sebagai "Rabu, 14 Oktober 2026".

**Excel:** kop dan judul; judul kolom bertingkat; sel isian kuning; rumus terkunci tanpa kata sandi; validasi isian (S/I/A, nilai 0–100);
warna otomatis untuk S/I/A dan nilai di bawah batas ketuntasan; baris rata-rata, tertinggi, dan terendah; cetak lanskap selebar
1 halaman dengan judul kolom berulang; nomor halaman; tanda tangan.

**Folder:** `hasil/` hanya berisi Word dan Excel bernama jelas (`1 Perencanaan`, `2 Modul dan LKPD`, `3 Asesmen`, `4 Administrasi`).
Draf Markdown disimpan terpisah di `guru/draf/`.

## Dibandingkan v0.1

| Masalah di v0.1 | Status di v0.2 |
|---|---|
| ATP dan Prota bertentangan, tetapi divalidasi ✔ | Diselesaikan: angka dihitung alat, dan revisi lewat data |
| Konvensi minggu efektif diambil diam-diam | Diselesaikan: aturan di `kebijakan.json`, atau ditandai `[PERLU GURU]` |
| Cakupan absensi/nilai tidak jelas | Diselesaikan: masuk cakupan dengan Excel yang nama murid tidak pernah lewat AI |
| Tidak menawarkan pekerjaan saat CP kosong | Diselesaikan: menawarkan minggu efektif |
| Aturan disimpan sebelum konfirmasi | Diselesaikan: alur diubah menjadi simpan, laporkan, lalu tawarkan batal |
| Kunci jawaban satu berkas dengan LKPD | Diselesaikan |
| Hanya Markdown (tanpa pandoc) | Diselesaikan: Word dan Excel dibuat sendiri tanpa program tambahan |
| Model gratis macet | Masih terjadi sesekali di pengembangan. Panduan guru menjelaskan "tekan Esc dan kirim ulang" |

## Catatan dan keterbatasan
- **Belum dibuka langsung di Microsoft Word/Excel.** Automasi Office di laptop ini tertahan dialog izin. Verifikasi memakai skema XML,
  HyperFormula, Quick Look, dan docx-preview. Mohon buka beberapa berkas di `contoh-hasil-v02/hasil/` dengan Word/Excel sebagai cek akhir.
- Kualitas pedagogis TP masih perlu dinilai guru. Contohnya, kelas 4 cenderung mencakup seluruh CP Fase B, dan LKPD TP5 memakai
  perkalian padahal TP-nya penjumlahan/pengurangan.
- CP yang dipakai adalah fixture sekunder. Sebelum pilot, sekolah harus mengisi CP resmi.

## Cara mengulang
1. Uji pustaka: `cd fixture && bun uji-lib.ts`, lalu `cd ../rumus && bun install && bun uji-rumus-fixture.ts ../fixture`.
2. Uji e2e: lihat `jalankan.sh`. Atur `WS` (salinan `AsistenGuru` yang sudah di-`git init`), `ISO` (HOME kosong), dan `LOGDIR`.
