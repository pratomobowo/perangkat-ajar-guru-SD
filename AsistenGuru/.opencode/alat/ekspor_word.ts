import { alat } from "../lib/alat.ts"
import { type Kebijakan, type Profil, Gagal, bacaJson, bacaTeks, relatif } from "../lib/berkas.ts"
import { opsiDokumen, simpanDokumen, tebakJenis } from "../lib/dokumen.ts"

export default alat<{ berkas: string; jenis?: "dokumen_guru" | "lembar_siswa" | "kunci"; orientasi?: "otomatis" | "potret" | "lanskap" }>({
  nama: "ekspor_word",
  deskripsi:
    "Mengubah draf Markdown di guru/draf/ menjadi dokumen Word rapi di hasil/ (jalur folder yang sama). Otomatis memberi kop sekolah, identitas, nomor halaman, dan tanda tangan untuk dokumen guru. Jenis: dokumen_guru (modul, kisi-kisi, KKTP, jurnal), lembar_siswa (LKPD, soal; huruf lebih besar, tanpa tanda tangan), kunci (kunci jawaban, ada tanda 'untuk guru'). Jika jenis tidak diisi, ditebak dari nama berkas. Pakai setiap kali selesai menulis atau mengubah draf.",
  masukan: {
    type: "object",
    properties: {
      berkas: { type: "string", description: "Path draf, misalnya 'guru/draf/2 Modul dan LKPD/Matematika TP5 Pola Bilangan/LKPD.md'" },
      jenis: { type: "string", enum: ["dokumen_guru", "lembar_siswa", "kunci"] },
      orientasi: { type: "string", enum: ["otomatis", "potret", "lanskap"], description: "Bawaan: otomatis (lanskap jika tabel 7 kolom atau lebih)" },
    },
    required: ["berkas"],
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const rel = relatif(akar, args.berkas)
    if (!rel.startsWith("guru/draf/") || !rel.toLowerCase().endsWith(".md"))
      throw new Gagal("Draf harus berupa berkas .md di dalam folder guru/draf/ (misalnya guru/draf/2 Modul dan LKPD/<topik>/LKPD.md).")
    const md = await bacaTeks(akar, rel)
    if (md === null) throw new Gagal(`Berkas ${rel} tidak ditemukan.`)
    const profil = await bacaJson<Profil>(akar, "guru/profil.json")
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const sub = rel.slice("guru/draf/".length, -3)
    const opsi = opsiDokumen({ kelas: 0, tahun_ajaran: "", mapel: [], ...profil }, kebijakan, args.jenis ?? tebakJenis(sub))
    if (args.orientasi === "lanskap") opsi.lanskap = true
    if (args.orientasi === "potret") opsi.lanskap = false
    const { docx, lanskap, catatan } = await simpanDokumen(akar, sub, md, opsi, false)
    return [`Selesai: ${docx} (${opsi.jenis}, ${lanskap ? "lanskap" : "potret"}). Penanda [PERLU ...] diberi stabilo kuning.`, ...catatan].join("\n")
  },
})
