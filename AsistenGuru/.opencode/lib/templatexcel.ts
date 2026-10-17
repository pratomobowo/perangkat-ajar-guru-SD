// Mesin templat Excel: setiap Excel bawaan Asisten Guru bisa diganti format sekolah atau format guru. Berkas templat diisi
// dengan mengenali kolom dari judulnya (identitas, nilai, kehadiran, kelompok), penanda {{...}} untuk format bebas
// (denah, struktur organisasi, judul), dan data guru. Hanya sel kosong yang diisi; rumus tidak pernah disentuh; gaya,
// susunan, lembar, dan bagian lain berkas dibiarkan persis seperti aslinya.

import type { BukuNilai, Hadir } from "./analisis.ts"
import { Gagal } from "./berkas.ts"
import type { Siswa } from "./siswa.ts"
import { bacaZip } from "./unzip.ts"
import { kolom } from "./xlsx.ts"
import { buatZip } from "./zip.ts"

const dec = new TextDecoder()
const entitas = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
const xmlAman = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
export const idx = (c: string) => [...c].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1
const barisDari = (ref: string) => Number(ref.replace(/^[A-Z]+/, ""))
const kolomDari = (ref: string) => ref.replace(/\d+$/, "")
export const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
/** NIS/NISN yang tersimpan sebagai angka ("3.205725867E9") dikembalikan ke digit. */
export const digit = (s: unknown) => {
  const t = String(s ?? "").trim()
  if (/^\d+(\.\d+)?(e\+?\d+)?$/i.test(t)) return String(Math.round(Number(t)))
  return t.replace(/\D/g, "")
}
const nisnKunci = (s: unknown) => { const d = digit(s); return d ? d.padStart(10, "0") : "" }

// ---------- Pengenal kolom ----------
export type JenisKolom = "no" | "nama" | "nis" | "nisn" | "jk" | "kelompok" | "tp" | "uh" | "tugas" | "uts" | "uas" | "rapor" | "sakit" | "izin" | "alfa" | "lain"
const ALIAS_MAPEL: [RegExp, string[]][] = [
  [/\b(pai|agama islam|pendidikan agama)\b/, ["pendidikan agama islam", "agama"]],
  [/\b(pp|ppkn|pkn|pancasila)\b/, ["pendidikan pancasila", "pancasila"]],
  [/\b(b ?i|bahasa indonesia|b indonesia|indonesia)\b/, ["bahasa indonesia"]],
  [/\b(mtk|matematika|math)\b/, ["matematika"]],
  [/\b(ipas|ipa|ips|science)\b/, ["ipas", "ilmu pengetahuan alam dan sosial"]],
  [/\b(sbdp|seni budaya|seni rupa|seni musik|seni tari|seni teater|seni)\b/, ["seni"]],
  [/\b(pjok|penjas|olahraga|jasmani)\b/, ["pjok", "pendidikan jasmani"]],
  [/\b(english|bahasa inggris|b inggris|inggris)\b/, ["bahasa inggris"]],
  [/\b(sunda|sundanese|bahasa sunda)\b/, ["bahasa sunda", "sunda"]],
  [/\b(jawa|bahasa jawa)\b/, ["bahasa jawa", "jawa"]],
  [/\b(arab|arabic|bahasa arab)\b/, ["bahasa arab", "arab"]],
]

/** Nomor TP dari judul "TP1", "TP 2", "TP.3", "TP-4", "Formatif 1", "SLM 2" (null bila bukan kolom TP). */
export function nomorTp(label: string): number | null {
  const m = norm(label).match(/^(tp|formatif|sumatif lingkup materi|slm|lm)\s*(\d{1,2})$/)
  return m ? Number(m[2]) : null
}

export function jenisDariJudul(label: string): JenisKolom {
  const t = norm(label)
  if (/^no$|^nomor$|^no urut$|^no absen$/.test(t)) return "no"
  if (/^nisn\b/.test(t)) return "nisn"
  if (/^(nis|nipd|no induk|nomor induk)\b/.test(t)) return "nis"
  if (/^nama( siswa| murid| peserta didik| lengkap)?$/.test(t)) return "nama"
  if (/^(l p|lp|jk|l\/p|jenis kelamin|gender)$/.test(t)) return "jk"
  if (/^kelompok$/.test(t)) return "kelompok"
  if (nomorTp(label) !== null) return "tp"
  if (/\bsakit\b/.test(t)) return "sakit"
  if (/\bizin\b|\bijin\b/.test(t)) return "izin"
  if (/\b(alfa|alpa|alpha|tanpa keterangan)\b/.test(t)) return "alfa"
  if (/\b(uts|sts|pts|tengah semester)\b/.test(t)) return "uts"
  if (/\b(uas|sas|pas|sat|akhir semester|akhir tahun)\b/.test(t)) return "uas"
  if (/\b(uh|ulangan harian|formatif|sumatif lingkup|harian)\b/.test(t)) return "uh"
  if (/\btugas\b/.test(t)) return "tugas"
  if (/\b(rapor|raport|nilai akhir)\b/.test(t)) return "rapor"
  return "lain"
}

/** Mapel yang dimaksud judul kolom (null bila tidak ada di daftar). */
export function cocokMapel(label: string, mapel: string[]): string | null {
  const t = ` ${norm(label)} `
  for (const m of mapel) if (t.includes(` ${norm(m)} `)) return m
  for (const [re, kata] of ALIAS_MAPEL) {
    if (!re.test(t)) continue
    const m = mapel.find((x) => kata.some((k) => norm(x).includes(k)))
    if (m) return m
  }
  return null
}

// ---------- Membaca dan menulis lembar ----------
export type Lembar = { nama: string; path: string; xml: string; nilai: Map<string, string>; rumus: Set<string>; gabung: string[] }

export function bacaBuku(isi: Map<string, Uint8Array>): { lembar: Lembar[]; shared: string[] } {
  const t = (n: string) => (isi.has(n) ? dec.decode(isi.get(n)!) : "")
  const wb = t("xl/workbook.xml")
  if (!wb) throw new Gagal("Berkas bukan buku kerja Excel (.xlsx). Bila dari Google Sheets, unduh sebagai Microsoft Excel (.xlsx).")
  const rels = t("xl/_rels/workbook.xml.rels")
  const shared = [...t("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => entitas([...m[1].matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((x) => x[1]).join("")))
  const lembar: Lembar[] = []
  for (const s of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const nama = entitas(s[0].match(/name="([^"]*)"/)?.[1] ?? "Lembar")
    const rid = s[0].match(/r:id="([^"]+)"/)?.[1]
    const target = rels.match(new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*>`))?.[0]?.match(/Target="([^"]*)"/)?.[1]
    if (!target) continue
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`
    const xml = t(path)
    const nilai = new Map<string, string>(), rumus = new Set<string>()
    for (const c of xml.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const jenis = c[2].match(/t="(\w+)"/)?.[1], dalam = c[3] ?? ""
      if (/<f[\s>/]/.test(dalam)) rumus.add(c[1])
      const v = dalam.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      const sv = jenis === "s" && v !== undefined ? shared[Number(v)] ?? "" : jenis === "inlineStr" ? entitas([...dalam.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)].map((x) => x[1]).join("")) : v !== undefined ? entitas(v) : ""
      if (sv.trim() !== "") nilai.set(c[1], sv.trim())
    }
    lembar.push({ nama, path, xml, nilai, rumus, gabung: [...xml.matchAll(/<mergeCell ref="([A-Z]+\d+):([A-Z]+\d+)"/g)].map((m) => `${m[1]}:${m[2]}`) })
  }
  return { lembar, shared }
}

/** Menulis satu sel (angka atau teks) dengan mempertahankan gaya sel; sel baru memakai `gaya` bila diberikan. */
export function tulisSel(xml: string, ref: string, nilai: number | string, gayaBaru?: string): string {
  const baris = String(barisDari(ref))
  const isi = typeof nilai === "number" ? `<v>${nilai}</v>` : `<is><t xml:space="preserve">${xmlAman(nilai)}</t></is>`
  const jenis = typeof nilai === "number" ? "" : ' t="inlineStr"'
  const re = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`)
  const ada = xml.match(re)
  if (ada) {
    const gaya = ada[1].match(/\ss="\d+"/)?.[0] ?? ""
    return xml.replace(re, `<c r="${ref}"${gaya}${jenis}>${isi}</c>`)
  }
  const sel = `<c r="${ref}"${gayaBaru ? ` s="${gayaBaru}"` : ""}${jenis}>${isi}</c>`
  const reBaris = new RegExp(`(<row r="${baris}"[^>]*?)(/>|>([\\s\\S]*?)</row>)`)
  const b = xml.match(reBaris)
  if (!b) {
    const berikut = [...xml.matchAll(/<row r="(\d+)"/g)].find((m) => Number(m[1]) > Number(baris))
    const baru = `<row r="${baris}">${sel}</row>`
    if (berikut) return xml.replace(berikut[0], `${baru}${berikut[0]}`)
    return xml.includes("<sheetData/>") ? xml.replace("<sheetData/>", `<sheetData>${baru}</sheetData>`) : xml.replace("</sheetData>", `${baru}</sheetData>`)
  }
  const dalam = b[3] ?? ""
  const k = idx(kolomDari(ref))
  const sesudah = [...dalam.matchAll(/<c r="([A-Z]+)\d+"/g)].find((m) => idx(m[1]) > k)
  const dalamBaru = sesudah ? dalam.replace(sesudah[0], `${sel}${sesudah[0]}`) : dalam + sel
  return xml.replace(reBaris, `${b[1]}>${dalamBaru}</row>`)
}

/** Mengosongkan sel (isi dihapus, gaya tetap). */
function kosongkanSel(xml: string, ref: string): string {
  const re = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`)
  return xml.replace(re, (_m, atr: string) => `<c r="${ref}"${atr.match(/\ss="\d+"/)?.[0] ?? ""}/>`)
}

// ---------- Struktur tabel siswa ----------
export type Kolom = { kol: string; judul: string[]; jenis: JenisKolom; mapel: string | null; tp: number | null }
export type Struktur = { barisKepala: number; barisData: number; barisAkhir: number; kolom: Kolom[] }

/** Mengenali tabel siswa di satu lembar (null bila tidak ada kolom NAMA di 15 baris teratas). */
export function kenaliTabel(l: Lembar, mapel: string[]): Struktur | null {
  const v = (c: string, r: number) => l.nilai.get(`${c}${r}`) ?? ""
  const semua = [...l.nilai.keys()]
  const refNama = semua.find((k) => jenisDariJudul(l.nilai.get(k)!) === "nama" && barisDari(k) <= 15)
  if (!refNama) return null
  const kNama = kolomDari(refNama)
  const barisKepala = barisDari(refNama)
  const judul = new Map<string, string>()
  for (const g of l.gabung) {
    const [a, b] = g.split(":")
    const t = v(kolomDari(a), barisDari(a))
    // Judul dokumen yang digabung di atas baris NAMA bukan judul kolom.
    if (!t || barisDari(b) < barisKepala) continue
    for (let r = barisDari(a); r <= barisDari(b); r++) for (let c = idx(kolomDari(a)); c <= idx(kolomDari(b)); c++) judul.set(`${kolom(c)}${r}`, t)
  }
  const jd = (c: string, r: number) => v(c, r) || judul.get(`${c}${r}`) || ""
  const kNo = semua.find((k) => jenisDariJudul(l.nilai.get(k)!) === "no" && barisDari(k) === barisKepala)?.replace(/\d+$/, "") ?? "A"
  const bukanJudul = (r: number) => /^\d+(\.0+)?$/.test(v(kNo, r)) || (!!v(kNama, r) && !judul.has(`${kNama}${r}`) && jenisDariJudul(v(kNama, r)) === "lain")
  let barisData = 0
  for (let r = barisKepala + 1; r <= barisKepala + 6 && !barisData; r++) if (bukanJudul(r)) barisData = r
  if (!barisData) {
    // Templat kosong: baris sesudah baris judul terakhir. Baris judul = baris yang berisi sel judul atau gabungan judul.
    const adaJudul = (r: number) => semua.some((k) => barisDari(k) === r && jenisDariJudul(l.nilai.get(k)!) !== "lain") || [...judul.keys()].some((k) => barisDari(k) === r) || semua.some((k) => barisDari(k) === r && /^nilai\b/i.test(l.nilai.get(k)!))
    barisData = barisKepala + 1
    while (barisData <= barisKepala + 4 && adaJudul(barisData)) barisData++
  }
  const maksKol = Math.max(...semua.filter((k) => barisDari(k) < barisData).map((k) => idx(kolomDari(k))), ...[...judul.keys()].map((k) => idx(kolomDari(k))))
  const kol: Kolom[] = []
  for (let c = 0; c <= maksKol; c++) {
    const huruf = kolom(c)
    const awal = Math.max(1, barisKepala - 2)
    const j = [...new Set(Array.from({ length: barisData - awal }, (_, i) => jd(huruf, awal + i)).filter(Boolean))]
    if (!j.length) continue
    const jenis = [...j].reverse().map(jenisDariJudul).find((x) => x !== "lain") ?? "lain"
    const tp = jenis === "tp" ? [...j].reverse().map(nomorTp).find((x) => x !== null) ?? null : null
    const m = ["no", "nama", "nis", "nisn", "jk", "kelompok", "sakit", "izin", "alfa"].includes(jenis) ? null : j.map((x) => cocokMapel(x, mapel)).find(Boolean) ?? null
    kol.push({ kol: huruf, judul: j, jenis, mapel: m, tp })
  }
  const barisNama = semua.filter((k) => kolomDari(k) === kNama).map(barisDari).filter((r) => r >= barisData)
  return { barisKepala, barisData, barisAkhir: barisNama.length ? Math.max(...barisNama) : barisData - 1, kolom: kol }
}

// ---------- Pengisian ----------
export type Anggota = { no: number; nama: string; jk?: string }
export type DataTemplat = {
  siswa: Siswa[]
  nilai?: BukuNilai[]
  hadir?: Hadir[]
  /** Untuk templat kelompok: anggota per kelompok (urutan baris mengikuti kelompok). */
  kelompok?: Anggota[][]
  /** Mapel bawaan untuk kolom nilai yang judulnya tidak menyebut mapel (buku nilai satu mapel). */
  mapel?: string
  /** Penanda {{kunci}} di sel teks: bulan, tahun, kelas, semester, mapel, sekolah, nama_guru, ... */
  penanda?: Record<string, string>
}
export type HasilTemplat = {
  data: Uint8Array; lembarTabel: number; baris: number; cocok: number; tidakCocok: number
  terisi: Record<string, number>; dilewati: number; kosong: string[]; mapelTerpakai: string[]; penanda: number
}

const rata = (xs: (number | null)[]) => { const a = xs.filter((x): x is number => typeof x === "number"); return a.length ? Math.round(a.reduce((p, q) => p + q, 0) / a.length) : null }

/** Penanda bawaan nama siswa berurutan absen: {{nama_1}}, {{nisn_1}}, … untuk format bebas (denah, struktur). */
function penandaSiswa(siswa: Siswa[]): Record<string, string> {
  const p: Record<string, string> = { jumlah_siswa: String(siswa.length) }
  siswa.forEach((s, i) => {
    p[`nama_${i + 1}`] = s.nama
    if (s.nisn) p[`nisn_${i + 1}`] = s.nisn
    if (s.nis) p[`nis_${i + 1}`] = s.nis
  })
  return p
}

export function isiTemplat(berkas: Uint8Array, d: DataTemplat, o: { timpa?: boolean; nolStrip?: boolean } = {}): HasilTemplat {
  const isi = bacaZip(berkas)
  const { lembar } = bacaBuku(isi)
  const nilaiBuku = d.nilai ?? [], hadirData = d.hadir ?? []
  const mapelBuku = [...new Set(nilaiBuku.map((b) => b.mapel))]
  const terisi: Record<string, number> = {}
  let dilewati = 0, cocok = 0, tidakCocok = 0, baris = 0, lembarTabel = 0
  const kosong = new Set<string>(), terpakai = new Set<string>()

  const byNisn = new Map(d.siswa.filter((s) => s.nisn).map((s) => [nisnKunci(s.nisn), s]))
  const byNis = new Map(d.siswa.filter((s) => s.nis).map((s) => [digit(s.nis), s]))
  const byNama = new Map(d.siswa.map((s) => [norm(s.nama), s]))
  const bukuPer = new Map<string, Map<string, BukuNilai["baris"][0]>>()
  for (const b of nilaiBuku) {
    const m = bukuPer.get(b.mapel) ?? new Map()
    for (const r of b.baris) if (String(r.nama ?? "").trim()) m.set(norm(r.nama), r)
    bukuPer.set(b.mapel, m)
  }
  const hadir = new Map<string, { s: number; i: number; a: number }>()
  for (const h of hadirData) for (const r of h.baris) {
    if (!String(r.nama ?? "").trim()) continue
    const x = hadir.get(norm(r.nama)) ?? { s: 0, i: 0, a: 0 }
    hadir.set(norm(r.nama), { s: x.s + r.s, i: x.i + r.i, a: x.a + r.a })
  }

  const xmlBaru = new Map<string, string>()
  for (const l of lembar) {
    let xml = l.xml
    const st = kenaliTabel(l, mapelBuku.length ? mapelBuku : d.mapel ? [d.mapel] : [])
    if (!st) continue
    lembarTabel++
    const kOf = (j: JenisKolom) => st.kolom.find((k) => k.jenis === j)?.kol
    const kNama = kOf("nama")!, kNis = kOf("nis"), kNisn = kOf("nisn"), kNo = kOf("no"), kJk = kOf("jk"), kKel = kOf("kelompok")
    // Gaya sel baru: gaya sel di baris data pertama pada kolom yang sama.
    const gayaKol = new Map<string, string>()
    for (const k of st.kolom) {
      const g = xml.match(new RegExp(`<c r="${k.kol}${st.barisData}"[^>]*?\\ss="(\\d+)"`))?.[1]
      if (g) gayaKol.set(k.kol, g)
    }
    const tulis = (ref: string, val: number | string | null, label: string) => {
      if (val === null || val === "") return
      if (l.rumus.has(ref)) return
      if (!o.timpa && l.nilai.has(ref)) { dilewati++; return }
      xml = tulisSel(xml, ref, val, gayaKol.get(kolomDari(ref)))
      terisi[label] = (terisi[label] ?? 0) + 1
    }
    const mapelKolom = (k: Kolom) => k.mapel ?? (d.mapel && ["tp", "uh", "uts", "uas", "rapor"].includes(k.jenis) ? (mapelBuku.find((m) => norm(m) === norm(d.mapel!)) ?? d.mapel) : null)

    // Daftar baris yang diisi: dari kelompok, dari Daftar Siswa (templat kosong), atau nama yang sudah ada di templat.
    const templatKosong = st.barisAkhir < st.barisData
    type Baris = { r: number; s?: Siswa; kel?: number; baru: boolean }
    const daftar: Baris[] = []
    if (d.kelompok && templatKosong) {
      let r = st.barisData
      d.kelompok.forEach((g, i) => g.forEach((a) => daftar.push({ r: r++, s: { nama: a.nama, jk: a.jk as any, ...(d.siswa[a.no - 1] ?? {}) }, kel: i + 1, baru: true })))
    } else if (templatKosong) d.siswa.forEach((s, i) => daftar.push({ r: st.barisData + i, s, baru: true }))
    else for (let r = st.barisData; r <= st.barisAkhir; r++) {
      const nama = l.nilai.get(`${kNama}${r}`)
      if (!nama) continue
      const s = (kNisn && byNisn.get(nisnKunci(l.nilai.get(`${kNisn}${r}`)))) || (kNis && byNis.get(digit(l.nilai.get(`${kNis}${r}`)))) || byNama.get(norm(nama)) ||
        ([...bukuPer.values()].some((m) => m.has(norm(nama))) || hadir.has(norm(nama)) ? { nama } : undefined)
      daftar.push({ r, s, baru: false })
    }

    let urutKel = 0, kelSebelum = 0
    for (const b of daftar) {
      baris++
      if (!b.s) { tidakCocok++; continue }
      cocok++
      const s = b.s
      if (b.baru) {
        if (b.kel !== undefined) { urutKel = b.kel === kelSebelum ? urutKel + 1 : 1; kelSebelum = b.kel }
        if (kNo) tulis(`${kNo}${b.r}`, b.kel !== undefined ? urutKel : b.r - st.barisData + 1, "identitas")
        tulis(`${kNama}${b.r}`, s.nama, "identitas")
        if (kNis && s.nis) tulis(`${kNis}${b.r}`, s.nis, "identitas")
        if (kNisn && s.nisn) tulis(`${kNisn}${b.r}`, s.nisn, "identitas")
        if (kJk && s.jk) tulis(`${kJk}${b.r}`, s.jk, "identitas")
        if (kKel && b.kel !== undefined) tulis(`${kKel}${b.r}`, `Kelompok ${b.kel}`, "kelompok")
      }
      const kunci = norm(s.nama)
      for (const k of st.kolom) {
        const ref = `${k.kol}${b.r}`
        const m = mapelKolom(k)
        if (m && ["tp", "uh", "uts", "uas"].includes(k.jenis)) {
          const r = bukuPer.get(m)?.get(kunci)
          if (!r) continue
          terpakai.add(m)
          const val = k.jenis === "tp" ? r.tp[(k.tp ?? 0) - 1] ?? null : k.jenis === "uh" ? rata(r.tp) : k.jenis === "uts" ? r.sts : r.sas
          if (typeof val === "number") tulis(ref, val, `${m} ${k.jenis === "tp" ? `TP${k.tp}` : k.jenis.toUpperCase()}`)
        } else if ((k.jenis === "sakit" || k.jenis === "izin" || k.jenis === "alfa") && hadirData.length) {
          const h = hadir.get(kunci)
          if (!h) continue
          const n = k.jenis === "sakit" ? h.s : k.jenis === "izin" ? h.i : h.a
          tulis(ref, n === 0 && o.nolStrip ? "-" : n, "kehadiran")
        }
      }
    }
    // Kolom yang tidak bisa diisi dari data asisten (kolom tanggal harian diringkas jadi satu keterangan).
    const hariKol = st.kolom.filter((k) => k.jenis === "lain" && k.judul.some((j) => /^([1-9]|[12]\d|3[01])(\.0)?$/.test(j.trim())))
    if (hariKol.length >= 5) kosong.add(`${hariKol.length} kolom tanggal harian (diisi guru setiap hari)`)
    for (const k of st.kolom) {
      if (["no", "nama", "nis", "nisn", "jk", "kelompok"].includes(k.jenis) || hariKol.includes(k)) continue
      // Kolom berumus di baris data terhitung sendiri oleh Excel.
      if (l.rumus.has(`${k.kol}${st.barisData}`)) continue
      const m = mapelKolom(k)
      const bisa = ["sakit", "izin", "alfa"].includes(k.jenis) ? hadirData.length > 0 : !!m && bukuPer.has(m) && ["tp", "uh", "uts", "uas"].includes(k.jenis)
      if (bisa) continue
      const calon = k.judul.filter((x) => jenisDariJudul(x) === "lain" && !/^nilai\b/i.test(x.trim())).map((x) => x.trim().replace(/\s+\d+$/, ""))
      const pokok = m ?? [...(calon.length ? calon : k.judul)].sort((a, b2) => b2.length - a.length)[0]
      const sub = k.jenis === "lain" ? k.judul[k.judul.length - 1] : k.jenis === "tp" ? `TP${k.tp}` : k.jenis.toUpperCase()
      kosong.add(norm(sub) && !norm(pokok).includes(norm(sub)) ? `${pokok.trim()} (${sub.trim()})` : pokok.trim())
    }
    xmlBaru.set(l.path, xml)
  }

  // Penanda {{...}} di teks (shared strings dan inline).
  const tanda = { ...penandaSiswa(d.siswa), ...(d.penanda ?? {}) }
  let penanda = 0
  const ganti = (s: string) => s.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, k) => {
    const v = tanda[k.toLowerCase()]
    if (v === undefined) return m
    penanda++
    return xmlAman(v)
  })
  const keluar: Record<string, Uint8Array | string> = {}
  for (const [k, v] of isi) {
    if (k === "xl/sharedStrings.xml") keluar[k] = ganti(dec.decode(v))
    else if (xmlBaru.has(k)) keluar[k] = ganti(xmlBaru.get(k)!)
    else if (/^xl\/worksheets\/[^/]+\.xml$/.test(k)) { const x = dec.decode(v); const y = ganti(x); keluar[k] = y === x ? v : y }
    else keluar[k] = v
  }
  if (!lembarTabel && !penanda) throw new Gagal("Templat Excel ini tidak berisi tabel siswa (kolom NAMA di 15 baris teratas) maupun penanda {{...}}, jadi tidak ada yang bisa diisi otomatis.")
  return { data: buatZip(keluar), lembarTabel, baris, cocok, tidakCocok, terisi, dilewati, kosong: [...kosong], mapelTerpakai: [...terpakai], penanda }
}

/** true bila berkas terlihat seperti rekap nilai (kolom NAMA + paling sedikit dua kolom nilai). */
export function adalahRekap(berkas: Uint8Array): boolean {
  try {
    return bacaBuku(bacaZip(berkas)).lembar.some((l) => (kenaliTabel(l, [])?.kolom.filter((k) => ["tp", "uh", "tugas", "uts", "uas", "rapor"].includes(k.jenis)).length ?? 0) >= 2 && (kenaliTabel(l, [])!.barisAkhir >= kenaliTabel(l, [])!.barisData))
  } catch {
    return false
  }
}

/** true bila berkas adalah format/templat kosong: ada tabel siswa (kolom NAMA) tetapi belum berisi nama, atau ada penanda {{...}}. */
export function adalahFormatKosong(berkas: Uint8Array): boolean {
  try {
    const isi = bacaZip(berkas)
    const { lembar, shared } = bacaBuku(isi)
    if (shared.some((s) => /\{\{\s*[a-z0-9_]+\s*\}\}/i.test(s)) || lembar.some((l) => [...l.nilai.values()].some((s) => /\{\{\s*[a-z0-9_]+\s*\}\}/i.test(s)))) return true
    return lembar.some((l) => { const st = kenaliTabel(l, []); return !!st && st.barisAkhir < st.barisData })
  } catch {
    return false
  }
}

/** Templat untuk disimpan: isi baris siswa di setiap tabel dikosongkan (gaya dan rumus tetap). */
export function kosongkanBarisSiswa(berkas: Uint8Array): { data: Uint8Array; dikosongkan: number } {
  const isi = bacaZip(berkas)
  const { lembar } = bacaBuku(isi)
  const baru = new Map<string, string>()
  let n = 0
  for (const l of lembar) {
    const st = kenaliTabel(l, [])
    if (!st || st.barisAkhir < st.barisData) continue
    let xml = l.xml
    for (const ref of l.nilai.keys()) {
      const r = barisDari(ref)
      if (r < st.barisData || r > st.barisAkhir || l.rumus.has(ref)) continue
      xml = kosongkanSel(xml, ref)
      n++
    }
    baru.set(l.path, xml)
  }
  const keluar: Record<string, Uint8Array | string> = {}
  for (const [k, v] of isi) keluar[k] = baru.get(k) ?? v
  return { data: buatZip(keluar), dikosongkan: n }
}

// ---------- Pembaca umum (buku nilai dan daftar hadir berformat sekolah) ----------
/** Buku nilai berformat bebas: kolom NAMA + kolom TP1..n dan/atau STS/SAS. */
export function bacaBukuNilaiUmum(data: Uint8Array, berkas: string, mapel: string): BukuNilai | null {
  for (const l of bacaBuku(bacaZip(data)).lembar) {
    const st = kenaliTabel(l, [mapel])
    if (!st || st.barisAkhir < st.barisData) continue
    const tpKol = st.kolom.filter((k) => k.jenis === "tp").sort((a, b) => (a.tp ?? 0) - (b.tp ?? 0))
    const sts = st.kolom.find((k) => k.jenis === "uts"), sas = st.kolom.find((k) => k.jenis === "uas")
    if (!tpKol.length && !sts && !sas) continue
    const kNama = st.kolom.find((k) => k.jenis === "nama")!.kol
    const angka = (ref: string) => { const v = l.nilai.get(ref); const n = v === undefined ? NaN : Number(String(v).replace(",", ".")); return Number.isFinite(n) ? n : null }
    const baris: BukuNilai["baris"] = []
    for (let r = st.barisData, no = 1; r <= st.barisAkhir; r++) {
      const nama = l.nilai.get(`${kNama}${r}`)
      if (!nama) continue
      baris.push({ no: no++, nama, tp: tpKol.map((k) => angka(`${k.kol}${r}`)), sts: sts ? angka(`${sts.kol}${r}`) : null, sas: sas ? angka(`${sas.kol}${r}`) : null })
    }
    const sem = berkas.match(/semester\s*(\d)/i)?.[1]
    return { berkas, mapel, semester: sem ? Number(sem) : null, tp: tpKol.map((k) => ({ kode: `TP${k.tp}`, tujuan: "", batas: null })), bobot: [50, 25, 25], baris }
  }
  return null
}

/** Daftar hadir berformat bebas: rekap S/I/A per siswa, atau kolom tanggal (1–31) berisi S/I/A. */
export function bacaHadirUmum(data: Uint8Array, berkas: string): Hadir | null {
  for (const l of bacaBuku(bacaZip(data)).lembar) {
    const st = kenaliTabel(l, [])
    if (!st || st.barisAkhir < st.barisData) continue
    const kNama = st.kolom.find((k) => k.jenis === "nama")!.kol
    const ks = st.kolom.find((k) => k.jenis === "sakit"), ki = st.kolom.find((k) => k.jenis === "izin"), ka = st.kolom.find((k) => k.jenis === "alfa")
    const hariKol = st.kolom.filter((k) => k.judul.some((j) => /^([1-9]|[12]\d|3[01])(\.0)?$/.test(j.trim())))
    if (!(ks || ki || ka) && hariKol.length < 5) continue
    const baris: Hadir["baris"] = []
    for (let r = st.barisData, no = 1; r <= st.barisAkhir; r++) {
      const nama = l.nilai.get(`${kNama}${r}`)
      if (!nama) continue
      const hitung = (h: string) => hariKol.filter((k) => (l.nilai.get(`${k.kol}${r}`) ?? "").trim().toUpperCase() === h).length
      const n = (k?: Kolom) => (k && !l.rumus.has(`${k.kol}${r}`) ? Number(String(l.nilai.get(`${k.kol}${r}`) ?? "0").replace("-", "0")) || 0 : null)
      const s = hariKol.length >= 5 ? hitung("S") : n(ks) ?? 0
      const i = hariKol.length >= 5 ? hitung("I") : n(ki) ?? 0
      const a = hariKol.length >= 5 ? hitung("A") : n(ka) ?? 0
      baris.push({ no: no++, nama, s, i, a })
    }
    return { berkas, bulan: l.nama, hari: hariKol.length, baris }
  }
  return null
}

/** Tebakan jenis format dari nama berkas dan judul kolomnya (untuk saran ke asisten). */
export function tebakJenisExcel(nama: string, berkas: Uint8Array): string[] | null {
  const n = norm(nama)
  let mapel = 0, nilai = 0, hadir = 0
  try {
    for (const l of bacaBuku(bacaZip(berkas)).lembar) {
      const st = kenaliTabel(l, ["Pendidikan Agama Islam", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", "IPAS", "Seni", "PJOK", "Bahasa Inggris"])
      if (!st) continue
      mapel = Math.max(mapel, new Set(st.kolom.map((k) => k.mapel).filter(Boolean)).size)
      nilai += st.kolom.filter((k) => ["tp", "uh", "tugas", "uts", "uas", "rapor"].includes(k.jenis)).length
      hadir += st.kolom.filter((k) => ["sakit", "izin", "alfa"].includes(k.jenis) || k.judul.some((j) => /^([1-9]|[12]\d|3[01])(\.0)?$/.test(j.trim()))).length
    }
  } catch { /* tebakan dari nama saja */ }
  const out: string[] = []
  if (/rekap|leger|ledger|rapor|raport/.test(n) || mapel >= 2) out.push("Rekap Nilai")
  if (/nilai/.test(n) || (nilai && mapel < 2)) out.push("Buku Nilai")
  if (/hadir|absen|presensi/.test(n) || hadir >= 5) out.push("Daftar Hadir")
  if (/kokurikuler|p5|projek/.test(n)) out.push("Penilaian Kokurikuler")
  if (/butir|analisis soal/.test(n)) out.push("Analisis Butir Soal")
  if (/kelompok/.test(n)) out.push("Kelompok")
  if (/piket|denah|struktur|wali|tata tertib|kesepakatan/.test(n)) out.push("Administrasi Wali Kelas")
  return out.length ? [...new Set(out)] : null
}
