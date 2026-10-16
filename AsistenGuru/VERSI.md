# Versi Paket

**Versi:** 0.3.0
**Tanggal:** 2026-10-16

## Catatan perubahan
- 0.3.0 — Untuk OpenCode 2 (OpenCode 1 tidak didukung lagi). Alat dipindah dari `.opencode/tools/` ke plugin
  `.opencode/plugins/asisten-guru.ts` tanpa paket npm. Konfigurasi dan izin memakai format OpenCode 2. Berkas yang disimpan
  Notepad Windows (BOM, CRLF), jalur dengan backslash, dan karakter yang dilarang Windows di nama berkas kini ditangani.
  Pemasang satu perintah (`pasang.ps1`, `pasang.sh`): guru cukup menempel link GitHub di OpenCode dan meminta dipasangkan.
  Perintah `/perbarui` dan skill `kelola-asisten` untuk cek versi, pembaruan aman (data guru dan sekolah tidak disentuh,
  paket lama dicadangkan), cadangan, dan pindah laptop. Versi paket kini di `.opencode/paket.json` dan `VERSI.md`.
- 0.2.0 — Agent "Asisten Guru" dengan menu slash; alat deterministik untuk minggu efektif, ATP/Prota/Promes, agenda
  harian, serta ekspor Word dan Excel tanpa perlu memasang program tambahan. Skill baru: modul-ajar, asesmen,
  administrasi-harian. Profil kini `guru/profil.json` dan `guru/kalender.json`. Kebijakan angka di `sekolah/kebijakan.json`.
- 0.1.0 — rilis awal untuk uji coba Matematika Kelas 4 (Fase B).
