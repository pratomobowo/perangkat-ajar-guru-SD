import { alat } from "../lib/alat.ts"
import { Gagal, bacaJson, muatDasar } from "../lib/berkas.ts"
import { FOLDER, opsiDokumen, simpanDokumen } from "../lib/dokumen.ts"
import { type JadwalKelas, jadwalMd } from "../lib/jadwal.ts"

export default alat<Record<string, never>>({
  nama: "buat_jadwal_kelas",
  deskripsi:
    "Membuat dokumen Word jadwal pelajaran kelas (jam ke-, waktu, mapel per hari, istirahat) dari guru/jadwal-kelas.json, lalu memeriksa jumlah JP per minggu tiap mapel terhadap profil dan bentrok jam. Disimpan di hasil/4 Administrasi/. Jika berkas jadwal belum ada, kumpulkan dulu dari guru (format di skill guru-setup, references/format-profil.md).",
  masukan: { type: "object", properties: {}, additionalProperties: false },
  async jalankan(_args, akar) {
    const { profil, kebijakan } = await muatDasar(akar)
    const j = await bacaJson<JadwalKelas>(
      akar,
      "guru/jadwal-kelas.json",
      "Jadwal kelas belum ada (guru/jadwal-kelas.json). Tanyakan ke guru jam pelajaran (jam ke-, mulai, selesai, istirahat) dan mapel tiap hari, lalu tulis berkasnya mengikuti format di skill guru-setup.",
    )
    const h = jadwalMd(profil, j)
    const { docx, catatan } = await simpanDokumen(akar, `${FOLDER.administrasi}/Jadwal Pelajaran Kelas ${profil.kelas} ${profil.tahun_ajaran.replace("/", "-")}`, h.md, { ...opsiDokumen(profil, kebijakan), lanskap: true })
    if (!docx) throw new Gagal("Jadwal gagal disimpan.")
    return [`Selesai: ${docx}.`, "", "Pemeriksaan (sampaikan apa adanya ke guru):", ...h.cek, ...catatan].join("\n")
  },
})
