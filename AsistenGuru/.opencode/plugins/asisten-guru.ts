// Plugin OpenCode 2: mendaftarkan alat deterministik Asisten Guru.
// Sengaja tanpa import "@opencode/plugin" (Plugin.define hanya mengembalikan objeknya), supaya tidak ada paket
// yang perlu diunduh di komputer guru. Logika alat ada di ../alat/, pustaka bersama di ../lib/.

import type { Alat, Konteks } from "../lib/alat.ts"
import { Gagal, cariAkar } from "../lib/berkas.ts"
import agendaHariIni from "../alat/agenda_hari_ini.ts"
import ambilCp from "../alat/ambil_cp.ts"
import aturGaya from "../alat/atur_gaya.ts"
import bacaBuku from "../alat/baca_buku.ts"
import bacaMasukan from "../alat/baca_masukan.ts"
import buatJadwalKelas from "../alat/buat_jadwal_kelas.ts"
import buatKalenderPendidikan from "../alat/buat_kalender_pendidikan.ts"
import buatPenilaianKokurikulerExcel from "../alat/buat_penilaian_kokurikuler_excel.ts"
import buatAbsensiExcel from "../alat/buat_absensi_excel.ts"
import buatNilaiExcel from "../alat/buat_nilai_excel.ts"
import eksporWord from "../alat/ekspor_word.ts"
import hitungMingguEfektif from "../alat/hitung_minggu_efektif.ts"
import perbaruiPaket from "../alat/perbarui_paket.ts"
import risetMateri from "../alat/riset_materi.ts"
import simpanTemplateWord from "../alat/simpan_template_word.ts"
import statusPerangkat from "../alat/status_perangkat.ts"
import daftarSiswa from "../alat/daftar_siswa.ts"
import analisisSiswa from "../alat/analisis_siswa.ts"
import susunPerencanaan from "../alat/susun_perencanaan.ts"
import unduhBuku from "../alat/unduh_buku.ts"

const ALAT: Alat[] = [hitungMingguEfektif, susunPerencanaan, agendaHariIni, eksporWord, buatAbsensiExcel, buatNilaiExcel, perbaruiPaket, bacaBuku, risetMateri, unduhBuku, aturGaya, simpanTemplateWord, buatKalenderPendidikan, buatJadwalKelas, ambilCp, buatPenilaianKokurikulerExcel, bacaMasukan, statusPerangkat, daftarSiswa, analisisSiswa]

export default {
  id: "asisten-guru",
  async setup(ctx: any) {
    const akar = cariAkar(ctx.location.directory)
    const konteks: Konteks = {
      // Pencarian lewat penyedia web search OpenCode; penyaringan domain dilakukan alat riset_materi.
      cariWeb: async (kueri) => {
        const r = await ctx.websearch.query({ query: kueri })
        return r?.data?.results ?? r?.results ?? []
      },
    }
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
              return { content: await a.jalankan((input ?? {}) as any, akar, konteks) }
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
