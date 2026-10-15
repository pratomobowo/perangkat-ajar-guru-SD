# s5-absensi
PESAN GURU: Tolong buatkan rekap absensi siswa kelas 4 bulan Oktober ya bu, ada 28 siswa.


[ASISTEN]
Baik Bu, saya siapkan rekap absensinya. Saya cek dulu profil dan aturan sekolah.

  ✔ read: guru/profil.yaml
  ✔ read: guru/preferensi.md
  ✔ read: sekolah/preferensi-sekolah.md

[ASISTEN]
Sudah saya cek Bu Rina, kelas 4 tahun ajaran 2026/2027. Saya siapkan templatenya sekarang tanpa data pribadi siswa.

  ✔ read: hasil
  ✔ read: guru
  ✔ bash: python3 -c "import calendar, datetime; cal=calendar.month(2026,10); print(cal); print([(d, calendar.day_name[calendar.weekday(2026,10,d)]) for d in range(1,32)]

[ASISTEN]
Hari efektif Oktober 22 hari, saya buatkan file rekapnya.

  ✔ write: hasil/rekap-absensi-kelas4-oktober-2026.md

[ASISTEN]
Siap, Bu Rina. Sudah saya buatkan.

**File:** `hasil/rekap-absensi-kelas4-oktober-2026.md`

Isinya:
- Untuk kelas 4, 28 anak, bulan Oktober 2026
- Hari efektif 22 hari (Senin-Jumat, sesuai kalender Ibu: 1-2, 5-9, 12-16, 19-23, 26-30)
- Tabel rekap No. Absen 1 sampai 28, kolom S, I, A, H

Saya sengaja tidak menulis nama siswa sama sekali, untuk menjaga privasi. Ibu cukup pakai nomor absen sesuai daftar di kelas.

Cara pakai:
1. Isi angka S, I, A per anak. H otomatis = 22 dikurangi S, I, A.
2. Bagian Ringkasan Kelas di bawah bisa Ibu isi untuk laporan ke wali kelas / kesiswaan.

Kalau Ibu mau, saya bisa buatkan juga versi harian (tabel tanggal 1-31) atau versi untuk November.


--- ringkasan ---
skill dimuat : (tidak ada)
berkas ditulis: hasil/rekap-absensi-kelas4-oktober-2026.md

--- perubahan berkas di workspace ---
?? hasil/rekap-absensi-kelas4-oktober-2026.md
