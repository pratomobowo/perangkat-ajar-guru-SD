# Format guru/data/atp-<kode-mapel>.json

```json
{
  "mapel": "matematika",
  "kelas": 4,
  "fase": "B",
  "cadangan_jp": { "1": 10, "2": 10 },
  "elemen_tidak_di_kelas_ini": [
    { "elemen": "Contoh Elemen", "alasan": "Diajarkan di kelas 3 menurut pembagian sekolah" }
  ],
  "catatan": [
    "[PERLU GURU: pembagian materi kelas 3 dan 4 adalah usulan asisten karena sekolah belum punya.]"
  ],
  "tp": [
    {
      "kode": "TP1",
      "semester": 1,
      "tujuan": "Membaca, menulis, dan membandingkan bilangan cacah sampai 10.000 berdasarkan nilai tempat",
      "materi": "Bilangan cacah sampai 10.000",
      "elemen": ["Bilangan"],
      "jp": 15,
      "nilai_islam": "Teliti dan jujur saat menghitung kotak infak kelas"
    }
  ]
}
```

Aturan:
- `kode` unik dan berurutan (TP1, TP2, ...). Urutan dalam daftar = urutan mengajar.
- `semester`: 1 atau 2. `jp`: bilangan bulat positif.
- `elemen`: satu atau lebih nama elemen yang **persis** sama dengan frontmatter `elemen` di berkas CP.
- `materi`: judul pendek (tampil di Prota dan agenda harian).
- `nilai_islam`, `elemen_tidak_di_kelas_ini`, `catatan`: opsional. `cadangan_jp`: opsional; jika tidak ada, alat memakai kebijakan sekolah.
