// Uji pembaca dokumen guru (baca_masukan) dan peta perangkat (status_perangkat).
// Pakai: cd uji-e2e/fixture && bun uji-masukan.ts

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buatDocx } from "../../AsistenGuru/.opencode/lib/docx.ts"
import { buatZip } from "../../AsistenGuru/.opencode/lib/zip.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i.slice(0, 700).replace(/\n/g, "\n    ")}` : ""}`); if (!b) gagal++ }

/** Excel kecil seperti buatan sekolah: tanggal berformat tanggal (numFmtId 14), teks bersama, dan angka. */
function excelKalender(): Uint8Array {
  return buatZip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>`,
    "xl/workbook.xml": `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Kalender 2026" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/sharedStrings.xml": `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Tanggal</t></si><si><t>Kegiatan</t></si><si><t>HUT RI</t></si><si><r><t>MPLS </t></r><r><t>hari 1</t></r></si></sst>`,
    "xl/styles.xml": `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>JP</t></is></c></row><row r="2"><c r="A2" s="1"><v>46251</v></c><c r="B2" t="s"><v>2</v></c><c r="C2"><v>5</v></c></row><row r="3"><c r="A3" s="2"><v>46216</v></c><c r="B3" t="s"><v>3</v></c><c r="C3"><f>C2+1</f><v>6</v></c></row></sheetData></worksheet>`,
  })
}

const akar = mkdtempSync(join(tmpdir(), "asisten-guru-masukan-"))
try {
  cpSync(join(SINI, "../../AsistenGuru"), akar, { recursive: true })
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => ({}) } })
  const jalan = async (n: string, a: any = {}) => (await alat[n].execute(a, {})).content as string
  let r: string

  // ---------- Peta perangkat: guru baru ----------
  r = await jalan("status_perangkat")
  cek("status: guru baru → langkah pertama profil", r.includes("✖ Profil guru") && r.includes("1. Profil guru"), r)

  // ---------- Dokumen masukan ----------
  r = await jalan("baca_masukan")
  cek("masukan kosong → petunjuk folder", r.includes("masih kosong") && r.includes("guru\\masukan"), r)
  const m = join(akar, "guru/masukan")
  writeFileSync(join(m, "Contoh RPP Sekolah.docx"), buatDocx("# RENCANA PELAKSANAAN PEMBELAJARAN\n\n## A. Tujuan\n\nMurid mampu ...\n\n| Kegiatan | Waktu |\n|---|---|\n| Pendahuluan | 10 menit |\n\n- Langkah satu\n", {}).data)
  writeFileSync(join(m, "Kalender Sekolah.xlsx"), excelKalender())
  cpSync(join(SINI, "buku/uji-buku.pdf"), join(m, "Buku Pecahan.pdf"))
  writeFileSync(join(m, "lama.doc"), "x")
  writeFileSync(join(m, "foto kalender.jpg"), "x")
  r = await jalan("baca_masukan")
  cek("daftar masukan: 5 berkas dengan jenis dan cuplikan", r.includes("(5)") && r.includes("Contoh RPP Sekolah.docx [word") && r.includes("Kalender Sekolah.xlsx [excel") && r.includes("Buku Pecahan.pdf [pdf, 1 halaman"), r)
  cek("format lama dan foto dijelaskan", r.includes("lama.doc: ") && r.includes(".docx/.xlsx") && r.includes("foto kalender.jpg: ") && r.includes("gambar"), r)
  r = await jalan("baca_masukan", { berkas: "Contoh RPP Sekolah.docx" })
  cek("Word → Markdown: judul, tabel, daftar", r.includes("## RENCANA PELAKSANAAN PEMBELAJARAN") && r.includes("### A. Tujuan") && r.includes("| Kegiatan | Waktu |") && r.includes("| Pendahuluan | 10 menit |") && r.includes("Langkah satu"), r)
  r = await jalan("baca_masukan", { berkas: "guru\\masukan\\Kalender Sekolah.xlsx" })
  cek("Excel → tabel; tanggal berformat tanggal jadi YYYY-MM-DD; rich text dan rumus", r.includes("## Lembar: Kalender 2026") && r.includes("| 2026-08-17 | HUT RI | 5 |") && r.includes("| 2026-07-13 | MPLS hari 1 | 6 |"), r)
  r = await jalan("baca_masukan", { berkas: "Buku Pecahan.pdf" })
  cek("PDF teks terbaca per halaman", r.includes("=== Halaman 1 ===") && r.includes("ZEBRA-4417"), r)
  r = await jalan("baca_masukan", { berkas: "Buku Pecahan.pdf", jadikan_buku: true })
  cek("PDF dijadikan buku pustaka", r.includes("guru/buku/Buku Pecahan.pdf") && (await jalan("baca_buku")).includes("Buku Pecahan"), r)
  r = await jalan("baca_masukan", { berkas: "../sekolah/kebijakan.json" })
  cek("berkas di luar guru/ ditolak", r.startsWith("GAGAL"), r)

  // ---------- Peta perangkat: guru dengan perencanaan ----------
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  cpSync(join(SINI, "sekolah/kebijakan.json"), join(akar, "sekolah/kebijakan.json"))
  cpSync(join(SINI, "sekolah/referensi/cp/matematika-fase-b.md"), join(akar, "sekolah/referensi/cp/matematika-fase-b.md"))
  r = await jalan("status_perangkat", { tanggal: "2026-10-16" })
  cek("status: perencanaan belum ada → langkah perencanaan", r.includes("✖ ATP, Prota, Promes") && /\d\. Perencanaan Matematika/.test(r), r)
  await jalan("susun_perencanaan", { mapel: "matematika" })
  mkdirSync(join(akar, "guru/draf/2 Modul dan LKPD/Matematika TP4 Kalimat Matematika"), { recursive: true })
  writeFileSync(join(akar, "guru/draf/2 Modul dan LKPD/Matematika TP4 Kalimat Matematika/RPM.md"), "# RPM\n[PERLU GURU: jumlah pertemuan]\n")
  r = await jalan("status_perangkat", { tanggal: "2026-10-16" })
  cek("status: modul TP4 terdeteksi, TP5 (2 minggu ke depan) jadi langkah berikutnya", r.includes("Modul/RPM + LKPD: 1/") && r.includes("Bahan ajar Matematika TP5") && !r.includes("Bahan ajar Matematika TP4"), r)
  cek("status: KKTP, buku nilai, absensi, kalender Word masuk langkah berikutnya", r.includes("KKTP Matematika") && r.includes("Buku nilai Matematika semester 1") && r.includes("Daftar hadir 2026-10") && r.includes("Kalender pendidikan (Word)"), r)
  cek("status: STS yang sudah lewat tidak dianggap kurang", r.includes("STS semester 1 (2026-09-21, sudah lewat)") && !/\d\. STS Matematika/.test(r), r)
  cek("status: penanda [PERLU GURU] dihitung", r.includes("[PERLU GURU/SEKOLAH]") && r.includes("Matematika TP4 Kalimat Matematika/RPM.md (1)"), r)
  r = await jalan("status_perangkat", { tanggal: "2026-09-01" })
  cek("status: STS dekat (≤ 4 minggu) masuk langkah berikutnya", r.includes("STS Matematika semester 1") && r.includes("2026-09-21"), r)
  r = await jalan("status_perangkat", { tanggal: "16-10-2026" })
  cek("status: tanggal salah format → GAGAL", r.startsWith("GAGAL"), r)
} finally {
  rmSync(akar, { recursive: true, force: true })
}
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
