import { alat } from "../lib/alat.ts"
import { muatDasar } from "../lib/berkas.ts"
import { FOLDER, opsiDokumen, simpanDokumen } from "../lib/dokumen.ts"
import { kalenderMd } from "../lib/jadwal.ts"

export default alat<Record<string, never>>({
  nama: "buat_kalender_pendidikan",
  deskripsi:
    "Membuat dokumen Word kalender pendidikan dari guru/kalender.json: kalender per bulan dengan tanda libur (L) dan kegiatan sekolah (K), jumlah hari sekolah dan hari belajar efektif per bulan, serta daftar kegiatan. Disimpan di hasil/1 Perencanaan/. Pakai saat guru meminta kalender pendidikan/kalender akademik.",
  masukan: { type: "object", properties: {}, additionalProperties: false },
  async jalankan(_args, akar) {
    const { profil, kalender, kebijakan } = await muatDasar(akar)
    const h = kalenderMd(profil, kalender)
    const { docx, catatan } = await simpanDokumen(akar, `${FOLDER.perencanaan}/Kalender Pendidikan ${profil.tahun_ajaran.replace("/", "-")}`, h.md, { ...opsiDokumen(profil, kebijakan), lanskap: false })
    return [`Selesai: ${docx} — ${h.ringkas}.`, ...catatan].join("\n")
  },
})
