import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { Gagal, bacaJson, daftar, muatDasar } from "../lib/berkas.ts"
import { agenda } from "../lib/administrasi.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { hariIni, tgl } from "../lib/kalender.ts"

export default alat<{ tanggal?: string }>({
  nama: "agenda_hari_ini",
  deskripsi:
    "Agenda harian guru: status hari (efektif/libur/kegiatan), jadwal pelajaran, TP yang dijadwalkan Promes minggu ini dan minggu depan, kegiatan sekolah 2 minggu ke depan, dan pengingat jurnal yang belum diisi. Pakai saat guru menyapa di pagi hari, bertanya 'hari ini apa', 'minggu ini ngajar apa', atau sebelum mengisi jurnal.",
  masukan: {
    type: "object",
    properties: { tanggal: { type: "string", description: "YYYY-MM-DD; kosongkan untuk hari ini" } },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const { profil, kalender } = await muatDasar(akar)
    const tanggal = args.tanggal || hariIni()
    try {
      tgl(tanggal)
    } catch (e) {
      throw new Gagal((e as Error).message)
    }
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
        return existsSync(p) ? readFileSync(p, "utf8").replace(/\r\n?/g, "\n") : null
      },
    })
  },
})
