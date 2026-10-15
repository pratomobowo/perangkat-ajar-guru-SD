import { tool } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { Gagal, bacaJson, cariAkar, daftar, muatDasar } from "../lib/berkas.ts"
import { agenda } from "../lib/administrasi.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { hariIni, tgl } from "../lib/kalender.ts"

export default tool({
  description:
    "Agenda harian guru: status hari (efektif/libur/kegiatan), jadwal pelajaran, TP yang dijadwalkan Promes minggu ini dan minggu depan, kegiatan sekolah 2 minggu ke depan, dan pengingat jurnal yang belum diisi. Pakai saat guru menyapa di pagi hari, bertanya 'hari ini apa', 'minggu ini ngajar apa', atau sebelum mengisi jurnal.",
  args: {
    tanggal: tool.schema.string().optional().describe("YYYY-MM-DD; kosongkan untuk hari ini"),
  },
  async execute(args, ctx) {
    try {
      const akar = cariAkar(ctx.directory)
      const { profil, kalender } = await muatDasar(akar)
      const tanggal = args.tanggal ?? hariIni()
      tgl(tanggal)
      const promes = []
      for (const f of await daftar(akar, "guru/data")) if (/^promes-.*\.json$/.test(f)) promes.push(await bacaJson<any>(akar, `guru/data/${f}`))
      return agenda({
        tanggal,
        profil,
        kalender,
        promes,
        bahan: await daftar(akar, `guru/draf/${FOLDER.modul}`),
        jurnal: (bulan) => {
          const p = join(akar, `guru/draf/${FOLDER.administrasi}/Jurnal Mengajar ${bulan}.md`)
          return existsSync(p) ? readFileSync(p, "utf8") : null
        },
      })
    } catch (e) {
      if (e instanceof Gagal) return `GAGAL: ${e.message}`
      if (e instanceof Error && /Format tanggal/.test(e.message)) return `GAGAL: ${e.message}`
      throw e
    }
  },
})
