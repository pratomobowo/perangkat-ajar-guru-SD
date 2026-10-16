import { existsSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type ATP, Gagal, bacaJson, cariMapel, jalurAman, muatDasar, slug, tulis } from "../lib/berkas.ts"
import { nilaiXlsx } from "../lib/administrasi.ts"
import { FOLDER } from "../lib/dokumen.ts"

export default alat<{ mapel: string; semester: number }>({
  nama: "buat_nilai_excel",
  deskripsi:
    "Membuat berkas Excel buku nilai satu mapel per semester: kolom per TP (dari data ATP), STS, SAS, rumus rata-rata formatif, nilai rapor berbobot, serta TP tertinggi/terendah untuk deskripsi rapor. Nama siswa dikosongkan untuk diketik guru. Butuh data ATP (guru/data/atp-<mapel>.json). Tidak pernah menimpa berkas yang sudah ada.",
  masukan: {
    type: "object",
    properties: {
      mapel: { type: "string", description: "Nama atau kode mapel" },
      semester: { type: "integer", minimum: 1, maximum: 2 },
    },
    required: ["mapel", "semester"],
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const semester = Number(args.semester)
    if (semester !== 1 && semester !== 2) throw new Gagal("Semester harus 1 atau 2.")
    const { profil, kebijakan } = await muatDasar(akar)
    const mapel = cariMapel(profil, args.mapel)
    const kode = slug(mapel.kode ?? mapel.nama)
    const atp = await bacaJson<ATP>(
      akar,
      `guru/data/atp-${kode}.json`,
      `Data ATP ${mapel.nama} belum ada, jadi kolom TP belum bisa dibuat. Buat perencanaan dulu (skill perencanaan-tahunan).`,
    )
    const h = nilaiXlsx(profil, kebijakan, atp, mapel.nama, semester)
    const dasar = `hasil/${FOLDER.administrasi}/Buku Nilai ${mapel.nama} Kelas ${profil.kelas} Semester ${semester} ${profil.tahun_ajaran.replace("/", "-")}`
    let rel = `${dasar}.xlsx`
    for (let i = 2; existsSync(join(akar, jalurAman(rel))); i++) rel = `${dasar} (${i}).xlsx`
    rel = await tulis(akar, rel, h.data)
    return [
      `Selesai: ${rel} — ${h.tp} kolom TP, ${h.siswa} baris siswa.`,
      h.bobotSekolah ? "" : "Bobot nilai rapor memakai bawaan 50/25/25 (formatif/STS/SAS) karena sekolah belum menetapkan; sampaikan sebagai [PERLU GURU].",
      h.perkiraanSiswa ? "Jumlah siswa belum ada di profil, jadi dibuat 30 baris." : "",
    ]
      .filter(Boolean)
      .join("\n")
  },
})
