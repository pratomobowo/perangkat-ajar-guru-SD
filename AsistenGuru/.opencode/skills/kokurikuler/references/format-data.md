# Format guru/data/kokurikuler-<tema>.json

Nama berkas: `kokurikuler-` + tema huruf kecil dengan tanda hubung, misalnya `kokurikuler-lingkunganku-sehat-aku-kuat.json`.

```json
{
  "tema": "Lingkunganku Sehat, Aku Kuat",
  "bentuk": "Pembelajaran kolaboratif lintas disiplin ilmu",
  "kelas": 4,
  "semester": 1,
  "alokasi_jp": 36,
  "mapel_terkait": ["IPAS", "Matematika", "Bahasa Indonesia"],
  "skala": "SB/B/C/K",
  "dimensi": [
    { "dimensi": "Penalaran Kritis", "subdimensi": "Penyelesaian masalah", "frasa": "penalaran kritis saat mencari solusi masalah sampah di sekolah" },
    { "dimensi": "Kolaborasi", "subdimensi": "Kerja sama", "frasa": "bekerja sama dalam kelompok" },
    { "dimensi": "Komunikasi", "subdimensi": "Berbicara", "frasa": "mengomunikasikan gagasan" }
  ]
}
```
- `bentuk`: "Pembelajaran kolaboratif lintas disiplin ilmu", "Gerakan 7 Kebiasaan Anak Indonesia Hebat", atau "Cara lainnya: …".
- `dimensi`: salah satu dari 8 dimensi (lihat `regulasi.md`); `subdimensi` dari daftar subdimensi SD. Pilih 1–3 dimensi.
- `frasa`: potongan kalimat untuk deskripsi rapor setelah "sudah baik dalam …" / "masih perlu pendampingan dalam …"
  (huruf kecil, spesifik pada kegiatan). Jika kosong, dipakai nama dimensi dan subdimensi.
- `skala`: "SB/B/C/K" (bawaan, contoh rubrik panduan), "Mahir/Cakap/Berkembang" (tahapan APK), atau
  "Terbiasa/Belum Terbiasa" (G7KAIH; isi `dimensi` dengan kebiasaan sebagai `subdimensi`, misalnya
  `{ "dimensi": "Kemandirian", "subdimensi": "Bangun pagi", "frasa": "membiasakan bangun pagi" }`).
