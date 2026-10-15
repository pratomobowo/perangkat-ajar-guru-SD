import { tool } from "@opencode-ai/plugin"
import { type Kebijakan, type Profil, Gagal, bacaJson, bacaTeks, cariAkar } from "../lib/berkas.ts"
import { opsiDokumen, simpanDokumen, tebakJenis } from "../lib/dokumen.ts"

export default tool({
  description:
    "Mengubah draf Markdown di guru/draf/ menjadi dokumen Word rapi di hasil/ (jalur folder yang sama). Otomatis memberi kop sekolah, identitas, nomor halaman, dan tanda tangan untuk dokumen guru. Jenis: dokumen_guru (modul, kisi-kisi, KKTP, jurnal), lembar_siswa (LKPD, soal; huruf lebih besar, tanpa tanda tangan), kunci (kunci jawaban, ada tanda 'untuk guru'). Jika jenis tidak diisi, ditebak dari nama berkas. Pakai setiap kali selesai menulis atau mengubah draf.",
  args: {
    berkas: tool.schema.string().describe("Path draf, misalnya 'guru/draf/2 Modul dan LKPD/Matematika TP5 Pola Bilangan/LKPD.md'"),
    jenis: tool.schema.enum(["dokumen_guru", "lembar_siswa", "kunci"]).optional(),
    orientasi: tool.schema.enum(["otomatis", "potret", "lanskap"]).optional().describe("Bawaan: otomatis (lanskap jika tabel 7 kolom atau lebih)"),
  },
  async execute(args, ctx) {
    try {
      const akar = cariAkar(ctx.directory)
      const rel = args.berkas.replace(/^\.?\//, "")
      if (!rel.startsWith("guru/draf/") || !rel.endsWith(".md"))
        throw new Gagal("Draf harus berupa berkas .md di dalam folder guru/draf/ (misalnya guru/draf/2 Modul dan LKPD/<topik>/LKPD.md).")
      const md = await bacaTeks(akar, rel)
      if (md === null) throw new Gagal(`Berkas ${rel} tidak ditemukan.`)
      const profil = await bacaJson<Profil>(akar, "guru/profil.json")
      const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
      const sub = rel.slice("guru/draf/".length, -3)
      const opsi = opsiDokumen({ kelas: 0, tahun_ajaran: "", mapel: [], ...profil }, kebijakan, args.jenis ?? tebakJenis(sub))
      if (args.orientasi === "lanskap") opsi.lanskap = true
      if (args.orientasi === "potret") opsi.lanskap = false
      const { docx, lanskap } = await simpanDokumen(akar, sub, md, opsi, false)
      return `Selesai: ${docx} (${opsi.jenis}, ${lanskap ? "lanskap" : "potret"}, ${opsi.kertas}). Penanda [PERLU ...] diberi stabilo kuning.`
    } catch (e) {
      if (e instanceof Gagal) return `GAGAL: ${e.message}`
      throw e
    }
  },
})
