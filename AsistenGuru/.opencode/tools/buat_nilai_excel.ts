import { tool } from "@opencode-ai/plugin"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { type ATP, Gagal, bacaJson, cariAkar, cariMapel, muatDasar, slug, tulis } from "../lib/berkas.ts"
import { nilaiXlsx } from "../lib/administrasi.ts"
import { FOLDER } from "../lib/dokumen.ts"

export default tool({
  description:
    "Membuat berkas Excel buku nilai satu mapel per semester: kolom per TP (dari data ATP), STS, SAS, rumus rata-rata formatif, nilai rapor berbobot, serta TP tertinggi/terendah untuk deskripsi rapor. Nama siswa dikosongkan untuk diketik guru. Butuh data ATP (guru/data/atp-<mapel>.json). Tidak pernah menimpa berkas yang sudah ada.",
  args: {
    mapel: tool.schema.string().describe("Nama atau kode mapel"),
    semester: tool.schema.number().int().min(1).max(2),
  },
  async execute(args, ctx) {
    try {
      const akar = cariAkar(ctx.directory)
      const { profil, kebijakan } = await muatDasar(akar)
      const mapel = cariMapel(profil, args.mapel)
      const kode = slug(mapel.kode ?? mapel.nama)
      const atp = await bacaJson<ATP>(
        akar,
        `guru/data/atp-${kode}.json`,
        `Data ATP ${mapel.nama} belum ada, jadi kolom TP belum bisa dibuat. Buat perencanaan dulu (skill perencanaan-tahunan).`,
      )
      const h = nilaiXlsx(profil, kebijakan, atp, mapel.nama, args.semester)
      const dasar = `hasil/${FOLDER.administrasi}/Buku Nilai ${mapel.nama} Kelas ${profil.kelas} Semester ${args.semester} ${profil.tahun_ajaran.replace("/", "-")}`
      let rel = `${dasar}.xlsx`
      for (let i = 2; existsSync(join(akar, rel)); i++) rel = `${dasar} (${i}).xlsx`
      await tulis(akar, rel, h.data)
      return [
        `Selesai: ${rel} — ${h.tp} kolom TP, ${h.siswa} baris siswa.`,
        h.bobotSekolah ? "" : "Bobot nilai rapor memakai bawaan 50/25/25 (formatif/STS/SAS) karena sekolah belum menetapkan; sampaikan sebagai [PERLU GURU].",
        h.perkiraanSiswa ? "Jumlah siswa belum ada di profil, jadi dibuat 30 baris." : "",
      ]
        .filter(Boolean)
        .join("\n")
    } catch (e) {
      if (e instanceof Gagal) return `GAGAL: ${e.message}`
      throw e
    }
  },
})
