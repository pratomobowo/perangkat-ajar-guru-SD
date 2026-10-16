// Uji template guru: gaya tampilan (atur_gaya), kerangka isi, dan Word contoh (simpan_template_word) pada ekspor.
// Pakai: cd uji-e2e/fixture && bun uji-template.ts        (set SOFFICE=/jalur/soffice untuk membuka hasil di LibreOffice)

import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { bacaZip } from "../../AsistenGuru/.opencode/lib/unzip.ts"
import { buatZip } from "../../AsistenGuru/.opencode/lib/zip.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
const PAKET = join(SINI, "../../AsistenGuru")
const DRAF = join(SINI, "../contoh-hasil-v02/guru/draf")
const LKPD = "guru/draf/2 Modul dan LKPD/Matematika TP5 Kalimat Matematika dan Pola Bilangan/LKPD.md"
const RPM = "guru/draf/2 Modul dan LKPD/Matematika TP5 Kalimat Matematika dan Pola Bilangan/RPM.md"
const keluaran = (rel: string) => rel.replace(/^guru\/draf\//, "hasil/").replace(/\.md$/, ".docx")

let gagal = 0
function cek(nama: string, benar: boolean, info = "") {
  console.log(`${benar ? "✔" : "✖"} ${nama}${!benar && info ? `\n    ${info.slice(0, 900).replace(/\n/g, "\n    ")}` : ""}`)
  if (!benar) gagal++
}
const dec = new TextDecoder()
const bagian = (path: string, nama: string) => dec.decode(bacaZip(new Uint8Array(readFileSync(path))).get(nama) ?? new Uint8Array())
function xmlSah(path: string): string | null {
  const isi = bacaZip(new Uint8Array(readFileSync(path)))
  for (const [n, d] of isi) {
    if (!/\.(xml|rels)$/.test(n)) continue
    const r = spawnSync("python3", ["-I", "-c", "import sys,xml.dom.minidom as m; m.parseString(sys.stdin.buffer.read())"], { input: Buffer.from(d) })
    if (r.status !== 0) return `${n}: ${r.stderr.toString().split("\n").slice(-2).join(" ")}`
  }
  return null
}

/** Word yang meniru simpanan Microsoft Word berbahasa Indonesia: ID gaya "Judul1", kop di header, namespace tambahan. */
function wordGuru(): Uint8Array {
  const W = 'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" mc:Ignorable="w14"'
  const p = (t: string, gaya = "", tebal = false) => `<w:p>${gaya ? `<w:pPr><w:pStyle w:val="${gaya}"/></w:pPr>` : ""}<w:r>${tebal ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${t}</w:t></w:r></w:p>`
  const sel = (t: string) => `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${p(t)}</w:tc>`
  const body = [
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>RENCANA PEMBELAJARAN MENDALAM</w:t></w:r></w:p>`,
    p("Nama Guru : ............"),
    p("Kelas : ............"),
    p("A. Tujuan Pembelajaran", "Judul1"),
    p("Isi tujuan di sini."),
    p("B. Langkah Pembelajaran", "Judul1"),
    `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid><w:tr>${sel("Kegiatan")}${sel("Deskripsi")}${sel("Waktu")}</w:tr><w:tr>${sel("")}${sel("")}${sel("")}</w:tr></w:tbl>`,
    p("Refleksi Guru", "", true),
    p("Catatan refleksi."),
  ].join("")
  const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rId8"/><w:pgSz w:w="12189" w:h="18709"/><w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>`
  return buatZip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId8" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}${sect}</w:body></w:document>`,
    "word/header1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>YAYASAN PENDIDIKAN UJI KOP HEADER</w:t></w:r></w:p></w:hdr>`,
    "word/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Judul1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="26"/></w:rPr></w:style></w:styles>`,
  })
}

const akar = mkdtempSync(join(tmpdir(), "asisten-guru-template-"))
try {
  cpSync(PAKET, akar, { recursive: true })
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  cpSync(join(SINI, "sekolah/kebijakan.json"), join(akar, "sekolah/kebijakan.json"))
  cpSync(DRAF, join(akar, "guru/draf"), { recursive: true })
  writeFileSync(join(akar, LKPD), readFileSync(join(akar, LKPD), "utf8") + "\n\n| No | Soal | Jawaban |\n|---|---|---|\n| 1 | 3 + 4 | 7 |\n")
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => ({ data: { results: [] } }) } })
  const jalan = async (n: string, input: any = {}) => (await alat[n].execute(input, {})).content as string
  let r: string

  // ---------- Lapis 1: gaya tampilan ----------
  r = await jalan("atur_gaya")
  cek("lihat gaya: awalnya bawaan", r.includes("Semua dokumen (guru): bawaan"), r)
  r = await jalan("atur_gaya", { ubah: { huruf: "Times New Roman", ukuran: 12, spasi: 1.5, margin: { kiri: 3 } } })
  cek("ubah gaya semua dokumen", r.startsWith("Tersimpan untuk semua dokumen") && r.includes("Times New Roman 12 pt"), r)
  r = await jalan("ekspor_word", { berkas: RPM })
  let st = bagian(join(akar, keluaran(RPM)), "word/styles.xml")
  let doc = bagian(join(akar, keluaran(RPM)), "word/document.xml")
  cek("ekspor RPM memakai huruf, ukuran, spasi guru", st.includes('w:ascii="Times New Roman"') && st.includes('<w:sz w:val="24"/>') && st.includes('w:line="360"'), st.slice(0, 600))
  cek("ekspor RPM memakai margin kiri 3 cm", doc.includes('w:left="1701"'), doc.match(/<w:pgMar[^>]*>/)?.[0] ?? "")
  cek("ekspor melaporkan gaya yang dipakai", r.includes("Gaya: gaya guru (semua dokumen)"), r)

  r = await jalan("atur_gaya", { dokumen: "LKPD", ubah: { ukuran: 14, kop: { tampil: false }, tabel: { warna_kepala: "kuning" }, nomor_halaman: { format: "X" } } })
  cek("ubah gaya khusus LKPD", r.startsWith("Tersimpan untuk lkpd"), r)
  await jalan("ekspor_word", { berkas: LKPD })
  st = bagian(join(akar, keluaran(LKPD)), "word/styles.xml")
  doc = bagian(join(akar, keluaran(LKPD)), "word/document.xml")
  const ftr = bagian(join(akar, keluaran(LKPD)), "word/footer1.xml")
  cek("LKPD: huruf 14 pt (per dokumen menimpa semua)", st.includes('<w:sz w:val="28"/>') && st.includes("Times New Roman"), st.slice(0, 400))
  cek("LKPD: tanpa kop", !doc.includes("SDIT AL HIKMAH"), doc.slice(0, 600))
  cek("LKPD: kepala tabel kuning", doc.includes('w:fill="FFF2CC"'))
  cek("LKPD: nomor halaman format X", ftr.includes("PAGE") && !ftr.includes("NUMPAGES"), ftr)
  await jalan("ekspor_word", { berkas: RPM })
  doc = bagian(join(akar, keluaran(RPM)), "word/document.xml")
  cek("RPM tidak terpengaruh gaya LKPD (kop tetap ada)", doc.includes("SDIT AL HIKMAH"))

  r = await jalan("atur_gaya", { ubah: { ukuran: 50 } })
  cek("ukuran tidak masuk akal ditolak", r.startsWith("GAGAL") && r.includes("ukuran huruf"), r)
  r = await jalan("atur_gaya", { ubah: { warna: "merah" } })
  cek("pengaturan tak dikenal ditolak", r.startsWith("GAGAL"), r)
  r = await jalan("atur_gaya", { kembalikan: true })
  cek("kembalikan membatalkan perubahan terakhir (LKPD)", r.startsWith("Perubahan gaya terakhir dibatalkan"), r)
  const gj = JSON.parse(readFileSync(join(akar, "guru/gaya-dokumen.json"), "utf8"))
  cek("setelah kembalikan: gaya LKPD hilang, gaya semua tetap", !gj.per_dokumen?.lkpd && gj.semua?.huruf === "Times New Roman", JSON.stringify(gj))
  cek("riwayat perubahan dicatat", readFileSync(join(akar, "guru/riwayat-perubahan.md"), "utf8").includes("| gaya | semua dokumen |"))

  const kb = JSON.parse(readFileSync(join(akar, "sekolah/kebijakan.json"), "utf8"))
  writeFileSync(join(akar, "sekolah/kebijakan.json"), JSON.stringify({ ...kb, gaya_dikunci: ["kertas", "kop"] }))
  r = await jalan("atur_gaya", { ubah: { kertas: "A4" } })
  cek("bagian yang dikunci sekolah ditolak", r.startsWith("GAGAL") && r.includes("ditetapkan sekolah"), r)
  writeFileSync(join(akar, "sekolah/kebijakan.json"), JSON.stringify(kb))

  // ---------- Lapis 3 + 2: Word contoh milik guru ----------
  mkdirSync(join(akar, "guru/contoh"), { recursive: true })
  writeFileSync(join(akar, "guru/contoh/RPM Sekolah Kami.docx"), wordGuru())
  r = await jalan("simpan_template_word", { berkas: "guru\\contoh\\RPM Sekolah Kami.docx", dokumen: "RPM" })
  cek("Word contoh guru tersimpan sebagai template RPM", r.includes("guru/template/RPM.docx") && r.includes("kertas F4") && r.includes("kop/logo di header"), r)
  const kerangka = readFileSync(join(akar, "guru/template/RPM.md"), "utf8")
  cek("kerangka diambil dari Word: judul, identitas, bagian, tabel", kerangka.includes("# RENCANA PEMBELAJARAN MENDALAM") && kerangka.includes("Nama Guru:") && kerangka.includes("## A. Tujuan Pembelajaran") && kerangka.includes("| Kegiatan | Deskripsi | Waktu |") && kerangka.includes("## Refleksi Guru"), kerangka)
  r = await jalan("ekspor_word", { berkas: RPM })
  const hasilRpm = join(akar, keluaran(RPM))
  doc = bagian(hasilRpm, "word/document.xml")
  st = bagian(hasilRpm, "word/styles.xml")
  cek("ekspor RPM melapor memakai Word contoh", r.includes("Memakai Word contoh guru: guru/template/RPM.docx") && r.includes("Kop diambil dari header"), r)
  cek("header kop guru dipertahankan", bagian(hasilRpm, "word/header1.xml").includes("UJI KOP HEADER") && doc.includes('<w:headerReference w:type="default" r:id="rId8"/>'))
  cek("kop buatan asisten tidak digandakan", !doc.includes("SDIT AL HIKMAH"))
  cek("judul memakai gaya Word guru (Judul1)", doc.includes('w:pStyle w:val="Judul1"') && !doc.includes('w:pStyle w:val="Heading1"'))
  cek("gaya judul yang belum ada ditambahkan", st.includes('w:styleId="Heading2"') && (st.match(/w:styleId="Judul1"/g) ?? []).length === 1)
  cek("namespace Word guru dipertahankan", doc.includes('mc:Ignorable="w14"') && doc.includes("xmlns:w14="))
  cek("ukuran kertas F4 dari Word guru", doc.includes('w:w="12189" w:h="18709"'))
  cek("Word contoh menang atas gaya 'semua dokumen' (margin atas tetap 3 cm dari contoh)", doc.includes('w:top="1701"'), doc.match(/<w:pgMar[^>]*>/)?.[0] ?? "")
  cek("Word contoh menang atas gaya 'semua dokumen' (spasi contoh, bukan 1,5)", st.includes('w:line="259"') && !st.includes('w:line="360"'), st.slice(0, 700))
  r = await jalan("atur_gaya", { dokumen: "RPM", ubah: { spasi: 1.5, ukuran: 11, margin: { atas: 2 } } })
  r = await jalan("ekspor_word", { berkas: RPM })
  doc = bagian(hasilRpm, "word/document.xml")
  st = bagian(hasilRpm, "word/styles.xml")
  cek("gaya khusus RPM tetap menimpa Word contoh", st.includes('w:line="360"') && st.includes('<w:sz w:val="22"/>') && doc.includes('w:top="1134"') && st.includes("Times New Roman"), st.slice(0, 700))
  cek("nomor halaman ditambahkan karena contoh tanpa footer", doc.includes("rIdAsistenGuruFooter") && bagian(hasilRpm, "word/footer-asisten-guru.xml").includes("PAGE"))
  cek("isi draf masuk ke Word contoh", doc.includes("KALIMAT MATEMATIKA"), doc.slice(0, 300))
  cek("bagian kerangka yang belum ada di draf dilaporkan", r.includes("belum ada di draf") && r.includes("Refleksi Guru"), r)
  let salah = xmlSah(hasilRpm)
  cek("RPM dengan Word contoh: semua XML sah", !salah, salah ?? "")

  // ---------- "Pakai hasil editan saya sebagai contoh" ----------
  await jalan("ekspor_word", { berkas: LKPD })
  const hasilLkpd = keluaran(LKPD)
  const isi = bacaZip(new Uint8Array(readFileSync(join(akar, hasilLkpd))))
  const ubahan: Record<string, Uint8Array | string> = {}
  for (const [n, d] of isi) ubahan[n] = d
  ubahan["word/styles.xml"] = dec.decode(isi.get("word/styles.xml")!).replace(/w:ascii="[^"]*"/g, 'w:ascii="Comic Sans MS"')
  writeFileSync(join(akar, hasilLkpd), buatZip(ubahan)) // seolah-olah diedit guru di Word lalu disimpan
  r = await jalan("simpan_template_word", { berkas: hasilLkpd })
  cek("hasil editan guru disimpan sebagai template LKPD (jenis ditebak)", r.includes("guru/template/LKPD.docx") && r.includes("Comic Sans MS"), r)
  const kerLkpd = readFileSync(join(akar, "guru/template/LKPD.md"), "utf8")
  cek("kerangka dari hasil ekspor: kop badan dokumen tidak dianggap judul", !/^# SDIT/m.test(kerLkpd) && /^# LKPD/m.test(kerLkpd), kerLkpd)
  cek("kerangka: judul khusus topik diumumkan dan pertemuan berulang diringkas", kerLkpd.includes("## Pertemuan 1\n<!-- ulangi bagian ini untuk tiap pertemuan -->") && !kerLkpd.includes("Pertemuan 1 -") && !kerLkpd.includes("## Pertemuan 2"), kerLkpd)
  r = await jalan("ekspor_word", { berkas: LKPD })
  cek("ekspor LKPD berikutnya memakai editan guru", r.includes("guru/template/LKPD.docx") && bagian(join(akar, hasilLkpd), "word/styles.xml").includes("Comic Sans MS"), r)
  salah = xmlSah(join(akar, hasilLkpd))
  cek("LKPD dari hasil editan: semua XML sah", !salah, salah ?? "")
  r = await jalan("simpan_template_word", { berkas: hasilLkpd })
  cek("menyimpan ulang: template lama dicadangkan", r.includes("guru/template/.lama/"), r)

  // ---------- Template sekolah wajib ----------
  writeFileSync(join(akar, "sekolah/template/RPM.docx"), wordGuru())
  writeFileSync(join(akar, "sekolah/kebijakan.json"), JSON.stringify({ ...kb, template_wajib: true }))
  r = await jalan("simpan_template_word", { berkas: "guru/contoh/RPM Sekolah Kami.docx", dokumen: "RPM" })
  cek("template sekolah wajib: template guru ditolak", r.startsWith("GAGAL") && r.includes("mewajibkan"), r)
  r = await jalan("ekspor_word", { berkas: RPM })
  cek("template sekolah wajib dipakai saat ekspor", r.includes("Memakai Word contoh sekolah (wajib): sekolah/template/RPM.docx"), r)
  writeFileSync(join(akar, "sekolah/kebijakan.json"), JSON.stringify(kb))
  rmSync(join(akar, "sekolah/template/RPM.docx"))

  // ---------- Hapus template dan Word rusak ----------
  r = await jalan("simpan_template_word", { dokumen: "RPM", hapus: true })
  cek("hapus template RPM", r.includes("dihapus") && !existsSync(join(akar, "guru/template/RPM.docx")), r)
  r = await jalan("ekspor_word", { berkas: RPM })
  cek("setelah dihapus: kembali ke format bawaan", !r.includes("Word contoh") && bagian(join(akar, keluaran(RPM)), "word/document.xml").includes("SDIT AL HIKMAH"), r)
  writeFileSync(join(akar, "guru/template/RPM.docx"), "bukan zip")
  r = await jalan("ekspor_word", { berkas: RPM })
  cek("Word contoh rusak: tetap jadi dengan format bawaan + pesan", r.startsWith("Selesai") && r.includes("tidak bisa dipakai"), r)
  rmSync(join(akar, "guru/template/RPM.docx"))
  r = await jalan("simpan_template_word", { berkas: "guru/contoh/tidak-ada.docx" })
  cek("berkas tidak ada → pesan jelas", r.startsWith("GAGAL"), r)

  // ---------- Buka di LibreOffice (jika tersedia) ----------
  const soffice = process.env.SOFFICE
  if (soffice) {
    writeFileSync(join(akar, "guru/template/RPM.docx"), wordGuru())
    await jalan("ekspor_word", { berkas: RPM })
    const keluarPdf = mkdtempSync(join(tmpdir(), "lo-"))
    const berkas = [join(akar, keluaran(RPM)), join(akar, hasilLkpd)]
    const lo = spawnSync(soffice, ["--headless", `-env:UserInstallation=file://${keluarPdf}/profil`, "--convert-to", "pdf", "--outdir", keluarPdf, ...berkas], { timeout: 180000 })
    const pdf = readdirSync(keluarPdf).filter((f) => f.endsWith(".pdf"))
    cek(`LibreOffice membuka dan mengonversi ${berkas.length} Word ke PDF`, pdf.length === berkas.length, lo.stderr?.toString() + lo.stdout?.toString())
    const { teksPdf } = await import("../../AsistenGuru/.opencode/lib/pustaka.ts")
    const hal = pdf.includes("RPM.pdf") ? await teksPdf(join(keluarPdf, "RPM.pdf")) : []
    cek("PDF RPM memuat kop header guru dan isi draf", hal.join("\n").includes("UJI KOP HEADER") && hal.join("\n").includes("KALIMAT MATEMATIKA"), hal.join("\n").slice(0, 400))
    rmSync(keluarPdf, { recursive: true, force: true })
  } else console.log("• LibreOffice dilewati (set SOFFICE untuk membuka hasil di LibreOffice)")
} finally {
  rmSync(akar, { recursive: true, force: true })
}

console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
