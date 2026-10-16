// Pustaka buku: ekstraksi teks PDF (pdf.js yang disertakan di ../vendor/pdfjs) dan pencarian topik.
// Buku diambil dari sekolah/referensi/buku/ (disiapkan operator) dan guru/buku/ (buku milik guru).

import { existsSync } from "node:fs"
import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { Gagal } from "./berkas.ts"

export const FOLDER_BUKU = ["sekolah/referensi/buku", "guru/buku"]
const BATAS_HALAMAN = 15
const BATAS_KARAKTER = 24000

export type Buku = { rel: string; nama: string; halaman: string[] }

let pdfjs: any = null
async function muatPdfjs() {
  if (!pdfjs) {
    pdfjs = await import("../vendor/pdfjs/pdf.min.mjs")
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href
  }
  return pdfjs
}

/** Teks per halaman PDF. Hasil disimpan di memori selama berkas tidak berubah. */
const tembolok = new Map<string, { mtime: number; halaman: string[] }>()
export async function teksPdf(path: string): Promise<string[]> {
  const mtime = (await stat(path)).mtimeMs
  const ada = tembolok.get(path)
  if (ada && ada.mtime === mtime) return ada.halaman
  const halaman = await teksPdfData(new Uint8Array(await readFile(path)), path.split(/[\\/]/).pop() ?? "PDF")
  tembolok.set(path, { mtime, halaman })
  return halaman
}

/** Teks per halaman dari isi PDF di memori (misalnya PDF yang diunduh saat riset). */
export async function teksPdfData(data: Uint8Array, nama = "PDF"): Promise<string[]> {
  const lib = await muatPdfjs()
  let tugas: any
  let doc: any
  try {
    tugas = lib.getDocument({
      data,
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    })
    doc = await tugas.promise
  } catch (e) {
    throw new Gagal(`Berkas ${nama} tidak bisa dibaca sebagai PDF (${(e as Error).message}).`)
  }
  const halaman: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent()
    halaman.push(
      tc.items
        .map((x: any) => (x.str ?? "") + (x.hasEOL ? "\n" : ""))
        .join("")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    )
  }
  await tugas.destroy()
  return halaman
}

export async function daftarBuku(akar: string): Promise<{ rel: string; nama: string; ukuranMb: number }[]> {
  const out: { rel: string; nama: string; ukuranMb: number }[] = []
  for (const folder of FOLDER_BUKU) {
    const p = join(akar, folder)
    if (!existsSync(p)) continue
    for (const f of (await readdir(p)).sort()) {
      if (!f.toLowerCase().endsWith(".pdf")) continue
      out.push({ rel: `${folder}/${f}`, nama: f.replace(/\.pdf$/i, ""), ukuranMb: Math.round((await stat(join(p, f))).size / 1e5) / 10 })
    }
  }
  return out
}

/**
 * Nomor halaman cetak dari kepala/kaki halaman buku, misalnya "56 Matematika untuk SD/MI Kelas IV" atau
 * "79Bab 2 | Pecahan". Hanya pola yang jelas yang dipakai; lebih baik kosong daripada salah.
 */
export function halamanCetak(teks: string): string | null {
  const baris = teks.split("\n").map((b) => b.trim()).filter(Boolean)
  for (const b of [...baris.slice(0, 6), ...baris.slice(-3)]) {
    const m = b.match(/^(\d{1,3})\s*(?=Bab \d|[A-Z][^\n]*(Kelas|SD\/MI))/) ?? b.match(/(Kelas [IVX]+|SD\/MI[^\n]*|Bab \d+ \|[^\n]*?)\s+(\d{1,3})$/)
    if (m) return m[1] && /^\d+$/.test(m[1]) ? m[1] : m[2]
  }
  return null
}

const kata = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((k) => k.length > 2 && !["dan", "yang", "untuk", "dengan", "dari", "pada", "kelas", "materi"].includes(k))

export type Temuan = { buku: string; halaman: number; cetak: string | null; skor: number; cuplikan: string }

/** Mencari halaman paling relevan: frasa utuh bernilai tinggi, lalu jumlah kata kunci yang muncul. */
export function cari(buku: { nama: string; halaman: string[] }[], kueri: string, maks = 8): Temuan[] {
  const kk = [...new Set(kata(kueri))]
  const frasa = kueri.toLowerCase().trim()
  if (!kk.length) throw new Gagal("Kata kunci pencarian terlalu pendek.")
  const hasil: Temuan[] = []
  for (const b of buku) {
    b.halaman.forEach((teks, i) => {
      const t = teks.toLowerCase()
      const ada = kk.filter((k) => t.includes(k))
      if (!ada.length) return
      const judul = t.split("\n").some((l) => l.trim().replace(/^[a-z0-9]{1,2}[.)]\s*/, "") === frasa)
      const daftarIsi = /\.{8,}/.test(t)
      const skor =
        (t.includes(frasa) ? 10 : 0) + (judul ? 8 : 0) - (daftarIsi ? 8 : 0) + ada.length * 2 + Math.min(5, kk.reduce((n, k) => n + t.split(k).length - 1, 0) / 3)
      const pos = Math.max(0, t.indexOf(t.includes(frasa) ? frasa : ada[0]) - 150)
      hasil.push({ buku: b.nama, halaman: i + 1, cetak: halamanCetak(teks), skor, cuplikan: teks.slice(pos, pos + 400).replace(/\s+/g, " ").trim() })
    })
  }
  return hasil.sort((a, b) => b.skor - a.skor).slice(0, maks)
}

/** "57", "57-60", atau "57,59" → daftar nomor halaman PDF. */
export function rentang(s: string, jumlah: number): number[] {
  const out: number[] = []
  for (const bagian of s.split(",")) {
    const m = bagian.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) throw new Gagal(`Halaman "${s}" tidak dikenali. Contoh: "57", "57-60", atau "57,59".`)
    const a = +m[1]
    const b = m[2] ? +m[2] : a
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= jumlah) out.push(i)
  }
  if (!out.length) throw new Gagal(`Halaman di luar jangkauan (buku ini ${jumlah} halaman).`)
  if (out.length > BATAS_HALAMAN) throw new Gagal(`Paling banyak ${BATAS_HALAMAN} halaman sekali baca. Persempit rentangnya.`)
  return out
}

export function potong(s: string): string {
  return s.length > BATAS_KARAKTER ? `${s.slice(0, BATAS_KARAKTER)}\n[... dipotong; minta halaman yang lebih sedikit]` : s
}
