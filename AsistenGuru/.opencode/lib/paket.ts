// Versi paket dan pembaruan dari rilis GitHub.
// Aturan yang sama dipakai pasang.ps1 dan pasang.sh di akar repositori:
// - .opencode/ dan berkas paket di akar (AGENTS.md, opencode.json, panduan, VERSI.md) diganti versi baru;
//   berkas lama dicadangkan dulu di .cadangan/.
// - sekolah/ hanya ditambah berkas yang belum ada (isian sekolah tidak pernah ditimpa).
// - guru/ dan hasil/ tidak pernah disentuh.

import { existsSync } from "node:fs"
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { Gagal } from "./berkas.ts"
import { bacaZip } from "./unzip.ts"

export const REPO = "pratomobowo/perangkat-ajar-guru-SD"
const DIABAIKAN = /^\.opencode\/(node_modules\/|package\.json$|package-lock\.json$|bun\.lock$|\.gitignore$)/
const SIMPAN_CADANGAN = 3

export type InfoPaket = { nama: string; versi: string; repo: string }

export async function paketTerpasang(akar: string): Promise<InfoPaket | null> {
  const p = join(akar, ".opencode/paket.json")
  if (!existsSync(p)) return null
  try {
    return JSON.parse(await readFile(p, "utf8"))
  } catch {
    return null
  }
}

/** -1, 0, atau 1 untuk versi "a.b.c" (awalan v dan akhiran -dev diabaikan; -dev dianggap lebih lama). */
export function bandingVersi(a: string, b: string): number {
  const urai = (s: string) => {
    const m = s.replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)(-.+)?$/)
    return m ? [+m[1], +m[2], +m[3], m[4] ? 0 : 1] : [0, 0, 0, 0]
  }
  const x = urai(a)
  const y = urai(b)
  for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1
  return 0
}

/** Tag rilis terbaru (vX.Y.Z) di GitHub. */
export async function rilisTerbaru(signal?: AbortSignal): Promise<{ tag: string; versi: string; zip: string }> {
  let res: Response
  try {
    res = await fetch(`https://api.github.com/repos/${REPO}/tags?per_page=100`, {
      headers: { accept: "application/vnd.github+json", "user-agent": "asisten-guru" },
      signal,
    })
  } catch {
    throw new Gagal("Tidak bisa menghubungi GitHub. Periksa koneksi internet, lalu coba lagi.")
  }
  if (!res.ok) throw new Gagal(`GitHub menolak permintaan (kode ${res.status}). Coba lagi beberapa saat lagi.`)
  const tags = ((await res.json()) as { name: string }[]).map((t) => t.name).filter((n) => /^v\d+\.\d+\.\d+$/.test(n))
  if (!tags.length) throw new Gagal("Belum ada rilis Asisten Guru di GitHub.")
  const tag = tags.sort((a, b) => bandingVersi(b, a))[0]
  return { tag, versi: tag.slice(1), zip: `https://github.com/${REPO}/archive/refs/tags/${tag}.zip` }
}

export async function unduh(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  let res: Response
  try {
    res = await fetch(url, { headers: { "user-agent": "asisten-guru" }, signal })
  } catch {
    throw new Gagal("Gagal mengunduh paket. Periksa koneksi internet, lalu coba lagi.")
  }
  if (!res.ok) throw new Gagal(`Gagal mengunduh paket (kode ${res.status}).`)
  return new Uint8Array(await res.arrayBuffer())
}

/** Isi folder AsistenGuru di dalam ZIP rilis, dengan jalur relatif terhadap folder itu. */
export function isiPaket(zip: Uint8Array): Map<string, Uint8Array> {
  const semua = bacaZip(zip)
  const penanda = [...semua.keys()].find((n) => /(^|\/)AsistenGuru\/opencode\.json$/.test(n))
  if (!penanda) throw new Gagal("Arsip yang diunduh bukan paket Asisten Guru.")
  const awalan = penanda.slice(0, -"opencode.json".length)
  const out = new Map<string, Uint8Array>()
  for (const [nama, data] of semua) {
    if (!nama.startsWith(awalan)) continue
    const rel = nama.slice(awalan.length)
    if (!rel || rel.split("/").some((b) => b === ".." || b === "") || /^[a-zA-Z]:/.test(rel)) continue
    out.set(rel, data)
  }
  return out
}

/** Berkas di akar folder yang dimiliki paket (selain itu di akar tidak pernah dihapus). */
export const BERKAS_AKAR = ["AGENTS.md", "opencode.json", "PANDUAN-GURU.md", "README-PASANG.md", "VERSI.md"]
const milikPaket = (rel: string) => rel.startsWith(".opencode/") || BERKAS_AKAR.includes(rel)

async function daftarBerkas(akar: string, rel: string): Promise<string[]> {
  const p = join(akar, rel)
  if (!existsSync(p)) return []
  const out: string[] = []
  for (const e of await readdir(p, { withFileTypes: true })) {
    const r = `${rel}/${e.name}`
    if (DIABAIKAN.test(r)) continue
    if (e.isDirectory()) out.push(...(await daftarBerkas(akar, r)))
    else out.push(r)
  }
  return out
}

export type HasilPasang = { ditulis: number; dihapus: number; sekolahBaru: string[]; cadangan: string | null }

/** Memasang atau memperbarui paket di `akar` dari isi ZIP rilis. */
export async function terapkanPaket(akar: string, isi: Map<string, Uint8Array>, versiLama: string | null): Promise<HasilPasang> {
  await mkdir(akar, { recursive: true })
  const baru = [...isi.keys()]
  const lama = [...(await daftarBerkas(akar, ".opencode")), ...BERKAS_AKAR.filter((f) => existsSync(join(akar, f)))]

  // Cadangkan berkas paket lama (bukan data guru/sekolah) sebelum diganti.
  let cadangan: string | null = null
  if (lama.length) {
    const d = new Date()
    const cap = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`
    cadangan = `.cadangan/${cap} v${versiLama ?? "lama"}`
    for (const rel of lama) {
      const tujuan = join(akar, cadangan, rel)
      await mkdir(dirname(tujuan), { recursive: true })
      await copyFile(join(akar, rel), tujuan)
    }
    const semua = existsSync(join(akar, ".cadangan")) ? (await readdir(join(akar, ".cadangan"))).sort() : []
    for (const tua of semua.slice(0, Math.max(0, semua.length - SIMPAN_CADANGAN)))
      await rm(join(akar, ".cadangan", tua), { recursive: true, force: true })
  }

  let ditulis = 0
  const sekolahBaru: string[] = []
  for (const [rel, data] of isi) {
    const p = join(akar, rel)
    if (rel.startsWith("guru/") || rel.startsWith("hasil/")) {
      await mkdir(dirname(p), { recursive: true })
      if (!existsSync(p)) await writeFile(p, data)
      continue
    }
    if (!milikPaket(rel) && rel.includes("/")) {
      if (existsSync(p)) continue
      sekolahBaru.push(rel)
    }
    await mkdir(dirname(p), { recursive: true })
    await writeFile(p, data)
    ditulis++
  }

  let dihapus = 0
  for (const rel of lama) {
    if (baru.includes(rel)) continue
    await rm(join(akar, rel), { force: true })
    dihapus++
  }
  await hapusFolderKosong(join(akar, ".opencode"))
  return { ditulis, dihapus, sekolahBaru, cadangan }
}

async function hapusFolderKosong(p: string) {
  if (!existsSync(p) || !(await stat(p)).isDirectory()) return
  for (const e of await readdir(p)) await hapusFolderKosong(join(p, e))
  if (!(await readdir(p)).length) await rm(p, { recursive: true, force: true })
}
