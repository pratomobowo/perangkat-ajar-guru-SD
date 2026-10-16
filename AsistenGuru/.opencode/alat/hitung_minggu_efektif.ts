import { alat } from "../lib/alat.ts"
import { muatDasar } from "../lib/berkas.ts"
import { FOLDER, opsiDokumen, simpanDokumen } from "../lib/dokumen.ts"
import { mingguEfektif } from "../lib/perencanaan.ts"

export default alat<Record<string, never>>({
  nama: "hitung_minggu_efektif",
  deskripsi:
    "Menghitung rincian minggu efektif dan JP tersedia per mapel dari profil dan kalender guru, lalu menyimpan dokumen Word di hasil/1 Perencanaan/. Selalu pakai alat ini; jangan menghitung minggu efektif sendiri. Tidak butuh CP.",
  masukan: { type: "object", properties: {}, additionalProperties: false },
  async jalankan(_args, akar) {
    const { profil, kalender, kebijakan } = await muatDasar(akar)
    const hasil = mingguEfektif(profil, kalender, kebijakan)
    const { docx } = await simpanDokumen(akar, `${FOLDER.perencanaan}/Minggu Efektif ${profil.tahun_ajaran.replace("/", "-")}`, hasil.md, opsiDokumen(profil, kebijakan))
    const jp = profil.mapel.map((m) => `${m.nama}: ${hasil.perSem.map((s) => `smt ${s.ke} ${s.efektif * m.jp_per_minggu} JP`).join(", ")}`).join("; ")
    return [
      `Selesai. ${hasil.ringkas}`,
      `JP tersedia — ${jp}.`,
      `Word: ${docx}`,
      hasil.aturan.dariSekolah ? "" : "Sampaikan ke guru: batas minimal hari efektif per minggu belum ditetapkan sekolah, jadi memakai 3 hari [PERLU GURU].",
    ]
      .filter(Boolean)
      .join("\n")
  },
})
