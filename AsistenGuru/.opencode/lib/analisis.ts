// Analisis belajar siswa dari Excel yang sudah diisi guru (buku nilai, daftar hadir, penilaian kokurikuler).
// Dibaca dan dihitung di komputer guru. Ke asisten hanya dikirim data yang diperlukan dengan label "Siswa No. X"
// (tanpa nama, tanpa NISN, tanpa data siswa lain per nama) — kecuali sekolah mengaktifkan kebijakan privasi.nama_ke_ai.
// Laporan kelas lengkap dengan nama ditulis ke hasil/4 Administrasi (terkunci dari asisten) untuk dibuka guru.

import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { kopExcel } from "./administrasi.ts"
import { type Kebijakan, type Profil, bacaJson, tulis } from "./berkas.ts"
import { FOLDER } from "./dokumen.ts"
import { bacaTabelXlsx } from "./masukan.ts"
import { type Siswa, bacaDaftarSiswa } from "./siswa.ts"
import { G, type Sel, buatXlsx } from "./xlsx.ts"

const angka = (v: unknown): number | null => {
  const s = String(v ?? "").trim().replace(",", ".")
  return s !== "" && Number.isFinite(Number(s)) ? Number(s) : null
}
const normNama = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim()
const rata = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
const bulat = (x: number | null) => (x === null ? null : Math.round(x))

export type TPInfo = { kode: string; tujuan: string; batas: number | null }
export type BukuNilai = { berkas: string; mapel: string; semester: number | null; tp: TPInfo[]; bobot: [number, number, number]; baris: { no: number; nama: string; tp: (number | null)[]; sts: number | null; sas: number | null }[] }
export type Hadir = { berkas: string; bulan: string; hari: number; baris: { no: number; nama: string; s: number; i: number; a: number }[] }
export type Koku = { berkas: string; tema: string; dimensi: string[]; baris: { no: number; nama: string; nilai: string[] }[] }

/** Baris data di bawah kepala: kolom A berisi nomor urut. */
function barisData(sel: string[][], mulai: number) {
  const out: { r: string[]; no: number }[] = []
  for (let i = mulai; i < sel.length; i++) {
    const no = angka(sel[i]?.[0])
    if (no === null || !Number.isInteger(no)) break
    out.push({ r: sel[i] ?? [], no })
  }
  return out
}

export function bacaBukuNilai(data: Uint8Array, berkas: string): BukuNilai | null {
  const [lembar, ket] = bacaTabelXlsx(data, 400, 80)
  if (!lembar) return null
  const sel = lembar.sel
  const h = sel.findIndex((b) => b?.[1] === "Nama Siswa" && b?.[2] === "Nilai Formatif per TP")
  if (h < 0) return null
  const kRata = sel[h].indexOf("Rata-rata Formatif")
  const kode = sel[h + 1].slice(2, kRata)
  const rb = sel.find((b) => String(b?.[0] ?? "").startsWith("Bobot nilai rapor"))
  const bobot: [number, number, number] = [angka(rb?.[4]) ?? 50, angka(rb?.[6]) ?? 25, angka(rb?.[8]) ?? 25]
  const info = new Map((ket?.sel ?? []).slice(3).filter((b) => b?.[0]).map((b) => [b[0], { tujuan: b[1] ?? "", batas: angka(b[3]) }]))
  const mapel = (sel.find((b) => /^BUKU NILAI /.test(b?.[0] ?? ""))?.[0] ?? "").replace(/^BUKU NILAI /, "")
  const semester = angka(berkas.match(/Semester (\d)/)?.[1] ?? lembar.nama.match(/Semester (\d)/)?.[1])
  return {
    berkas, mapel: mapel ? mapel[0] + mapel.slice(1).toLowerCase() : berkas, semester,
    tp: kode.map((k) => ({ kode: k, tujuan: info.get(k)?.tujuan ?? "", batas: info.get(k)?.batas ?? null })),
    bobot,
    baris: barisData(sel, h + 2).map(({ r, no }) => ({ no, nama: r[1] ?? "", tp: kode.map((_, j) => angka(r[2 + j])), sts: angka(r[kRata + 1]), sas: angka(r[kRata + 2]) })),
  }
}

export function bacaHadir(data: Uint8Array, berkas: string): Hadir | null {
  const [lembar] = bacaTabelXlsx(data, 400, 60)
  if (!lembar) return null
  const sel = lembar.sel
  const h = sel.findIndex((b) => b?.[1] === "Nama Siswa" && b?.[2] === "Tanggal")
  if (h < 0) return null
  const kS = sel[h + 1].indexOf("S")
  return {
    berkas, bulan: lembar.nama, hari: kS - 2,
    baris: barisData(sel, h + 3).map(({ r, no }) => {
      const isi = r.slice(2, kS).map((x) => String(x ?? "").trim().toUpperCase())
      return { no, nama: r[1] ?? "", s: isi.filter((x) => x === "S").length, i: isi.filter((x) => x === "I").length, a: isi.filter((x) => x === "A").length }
    }),
  }
}

export function bacaKoku(data: Uint8Array, berkas: string): Koku | null {
  const [lembar] = bacaTabelXlsx(data, 400, 40)
  if (!lembar) return null
  const sel = lembar.sel
  const h = sel.findIndex((b) => b?.[1] === "Nama Murid" && b?.[2] === "Hasil Asesmen per Dimensi")
  if (h < 0) return null
  const kCat = sel[h].indexOf("Catatan Pendidik")
  return {
    berkas, tema: (sel.find((b) => /^Tema: /.test(b?.[0] ?? ""))?.[0] ?? "").replace(/^Tema: /, "").split("  ·  ")[0],
    dimensi: sel[h + 1].slice(2, kCat),
    baris: barisData(sel, h + 2).map(({ r, no }) => ({ no, nama: r[1] ?? "", nilai: r.slice(2, kCat).map((x) => String(x ?? "").trim()) })),
  }
}

async function semuaXlsx(akar: string, folder: string, awalan: string) {
  const dir = join(akar, "hasil", folder)
  if (!existsSync(dir)) return []
  return (await readdir(dir)).filter((f) => f.startsWith(awalan) && f.endsWith(".xlsx") && !f.startsWith("~$")).sort().map((f) => ({ f, p: join(dir, f) }))
}

export async function muatData(akar: string) {
  const nilai: BukuNilai[] = [], hadir: Hadir[] = [], koku: Koku[] = []
  for (const { f, p } of await semuaXlsx(akar, FOLDER.administrasi, "Buku Nilai ")) { const b = bacaBukuNilai(new Uint8Array(await readFile(p)), f); if (b) nilai.push(b) }
  for (const { f, p } of await semuaXlsx(akar, FOLDER.administrasi, "Daftar Hadir ")) { const b = bacaHadir(new Uint8Array(await readFile(p)), f); if (b) hadir.push(b) }
  for (const { f, p } of await semuaXlsx(akar, FOLDER.kokurikuler, "Penilaian Kokurikuler ")) { const b = bacaKoku(new Uint8Array(await readFile(p)), f); if (b) koku.push(b) }
  return { nilai, hadir, koku, daftar: (await bacaDaftarSiswa(akar)) ?? [] }
}

/** Nomor absen dari nama atau nomor yang diketik guru. */
export function cariSiswa(daftar: Siswa[], q: string): { no: number } | { ganda: number[] } | null {
  const t = String(q).trim()
  if (/^\d{1,2}$/.test(t)) {
    const no = Number(t)
    return no >= 1 && no <= Math.max(daftar.length, 99) ? { no } : null
  }
  const kata = normNama(t).split(" ").filter(Boolean)
  if (!kata.length) return null
  const cocok = daftar.map((s, i) => ({ no: i + 1, n: normNama(s.nama) })).filter(({ n }) => {
    const bag = n.split(" ")
    return kata.every((k) => bag.some((b) => b.startsWith(k)))
  })
  const persis = cocok.filter(({ n }) => n === normNama(t))
  if (persis.length === 1) return { no: persis[0].no }
  if (cocok.length === 1) return { no: cocok[0].no }
  if (cocok.length > 1) return { ganda: cocok.map((c) => c.no) }
  return null
}

const nilaiRapor = (b: BukuNilai, r: BukuNilai["baris"][0]) => {
  const f = rata(r.tp)
  if (f === null || r.sts === null || r.sas === null) return null
  const [bf, bs, ba] = b.bobot
  return Math.round((Math.round(f) * bf + r.sts * bs + r.sas * ba) / (bf + bs + ba))
}
const barisUntuk = <T extends { no: number; nama: string }>(rows: T[], no: number, nama?: string) =>
  (nama ? rows.find((r) => normNama(r.nama) && normNama(r.nama) === normNama(nama)) : undefined) ?? rows.find((r) => r.no === no)

/** Analisis satu siswa: teks untuk asisten, berlabel "Siswa No. X" (atau nama bila kebijakan mengizinkan). */
export function analisisSiswa(d: Awaited<ReturnType<typeof muatData>>, no: number, opsi: { mapel?: string; semester?: number; namaKeAi?: boolean }): string {
  const nama = d.daftar[no - 1]?.nama
  const label = opsi.namaKeAi && nama ? `${nama} (No. ${no})` : `Siswa No. ${no}`
  const out = [`# Data belajar ${label}`, ""]
  const nilai = d.nilai.filter((b) => (!opsi.mapel || b.mapel.toLowerCase().includes(opsi.mapel.toLowerCase())) && (!opsi.semester || b.semester === opsi.semester))
  let adaNilai = false
  for (const b of nilai) {
    const r = barisUntuk(b.baris, no, nama)
    if (!r || r.tp.every((x) => x === null) && r.sts === null && r.sas === null) continue
    adaNilai = true
    out.push(`## ${b.mapel}${b.semester ? ` semester ${b.semester}` : ""}`, "| TP | Nilai | Batas tuntas | Rata-rata kelas | Status |", "|---|---|---|---|---|")
    b.tp.forEach((t, j) => {
      const v = r.tp[j]
      const kelas = bulat(rata(b.baris.map((x) => x.tp[j])))
      const status = v === null ? "belum dinilai" : t.batas !== null ? (v < t.batas ? "BELUM TUNTAS" : "tuntas") : ""
      out.push(`| ${t.kode} ${t.tujuan} | ${v ?? "–"} | ${t.batas ?? "–"} | ${kelas ?? "–"} | ${status} |`)
    })
    const f = bulat(rata(r.tp)), rap = nilaiRapor(b, r)
    const raporKelas = bulat(rata(b.baris.map((x) => nilaiRapor(b, x))))
    out.push("", `Rata-rata formatif: ${f ?? "–"} · STS: ${r.sts ?? "–"} · SAS: ${r.sas ?? "–"} · Nilai rapor: ${rap ?? "belum lengkap"}${raporKelas !== null ? ` (rata-rata kelas ${raporKelas})` : ""}`)
    const terisi = r.tp.map((v, j) => ({ v, t: b.tp[j] })).filter((x) => x.v !== null) as { v: number; t: TPInfo }[]
    if (terisi.length >= 2) {
      const urut = [...terisi].sort((a, z) => z.v - a.v)
      out.push(`Terkuat: ${urut[0].t.kode} (${urut[0].v}). Terlemah: ${urut.at(-1)!.t.kode} (${urut.at(-1)!.v}).`)
    }
    out.push("")
  }
  if (!adaNilai) out.push("Nilai: belum ada nilai yang diisi untuk siswa ini di buku nilai.", "")
  const hadir = d.hadir.map((h) => ({ h, r: barisUntuk(h.baris, no, nama) })).filter((x) => x.r)
  if (hadir.length) {
    out.push("## Kehadiran", "| Bulan | Hari sekolah | Sakit | Izin | Alpa | Hadir | Rata-rata hadir kelas |", "|---|---|---|---|---|---|---|")
    for (const { h, r } of hadir) {
      const pr = (x: { s: number; i: number; a: number }) => (h.hari ? Math.round(((h.hari - x.s - x.i - x.a) / h.hari) * 100) : null)
      // Rata-rata kelas hanya dari baris siswa yang ada (bernama, atau sebanyak Daftar Siswa), bukan baris kosong cadangan.
      const ada = h.baris.some((x) => normNama(x.nama)) ? h.baris.filter((x) => normNama(x.nama)) : d.daftar.length ? h.baris.slice(0, d.daftar.length) : h.baris
      out.push(`| ${h.bulan} | ${h.hari} | ${r!.s} | ${r!.i} | ${r!.a} | ${pr(r!)}% | ${bulat(rata(ada.map(pr)))}% |`)
    }
    out.push("")
  }
  for (const k of d.koku) {
    const r = barisUntuk(k.baris, no, nama)
    if (!r || r.nilai.every((x) => !x)) continue
    out.push(`## Kokurikuler: ${k.tema}`, ...k.dimensi.map((dim, j) => `- ${dim}: ${r.nilai[j] || "–"}`), "")
  }
  if (out.length <= 3) out.push("Belum ada data yang diisi guru (nilai, kehadiran, atau kokurikuler) untuk siswa ini.")
  out.push("Gunakan data ini apa adanya; jangan menebak hal yang tidak ada di data. Sebut siswa dengan nama yang diketik guru atau nomornya.")
  return out.join("\n")
}

/** Ringkasan kelas (nomor saja untuk asisten) + laporan Excel lengkap dengan nama untuk guru. */
export async function analisisKelas(akar: string, d: Awaited<ReturnType<typeof muatData>>, opsi: { mapel?: string; semester?: number; namaKeAi?: boolean }, tanggal: string) {
  const nilai = d.nilai.filter((b) => (!opsi.mapel || b.mapel.toLowerCase().includes(opsi.mapel.toLowerCase())) && (!opsi.semester || b.semester === opsi.semester))
  const sebut = (nos: number[]) => (nos.length ? nos.map((n) => (opsi.namaKeAi && d.daftar[n - 1] ? `${d.daftar[n - 1].nama} (No. ${n})` : `No. ${n}`)).join(", ") : "tidak ada")
  const out = ["# Ringkasan kelas", ""]
  for (const b of nilai) {
    out.push(`## ${b.mapel}${b.semester ? ` semester ${b.semester}` : ""}`, "| TP | Rata-rata | Sudah dinilai | Belum tuntas (nomor absen) |", "|---|---|---|---|")
    b.tp.forEach((t, j) => {
      const isi = b.baris.filter((r) => r.tp[j] !== null)
      const kurang = t.batas === null ? [] : isi.filter((r) => r.tp[j]! < t.batas!).map((r) => r.no)
      out.push(`| ${t.kode} ${t.tujuan} | ${bulat(rata(b.baris.map((r) => r.tp[j]))) ?? "–"} | ${isi.length}/${b.baris.length} | ${sebut(kurang)} |`)
    })
    out.push("")
  }
  if (d.hadir.length) {
    const tot = new Map<number, { s: number; i: number; a: number }>()
    for (const h of d.hadir) for (const r of h.baris) { const t = tot.get(r.no) ?? { s: 0, i: 0, a: 0 }; t.s += r.s; t.i += r.i; t.a += r.a; tot.set(r.no, t) }
    const alpa = [...tot].filter(([, t]) => t.a >= 3).map(([n]) => n), sakit = [...tot].filter(([, t]) => t.s >= 5).map(([n]) => n)
    out.push(`## Kehadiran (${d.hadir.map((h) => h.bulan).join(", ")})`, `- Alpa 3 kali atau lebih: ${sebut(alpa)}`, `- Sakit 5 hari atau lebih: ${sebut(sakit)}`, "")
  }
  // Laporan lengkap dengan nama (dibuka guru; terkunci dari asisten).
  const profil = await bacaJson<Profil>(akar, "guru/profil.json")
  const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
  const lembar = nilai.map((b) => {
    const baris: Sel[][] = []
    const gabung: string[] = []
    const nKol = 2 + b.tp.length + 5
    kopExcel(baris, gabung, nKol, kebijakan.nama_sekolah ?? profil.sekolah, `ANALISIS BELAJAR ${b.mapel.toUpperCase()}`, `Kelas ${profil.rombel ?? profil.kelas}${b.semester ? `  ·  Semester ${b.semester}` : ""}  ·  Per ${tanggal}`)
    baris.push(["No", "Nama", ...b.tp.map((t) => t.kode), "Rata-rata Formatif", "STS", "SAS", "Nilai Rapor", "TP Belum Tuntas"].map((v) => ({ v, s: G.kepala })))
    for (const r of b.baris) {
      const nama = d.daftar[r.no - 1]?.nama || r.nama
      const kurang = b.tp.filter((t, j) => t.batas !== null && r.tp[j] !== null && r.tp[j]! < t.batas).map((t) => t.kode).join(" ")
      baris.push([{ v: r.no, s: G.tengah }, { v: nama, s: G.sel }, ...r.tp.map((v) => ({ v: v ?? "", s: G.tengah })), { v: bulat(rata(r.tp)) ?? "", s: G.tengah }, { v: r.sts ?? "", s: G.tengah }, { v: r.sas ?? "", s: G.tengah }, { v: nilaiRapor(b, r) ?? "", s: G.tengahTebal }, { v: kurang, s: G.tengah }])
    }
    return { nama: `${b.mapel} S${b.semester ?? ""}`.slice(0, 31), baris, gabung, lebar: [5, 30, ...b.tp.map(() => 7), 10, 7, 7, 9, 16] }
  })
  let laporan: string | null = null
  if (lembar.length) laporan = await tulis(akar, `hasil/${FOLDER.administrasi}/Analisis Kelas ${tanggal}.xlsx`, buatXlsx(lembar))
  if (!nilai.length && !d.hadir.length) out.push("Belum ada buku nilai atau daftar hadir yang diisi.")
  out.push(laporan ? `Laporan lengkap dengan nama siswa: ${laporan} (sampaikan ke guru untuk dibuka di Excel; asisten tidak bisa membukanya).` : "")
  return out.join("\n")
}

