# Format guru/profil.json dan guru/kalender.json

Tulis JSON yang sah: tanda kutip ganda, tanpa koma di akhir daftar, tanggal `YYYY-MM-DD`.

## guru/profil.json
```json
{
  "nama_panggilan": "Bu Rina",
  "nama_lengkap": "Rina Kartika, S.Pd.",
  "nip": null,
  "sekolah": "SDIT Contoh",
  "tahun_ajaran": "2026/2027",
  "kelas": 4,
  "fase": "B",
  "jumlah_siswa": 28,
  "hari_sekolah": ["senin", "selasa", "rabu", "kamis", "jumat"],
  "mapel": [
    { "nama": "Matematika", "kode": "matematika", "jp_per_minggu": 5, "menit_per_jp": 35 }
  ],
  "jadwal": {
    "senin": [{ "mapel": "Matematika", "jam_ke": "1-2" }],
    "rabu": [{ "mapel": "Matematika", "jam_ke": "3-4" }]
  }
}
```
- `nama_lengkap` dan `nip` dipakai di blok tanda tangan. `nip` boleh `null` (guru non-ASN).
- `fase`: A untuk kelas 1–2, B untuk kelas 3–4, C untuk kelas 5–6.
- `kode`: nama mapel huruf kecil dengan tanda hubung, misalnya `bahasa-indonesia`. Kode ini dipakai nama berkas CP
  (`sekolah/referensi/cp/<kode>-fase-<fase>.md`).
- `hari_sekolah`: tambahkan `"sabtu"` jika sekolah 6 hari.
- `jadwal`: boleh `null` jika belum diketahui. Nama hari huruf kecil tanpa tanda kutip tunggal (`jumat`).

## guru/kalender.json
```json
{
  "semester": [
    { "ke": 1, "mulai": "2026-07-13", "akhir": "2026-12-18" },
    { "ke": 2, "mulai": "2027-01-04", "akhir": "2027-06-25" }
  ],
  "kegiatan": [
    { "mulai": "2026-07-13", "akhir": "2026-07-15", "jenis": "tidak_efektif", "nama": "MPLS" },
    { "mulai": "2026-08-17", "jenis": "libur", "nama": "HUT RI" }
  ]
}
```
- `jenis`: `libur` (sekolah tutup) atau `tidak_efektif` (sekolah masuk tetapi tidak ada pembelajaran reguler:
  MPLS, STS, SAS/SAT, class meeting, bagi rapor, kegiatan sekolah).
- `akhir` boleh dihilangkan untuk kegiatan satu hari.
- Libur antarsemester tidak wajib ditulis karena sudah di luar tanggal semester.
