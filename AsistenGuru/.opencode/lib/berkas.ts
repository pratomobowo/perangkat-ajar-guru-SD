// Akses berkas bersama untuk semua tool: mencari akar folder, membaca data guru/sekolah, menulis dengan aman.

import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises"
import { dirname, join, normalize, resolve, sep } from "node:path"

/** Kesalahan yang pesannya ditujukan ke asisten (dan guru), bukan crash program. */
export class Gagal extends Error {}

export type Mapel = { nama: string; kode?: string; jp_per_minggu: number; menit_per_jp?: number }
export type Profil = {
  nama_panggilan?: string
  nama_lengkap?: string | null
  nip?: string | null
  sekolah?: string | null
  tahun_ajaran: string
  kelas: number
  /** Nama rombel, misalnya "4A" (dipakai menyaring daftar siswa Dapodik satu sekolah). */
  rombel?: string | null
  fase?: string
  jumlah_siswa?: number | null
  hari_sekolah?: string[]
  mapel: Mapel[]
  jadwal?: Record<string, { mapel: string; jam_ke?: string; jp?: number }[]>
}
export type Kegiatan = { mulai: string; akhir?: string; jenis: "libur" | "tidak_efektif"; nama: string }
export type Kalender = { semester: { ke: number; mulai: string; akhir: string }[]; kegiatan: Kegiatan[] }
export type Kebijakan = {
  nama_sekolah?: string | null
  alamat_sekolah?: string | null
  kota?: string | null
  kepala_sekolah?: { nama?: string | null; nip?: string | null } | null
  kertas?: "A4" | "F4" | null
  huruf?: string | null
  batas_ketuntasan?: number | null
  minggu_efektif?: { min_hari_efektif?: number }
  cadangan_jp_per_semester?: number | null
  bobot_nilai_rapor?: { formatif: number; sts: number; sas: number } | null
  riset?: { web?: boolean; domain_tepercaya?: string[] | null } | null
  gaya_dokumen?: Record<string, unknown> | null
  gaya_dikunci?: string[] | null
  template_wajib?: boolean | null
}
export type TP = {
  kode: string
  semester: number
  tujuan: string
  materi?: string
  elemen: string[]
  jp: number
  nilai_islam?: string
}
export type ATP = {
  mapel: string
  kelas?: number
  fase?: string
  cadangan_jp?: Record<string, number>
  elemen_tidak_di_kelas_ini?: { elemen: string; alasan: string }[]
  catatan?: string[]
  tp: TP[]
}

export function cariAkar(dir: string): string {
  let d = resolve(dir)
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(d, ".opencode", "agents", "asisten-guru.md")) || existsSync(join(d, "sekolah", "kebijakan.json"))) return d
    const atas = dirname(d)
    if (atas === d) break
    d = atas
  }
  return resolve(dir)
}

/** Membaca teks. BOM (Notepad Windows) dibuang dan akhir baris CRLF diseragamkan menjadi LF. */
export async function bacaTeks(akar: string, rel: string): Promise<string | null> {
  const p = join(akar, rel)
  if (!existsSync(p)) return null
  return (await readFile(p, "utf8")).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n")
}

/**
 * Jalur relatif terhadap akar dengan garis miring biasa. Menerima jalur gaya Windows (`guru\draf\...`),
 * awalan `./`, atau jalur absolut di dalam akar.
 */
export function relatif(akar: string, p: string): string {
  let s = p.trim().replace(/\\/g, "/")
  const a = akar.replace(/\\/g, "/").replace(/\/$/, "")
  if (s.toLowerCase().startsWith(a.toLowerCase() + "/")) s = s.slice(a.length + 1)
  return s.replace(/^(\.\/)+/, "")
}

/** Karakter yang tidak boleh ada di nama berkas/folder Windows diganti, spasi dan titik di ujung nama dibuang. */
export function jalurAman(rel: string): string {
  return rel
    .split("/")
    .map((bagian) => {
      let b = bagian.replace(/[<>:"|?*\x00-\x1f]/g, "-").replace(/[ .]+$/, "")
      if (/^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(b)) b = `_${b}`
      return b
    })
    .join("/")
}

export async function bacaJson<T>(akar: string, rel: string, jikaTidakAda?: string): Promise<T> {
  const t = await bacaTeks(akar, rel)
  if (t === null) {
    if (jikaTidakAda) throw new Gagal(jikaTidakAda)
    return {} as T
  }
  try {
    return JSON.parse(t) as T
  } catch (e) {
    throw new Gagal(`Berkas ${rel} bukan JSON yang sah (${(e as Error).message}). Perbaiki isinya dulu.`)
  }
}

/** Menulis berkas hanya di dalam guru/ atau hasil/. Mengembalikan jalur yang benar-benar ditulis. */
export async function tulis(akar: string, rel: string, isi: string | Uint8Array): Promise<string> {
  const n = jalurAman(normalize(rel).replace(/\\/g, "/"))
  if (n.split("/").includes("..") || !(n.startsWith("guru/") || n.startsWith("hasil/")))
    throw new Gagal(`Tidak boleh menulis di ${rel}. Hanya folder guru/ dan hasil/ yang boleh diubah.`)
  const p = join(akar, n)
  await mkdir(dirname(p), { recursive: true })
  await writeFile(p, isi)
  return n
}

export async function daftar(akar: string, rel: string): Promise<string[]> {
  const p = join(akar, rel)
  if (!existsSync(p)) return []
  return (await readdir(p)).filter((f) => !f.startsWith("."))
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function muatDasar(akar: string) {
  const profil = await bacaJson<Profil>(
    akar,
    "guru/profil.json",
    "Profil guru belum ada (guru/profil.json). Jalankan skill guru-setup dulu (guru bisa mengetik /mulai).",
  )
  const kalender = await bacaJson<Kalender>(
    akar,
    "guru/kalender.json",
    "Kalender pendidikan belum ada (guru/kalender.json). Minta guru menempelkan kalender sekolah lewat skill guru-setup.",
  )
  const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
  if (!kalender.semester?.length) throw new Gagal("guru/kalender.json belum berisi tanggal semester.")
  // Fase bisa diturunkan dari kelas (A: 1–2, B: 3–4, C: 5–6) bila tidak ditulis di profil.
  if (!profil.fase && profil.kelas >= 1 && profil.kelas <= 6) profil.fase = "ABC"[Math.ceil(profil.kelas / 2) - 1]
  return { profil, kalender, kebijakan }
}

export function cariMapel(profil: Profil, nama: string): Mapel {
  const s = slug(nama)
  const m = profil.mapel.find((x) => slug(x.kode ?? x.nama) === s || slug(x.nama) === s || slug(x.nama).startsWith(s))
  if (!m)
    throw new Gagal(
      `Mapel "${nama}" tidak ada di profil. Mapel yang ada: ${profil.mapel.map((x) => x.nama).join(", ")}. Tambahkan lewat guru-setup bila perlu.`,
    )
  return m
}

/** Frontmatter sederhana "kunci: nilai" dari berkas Markdown. */
export function frontmatter(md: string): Record<string, string> {
  const m = md.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").match(/^---\n([\s\S]*?)\n---/)
  const out: Record<string, string> = {}
  if (!m) return out
  for (const baris of m[1].split("\n")) {
    const k = baris.match(/^([\w_]+):\s*(.*?)\s*(#.*)?$/)
    if (k) out[k[1]] = k[2]
  }
  return out
}

export const PEMISAH = sep
