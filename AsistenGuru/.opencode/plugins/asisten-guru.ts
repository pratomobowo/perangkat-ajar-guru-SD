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
import cekKesiapan from "../alat/cek_kesiapan.ts"
import acuanJp from "../alat/acuan_jp.ts"
import liburNasional from "../alat/libur_nasional.ts"
import periksaPerangkatPpg from "../alat/periksa_perangkat_ppg.ts"
import berkasPpg from "../alat/berkas_ppg.ts"
import ingat from "../alat/ingat.ts"
import cariIngatan from "../alat/cari_ingatan.ts"
import buatAdministrasiWaliKelas from "../alat/buat_administrasi_wali_kelas.ts"
import buatKelompok from "../alat/buat_kelompok.ts"
import buatAnalisisButirExcel from "../alat/buat_analisis_butir_excel.ts"
import bahanRefleksiSemester from "../alat/bahan_refleksi_semester.ts"
import isiRekapSekolah from "../alat/isi_rekap_sekolah.ts"
import simpanTemplateExcel from "../alat/simpan_template_excel.ts"
import { blokIngatan, catatRiwayat } from "../lib/ingatan.ts"
import susunPerencanaan from "../alat/susun_perencanaan.ts"
import unduhBuku from "../alat/unduh_buku.ts"

const ALAT: Alat[] = [hitungMingguEfektif, susunPerencanaan, agendaHariIni, eksporWord, buatAbsensiExcel, buatNilaiExcel, perbaruiPaket, bacaBuku, risetMateri, unduhBuku, aturGaya, simpanTemplateWord, buatKalenderPendidikan, buatJadwalKelas, ambilCp, buatPenilaianKokurikulerExcel, bacaMasukan, statusPerangkat, daftarSiswa, analisisSiswa, cekKesiapan, acuanJp, liburNasional, periksaPerangkatPpg, berkasPpg, ingat, cariIngatan, buatAdministrasiWaliKelas, buatKelompok, buatAnalisisButirExcel, bahanRefleksiSemester, isiRekapSekolah, simpanTemplateExcel]

/** Alat yang membuat berkas: hasilnya dicatat otomatis di arsip riwayat (bisa dicari dengan cari_ingatan). */
const DICATAT = new Set(["ekspor_word", "susun_perencanaan", "buat_absensi_excel", "buat_nilai_excel", "buat_penilaian_kokurikuler_excel", "buat_kalender_pendidikan", "buat_jadwal_kelas", "berkas_ppg", "unduh_buku", "ambil_cp", "buat_administrasi_wali_kelas", "buat_kelompok", "buat_analisis_butir_excel", "isi_rekap_sekolah"])

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
    // Ingatan lintas sesi: blok ingatan ditempel ke system prompt. Satu salinan per sesi (dibekukan saat panggilan
    // pertama, seperti Hermes Agent) supaya awalan prompt tetap sama dan cache model terpakai; catatan baru berlaku
    // di sesi berikutnya.
    if (typeof ctx.session?.hook === "function") {
      const salinan = new Map<string, string>()
      await ctx.session.hook("context", async (event: any) => {
        try {
          let blok = salinan.get(event.sessionID)
          if (blok === undefined) {
            blok = await blokIngatan(akar)
            if (salinan.size > 50) salinan.clear()
            salinan.set(event.sessionID, blok)
          }
          event.system.push({ type: "text", text: blok })
        } catch {
          // Ingatan bersifat pelengkap: kegagalan membaca tidak boleh menghentikan percakapan.
        }
      })
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
              const hasil = await a.jalankan((input ?? {}) as any, akar, konteks)
              if (DICATAT.has(a.nama)) await catatRiwayat(akar, "alat", `${a.nama}: ${hasil.split("\n")[0]}`)
              return { content: hasil }
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
