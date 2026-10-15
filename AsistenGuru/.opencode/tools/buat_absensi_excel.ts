import { tool } from "@opencode-ai/plugin"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { Gagal, cariAkar, muatDasar, tulis } from "../lib/berkas.ts"
import { absensiXlsx, tahunUntukBulan } from "../lib/administrasi.ts"
import { NAMA_BULAN } from "../lib/kalender.ts"
import { FOLDER } from "../lib/dokumen.ts"

export default tool({
  description:
    "Membuat berkas Excel daftar hadir satu bulan: kolom tanggal hanya hari sekolah (libur dilewati, hari kegiatan diberi warna abu-abu), rumus rekap S/I/A/H dan persentase kehadiran otomatis. Nama siswa dikosongkan untuk diketik guru sendiri. Tidak pernah menimpa berkas yang sudah ada.",
  args: {
    bulan: tool.schema.number().int().min(1).max(12).describe("Bulan 1-12"),
    tahun: tool.schema.number().int().optional().describe("Kosongkan agar ditentukan dari kalender tahun ajaran"),
  },
  async execute(args, ctx) {
    try {
      const akar = cariAkar(ctx.directory)
      const { profil, kalender, kebijakan } = await muatDasar(akar)
      const tahun = args.tahun ?? tahunUntukBulan(kalender, args.bulan)
      const h = absensiXlsx(profil, kalender, kebijakan, tahun, args.bulan)
      const dasar = `hasil/${FOLDER.administrasi}/Daftar Hadir Kelas ${profil.kelas} ${tahun}-${String(args.bulan).padStart(2, "0")} ${NAMA_BULAN[args.bulan]}`
      let rel = `${dasar}.xlsx`
      for (let i = 2; existsSync(join(akar, rel)); i++) rel = `${dasar} (${i}).xlsx`
      await tulis(akar, rel, h.data)
      return [
        `Selesai: ${rel} — ${NAMA_BULAN[args.bulan]} ${tahun}, ${h.hari} hari sekolah, ${h.siswa} baris siswa.`,
        h.perkiraanSiswa ? "Jumlah siswa belum ada di profil, jadi dibuat 30 baris. Tanyakan jumlah siswa dan simpan di guru/profil.json." : "",
        "Sampaikan ke guru: ketik nama siswa langsung di Excel, isi S/I/A saja (kosong = hadir), rekap terhitung otomatis.",
      ]
        .filter(Boolean)
        .join("\n")
    } catch (e) {
      if (e instanceof Gagal) return `GAGAL: ${e.message}`
      throw e
    }
  },
})
