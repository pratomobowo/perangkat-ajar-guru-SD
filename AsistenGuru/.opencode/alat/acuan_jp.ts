import { alat } from "../lib/alat.ts"
import { acuanJp } from "../lib/struktur.ts"

export default alat<{ kelas: number; mapel?: string[] }>({
  nama: "acuan_jp",
  deskripsi:
    "JP (jam pelajaran) per minggu tiap mapel menurut struktur kurikulum SD resmi (Permendikdasmen 13/2025 Lampiran II). Pakai saat guru belum tahu JP mapelnya — jangan menebak angka JP. Mengembalikan JP intrakurikuler per minggu (yang dipakai untuk perencanaan mapel) dan total bila jam kokurikuler dibagi ke mapel.",
  masukan: {
    type: "object",
    properties: {
      kelas: { type: "integer", minimum: 1, maximum: 6 },
      mapel: { type: "array", items: { type: "string" }, description: "Nama mapel; kosongkan untuk semua mapel kelas itu" },
    },
    required: ["kelas"],
    additionalProperties: false,
  },
  async jalankan(args) {
    const { minggu, baris } = acuanJp(Number(args.kelas), args.mapel)
    const fmt = (x: number | null) => (x === null ? "–" : Number.isInteger(x) ? String(x) : x.toFixed(1))
    const out = [
      `Acuan JP kelas ${args.kelas} (Permendikdasmen No. 13 Tahun 2025, Lampiran II; ${minggu} minggu/tahun, 1 JP = 35 menit):`,
      "| Mapel | JP intrakurikuler per minggu | Total bila jam kokurikuler dibagi ke mapel |",
      "|---|---|---|",
      ...baris.map((b) => `| ${b.mapel ?? `${b.diminta} (tidak ada di struktur resmi)`} | ${b.mapel && b.intraMinggu === null ? "tidak diajarkan di kelas ini" : fmt(b.intraMinggu)} | ${fmt(b.totalMinggu)} |`),
      "",
      "Simpan JP INTRAKURIKULER sebagai jp_per_minggu di profil. Sampaikan ke guru bahwa ini acuan resmi dan jadwal sekolah bisa berbeda (misalnya jam kokurikuler digabung ke mapel); minta guru mencocokkan dengan jadwal dari sekolah bila sudah ada.",
    ]
    return out.join("\n")
  },
})
