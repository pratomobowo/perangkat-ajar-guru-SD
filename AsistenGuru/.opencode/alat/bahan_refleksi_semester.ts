import { alat } from "../lib/alat.ts"
import { hariIni } from "../lib/kalender.ts"
import { bahanRefleksi } from "../lib/refleksi.ts"

export default alat<{ semester?: 1 | 2; tanggal?: string }>({
  nama: "bahan_refleksi_semester",
  deskripsi:
    "Kewajiban guru tiap semester: refleksi diri sebagai penilaian proses pembelajaran (Permendikdasmen No. 1 Tahun 2026 Pasal 15). Alat ini mengumpulkan bahan refleksi dari berkas guru — ketuntasan dan rata-rata per TP dari buku nilai, tingkat kesukaran dan daya beda dari analisis butir soal yang sudah diisi, kehadiran, catatan tindak lanjut jurnal, jumlah modul dan asesmen — sebagai angka kelas tanpa nama siswa, lengkap dengan tabel siap tempel dan jalur draf. Panggil sebelum menyusun refleksi (skill refleksi-pembelajaran).",
  masukan: {
    type: "object",
    properties: {
      semester: { type: "integer", enum: [1, 2], description: "Bawaan: semester berjalan atau yang baru selesai" },
      tanggal: { type: "string", description: "YYYY-MM-DD, bawaan hari ini" },
    },
    additionalProperties: false,
  },
  async jalankan(a, akar) {
    return (await bahanRefleksi(akar, a.tanggal ?? hariIni(), a.semester)).teks
  },
})
