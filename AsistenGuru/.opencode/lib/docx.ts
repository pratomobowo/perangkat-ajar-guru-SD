// Mengubah Markdown menjadi .docx (Word) yang rapi dan siap cetak, tanpa dependensi.
//
// Markdown yang didukung: judul #..####, paragraf (baris baru dipertahankan), **tebal**, *miring*, tabel |..|,
// daftar - / 1. / a. / - [ ], kutipan >, garis ---, <!-- halaman-baru -->, dan blok identitas:
//   ```identitas
//   Satuan pendidikan: SDIT Contoh
//   Kelas/Fase: 4 / B
//   ```
// Penanda [PERLU ...] diberi stabilo kuning. Baris yang diawali "DRAF" dicetak merah tebal.
//
// Tata letak: kop sekolah, judul utama di tengah, lebar kolom tabel proporsional terhadap isinya, kolom angka
// rata tengah, baris tabel tidak terpotong antarhalaman, judul kolom diulang di tiap halaman, nomor halaman di kaki,
// dan blok tanda tangan untuk dokumen guru.

import { buatZip, xml } from "./zip.ts"

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const BULAN = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
function tanggalIndonesia(y: number, m: number, d: number): string {
  return `${HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${d} ${BULAN[m]} ${y}`
}

export type JenisDokumen = "dokumen_guru" | "lembar_siswa" | "kunci"
export type Orang = { nama?: string | null; nip?: string | null }
export type OpsiDokumen = {
  jenis?: JenisDokumen
  lanskap?: boolean
  kertas?: "A4" | "F4"
  huruf?: string
  kop?: { sekolah?: string | null; alamat?: string | null }
  ttd?: { kota?: string | null; tanggal: string; kepala?: Orang; guru?: Orang & { jabatan?: string } } | null
}

const KERTAS = { A4: [11906, 16838], F4: [12189, 18709] } as const
const MARGIN = { atas: 1134, bawah: 1134, kiri: 1418, kanan: 1134 } // 2 cm; kiri 2,5 cm untuk jilid

type Run = { teks: string; tebal?: boolean; miring?: boolean; garisBawah?: boolean; stabilo?: boolean; merah?: boolean; ukuran?: number }

function runXml(r: Run): string {
  const p: string[] = []
  // Urutan sesuai skema rPr: b, i, color, sz, szCs, highlight, u
  if (r.tebal) p.push("<w:b/>")
  if (r.miring) p.push("<w:i/>")
  if (r.merah) p.push('<w:color w:val="C00000"/>')
  if (r.ukuran) p.push(`<w:sz w:val="${r.ukuran}"/><w:szCs w:val="${r.ukuran}"/>`)
  if (r.stabilo) p.push('<w:highlight w:val="yellow"/>')
  if (r.garisBawah) p.push('<w:u w:val="single"/>')
  const rpr = p.length ? `<w:rPr>${p.join("")}</w:rPr>` : ""
  return `<w:r>${rpr}<w:t xml:space="preserve">${xml(r.teks)}</w:t></w:r>`
}

function inline(teks: string, dasar: Partial<Run> = {}): string {
  const runs: Run[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[PERLU[^\]]*\]|\[([^\]]+)\]\([^)]+\))/g
  let last = 0
  for (const m of teks.matchAll(re)) {
    if (m.index! > last) runs.push({ ...dasar, teks: teks.slice(last, m.index) })
    const t = m[0]
    if (t.startsWith("**")) runs.push({ ...dasar, teks: t.slice(2, -2), tebal: true })
    else if (t.startsWith("`")) runs.push({ ...dasar, teks: t.slice(1, -1) })
    else if (t.startsWith("[PERLU")) runs.push({ ...dasar, teks: t, stabilo: true })
    else if (t.startsWith("[")) runs.push({ ...dasar, teks: m[2] })
    else runs.push({ ...dasar, teks: t.slice(1, -1), miring: true })
    last = m.index! + t.length
  }
  if (last < teks.length) runs.push({ ...dasar, teks: teks.slice(last) })
  return runs.map(runXml).join("")
}

const polos = (t: string) => t.replace(/\*\*|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

type OpsiPara = {
  gaya?: string
  keepNext?: boolean
  pBdr?: string // isi <w:pBdr>
  tabs?: number[] // posisi tab kiri (twip)
  spasiSebelum?: number
  spasiSetelah?: number
  baris?: number // jarak baris (240 = tunggal)
  kiri?: number
  gantung?: number
  jc?: "center" | "right" | "both"
}
/** Paragraf dengan elemen pPr dalam urutan skema resmi Word (pStyle, keepNext, pBdr, tabs, spacing, ind, jc). */
function para(isi: string, o: OpsiPara = {}): string {
  const p: string[] = []
  if (o.gaya) p.push(`<w:pStyle w:val="${o.gaya}"/>`)
  if (o.keepNext) p.push("<w:keepNext/>")
  if (o.pBdr) p.push(`<w:pBdr>${o.pBdr}</w:pBdr>`)
  const tabs = [...new Set([...(o.tabs ?? []), ...(o.gantung ? [o.kiri ?? 0] : [])])].sort((x, y) => x - y)
  if (tabs.length) p.push(`<w:tabs>${tabs.map((t) => `<w:tab w:val="left" w:pos="${t}"/>`).join("")}</w:tabs>`)
  if (o.spasiSetelah !== undefined || o.spasiSebelum !== undefined || o.baris !== undefined)
    p.push(
      `<w:spacing${o.spasiSebelum !== undefined ? ` w:before="${o.spasiSebelum}"` : ""}${o.spasiSetelah !== undefined ? ` w:after="${o.spasiSetelah}"` : ""}${o.baris !== undefined ? ` w:line="${o.baris}" w:lineRule="auto"` : ""}/>`,
    )
  if (o.kiri || o.gantung) p.push(`<w:ind w:left="${o.kiri ?? 0}" w:hanging="${o.gantung ?? 0}"/>`)
  if (o.jc) p.push(`<w:jc w:val="${o.jc}"/>`)
  return `<w:p>${p.length ? `<w:pPr>${p.join("")}</w:pPr>` : ""}${isi}</w:p>`
}

function selTabel(baris: string): string[] {
  let s = baris.trim()
  if (s.startsWith("|")) s = s.slice(1)
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1)
  return s.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"))
}

const GARIS = (warna = "808080", ukuran = 4) =>
  ["top", "left", "bottom", "right", "insideH", "insideV"].map((g) => `<w:${g} w:val="single" w:sz="${ukuran}" w:space="0" w:color="${warna}"/>`).join("")
const TANPA_GARIS = ["top", "left", "bottom", "right", "insideH", "insideV"].map((g) => `<w:${g} w:val="nil"/>`).join("")

function tabel(baris: string[][], lebar: number[], o: { kepala?: boolean; garis?: boolean; ukuran: number; tengah?: boolean[] }): string {
  const grid = `<w:tblGrid>${lebar.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`
  const rows = baris
    .map((r, i) => {
      const header = !!o.kepala && i === 0
      const redup = !header && r.some((c) => /^(tidak efektif|libur)$/i.test(polos(c).trim()))
      const sel = lebar
        .map((w, k) => {
          const isi = (r[k] ?? "").split(/<br\s*\/?>/i)
          const shade = header ? '<w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/>' : redup ? '<w:shd w:val="clear" w:color="auto" w:fill="EDEDED"/>' : ""
          const jc = header || o.tengah?.[k] ? "center" : undefined
          const ps = isi
            .map((t) => para(inline(t, { tebal: header || undefined, ukuran: o.ukuran }), { spasiSetelah: 0, spasiSebelum: 0, baris: 240, jc }))
            .join("")
          return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${shade}<w:vAlign w:val="${header ? "center" : "top"}"/></w:tcPr>${ps}</w:tc>`
        })
        .join("")
      return `<w:tr><w:trPr><w:cantSplit/>${header ? "<w:tblHeader/>" : ""}</w:trPr>${sel}</w:tr>`
    })
    .join("")
  const total = lebar.reduce((a, b) => a + b, 0)
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${o.garis === false ? TANPA_GARIS : GARIS()}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>${grid}${rows}</w:tbl>`
}

/** Lebar kolom proporsional terhadap panjang isi, dengan batas minimum dan maksimum. */
function hitungLebar(data: string[][], tersedia: number): number[] {
  const n = Math.max(...data.map((r) => r.length))
  const bobot = Array.from({ length: n }, (_, k) => {
    const panjang = data.map((r, i) => {
      const teks = polos(r[k] ?? "")
      const kataTerpanjang = Math.max(0, ...teks.split(/\s+/).map((w) => w.length))
      // Judul kolom boleh turun baris: cukup kata terpanjangnya yang muat.
      if (i === 0) return kataTerpanjang * 1.15
      return Math.max(...teks.split(/<br\s*\/?>/i).map((s) => s.length), kataTerpanjang * 1.6)
    })
    const maks = Math.max(3, ...panjang)
    return Math.min(maks, 60)
  })
  const jumlah = bobot.reduce((a, b) => a + b, 0)
  const lebar = bobot.map((b) => Math.max(520, Math.floor((tersedia * b) / jumlah)))
  const lebih = lebar.reduce((a, b) => a + b, 0) - tersedia
  if (lebih > 0) {
    const iMaks = lebar.indexOf(Math.max(...lebar))
    lebar[iMaks] -= lebih
  }
  return lebar
}

const ANGKA = /^[\d\s.,:;\-–—\/()%×x+=]*$/

function tabelMarkdown(blok: string[], tersedia: number, ukuran: number): string {
  const data = blok.filter((b) => !/^\|?\s*:?-{2,}/.test(b.trim())).map(selTabel)
  const n = Math.max(...data.map((r) => r.length))
  const lebar = hitungLebar(data, tersedia)
  const tengah = Array.from({ length: n }, (_, k) => {
    const isi = data.slice(1).map((r) => polos(r[k] ?? "").trim()).filter(Boolean)
    return isi.length > 0 && isi.every((t) => ANGKA.test(t) || t.length <= 4)
  })
  return tabel(data, lebar, { kepala: true, ukuran, tengah }) + para("", { spasiSetelah: 0 })
}

function blokIdentitas(baris: string[], tersedia: number, ukuran: number): string {
  const data = baris
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const i = b.indexOf(":")
      return i < 0 ? [b, "", ""] : [`**${b.slice(0, i).trim()}**`, ":", b.slice(i + 1).trim()]
    })
  const kiri = Math.round(tersedia * 0.3)
  return tabel(data, [kiri, 240, tersedia - kiri - 240], { garis: false, ukuran }) + para("", { spasiSetelah: 0 })
}

function kopXml(o: OpsiDokumen, tersedia: number): string {
  const sekolah = o.kop?.sekolah?.trim()
  const out: string[] = []
  if (sekolah) {
    const siswa = o.jenis === "lembar_siswa"
    out.push(para(runXml({ teks: sekolah.toUpperCase(), tebal: true, ukuran: siswa ? 24 : 28 }), { jc: "center", spasiSetelah: 0 }))
    if (o.kop?.alamat && !siswa) out.push(para(runXml({ teks: o.kop.alamat, ukuran: 18 }), { jc: "center", spasiSetelah: 0 }))
    out.push(para("", { spasiSetelah: 160, pBdr: `<w:bottom w:val="${siswa ? "single" : "thinThickSmallGap"}" w:sz="${siswa ? 6 : 12}" w:space="1" w:color="000000"/>` }))
  }
  if (o.jenis === "kunci")
    out.push(
      tabel([["**KUNCI JAWABAN — UNTUK GURU, JANGAN DIBAGIKAN KE MURID**"]], [tersedia], { garis: true, ukuran: 20, tengah: [true] }) +
        para("", { spasiSetelah: 0 }),
    )
  return out.join("")
}

function ttdXml(o: OpsiDokumen, tersedia: number, ukuran: number): string {
  const t = o.ttd
  if (!t) return ""
  const titik = "( ...................................... )"
  const kolom = (judul1: string, judul2: string, orang?: Orang) => {
    const nama = orang?.nama?.trim()
    const baris = [
      para(runXml({ teks: judul1, ukuran }), { jc: "center", spasiSetelah: 0 }),
      para(runXml({ teks: judul2, ukuran }), { jc: "center", spasiSetelah: 0 }),
      para("", { spasiSetelah: 0 }),
      para("", { spasiSetelah: 0 }),
      para("", { spasiSetelah: 0 }),
      para(nama ? runXml({ teks: nama, tebal: true, garisBawah: true, ukuran }) : runXml({ teks: titik, ukuran }), { jc: "center", spasiSetelah: 0 }),
    ]
    if (orang?.nip) baris.push(para(runXml({ teks: `NIP. ${orang.nip}`, ukuran }), { jc: "center", spasiSetelah: 0 }))
    return baris.join("")
  }
  const w = Math.floor(tersedia / 2)
  const sel = (isi: string) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${isi}</w:tc>`
  const kota = t.kota?.trim() || "...................."
  return (
    para("", { spasiSetelah: 240 }) +
    `<w:tbl><w:tblPr><w:tblW w:w="${w * 2}" w:type="dxa"/><w:tblBorders>${TANPA_GARIS}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${w}"/><w:gridCol w:w="${w}"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>` +
    sel(kolom("Mengetahui,", "Kepala Sekolah", t.kepala)) +
    sel(kolom(`${kota}, ${t.tanggal}`, t.guru?.jabatan ?? "Guru", t.guru)) +
    "</w:tr></w:tbl>"
  )
}

export function markdownKeBody(md: string, o: OpsiDokumen, tersedia: number): { body: string; kolomMaks: number } {
  const siswa = o.jenis === "lembar_siswa"
  const ukTabel = siswa ? 22 : 20
  const lines = md.replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---\n/, "").split("\n")
  const out: string[] = []
  let paragraf: string[] = []
  let kolomMaks = 0
  let judulPertama = true

  const flush = () => {
    if (!paragraf.length) return
    const isi = paragraf.map((l) => (/^DRAF\b/i.test(l.trim()) ? inline(l, { tebal: true, merah: true }) : inline(l))).join("<w:r><w:br/></w:r>")
    out.push(para(isi))
    paragraf = []
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    const t = l.trim()
    if (t === "") { flush(); continue }
    if (/^<!--\s*halaman-baru\s*-->$/i.test(t)) { flush(); out.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>'); continue }
    if (/^<!--.*-->$/.test(t)) continue
    if (t.startsWith("```")) {
      flush()
      const jenis = t.slice(3).trim().toLowerCase()
      const isi: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) isi.push(lines[i++])
      if (jenis === "identitas") out.push(blokIdentitas(isi, tersedia, siswa ? 22 : 20))
      else for (const b of isi) out.push(para(runXml({ teks: b, ukuran: 18 }), { spasiSetelah: 0 }))
      continue
    }
    const h = t.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      flush()
      const lvl = h[1].length
      const tengah = lvl === 1 && judulPertama
      if (lvl === 1) judulPertama = false
      // Judul berupa tanggal ISO (mis. di jurnal) ditampilkan sebagai tanggal Indonesia: "Rabu, 14 Oktober 2026"
      const iso = h[2].trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*\(.*\))?$/)
      const teksJudul = iso ? tanggalIndonesia(+iso[1], +iso[2], +iso[3]) : h[2]
      out.push(para(inline(teksJudul), { gaya: `Heading${lvl}`, jc: tengah ? "center" : undefined }))
      continue
    }
    if (t.startsWith("|")) {
      flush()
      const blok: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) blok.push(lines[i++])
      i--
      kolomMaks = Math.max(kolomMaks, ...blok.map((b) => selTabel(b).length))
      out.push(tabelMarkdown(blok, tersedia, ukTabel))
      continue
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      flush()
      out.push(para("", { pBdr: '<w:bottom w:val="single" w:sz="6" w:space="1" w:color="808080"/>' }))
      continue
    }
    // Pilihan jawaban (A. … D.): disusun berjajar agar hemat kertas, dan tidak terpisah dari soalnya.
    const OPSI = /^(?:[-*•]\s+)?([A-E])[.)]\s+(.*)$/
    if (OPSI.test(t) && /^A$/.test(t.match(OPSI)![1])) {
      flush()
      const opsi: [string, string][] = []
      while (i < lines.length && OPSI.test(lines[i].trim())) {
        const m = lines[i].trim().match(OPSI)!
        opsi.push([m[1], m[2]])
        i++
      }
      i--
      // soal sebelumnya tetap bersama pilihan
      const prev = out.length - 1
      if (prev >= 0 && out[prev].startsWith("<w:p>") && !out[prev].includes("<w:keepNext/>"))
        out[prev] = out[prev].startsWith("<w:p><w:pPr><w:pStyle")
          ? out[prev].replace(/(<w:pStyle [^>]*\/>)/, "$1<w:keepNext/>")
          : out[prev].startsWith("<w:p><w:pPr>")
            ? out[prev].replace("<w:p><w:pPr>", "<w:p><w:pPr><w:keepNext/>")
            : out[prev].replace("<w:p>", "<w:p><w:pPr><w:keepNext/></w:pPr>")
      const panjang = Math.max(...opsi.map(([, x]) => polos(x).length))
      const perBaris = panjang <= 16 ? opsi.length : panjang <= 38 ? 2 : 1
      const lebarKolom = Math.floor((tersedia - 440) / perBaris)
      for (let k = 0; k < opsi.length; k += perBaris) {
        const grup = opsi.slice(k, k + perBaris)
        const isi = grup
          .map(([h, x], g) => (g ? runXml({ teks: "\t" }) : "") + runXml({ teks: `${h}.` }) + runXml({ teks: "\t" }) + inline(x))
          .join("")
        const akhirGrup = k + perBaris >= opsi.length
        const tabs = perBaris === 1 ? [] : grup.flatMap((_, g) => (g ? [440 + g * lebarKolom, 440 + g * lebarKolom + 400] : [840]))
        out.push(
          para(isi, {
            kiri: perBaris === 1 ? 840 : 440,
            gantung: perBaris === 1 ? 400 : 0,
            tabs,
            keepNext: !akhirGrup,
            spasiSetelah: akhirGrup ? 160 : 40,
          }),
        )
      }
      continue
    }
    const indent = Math.floor((l.length - l.trimStart().length) / 2) * 360
    const cek = t.match(/^[-*]\s+\[( |x|X)\]\s+(.*)$/)
    if (cek) { flush(); out.push(para(runXml({ teks: cek[1] === " " ? "☐\t" : "☑\t" }) + inline(cek[2]), { kiri: 400 + indent, gantung: 400, spasiSetelah: 60 })); continue }
    const bul = t.match(/^[-*•]\s+(.*)$/)
    if (bul) { flush(); out.push(para(runXml({ teks: "•\t" }) + inline(bul[1]), { kiri: 360 + indent, gantung: 360, spasiSetelah: 60 })); continue }
    const num = t.match(/^(\d+[.)]|[a-zA-Z][.)])\s+(.*)$/)
    if (num) { flush(); out.push(para(runXml({ teks: num[1] + "\t" }) + inline(num[2]), { kiri: 440 + indent, gantung: 440, spasiSetelah: 60 })); continue }
    if (t.startsWith(">")) {
      flush()
      out.push(para(inline(t.replace(/^>\s?/, ""), { miring: true }), { kiri: 240, pBdr: '<w:left w:val="single" w:sz="18" w:space="8" w:color="A6A6A6"/>' }))
      continue
    }
    paragraf.push(t)
  }
  flush()
  return { body: out.join(""), kolomMaks }
}

function styles(o: OpsiDokumen): string {
  const huruf = o.huruf ?? "Arial"
  const siswa = o.jenis === "lembar_siswa"
  const sz = siswa ? 24 : 22
  const baris = siswa ? 336 : 276
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${huruf}" w:hAnsi="${huruf}" w:eastAsia="${huruf}" w:cs="${huruf}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:widowControl/><w:spacing w:after="120" w:line="${baris}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="${huruf}" w:hAnsi="${huruf}" w:eastAsia="${huruf}" w:cs="${huruf}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="120" w:after="200"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="${siswa ? 30 : 28}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="${siswa ? 26 : 24}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="595959"/><w:sz w:val="16"/></w:rPr></w:style>
</w:styles>`
}

const FOOTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:t xml:space="preserve">Halaman </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple><w:r><w:t xml:space="preserve"> dari </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`

export function lebarIsi(o: OpsiDokumen, lanskap: boolean): number {
  const [w, h] = KERTAS[o.kertas ?? "A4"]
  return (lanskap ? h : w) - MARGIN.kiri - MARGIN.kanan
}

export function buatDocx(md: string, opsi: OpsiDokumen = {}): { data: Uint8Array; lanskap: boolean } {
  const o: OpsiDokumen = { jenis: "dokumen_guru", ...opsi }
  // Tentukan orientasi dulu dari jumlah kolom tabel terlebar.
  const kolomMaks = Math.max(0, ...md.split("\n").filter((l) => l.trim().startsWith("|")).map((l) => selTabel(l).length))
  const lanskap = o.lanskap ?? kolomMaks >= 7
  const tersedia = lebarIsi(o, lanskap)
  const { body } = markdownKeBody(md, o, tersedia)
  const kop = kopXml(o, tersedia)
  const ttd = o.jenis === "dokumen_guru" ? ttdXml(o, tersedia, 22) : ""
  const [pw, ph] = KERTAS[o.kertas ?? "A4"]
  const [w, h] = lanskap ? [ph, pw] : [pw, ph]
  const sect = `<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="${w}" w:h="${h}"${lanskap ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${MARGIN.atas}" w:right="${MARGIN.kanan}" w:bottom="${MARGIN.bawah}" w:left="${MARGIN.kiri}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${kop}${body}${ttd}${sect}</w:body></w:document>`
  const data = buatZip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>`,
    "word/document.xml": doc,
    "word/styles.xml": styles(o),
    "word/footer1.xml": FOOTER,
    "word/settings.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:themeFontLang w:val="id-ID"/></w:settings>`,
  })
  return { data, lanskap }
}
