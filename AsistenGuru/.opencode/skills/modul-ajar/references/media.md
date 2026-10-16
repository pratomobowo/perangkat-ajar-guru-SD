# Spesifikasi media interaktif (`buat_media`)

Kamu hanya menulis isi. Gambar, permainan, dan 3D dibuat alat dengan tepat. Jangan menulis HTML/JavaScript.

```json
{ "topik": "Matematika TP3 Pecahan Senilai", "nama": "Media Pecahan",
  "spek": { "judul": "Pecahan Senilai", "petunjuk": "Kelas 4", "bagian": [ ... ] } }
```

Tiap bagian = satu layar. Semua bagian boleh punya `judul` dan `petunjuk`. Pilih yang cocok dengan kegiatan (2–5 bagian).

## Bagian

| jenis | isi minimal | catatan |
|---|---|---|
| `kuis` | `"soal": [{"tanya": "...", "pilihan": ["..",".."], "jawaban": "B"}]` | `jawaban` = huruf pilihan. Tanpa `pilihan` = isian: `"jawaban": "4"` atau `["4","empat"]`. Opsional `gambar`, `bahas` |
| `kartu` | `"kartu": [{"teks": "1/2", "balik": {"teks": "setengah"}}]` | kartu kilat, diketuk untuk dibalik. `kolom` 1–6 |
| `pasangkan` | `"pasangan": [["1/2","2/4"], ["1/3","2/6"]]` | `"mode": "memori"` untuk kartu memori (maks 10 pasangan) |
| `urutkan` | `"item": ["1/8","1/4","1/2"]` | tulis dalam urutan BENAR; alat mengacaknya |
| `roda` | `"absen": 28` atau `"isi": ["Soal 1","Soal 2"]` | roda putar; pakai nomor absen, jangan nama murid |
| `bingo` | `"ukuran": 3, "isi": [{"soal": "6×7", "jawaban": "42"}, ...]` | isian ≥ ukuran² (−1 bila ganjil); jawaban berbeda semua. `jumlah_papan` untuk dicetak |
| `ular_tangga` | `"tangga": [[3,22]], "ular": [[27,8]], "soal": {"5": {"soal": "1/2+1/2", "jawaban": "1"}}` | `tim` 2–4 |
| `peraga` | `"alat": "pecahan", "penyebut": 4, "tantangan": ["3/4"]` | lihat alat di bawah |
| `ruang` | `"bangun": ["kubus", {"bentuk": "balok", "p": 6, "l": 4, "t": 3}]` | 3D diputar + jaring-jaring + sisi/rusuk/titik sudut |
| `volume` | `"p": 4, "l": 3, "t": 2` | kubus satuan 3D (maks 8 tiap sisi) |
| `teks` | `"isi": "paragraf..."` | materi singkat |
| `gambar` | `"gambar": [ {gambar}, ... ]` | lembar gambar statis |

Alat `peraga`:
- `pecahan`: `bentuk` lingkaran/batang/persegi, `penyebut` 1–12, `tantangan` ["3/4", ...] (pecahan senilai diterima).
- `jam`: `jam`, `menit`, `langkah` (menit per geser, bawaan 5), `tantangan` ["07.30", ...].
- `garis_bilangan`: `mulai`, `akhir`, `lompat`, `loncatan` [[0,4],[4,8]] (ditampilkan satu per satu).
- `dienes`: `bilangan` awal, `tantangan` [247, ...] (ada tombol menukar 10 satuan ↔ 1 puluhan).
- `tabel_perkalian`: `dari`, `sampai` (1–12).

Bangun `ruang`: kubus (`s`), balok (`p`,`l`,`t`), prisma segitiga (`a`,`panjang`), limas segiempat (`s`,`t`),
limas segitiga (`a`), tabung (`r`,`t`), kerucut (`r`,`t`), bola (`r`). Ukuran boleh dikosongkan.
Untuk soal, pakai angka yang sama dengan panel 3D (sisi/rusuk/titik sudut): kubus & balok 6/12/8, prisma segitiga 5/9/6,
limas segiempat 5/8/5, limas segitiga 4/6/4, tabung 3/2/0, kerucut 2/1/0 (+1 titik puncak), bola 1/0/0.

`{gambar}` (untuk kuis, kartu, pasangkan, urutkan, bagian gambar):
`{"jenis": "pecahan", "pembilang": 3, "penyebut": 4, "bentuk": "lingkaran"}`, `{"jenis": "jam", "jam": 7, "menit": 30}`,
`{"jenis": "bangun", "bangun": "trapesium"}`, `{"jenis": "dienes", "bilangan": 247}`,
`{"jenis": "garis_bilangan", "mulai": 0, "akhir": 10}`. Isi kartu/pasangan boleh teks biasa atau `{"teks": "..", "gambar": {..}}`.

## Contoh lengkap

```json
{ "judul": "Bangun Ruang", "bagian": [
  { "jenis": "ruang", "bangun": ["kubus", "balok", "tabung"] },
  { "jenis": "kuis", "soal": [
    { "tanya": "Kubus mempunyai berapa rusuk?", "pilihan": ["6", "8", "12"], "jawaban": "C" },
    { "tanya": "Bangun yang tidak punya titik sudut?", "pilihan": ["Balok", "Tabung", "Limas"], "jawaban": "B" } ] },
  { "jenis": "volume", "p": 4, "l": 3, "t": 2 } ] }
```

Aturan: jawaban kuis harus benar menurut buku/sumber; soal sesuai TP dan kelas; tanpa nama murid sungguhan.
