# Versi Paket

**Versi:** 0.3.0-dev
**Tanggal:** 2026-10-16

## Catatan perubahan
- 0.3.0-dev — Untuk OpenCode 2 (OpenCode 1 tidak didukung lagi). Alat dipindah dari `.opencode/tools/` ke plugin
  `.opencode/plugins/asisten-guru.ts` tanpa paket npm. Konfigurasi dan izin memakai format OpenCode 2. Berkas yang disimpan
  Notepad Windows (BOM, CRLF), jalur dengan backslash, dan karakter yang dilarang Windows di nama berkas kini ditangani.
- 0.2.0 — Agent "Asisten Guru" dengan menu slash; alat deterministik untuk minggu efektif, ATP/Prota/Promes, agenda
  harian, serta ekspor Word dan Excel tanpa perlu memasang program tambahan. Skill baru: modul-ajar, asesmen,
  administrasi-harian. Profil kini `guru/profil.json` dan `guru/kalender.json`. Kebijakan angka di `sekolah/kebijakan.json`.
- 0.1.0 — rilis awal untuk uji coba Matematika Kelas 4 (Fase B).
