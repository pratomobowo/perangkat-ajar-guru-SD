import { alat } from "../lib/alat.ts"
import { type ATP, Gagal, bacaJson, bacaTeks, cariMapel, frontmatter, muatDasar, slug, tulis } from "../lib/berkas.ts"
import { FOLDER, opsiDokumen, simpanDokumen } from "../lib/dokumen.ts"
import { type CpInfo, susunPerencanaan } from "../lib/perencanaan.ts"

export default alat<{ mapel: string }>({
  nama: "susun_perencanaan",
  deskripsi:
    "Memvalidasi data ATP di guru/data/atp-<mapel>.json lalu menyusun dokumen ATP, Prota, Promes, dan minggu efektif (Markdown + Word) secara otomatis dan konsisten. Panggil setelah menulis atau mengubah berkas data ATP. Jika hasilnya GAGAL, perbaiki data ATP sesuai pesan lalu panggil lagi. Jangan menulis Prota/Promes sendiri.",
  masukan: {
    type: "object",
    properties: { mapel: { type: "string", description: "Nama atau kode mapel, misalnya 'matematika'" } },
    required: ["mapel"],
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const { profil, kalender, kebijakan } = await muatDasar(akar)
    const mapel = cariMapel(profil, args.mapel)
    const kode = slug(mapel.kode ?? mapel.nama)
    const atp = await bacaJson<ATP>(
      akar,
      `guru/data/atp-${kode}.json`,
      `Data ATP belum ada di guru/data/atp-${kode}.json. Tulis dulu berkas itu mengikuti format di skill perencanaan-tahunan (references/format-data-atp.md).`,
    )

    const fase = (profil.fase ?? "").toLowerCase()
    // CP sekolah diutamakan; CP yang diambil otomatis oleh guru (alat ambil_cp) dipakai bila CP sekolah belum diisi.
    let cpPath = `sekolah/referensi/cp/${kode}-fase-${fase}.md`
    let cpTeks = await bacaTeks(akar, cpPath)
    if (!cpTeks || frontmatter(cpTeks).status === "BELUM-TERISI") {
      const guruPath = `guru/referensi/cp/${kode}-fase-${fase}.md`
      const guruTeks = await bacaTeks(akar, guruPath)
      if (guruTeks) { cpPath = guruPath; cpTeks = guruTeks }
    }
    let cp: CpInfo | null = null
    if (cpTeks) {
      const fm = frontmatter(cpTeks)
      cp = {
        path: cpPath,
        status: fm.status || "TIDAK-DIKETAHUI",
        sumber: fm.sumber,
        elemen: (fm.elemen ?? "").split(";").map((s) => s.trim()).filter(Boolean),
      }
    }
    if (!cp || cp.status === "BELUM-TERISI")
      throw new Gagal(`CP belum tersedia (${cpPath}). Perencanaan tidak boleh dibuat tanpa CP. Tawarkan ke guru mengambil CP resmi otomatis dengan alat ambil_cp (mapel "${mapel.nama}", fase ${profil.fase}), atau minta sekolah mengisinya.`)

    const h = susunPerencanaan({ profil, kalender, kebijakan, mapel, atp, cp })
    const folder = `${FOLDER.perencanaan}/${mapel.nama} Kelas ${profil.kelas} ${profil.tahun_ajaran.replace("/", "-")}`
    const opsi = opsiDokumen(profil, kebijakan)
    const dok: [string, string][] = [
      ["1 Minggu Efektif", h.me.md],
      ["2 ATP", h.dokumen.atp],
      ["3 Prota", h.dokumen.prota],
      ["4 Promes", h.dokumen.promes],
    ]
    const catatan = new Set<string>()
    for (const [nama, md] of dok) for (const c of (await simpanDokumen(akar, `${folder}/${nama}`, md, opsi)).catatan) catatan.add(c)
    await tulis(akar, `guru/data/promes-${kode}.json`, JSON.stringify(h.promesJson, null, 2))

    return [
      `Selesai. Empat dokumen Word tersimpan di hasil/${folder}/: 1 Minggu Efektif, 2 ATP, 3 Prota, 4 Promes.`,
      "",
      "Hasil validasi (sampaikan apa adanya ke guru):",
      ...h.cek,
      ...(catatan.size ? ["", ...catatan] : []),
    ].join("\n")
  },
})
