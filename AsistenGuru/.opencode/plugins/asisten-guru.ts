// Plugin OpenCode 2: mendaftarkan alat deterministik Asisten Guru.
// Sengaja tanpa import "@opencode/plugin" (Plugin.define hanya mengembalikan objeknya), supaya tidak ada paket
// yang perlu diunduh di komputer guru. Logika alat ada di ../alat/, pustaka bersama di ../lib/.

import type { Alat } from "../lib/alat.ts"
import { Gagal, cariAkar } from "../lib/berkas.ts"
import agendaHariIni from "../alat/agenda_hari_ini.ts"
import buatAbsensiExcel from "../alat/buat_absensi_excel.ts"
import buatNilaiExcel from "../alat/buat_nilai_excel.ts"
import eksporWord from "../alat/ekspor_word.ts"
import hitungMingguEfektif from "../alat/hitung_minggu_efektif.ts"
import susunPerencanaan from "../alat/susun_perencanaan.ts"

const ALAT: Alat[] = [hitungMingguEfektif, susunPerencanaan, agendaHariIni, eksporWord, buatAbsensiExcel, buatNilaiExcel]

export default {
  id: "asisten-guru",
  async setup(ctx: any) {
    const akar = cariAkar(ctx.location.directory)
    await ctx.tool.transform((editor: any) => {
      for (const a of ALAT) {
        editor.add({
          name: a.nama,
          description: a.deskripsi,
          input: a.masukan,
          // Dipanggil langsung oleh model, bukan lewat Code Mode, supaya model gratis pun mudah memakainya.
          options: { codemode: false },
          execute: async (input: unknown) => {
            try {
              return { content: await a.jalankan((input ?? {}) as any, akar) }
            } catch (e) {
              if (e instanceof Gagal) return { content: `GAGAL: ${e.message}` }
              throw e
            }
          },
        })
      }
    })
  },
}
