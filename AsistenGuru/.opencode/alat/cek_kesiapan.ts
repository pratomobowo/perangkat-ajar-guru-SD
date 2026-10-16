import { alat } from "../lib/alat.ts"
import { Gagal } from "../lib/berkas.ts"
import { TUGAS, type Tugas, cekKesiapan } from "../lib/kesiapan.ts"

export default alat<{ tugas: Tugas; mapel?: string }>({
  nama: "cek_kesiapan",
  deskripsi:
    "Cek bahan sebelum membuat perangkat (modul, soal, rencana, nilai, absen, kokurikuler, analisis): bahan apa yang sudah ada, apa yang belum, dan untuk tiap kekurangan — bisa diambilkan asisten otomatis (CP resmi, buku resmi, susun ATP) atau perlu dari guru, dengan langkah sederhana. Panggil SEBELUM membuat dokumen besar, dan saat guru bingung atau bahan tidak lengkap; jangan membuat dokumen dari bahan yang belum ada.",
  masukan: {
    type: "object",
    properties: {
      tugas: { type: "string", enum: [...TUGAS], description: "Yang ingin dibuat guru" },
      mapel: { type: "string", description: "Mata pelajaran (bila tugas terkait mapel)" },
    },
    required: ["tugas"],
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    if (!TUGAS.includes(args.tugas)) throw new Gagal(`Tugas harus salah satu: ${TUGAS.join(", ")}.`)
    return cekKesiapan(akar, args.tugas, args.mapel)
  },
})
