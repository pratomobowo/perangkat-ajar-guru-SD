// Gaya dokumen per guru: tampilan Word (lapis 1), kerangka isi (lapis 2), dan Word contoh (lapis 3).
//
// Disimpan di guru/ supaya tidak ditimpa pembaruan paket:
//   guru/gaya-dokumen.json            { "semua": Gaya, "per_dokumen": { "lkpd": Gaya, ... } }
//   guru/template/<Dokumen>.md        kerangka isi (judul dan bagian) yang diikuti asisten saat menulis draf
//   guru/template/<Dokumen>.docx      Word contoh: gaya, kop/header, footer, dan ukuran halamannya dipakai saat ekspor
// Sekolah bisa memberi bawaan dan mengunci sebagian lewat sekolah/kebijakan.json dan sekolah/template/.
// Urutan: bawaan < sekolah < guru (semua) < guru (per dokumen), kecuali bagian yang dikunci sekolah.

import { existsSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { type Kebijakan, Gagal, bacaJson, slug } from "./berkas.ts"

export type Gaya = {
  huruf?: string
  ukuran?: number // pt, isi dokumen
  spasi?: number // 1, 1.15, 1.5, 2
  rata?: "kiri" | "kanan-kiri"
  kertas?: "A4" | "F4"
  orientasi?: "otomatis" | "potret" | "lanskap"
  margin?: { atas?: number; bawah?: number; kiri?: number; kanan?: number } // cm
  kop?: { tampil?: boolean; baris_tambahan?: string[] }
  judul?: { ukuran?: number; rata?: "tengah" | "kiri"; kapital?: boolean }
  tabel?: { warna_kepala?: string; ukuran?: number }
  ttd?: { tampil?: boolean; kepala_sekolah?: boolean }
  nomor_halaman?: { tampil?: boolean; format?: "Halaman X dari Y" | "X" }
}

export type BerkasGaya = { semua?: Gaya; per_dokumen?: Record<string, Gaya> }

export const BAGIAN_GAYA = ["huruf", "ukuran", "spasi", "rata", "kertas", "orientasi", "margin", "kop", "judul", "tabel", "ttd", "nomor_halaman"] as const

/**
 * Kunci dokumen dari nama berkas draf: "2 Modul dan LKPD/Matematika TP5/LKPD" → "lkpd",
 * "4 Administrasi/Jurnal Mengajar 2026-10" → "jurnal-mengajar", "1 Perencanaan/.../2 ATP" → "atp".
 */
export function kunciDokumen(sub: string): string {
  const dasar = sub.split(/[\\/]/).pop()!.replace(/\.(md|docx|xlsx)$/i, "")
  return slug(dasar.replace(/^\d+\s+/, "").replace(/\s+\d{4}([-/]\d{2,4})?$/, "")) || "dokumen"
}

/** Gabung dalam: nilai dari `atas` menimpa `bawah`; objek (margin, kop, ...) digabung per kunci. */
export function gabung(bawah: Gaya, atas: Gaya): Gaya {
  const out: any = { ...bawah }
  for (const [k, v] of Object.entries(atas ?? {})) {
    if (v === undefined || v === null) continue
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...(out[k] ?? {}), ...v } : v
  }
  return out
}

export function aturanSekolah(kebijakan: Kebijakan) {
  return {
    gaya: (kebijakan.gaya_dokumen ?? {}) as Gaya,
    dikunci: (kebijakan.gaya_dikunci ?? []) as string[],
    templateWajib: kebijakan.template_wajib === true,
  }
}

export async function bacaBerkasGaya(akar: string): Promise<BerkasGaya> {
  return bacaJson<BerkasGaya>(akar, "guru/gaya-dokumen.json")
}

/**
 * Gaya yang berlaku untuk satu dokumen, beserta asal tiap lapis (untuk dilaporkan ke guru).
 * Jika jenis dokumen ini memakai Word contoh, Word contoh lebih spesifik daripada gaya umum: gaya sekolah (kecuali yang
 * dikunci) dan gaya guru "semua dokumen" tidak dipakai, sedangkan gaya guru khusus jenis ini tetap menimpanya.
 */
export async function gayaEfektif(akar: string, kunci: string, kebijakan: Kebijakan, adaContoh = false) {
  const sekolah = aturanSekolah(kebijakan)
  const guru = await bacaBerkasGaya(akar)
  const khusus = guru.per_dokumen?.[kunci] ?? {}
  const lapisGuru = gabung(adaContoh ? {} : (guru.semua ?? {}), khusus)
  for (const k of sekolah.dikunci) delete (lapisGuru as any)[k]
  const dariSekolah: any = adaContoh ? Object.fromEntries(Object.entries(sekolah.gaya).filter(([k]) => sekolah.dikunci.includes(k))) : sekolah.gaya
  const asal: string[] = []
  if (Object.keys(dariSekolah).length) asal.push(adaContoh ? "gaya sekolah yang dikunci" : "gaya sekolah")
  if (!adaContoh && Object.keys(guru.semua ?? {}).length) asal.push("gaya guru (semua dokumen)")
  if (Object.keys(khusus).length) asal.push(`gaya guru (${kunci})`)
  return { gaya: gabung(dariSekolah, lapisGuru), asal }
}

/** Template (kerangka .md atau Word contoh .docx) untuk satu dokumen. Template sekolah menang jika diwajibkan. */
export async function cariTemplate(akar: string, kunci: string, ext: "md" | "docx" | "xlsx", kebijakan: Kebijakan) {
  const cari = async (folder: string) => {
    const p = join(akar, folder)
    if (!existsSync(p)) return null
    const f = (await readdir(p)).find((n) => n.toLowerCase().endsWith(`.${ext}`) && !n.startsWith("~$") && kunciDokumen(n) === kunci)
    return f ? `${folder}/${f}` : null
  }
  const sekolah = await cari("sekolah/template")
  const guru = await cari("guru/template")
  if (sekolah && aturanSekolah(kebijakan).templateWajib) return { rel: sekolah, asal: "sekolah (wajib)" }
  if (guru) return { rel: guru, asal: "guru" }
  if (sekolah) return { rel: sekolah, asal: "sekolah" }
  return null
}

const HEX = /^[0-9A-Fa-f]{6}$/
const WARNA: Record<string, string> = { biru: "D9E2F3", abu: "EDEDED", "abu-abu": "EDEDED", hijau: "E2EFDA", kuning: "FFF2CC", merah: "FBE4E4", tanpa: "tanpa" }

/** Memeriksa dan merapikan perubahan gaya dari guru. Melempar Gagal dengan pesan yang bisa disampaikan ke guru. */
export function rapikanGaya(ubah: any): Gaya {
  const g: any = {}
  const salah: string[] = []
  const angka = (v: any, min: number, maks: number, nama: string) => {
    const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v)
    if (!Number.isFinite(n) || n < min || n > maks) salah.push(`${nama} harus angka ${min}–${maks}`)
    return n
  }
  for (const [k, v] of Object.entries(ubah ?? {})) {
    if (!BAGIAN_GAYA.includes(k as any)) { salah.push(`"${k}" bukan pengaturan yang dikenal`); continue }
    switch (k) {
      case "huruf": if (typeof v !== "string" || !v.trim()) salah.push("huruf harus nama font"); else g.huruf = v.trim(); break
      case "ukuran": g.ukuran = angka(v, 8, 20, "ukuran huruf"); break
      case "spasi": g.spasi = angka(v, 1, 3, "spasi"); break
      case "rata": if (v !== "kiri" && v !== "kanan-kiri") salah.push('rata harus "kiri" atau "kanan-kiri"'); else g.rata = v; break
      case "kertas": if (v !== "A4" && v !== "F4") salah.push('kertas harus "A4" atau "F4"'); else g.kertas = v; break
      case "orientasi": if (!["otomatis", "potret", "lanskap"].includes(v as string)) salah.push("orientasi harus otomatis, potret, atau lanskap"); else g.orientasi = v; break
      case "margin": {
        const m: any = {}
        for (const s of ["atas", "bawah", "kiri", "kanan"]) if ((v as any)?.[s] !== undefined) m[s] = angka((v as any)[s], 0.5, 6, `margin ${s} (cm)`)
        g.margin = m
        break
      }
      case "kop": g.kop = { ...(typeof (v as any)?.tampil === "boolean" ? { tampil: (v as any).tampil } : {}), ...(Array.isArray((v as any)?.baris_tambahan) ? { baris_tambahan: (v as any).baris_tambahan.map(String).slice(0, 3) } : {}) }; break
      case "judul": {
        const j: any = {}
        if ((v as any)?.ukuran !== undefined) j.ukuran = angka((v as any).ukuran, 10, 28, "ukuran judul")
        if ((v as any)?.rata) j.rata = (v as any).rata === "kiri" ? "kiri" : "tengah"
        if (typeof (v as any)?.kapital === "boolean") j.kapital = (v as any).kapital
        g.judul = j
        break
      }
      case "tabel": {
        const t: any = {}
        const w = (v as any)?.warna_kepala
        if (w !== undefined) {
          const n = WARNA[String(w).toLowerCase()] ?? String(w).replace(/^#/, "")
          if (n !== "tanpa" && !HEX.test(n)) salah.push("warna kepala tabel: biru, abu, hijau, kuning, merah, tanpa, atau kode #RRGGBB")
          t.warna_kepala = n
        }
        if ((v as any)?.ukuran !== undefined) t.ukuran = angka((v as any).ukuran, 7, 16, "ukuran huruf tabel")
        g.tabel = t
        break
      }
      case "ttd": g.ttd = { ...(typeof (v as any)?.tampil === "boolean" ? { tampil: (v as any).tampil } : {}), ...(typeof (v as any)?.kepala_sekolah === "boolean" ? { kepala_sekolah: (v as any).kepala_sekolah } : {}) }; break
      case "nomor_halaman": g.nomor_halaman = { ...(typeof (v as any)?.tampil === "boolean" ? { tampil: (v as any).tampil } : {}), ...((v as any)?.format === "X" || (v as any)?.format === "Halaman X dari Y" ? { format: (v as any).format } : {}) }; break
    }
  }
  if (salah.length) throw new Gagal(`Pengaturan tidak bisa disimpan: ${salah.join("; ")}.`)
  return g
}

/** Ringkasan gaya dalam bahasa guru. */
export function uraiGaya(g: Gaya): string[] {
  const out: string[] = []
  if (g.huruf || g.ukuran) out.push(`huruf ${g.huruf ?? "(bawaan)"}${g.ukuran ? ` ${g.ukuran} pt` : ""}`)
  if (g.spasi) out.push(`spasi ${g.spasi}`)
  if (g.rata) out.push(g.rata === "kanan-kiri" ? "rata kanan-kiri" : "rata kiri")
  if (g.kertas) out.push(`kertas ${g.kertas}`)
  if (g.orientasi && g.orientasi !== "otomatis") out.push(g.orientasi)
  if (g.margin && Object.keys(g.margin).length) out.push(`margin ${Object.entries(g.margin).map(([k, v]) => `${k} ${v} cm`).join(", ")}`)
  if (g.kop?.tampil === false) out.push("tanpa kop")
  if (g.kop?.baris_tambahan?.length) out.push(`kop tambahan: ${g.kop.baris_tambahan.join(" / ")}`)
  if (g.judul && Object.keys(g.judul).length) out.push(`judul${g.judul.ukuran ? ` ${g.judul.ukuran} pt` : ""}${g.judul.rata ? ` rata ${g.judul.rata}` : ""}${g.judul.kapital === false ? " tidak kapital" : ""}`)
  if (g.tabel?.warna_kepala) out.push(g.tabel.warna_kepala === "tanpa" ? "kepala tabel tanpa warna" : `kepala tabel #${g.tabel.warna_kepala}`)
  if (g.tabel?.ukuran) out.push(`huruf tabel ${g.tabel.ukuran} pt`)
  if (g.ttd?.tampil === false) out.push("tanpa tanda tangan")
  if (g.ttd?.kepala_sekolah === false) out.push("tanda tangan guru saja")
  if (g.nomor_halaman?.tampil === false) out.push("tanpa nomor halaman")
  else if (g.nomor_halaman?.format === "X") out.push('nomor halaman "X"')
  return out
}
