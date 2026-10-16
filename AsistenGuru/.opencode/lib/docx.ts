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

import type { Gaya } from "./gaya.ts"
import { bacaZip } from "./unzip.ts"
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
  /** Gaya tampilan pilihan guru/sekolah (lib/gaya.ts). */
  gaya?: Gaya
  /** Word contoh (.docx) sebagai dasar: gaya, header/kop, footer, dan ukuran halamannya dipakai. */
  dasar?: Uint8Array
}

const KERTAS = { A4: [11906, 16838], F4: [12189, 18709] } as const
const CM = 567 // twip per cm
/** Margin bawaan 2 cm, kiri 2,5 cm untuk jilid; bisa diubah lewat gaya. */
function margin(o: OpsiDokumen) {
  const m = o.gaya?.margin ?? {}
  const t = (cm: number | undefined, bawaan: number) => (cm ? Math.round(cm * CM) : bawaan)
  return { atas: t(m.atas, 1134), bawah: t(m.bawah, 1134), kiri: t(m.kiri, 1418), kanan: t(m.kanan, 1134) }
}
const kertas = (o: OpsiDokumen) => KERTAS[o.gaya?.kertas ?? o.kertas ?? "A4"]
const warnaKepala = (o: OpsiDokumen) => o.gaya?.tabel?.warna_kepala ?? "D9E2F3"

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

function tabel(baris: string[][], lebar: number[], o: { kepala?: boolean; garis?: boolean; ukuran: number; tengah?: boolean[]; warna?: string }): string {
  const grid = `<w:tblGrid>${lebar.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`
  const rows = baris
    .map((r, i) => {
      const header = !!o.kepala && i === 0
      const redup = !header && r.some((c) => /^(tidak efektif|libur)$/i.test(polos(c).trim()))
      const sel = lebar
        .map((w, k) => {
          const isi = (r[k] ?? "").split(/<br\s*\/?>/i)
          const warna = o.warna ?? "D9E2F3"
          const shade = header && warna !== "tanpa" ? `<w:shd w:val="clear" w:color="auto" w:fill="${warna}"/>` : header ? "" : redup ? '<w:shd w:val="clear" w:color="auto" w:fill="EDEDED"/>' : ""
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

function tabelMarkdown(blok: string[], tersedia: number, ukuran: number, warna?: string): string {
  const data = blok.filter((b) => !/^\|?\s*:?-{2,}/.test(b.trim())).map(selTabel)
  const n = Math.max(...data.map((r) => r.length))
  const lebar = hitungLebar(data, tersedia)
  const tengah = Array.from({ length: n }, (_, k) => {
    const isi = data.slice(1).map((r) => polos(r[k] ?? "").trim()).filter(Boolean)
    return isi.length > 0 && isi.every((t) => ANGKA.test(t) || t.length <= 4)
  })
  return tabel(data, lebar, { kepala: true, ukuran, tengah, warna }) + para("", { spasiSetelah: 0 })
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

function kopXml(o: OpsiDokumen, tersedia: number, tampilKop = true): string {
  const sekolah = o.kop?.sekolah?.trim()
  const out: string[] = []
  if (sekolah && tampilKop && o.gaya?.kop?.tampil !== false) {
    const siswa = o.jenis === "lembar_siswa"
    for (const b of o.gaya?.kop?.baris_tambahan ?? []) out.push(para(runXml({ teks: b, tebal: true, ukuran: siswa ? 20 : 22 }), { jc: "center", spasiSetelah: 0 }))
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
  const kepala = o.gaya?.ttd?.kepala_sekolah === false ? para("", { spasiSetelah: 0 }) : kolom("Mengetahui,", "Kepala Sekolah", t.kepala)
  return (
    para("", { spasiSetelah: 240 }) +
    `<w:tbl><w:tblPr><w:tblW w:w="${w * 2}" w:type="dxa"/><w:tblBorders>${TANPA_GARIS}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${w}"/><w:gridCol w:w="${w}"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>` +
    sel(kepala) +
    sel(kolom(`${kota}, ${t.tanggal}`, t.guru?.jabatan ?? "Guru", t.guru)) +
    "</w:tr></w:tbl>"
  )
}

export function markdownKeBody(md: string, o: OpsiDokumen, tersedia: number): { body: string; kolomMaks: number } {
  const siswa = o.jenis === "lembar_siswa"
  const ukTabel = o.gaya?.tabel?.ukuran ? o.gaya.tabel.ukuran * 2 : siswa ? 22 : 20
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
      const tengah = lvl === 1 && judulPertama && o.gaya?.judul?.rata !== "kiri"
      const kapital = lvl === 1 && judulPertama && o.gaya?.judul?.kapital === true
      if (lvl === 1) judulPertama = false
      // Judul berupa tanggal ISO (mis. di jurnal) ditampilkan sebagai tanggal Indonesia: "Rabu, 14 Oktober 2026"
      const iso = h[2].trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*\(.*\))?$/)
      const teksJudul = iso ? tanggalIndonesia(+iso[1], +iso[2], +iso[3]) : kapital ? h[2].toUpperCase() : h[2]
      out.push(para(inline(teksJudul), { gaya: `Heading${lvl}`, jc: tengah ? "center" : undefined }))
      continue
    }
    if (t.startsWith("|")) {
      flush()
      const blok: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) blok.push(lines[i++])
      i--
      kolomMaks = Math.max(kolomMaks, ...blok.map((b) => selTabel(b).length))
      out.push(tabelMarkdown(blok, tersedia, ukTabel, warnaKepala(o)))
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

/** Ukuran huruf isi (setengah-poin), jarak baris, dan perataan dari gaya; bawaan berbeda untuk lembar siswa. */
function ukuranDasar(o: OpsiDokumen) {
  const siswa = o.jenis === "lembar_siswa"
  return {
    sz: o.gaya?.ukuran ? Math.round(o.gaya.ukuran * 2) : siswa ? 24 : 22,
    baris: o.gaya?.spasi ? Math.round(o.gaya.spasi * 240) : siswa ? 336 : 276,
    jc: o.gaya?.rata === "kanan-kiri" ? '<w:jc w:val="both"/>' : "",
  }
}

function styles(o: OpsiDokumen): string {
  const huruf = o.gaya?.huruf ?? o.huruf ?? "Arial"
  const siswa = o.jenis === "lembar_siswa"
  const { sz, baris, jc } = ukuranDasar(o)
  const h1 = o.gaya?.judul?.ukuran ? Math.round(o.gaya.judul.ukuran * 2) : siswa ? 30 : 28
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${xml(huruf)}" w:hAnsi="${xml(huruf)}" w:eastAsia="${xml(huruf)}" w:cs="${xml(huruf)}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:widowControl/><w:spacing w:after="120" w:line="${baris}" w:lineRule="auto"/>${jc}</w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="${xml(huruf)}" w:hAnsi="${xml(huruf)}" w:eastAsia="${xml(huruf)}" w:cs="${xml(huruf)}"/></w:rPr></w:style>
${gayaJudul(siswa, h1)}
</w:styles>`
}

/** Definisi gaya judul dan kaki halaman yang dipakai isi dokumen (juga ditambahkan ke Word contoh bila belum ada). */
function gayaJudul(siswa: boolean, h1: number): string {
  return `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="120" w:after="200"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="${h1}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="${siswa ? 26 : 24}"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="595959"/><w:sz w:val="16"/></w:rPr></w:style>`
}

function footerXml(o: OpsiDokumen, gaya = "Footer"): string {
  const isi =
    o.gaya?.nomor_halaman?.format === "X"
      ? `<w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>`
      : `<w:r><w:t xml:space="preserve">Halaman </w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple><w:r><w:t xml:space="preserve"> dari </w:t></w:r><w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>1</w:t></w:r></w:fldSimple>`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:pStyle w:val="${gaya}"/><w:jc w:val="center"/></w:pPr>${isi}</w:p></w:ftr>`
}

const pakaiNomor = (o: OpsiDokumen) => o.gaya?.nomor_halaman?.tampil !== false

export function lebarIsi(o: OpsiDokumen, lanskap: boolean): number {
  const [w, h] = kertas(o)
  const m = margin(o)
  return (lanskap ? h : w) - m.kiri - m.kanan
}

function orientasi(o: OpsiDokumen, kolomMaks: number): boolean {
  if (o.lanskap !== undefined) return o.lanskap
  if (o.gaya?.orientasi === "lanskap") return true
  if (o.gaya?.orientasi === "potret") return false
  return kolomMaks >= 7
}

export function buatDocx(md: string, opsi: OpsiDokumen = {}): { data: Uint8Array; lanskap: boolean; dasar?: InfoDasar } {
  const o: OpsiDokumen = { jenis: "dokumen_guru", ...opsi }
  // Tentukan orientasi dulu dari jumlah kolom tabel terlebar.
  const kolomMaks = Math.max(0, ...md.split("\n").filter((l) => l.trim().startsWith("|")).map((l) => selTabel(l).length))
  const lanskap = orientasi(o, kolomMaks)
  if (o.dasar) return buatDariDasar(md, o, lanskap)
  const tersedia = lebarIsi(o, lanskap)
  const { body } = markdownKeBody(md, o, tersedia)
  const kop = kopXml(o, tersedia)
  const ttd = o.jenis === "dokumen_guru" && o.gaya?.ttd?.tampil !== false ? ttdXml(o, tersedia, ukuranDasar(o).sz) : ""
  const [pw, ph] = kertas(o)
  const [w, h] = lanskap ? [ph, pw] : [pw, ph]
  const m = margin(o)
  const sect = `<w:sectPr>${pakaiNomor(o) ? '<w:footerReference w:type="default" r:id="rId2"/>' : ""}<w:pgSz w:w="${w}" w:h="${h}"${lanskap ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${m.atas}" w:right="${m.kanan}" w:bottom="${m.bawah}" w:left="${m.kiri}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`
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
    "word/footer1.xml": footerXml(o),
    "word/settings.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:themeFontLang w:val="id-ID"/></w:settings>`,
  })
  return { data, lanskap }
}

// ---------------------------------------------------------------------------------------------------------------
// Word contoh sebagai dasar (lapis 3): isi dari Markdown dituang ke dalam berkas Word milik guru/sekolah.
// Yang dipertahankan: gaya (styles.xml), header (kop/logo), footer, ukuran dan margin halaman, tema, dan media.
// Yang diganti: isi badan dokumen. Gaya yang diatur guru lewat chat (huruf, ukuran, spasi, margin, kertas) tetap menang.

export type InfoDasar = { kopDariHeader: boolean; footerDariContoh: boolean; gayaDitambah: string[] }

const dec = new TextDecoder()
const enc = new TextEncoder()
const attr = (tag: string, nama: string) => tag.match(new RegExp(`${nama}="([^"]*)"`))?.[1]

/** styleId untuk tiap nama gaya ("heading 1" → "Heading1" atau "Judul1" di Word berbahasa Indonesia). */
export function petaGaya(stylesXml: string): Map<string, string> {
  const peta = new Map<string, string>()
  for (const m of stylesXml.matchAll(/<w:style\b[^>]*>[\s\S]*?<\/w:style>/g)) {
    const id = attr(m[0].match(/<w:style\b[^>]*>/)![0], "w:styleId")
    const nama = m[0].match(/<w:name w:val="([^"]*)"/)?.[1]?.toLowerCase()
    if (id && nama) peta.set(nama, id)
  }
  return peta
}

function buatDariDasar(md: string, o: OpsiDokumen, lanskapPerlu: boolean): { data: Uint8Array; lanskap: boolean; dasar: InfoDasar } {
  let isi: Map<string, Uint8Array>
  try {
    isi = bacaZip(o.dasar!)
  } catch {
    throw new Error("Word contoh rusak atau bukan berkas .docx.")
  }
  const teks = (n: string) => (isi.has(n) ? dec.decode(isi.get(n)!) : null)
  const docXml = teks("word/document.xml")
  if (!docXml) throw new Error("Word contoh tidak berisi word/document.xml.")
  const rels = teks("word/_rels/document.xml.rels") ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'
  let types = teks("[Content_Types].xml") ?? ""
  let stylesXml = teks("word/styles.xml") ?? styles(o)

  // Akar dokumen (dengan semua namespace milik Word contoh) dan pengaturan halaman terakhir.
  let akar = docXml.match(/<w:document\b[^>]*>/)?.[0] ?? '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
  if (!akar.includes("xmlns:r=")) akar = akar.replace(/>$/, ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">')
  const sectSemua = [...docXml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)]
  let sect = sectSemua.length ? sectSemua[sectSemua.length - 1][0] : "<w:sectPr></w:sectPr>"

  // Header berisi teks/gambar dianggap kop: kop buatan asisten tidak ditambahkan.
  const target = (rid: string) => rels.match(new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*>`))?.[0]?.match(/Target="([^"]*)"/)?.[1]
  const kopDariHeader = [...sect.matchAll(/<w:headerReference\b[^>]*r:id="([^"]*)"/g)].some((m) => {
    const h = teks(`word/${(target(m[1]) ?? "").replace(/^\/?word\//, "")}`)
    return !!h && /<w:t[ >][^<]*\S|<w:drawing|<w:pict|<v:shape/.test(h)
  })
  const footerDariContoh = /<w:footerReference\b/.test(sect)

  // Ukuran dan margin halaman: dari contoh, kecuali guru mengatur sendiri lewat gaya.
  let pgSz = sect.match(/<w:pgSz\b[^>]*\/>/)?.[0] ?? `<w:pgSz w:w="${KERTAS.A4[0]}" w:h="${KERTAS.A4[1]}"/>`
  let pw = Number(attr(pgSz, "w:w") ?? KERTAS.A4[0])
  let ph = Number(attr(pgSz, "w:h") ?? KERTAS.A4[1])
  if (o.gaya?.kertas) [pw, ph] = pw > ph ? [KERTAS[o.gaya.kertas][1], KERTAS[o.gaya.kertas][0]] : [...KERTAS[o.gaya.kertas]]
  const contohLanskap = pw > ph
  const lanskap = o.lanskap ?? (o.gaya?.orientasi === "potret" ? false : o.gaya?.orientasi === "lanskap" ? true : lanskapPerlu || contohLanskap)
  if (lanskap !== contohLanskap) [pw, ph] = [ph, pw]
  pgSz = `<w:pgSz w:w="${pw}" w:h="${ph}"${lanskap ? ' w:orient="landscape"' : ""}/>`
  sect = /<w:pgSz\b/.test(sect) ? sect.replace(/<w:pgSz\b[^>]*\/>/, pgSz) : sect.replace(/(<w:sectPr\b[^>]*>)/, `$1${pgSz}`)
  if (o.gaya?.margin && Object.keys(o.gaya.margin).length) {
    const m = margin(o)
    const lama = sect.match(/<w:pgMar\b[^>]*\/>/)?.[0]
    const baru = `<w:pgMar w:top="${m.atas}" w:right="${m.kanan}" w:bottom="${m.bawah}" w:left="${m.kiri}" w:header="${attr(lama ?? "", "w:header") ?? 567}" w:footer="${attr(lama ?? "", "w:footer") ?? 567}" w:gutter="0"/>`
    sect = lama ? sect.replace(lama, baru) : sect.replace(pgSz, pgSz + baru)
  }
  const mar = sect.match(/<w:pgMar\b[^>]*\/>/)?.[0] ?? ""
  const tersedia = pw - Number(attr(mar, "w:left") ?? 1418) - Number(attr(mar, "w:right") ?? 1134)

  // Nomor halaman bila contoh tidak punya footer.
  let relsBaru = rels
  if (!footerDariContoh && pakaiNomor(o)) {
    relsBaru = rels.replace("</Relationships>", '<Relationship Id="rIdAsistenGuruFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer-asisten-guru.xml"/></Relationships>')
    sect = sect.replace(/(<w:sectPr\b[^>]*>)/, '$1<w:footerReference w:type="default" r:id="rIdAsistenGuruFooter"/>')
    if (!types.includes("/word/footer-asisten-guru.xml"))
      types = types.replace("</Types>", '<Override PartName="/word/footer-asisten-guru.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>')
  }

  // Gaya judul: pakai milik contoh (dicocokkan lewat nama), tambahkan yang belum ada.
  let peta = petaGaya(stylesXml)
  const gayaDitambah: string[] = []
  const siswa = o.jenis === "lembar_siswa"
  const definisi = gayaJudul(siswa, o.gaya?.judul?.ukuran ? Math.round(o.gaya.judul.ukuran * 2) : siswa ? 30 : 28)
  for (const m of definisi.matchAll(/<w:style\b[\s\S]*?<\/w:style>/g)) {
    const nama = m[0].match(/<w:name w:val="([^"]*)"/)![1]
    if (peta.has(nama)) continue
    let def = m[0]
    const id = attr(def.match(/<w:style\b[^>]*>/)![0], "w:styleId")!
    if ([...peta.values()].includes(id)) def = def.replace(`w:styleId="${id}"`, `w:styleId="AG${id}"`)
    stylesXml = stylesXml.replace("</w:styles>", `${def}</w:styles>`)
    gayaDitambah.push(nama)
  }
  peta = petaGaya(stylesXml)
  stylesXml = timpaBawaan(stylesXml, o)

  const { body } = markdownKeBody(md, o, tersedia)
  const isiBody = body.replace(/<w:pStyle w:val="(Heading[1-4]|Footer)"\/>/g, (_, id: string) => {
    const nama = id === "Footer" ? "footer" : `heading ${id.slice(-1)}`
    return `<w:pStyle w:val="${peta.get(nama) ?? id}"/>`
  })
  const kop = kopXml(o, tersedia, !kopDariHeader)
  const ttd = o.jenis === "dokumen_guru" && o.gaya?.ttd?.tampil !== false ? ttdXml(o, tersedia, ukuranDasar(o).sz) : ""
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${akar}<w:body>${kop}${isiBody}${ttd}${sect}</w:body></w:document>`

  const keluar: Record<string, Uint8Array | string> = {}
  keluar["[Content_Types].xml"] = types
  for (const [nama, data] of isi) if (nama !== "[Content_Types].xml") keluar[nama] = data
  keluar["word/document.xml"] = doc
  keluar["word/styles.xml"] = stylesXml
  keluar["word/_rels/document.xml.rels"] = relsBaru
  if (relsBaru !== rels) keluar["word/footer-asisten-guru.xml"] = footerXml(o, peta.get("footer") ?? "Footer")
  return { data: buatZip(keluar), lanskap, dasar: { kopDariHeader, footerDariContoh, gayaDitambah } }
}

/** Gaya yang diatur guru lewat chat menimpa bawaan Word contoh (huruf, ukuran, spasi, perataan). */
function timpaBawaan(stylesXml: string, o: OpsiDokumen): string {
  const g = o.gaya ?? {}
  if (!g.huruf && !g.ukuran && !g.spasi && !g.rata) return stylesXml
  let s = stylesXml
  if (!/<w:docDefaults>/.test(s)) s = s.replace(/(<w:styles\b[^>]*>)/, "$1<w:docDefaults><w:rPrDefault><w:rPr></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr></w:pPr></w:pPrDefault></w:docDefaults>")
  if (!/<w:rPrDefault>/.test(s)) s = s.replace("<w:docDefaults>", "<w:docDefaults><w:rPrDefault><w:rPr></w:rPr></w:rPrDefault>")
  if (!/<w:pPrDefault>/.test(s)) s = s.replace("</w:rPrDefault>", "</w:rPrDefault><w:pPrDefault><w:pPr></w:pPr></w:pPrDefault>")
  s = s.replace(/<w:rPrDefault>\s*<w:rPr\/>\s*<\/w:rPrDefault>/, "<w:rPrDefault><w:rPr></w:rPr></w:rPrDefault>")
  s = s.replace(/<w:pPrDefault>\s*<w:pPr\/>\s*<\/w:pPrDefault>/, "<w:pPrDefault><w:pPr></w:pPr></w:pPrDefault>")
  s = s.replace(/<w:rPrDefault>([\s\S]*?)<\/w:rPrDefault>/, (_, dalam: string) => {
    let r = dalam
    if (g.huruf) {
      const f = `<w:rFonts w:ascii="${xml(g.huruf)}" w:hAnsi="${xml(g.huruf)}" w:eastAsia="${xml(g.huruf)}" w:cs="${xml(g.huruf)}"/>`
      r = /<w:rFonts\b[^>]*\/>/.test(r) ? r.replace(/<w:rFonts\b[^>]*\/>/, f) : r.replace("<w:rPr>", `<w:rPr>${f}`)
    }
    if (g.ukuran) {
      const v = Math.round(g.ukuran * 2)
      r = r.replace(/<w:sz w:val="\d+"\/>/, "").replace(/<w:szCs w:val="\d+"\/>/, "")
      // sz dan szCs ditaruh sebelum elemen lang/eastAsianLayout (urutan skema rPr).
      r = /<w:lang\b/.test(r) ? r.replace(/<w:lang\b/, `<w:sz w:val="${v}"/><w:szCs w:val="${v}"/><w:lang`) : r.replace("</w:rPr>", `<w:sz w:val="${v}"/><w:szCs w:val="${v}"/></w:rPr>`)
    }
    return `<w:rPrDefault>${r}</w:rPrDefault>`
  })
  s = s.replace(/<w:pPrDefault>([\s\S]*?)<\/w:pPrDefault>/, (_, dalam: string) => {
    let p = dalam
    if (g.spasi) {
      const line = Math.round(g.spasi * 240)
      p = /<w:spacing\b[^>]*\/>/.test(p)
        ? p.replace(/<w:spacing\b[^>]*\/>/, (t) => (/w:line=/.test(t) ? t.replace(/w:line="\d+"/, `w:line="${line}"`).replace(/w:lineRule="\w+"/, 'w:lineRule="auto"') : t.replace("/>", ` w:line="${line}" w:lineRule="auto"/>`)))
        : p.replace("</w:pPr>", `<w:spacing w:line="${line}" w:lineRule="auto"/></w:pPr>`)
    }
    if (g.rata) {
      p = p.replace(/<w:jc w:val="\w+"\/>/, "")
      if (g.rata === "kanan-kiri") p = p.replace("</w:pPr>", '<w:jc w:val="both"/></w:pPr>')
    }
    return `<w:pPrDefault>${p}</w:pPrDefault>`
  })
  return s
}

// ---------------------------------------------------------------------------------------------------------------
// Membaca Word contoh/hasil editan guru: ringkasan tampilan dan kerangka isinya (untuk lapis 2).

/** "Pertemuan 1 - Tebak polanya" → "Pertemuan 1": bagian bernomor dipertahankan, judul khusus topik dibuang. */
export function umumkanJudul(judul: string): string {
  return judul.replace(/^((?:pertemuan|kegiatan|bagian|aktivitas|langkah|sesi|topik|tahap)\s+\d+)\s*[-–—:.].*$/i, "$1").trim()
}
/** "Pertemuan 2" → { dasar: "pertemuan", nomor: 2 }; selain bagian bernomor → null. */
const bernomor = (j: string) => {
  const m = umumkanJudul(j).match(/^(pertemuan|kegiatan|bagian|aktivitas|langkah|sesi|topik|tahap)\s+(\d+)$/i)
  return m ? { dasar: m[1].toLowerCase(), nomor: Number(m[2]) } : null
}

export type AnalisisDocx = {
  huruf: string | null
  ukuran: number | null
  kertas: string
  lanskap: boolean
  margin: { atas: number; bawah: number; kiri: number; kanan: number }
  kopDiHeader: boolean
  kerangka: string
  jumlahBagian: number
}

const teksXml = (x: string) =>
  [...x.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>/g)]
    .map((m) => (m[0] === "<w:tab/>" ? " " : m[1]))
    .join("")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()

export function analisisDocx(data: Uint8Array): AnalisisDocx {
  const isi = bacaZip(data)
  const t = (n: string) => (isi.has(n) ? dec.decode(isi.get(n)!) : "")
  const doc = t("word/document.xml")
  if (!doc) throw new Error("Berkas bukan dokumen Word (.docx).")
  const st = t("word/styles.xml")
  const nama = new Map<string, string>()
  for (const [n, id] of petaGaya(st)) nama.set(id, n)
  const rpr = st.match(/<w:rPrDefault>[\s\S]*?<\/w:rPrDefault>/)?.[0] ?? ""
  const sect = [...doc.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)].pop()?.[0] ?? ""
  const pg = sect.match(/<w:pgSz\b[^>]*\/>/)?.[0] ?? ""
  const mr = sect.match(/<w:pgMar\b[^>]*\/>/)?.[0] ?? ""
  const w = Number(attr(pg, "w:w") ?? 11906)
  const h = Number(attr(pg, "w:h") ?? 16838)
  const pendek = Math.min(w, h)
  const panjang = Math.max(w, h)
  const kertasNama = Math.abs(pendek - 11906) < 120 && Math.abs(panjang - 16838) < 120 ? "A4" : Math.abs(pendek - 12189) < 120 && Math.abs(panjang - 18709) < 200 ? "F4" : Math.abs(pendek - 12240) < 120 && Math.abs(panjang - 15840) < 120 ? "Letter" : `${(pendek / CM).toFixed(1)} × ${(panjang / CM).toFixed(1)} cm`
  const cm = (v: string | undefined, b: number) => Math.round((Number(v ?? b) / CM) * 10) / 10
  const rels = t("word/_rels/document.xml.rels")
  const kopDiHeader = [...sect.matchAll(/<w:headerReference\b[^>]*r:id="([^"]*)"/g)].some((m) => {
    const tg = rels.match(new RegExp(`<Relationship[^>]*Id="${m[1]}"[^>]*>`))?.[0]?.match(/Target="([^"]*)"/)?.[1]
    const hx = tg ? t(`word/${tg.replace(/^\/?word\//, "")}`) : ""
    return /<w:t[ >][^<]*\S|<w:drawing|<w:pict/.test(hx)
  })

  // Kerangka: judul (gaya heading/Title, atau baris pendek tebal), tabel (baris pertama), dan isian "Label : ...".
  const body = doc.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? ""
  const baris: string[] = []
  const identitas: string[] = []
  let judulUtama = ""
  let bagian = 0
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g)) {
    const blok = m[0]
    if (blok.startsWith("<w:tbl>")) {
      const tr = blok.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) ?? []
      const sel = (r: string) => (r.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? []).map(teksXml)
      const kepala = tr.length ? sel(tr[0]) : []
      if (!kepala.length) continue
      const duaKolomLabel = tr.length > 1 && tr.every((r) => sel(r).length <= 3 && /:\s*$|^:$/.test(sel(r)[1] ?? sel(r)[0] ?? ""))
      if (duaKolomLabel || (kepala.length <= 3 && tr.every((r) => /[:]/.test(sel(r).join(" "))))) {
        for (const r of tr) {
          const s = sel(r).filter(Boolean)
          const label = (s[0] ?? "").replace(/\s*:\s*$/, "")
          if (label) identitas.push(`${label}: `)
        }
        continue
      }
      baris.push("", `| ${kepala.map((k) => k || " ").join(" | ")} |`, `|${kepala.map(() => "---").join("|")}|`, `|${kepala.map(() => "  ").join("|")}|`, "")
      continue
    }
    const tx = teksXml(blok)
    // Garis bawah kop (paragraf kosong bergaris) menutup kop: teks sebelumnya bukan judul dokumen.
    if (!tx && /<w:pBdr>[\s\S]*<w:bottom\b/.test(blok) && !baris.length) {
      judulUtama = ""
      identitas.length = 0
      continue
    }
    if (!tx) continue
    const id = blok.match(/<w:pStyle w:val="([^"]*)"/)?.[1]
    const gayaNama = id ? (nama.get(id) ?? id.toLowerCase()) : ""
    const runs = blok.match(/<w:r\b[\s\S]*?<\/w:r>/g) ?? []
    const tebalSemua = runs.length > 0 && runs.filter((r) => /<w:t[ >][^<]*\S/.test(r)).every((r) => /<w:b\/>|<w:b w:val="(1|true)"\/>/.test(r))
    const lvl = gayaNama.match(/^heading (\d)/)?.[1]
    if (!judulUtama && (gayaNama === "title" || lvl === "1" || (tebalSemua && /<w:jc w:val="center"\/>/.test(blok)))) {
      judulUtama = tx
      continue
    }
    const judulBagian = (pagar: string) => {
      // Bagian bernomor berulang (Pertemuan 1, 2, 3) diringkas: jumlahnya mengikuti topik, bukan template.
      const b = bernomor(tx)
      if (b && b.nomor > 1) return
      baris.push(`${pagar} ${umumkanJudul(tx)}`)
      if (b) baris.push(`<!-- ulangi bagian ini untuk tiap ${b.dasar} -->`)
      bagian++
    }
    if (lvl) { judulBagian("#".repeat(Math.min(4, Number(lvl) + (Number(lvl) === 1 ? 1 : 0)))); continue }
    if (tebalSemua && tx.length <= 80 && !/[.:]$/.test(tx)) { judulBagian("##"); continue }
    const lab = tx.match(/^([A-Za-z][\w /().-]{1,40}?)\s*:\s*(\.{2,}|_{2,}|…+)?$/)
    if (lab && !bagian) { identitas.push(`${lab[1].trim()}: `); continue }
  }
  const kerangka = [
    `# ${judulUtama ? judulUtama.toUpperCase() : "[JUDUL DOKUMEN]"}`,
    "",
    ...(identitas.length ? ["```identitas", ...identitas, "```", ""] : []),
    ...baris,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return {
    huruf: rpr.match(/w:ascii="([^"]*)"/)?.[1] ?? null,
    ukuran: rpr.match(/<w:sz w:val="(\d+)"/) ? Number(rpr.match(/<w:sz w:val="(\d+)"/)![1]) / 2 : null,
    kertas: kertasNama,
    lanskap: w > h,
    margin: { atas: cm(attr(mr, "w:top"), 1134), bawah: cm(attr(mr, "w:bottom"), 1134), kiri: cm(attr(mr, "w:left"), 1418), kanan: cm(attr(mr, "w:right"), 1134) },
    kopDiHeader,
    kerangka: kerangka + "\n",
    jumlahBagian: bagian,
  }
}

/** Judul bagian (## dan ###) di kerangka yang tidak ada di draf. Pencocokan longgar (huruf kecil, tanpa nomor/tanda baca). */
export function bagianHilang(draf: string, kerangka: string): string[] {
  const norm = (s: string) => umumkanJudul(s).toLowerCase().replace(/^[a-z0-9ivx]{1,4}[.)]\s+/i, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()
  const judul = (md: string) => [...md.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => norm(m[1])).filter(Boolean)
  const ada = new Set(judul(draf))
  return [...kerangka.matchAll(/^#{2,3}\s+(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter((j) => norm(j) && !ada.has(norm(j)) && !((bernomor(j)?.nomor ?? 0) > 1))
}
