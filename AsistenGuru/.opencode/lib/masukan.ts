// Membaca dokumen yang diberikan guru (PDF teks, Word .docx, Excel .xlsx) menjadi teks/Markdown untuk asisten.
// Tanpa dependensi: PDF lewat pdf.js (vendor), Word dan Excel lewat pembaca ZIP sendiri.

import { Gagal } from "./berkas.ts"
import { petaGaya } from "./docx.ts"
import { teksPdfData } from "./pustaka.ts"
import { bacaZip } from "./unzip.ts"

const dec = new TextDecoder()
const entitas = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")

/** Teks run Word: <w:t>, tab, dan baris baru di dalam paragraf. */
function teksRun(x: string): string {
  return entitas(
    [...x.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>/g)]
      .map((m) => (m[0] === "<w:tab/>" ? "\t" : m[0] === "<w:br/>" ? "\n" : m[1]))
      .join(""),
  )
    .replace(/[ \t]+/g, " ")
    .trim()
}

/** Word (.docx) → Markdown: judul (gaya heading/Title), paragraf, daftar, dan tabel. */
export function docxKeMarkdown(data: Uint8Array): string {
  const isi = bacaZip(data)
  const doc = isi.get("word/document.xml")
  if (!doc) throw new Gagal("Berkas bukan dokumen Word (.docx).")
  const nama = new Map<string, string>()
  for (const [n, id] of petaGaya(isi.has("word/styles.xml") ? dec.decode(isi.get("word/styles.xml")!) : "")) nama.set(id, n)
  const body = dec.decode(doc).match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? ""
  const out: string[] = []
  // Tabel bersarang jarang dipakai di dokumen sekolah.
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g)) {
    const blok = m[0]
    if (blok.startsWith("<w:tbl>")) {
      const baris = (blok.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? []).map((tr) =>
        (tr.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? []).map((tc) =>
          (tc.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? []).map(teksRun).filter(Boolean).join("<br>").replace(/\|/g, "\\|"),
        ),
      )
      if (!baris.length) continue
      const n = Math.max(...baris.map((b) => b.length))
      out.push("", `| ${Array.from({ length: n }, (_, i) => baris[0][i] ?? "").join(" | ")} |`, `|${Array.from({ length: n }, () => "---").join("|")}|`)
      for (const b of baris.slice(1)) out.push(`| ${Array.from({ length: n }, (_, i) => b[i] ?? "").join(" | ")} |`)
      out.push("")
      continue
    }
    const t = teksRun(blok)
    if (!t) continue
    const id = blok.match(/<w:pStyle w:val="([^"]*)"/)?.[1]
    const g = id ? (nama.get(id) ?? id.toLowerCase()) : ""
    const lvl = g.match(/^heading (\d)/)?.[1]
    if (g === "title") out.push(`# ${t}`)
    else if (lvl) out.push(`${"#".repeat(Math.min(6, Number(lvl) + 1))} ${t}`)
    else if (/<w:numPr>/.test(blok) || /list/.test(g)) out.push(`- ${t}`)
    else out.push(t)
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

/** Nomor seri tanggal Excel → YYYY-MM-DD. */
function tanggalExcel(n: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000)
  return d.toISOString().slice(0, 10)
}

const kolomKeIndeks = (c: string) => [...c].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1

/** Excel (.xlsx) → tabel mentah per lembar (nilai sel sebagai teks; tanggal berformat tanggal menjadi YYYY-MM-DD). */
export function bacaTabelXlsx(data: Uint8Array, maksBaris = 300, maksKolom = 30): { nama: string; sel: string[][] }[] {
  const isi = bacaZip(data)
  const t = (n: string) => (isi.has(n) ? dec.decode(isi.get(n)!) : "")
  const wb = t("xl/workbook.xml")
  if (!wb) throw new Gagal("Berkas bukan buku kerja Excel (.xlsx).")
  const shared = [...t("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => entitas([...m[1].matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((x) => x[1]).join("")))
  // Gaya sel yang berformat tanggal.
  const st = t("xl/styles.xml")
  const fmtKustom = new Map([...st.matchAll(/<numFmt numFmtId="(\d+)" formatCode="([^"]*)"/g)].map((m) => [Number(m[1]), m[2]]))
  const xfs = (st.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "").match(/<xf\b[^>]*>/g) ?? []
  const gayaTanggal = xfs.map((x) => {
    const id = Number(x.match(/numFmtId="(\d+)"/)?.[1] ?? 0)
    if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47)) return true
    const f = fmtKustom.get(id)
    return !!f && /[dy]/i.test(f.replace(/\[[^\]]*\]|"[^"]*"/g, ""))
  })
  const rels = t("xl/_rels/workbook.xml.rels")
  const out: { nama: string; sel: string[][] }[] = []
  for (const s of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const nama = entitas(s[0].match(/name="([^"]*)"/)?.[1] ?? "Lembar")
    const rid = s[0].match(/r:id="([^"]*)"/)?.[1]
    const target = rels.match(new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*>`))?.[0]?.match(/Target="([^"]*)"/)?.[1]
    if (!target) continue
    const xml = t(target.startsWith("/") ? target.slice(1) : `xl/${target}`)
    const sel: string[][] = []
    for (const c of xml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const r = Number(c[2]) - 1
      const k = kolomKeIndeks(c[1])
      if (r >= maksBaris || k >= maksKolom) continue
      const atr = c[3]
      const dalam = c[4] ?? ""
      const jenis = atr.match(/t="(\w+)"/)?.[1]
      const gaya = Number(atr.match(/s="(\d+)"/)?.[1] ?? 0)
      const v = dalam.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      let nilai = ""
      if (jenis === "s" && v !== undefined) nilai = shared[Number(v)] ?? ""
      else if (jenis === "inlineStr") nilai = entitas([...dalam.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((x) => x[1]).join(""))
      else if (v !== undefined) nilai = gayaTanggal[gaya] && /^\d+(\.\d+)?$/.test(v) ? tanggalExcel(Number(v)) : entitas(v)
      ;(sel[r] ??= [])[k] = nilai
    }
    out.push({ nama, sel: Array.from({ length: sel.length }, (_, i) => sel[i] ?? []) })
  }
  return out
}

/** Excel (.xlsx) → Markdown: satu tabel per lembar. Tanggal (format tanggal) diubah menjadi YYYY-MM-DD. */
export function xlsxKeMarkdown(data: Uint8Array, maksBaris = 300, maksKolom = 30): string {
  const out: string[] = []
  for (const { nama, sel } of bacaTabelXlsx(data, maksBaris, maksKolom)) {
    const baris = sel.map((b) => Array.from({ length: b.length }, (_, k) => (b[k] ?? "").replace(/\|/g, "\\|").replace(/\n/g, "<br>"))).filter((b) => b.some((x) => x && x.trim()))
    if (!baris.length) continue
    const n = Math.max(...baris.map((b) => b.length))
    out.push(`## Lembar: ${nama}`, "", `| ${Array.from({ length: n }, (_, i) => baris[0][i] ?? "").join(" | ")} |`, `|${Array.from({ length: n }, () => "---").join("|")}|`)
    for (const b of baris.slice(1)) out.push(`| ${Array.from({ length: n }, (_, i) => b[i] ?? "").join(" | ")} |`)
    out.push("")
  }
  return out.join("\n").trim()
}

export async function bacaDokumen(nama: string, data: Uint8Array): Promise<{ jenis: "pdf" | "word" | "excel" | "teks"; teks: string; halaman?: number }> {
  const n = nama.toLowerCase()
  if (n.endsWith(".pdf")) {
    const hal = await teksPdfData(data, nama)
    const kosong = hal.filter((h) => h.trim().length < 20).length
    if (kosong === hal.length) throw new Gagal(`${nama} tidak berisi teks (kemungkinan hasil pindaian/foto). Minta guru mengirim versi Word/PDF teks, atau mengetik isinya.`)
    return { jenis: "pdf", teks: hal.map((h, i) => `=== Halaman ${i + 1} ===\n${h}`).join("\n\n"), halaman: hal.length }
  }
  if (n.endsWith(".docx")) return { jenis: "word", teks: docxKeMarkdown(data) }
  if (n.endsWith(".xlsx")) return { jenis: "excel", teks: xlsxKeMarkdown(data) }
  if (/\.(md|txt|csv)$/.test(n)) return { jenis: "teks", teks: dec.decode(data).replace(/^﻿/, "").replace(/\r\n?/g, "\n") }
  if (/\.(doc|xls|ppt)$/.test(n)) throw new Gagal(`${nama} berformat lama (.doc/.xls). Simpan ulang sebagai .docx/.xlsx (File → Save As) lalu taruh lagi.`)
  if (/\.(jpe?g|png|heic|webp)$/.test(n)) throw new Gagal(`${nama} berupa gambar. Teks dari foto belum bisa dibaca alat ini; minta guru mengetik isinya atau mengirim versi dokumen.`)
  throw new Gagal(`Format ${nama} belum didukung (yang didukung: PDF teks, .docx, .xlsx, .txt).`)
}
