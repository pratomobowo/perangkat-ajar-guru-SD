// Katalog buku teks resmi SIBI (buku.kemendikdasmen.go.id) untuk mengisi pustaka guru.

import { Gagal, slug } from "./berkas.ts"

const API = "https://api.buku.kemendikdasmen.go.id/api/catalogue/getPenggerakTextBooks?limit=5000"
/** Berkas di katalog masih memakai domain lama yang sudah tidak aktif; isinya kini dilayani host ini. */
const HOST_LAMA = /^https?:\/\/static\.buku\.(kemdikbud|kemendikdasmen)\.go\.id/i
export const HOST_BERKAS = "https://static.sc.cloudapp.web.id"

export type BukuSibi = { judul: string; mapel: string; kelas: number; jenis: "siswa" | "guru"; url: string; revisi: boolean }

/** Sebutan mapel sehari-hari → kode mapel di katalog SIBI. */
const ALIAS: Record<string, string> = {
  pai: "agama-islam",
  "agama-islam": "agama-islam",
  ppkn: "pendidikan-pancasila",
  pkn: "pendidikan-pancasila",
  pancasila: "pendidikan-pancasila",
  penjas: "pjok",
  olahraga: "pjok",
  inggris: "bahasa-inggris",
  "bahasa-indo": "bahasa-indonesia",
  "b-indonesia": "bahasa-indonesia",
  bindo: "bahasa-indonesia",
  ipa: "ipas",
  ips: "ipas",
  mtk: "matematika",
  seni: "seni",
}

const ROMAWI: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 }

export function urlBerkas(url: string): string {
  return url.replace(HOST_LAMA, HOST_BERKAS)
}

function jenisDari(judul: string, url: string): "siswa" | "guru" {
  return /panduan guru|buku guru/i.test(judul) || /[_-]BG[_-]/.test(url) ? "guru" : "siswa"
}

export async function katalogSd(signal?: AbortSignal): Promise<BukuSibi[]> {
  let data: any
  try {
    const res = await fetch(API, { headers: { "user-agent": "asisten-guru" }, signal })
    if (!res.ok) throw new Error(`kode ${res.status}`)
    data = await res.json()
  } catch (e) {
    throw new Gagal(`Katalog buku SIBI tidak bisa dihubungi (${(e as Error).message}). Periksa internet, lalu coba lagi.`)
  }
  const out = new Map<string, BukuSibi>()
  for (const x of data?.results ?? []) {
    const url = String(x.attachment ?? "")
    if (!/\.pdf$/i.test(url) || !/^SD/i.test(String(x.level ?? ""))) continue
    const k = String(x.class ?? "").toLowerCase()
    const kelas = /^\d+$/.test(k) ? +k : (ROMAWI[k] ?? 0)
    if (kelas < 1 || kelas > 6) continue
    const judul = String(x.title ?? "").replace(/^Buku Audio\s+/i, "").replace(/\s+/g, " ").trim()
    out.set(url, { judul, mapel: slug(String(x.subject ?? "")), kelas, jenis: jenisDari(judul, url), url: urlBerkas(url), revisi: /revisi|_Rev\.pdf$/i.test(judul + url) })
  }
  return [...out.values()]
}

/** Buku untuk satu kelas (dan mapel bila diisi). Jika ada edisi revisi, edisi lama untuk mapel+jenis yang sama dibuang. */
export function pilihBuku(semua: BukuSibi[], kelas: number, mapel?: string, jenis?: "siswa" | "guru"): BukuSibi[] {
  let m = mapel ? slug(mapel) : ""
  m = ALIAS[m] ?? m
  const cocok = semua.filter(
    (b) =>
      b.kelas === kelas &&
      (!jenis || b.jenis === jenis) &&
      (!m || b.mapel === m || b.mapel.startsWith(`${m}-`) || slug(b.judul).includes(m)),
  )
  return cocok
    .filter((b) => b.revisi || !cocok.some((c) => c !== b && c.revisi && c.mapel === b.mapel && c.jenis === b.jenis))
    .sort((a, b) => a.mapel.localeCompare(b.mapel) || a.jenis.localeCompare(b.jenis))
}

/** Nama berkas yang mudah dibaca guru, misalnya "Matematika untuk SD-MI Kelas IV.pdf". */
export function namaBerkas(b: BukuSibi): string {
  return `${b.judul.replace(/[\\/]/g, "-").replace(/[<>:"|?*]/g, "").slice(0, 120).trim()}.pdf`
}
