// Ingatan asisten lintas sesi (pola Hermes Agent): ingatan inti yang kecil dan selalu dimuat, plus arsip riwayat yang
// dicari bila perlu.
// - guru/ingatan/tentang-guru.md   : siapa guru, panggilan, kebiasaan, kondisi kelas (batas BATAS.guru karakter)
// - guru/ingatan/catatan-kerja.md  : pekerjaan berjalan dan langkah berikutnya (batas BATAS.kerja karakter)
// - guru/ingatan/pengingat.md      : pengingat bertanggal
// - guru/ingatan/riwayat.db        : arsip SQLite FTS5 (cadangan riwayat.md bila SQLite tidak tersedia)
// Semua berkas Markdown bisa dibuka dan diubah guru di Notepad. Asisten hanya menulis lewat alat `ingat` (izin edit
// folder ini ditolak), supaya batas ukuran, privasi siswa, dan pemeriksaan isi selalu berlaku.

import { mkdir, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { type Kebijakan, Gagal, bacaJson, bacaTeks, jalurAman } from "./berkas.ts"
import { NAMA_BULAN, NAMA_HARI } from "./kalender.ts"
import { bacaDaftarSiswa } from "./siswa.ts"

export const FOLDER_INGATAN = "guru/ingatan"
export const BERKAS = { guru: `${FOLDER_INGATAN}/tentang-guru.md`, kerja: `${FOLDER_INGATAN}/catatan-kerja.md`, pengingat: `${FOLDER_INGATAN}/pengingat.md` } as const
export const BATAS = { guru: 1500, kerja: 2200 } as const
export const MAKS_PENGINGAT = 20
export type Bagian = keyof typeof BERKAS

const JUDUL: Record<Bagian, string> = {
  guru: "# Tentang guru\nDiisi asisten lewat alat `ingat`. Boleh diubah atau dihapus di Notepad, satu catatan per baris \"- \".\n",
  kerja: "# Catatan kerja\nPekerjaan yang sedang berjalan dan langkah berikutnya. Satu catatan per baris \"- \".\n",
  pengingat: "# Pengingat\nFormat: - TTTT-BB-HH — isi pengingat\n",
}

// ---------- Tanggal (waktu lokal laptop guru) ----------
export function tanggalIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const kapital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export function tanggalBaca(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return `${kapital(NAMA_HARI[new Date(y, m - 1, d).getDay()])}, ${d} ${NAMA_BULAN[m]} ${y}`
}
function selisihHari(dari: string, ke: string): number {
  const t = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d) }
  return Math.round((t(ke) - t(dari)) / 86400000)
}

// ---------- Berkas catatan ----------
/** Catatan = baris yang diawali "- " (judul dan keterangan diabaikan). */
export function bacaCatatan(md: string | null): string[] {
  return (md ?? "").split("\n").filter((b) => /^\s*[-*]\s+\S/.test(b)).map((b) => b.replace(/^\s*[-*]\s+/, "").trim())
}
const susun = (bagian: Bagian, catatan: string[]) => `${JUDUL[bagian]}\n${catatan.map((c) => `- ${c}`).join("\n")}${catatan.length ? "\n" : ""}`
const panjang = (catatan: string[]) => catatan.reduce((n, c) => n + c.length, 0)
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()

// Model bisa memanggil `ingat` beberapa kali sekaligus (paralel). Semua perubahan ingatan diantrekan satu per satu
// supaya baca-ubah-tulis tidak saling menimpa, dan berkas ditulis lewat berkas sementara + rename (tidak pernah
// setengah tertulis).
let antrean: Promise<unknown> = Promise.resolve()
export function antre<T>(f: () => Promise<T>): Promise<T> {
  const jalan = antrean.then(f, f)
  antrean = jalan.catch(() => {})
  return jalan
}
async function tulisAtomik(akar: string, rel: string, isi: string) {
  const p = join(akar, jalurAman(rel))
  await mkdir(join(p, ".."), { recursive: true })
  const sementara = `${p}.${process.pid}.${Date.now()}.tmp`
  await writeFile(sementara, isi, "utf8")
  await rename(sementara, p)
}

export async function muatBagian(akar: string, bagian: Bagian): Promise<string[]> {
  return bacaCatatan(await bacaTeks(akar, BERKAS[bagian]))
}
async function simpanBagian(akar: string, bagian: Bagian, catatan: string[]) {
  await tulisAtomik(akar, BERKAS[bagian], susun(bagian, catatan))
}

// ---------- Pemeriksaan isi ----------
const TAK_TERLIHAT = /[​-‏‪-‮⁠-⁤﻿]/
const INJEKSI = [
  /\b(abaikan|lupakan|ignore|disregard)\b.{0,40}\b(instruksi|aturan|perintah|instructions?|rules?|prompts?)\b/i,
  /\b(system prompt|prompt sistem)\b/i,
  /<\/?(system|assistant|user|instructions?)>/i,
  /\b(api[_ -]?key|password|kata sandi|token)\b\s*[:=]/i,
  /\bsk-[A-Za-z0-9_-]{12,}/,
]

/** Menolak isi yang tidak boleh masuk ingatan: karakter tersembunyi, pola injeksi, rahasia, nomor identitas, nama siswa. */
export async function periksaIsi(akar: string, isi: string): Promise<void> {
  const t = isi.trim()
  if (!t) throw new Gagal("Isi catatan kosong.")
  if (t.includes("\n")) throw new Gagal("Satu catatan harus satu baris. Pecah menjadi beberapa catatan.")
  if (t.length > 300) throw new Gagal(`Catatan terlalu panjang (${t.length} karakter, maks 300). Ringkas menjadi satu kalimat.`)
  if (TAK_TERLIHAT.test(t)) throw new Gagal("Catatan berisi karakter tersembunyi; tidak disimpan.")
  if (INJEKSI.some((re) => re.test(t))) throw new Gagal("Catatan berisi perintah ke asisten atau data rahasia (kata sandi, kunci API); tidak disimpan.")
  if (/\b\d{9,16}\b/.test(t.replace(/(\d)[ .-](?=\d)/g, "$1")))
    throw new Gagal("Catatan berisi nomor panjang (NISN/NIK/nomor rekening/telepon?). Ingatan tidak menyimpan nomor identitas.")
  const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
  if (kebijakan.privasi?.nama_ke_ai === true) return
  const siswa = (await bacaDaftarSiswa(akar).catch(() => null)) ?? []
  const n = ` ${norm(t)} `
  const kena = siswa.filter((s) => {
    const k = norm(s.nama).split(" ").filter((x) => x.length > 1)
    if (k.length >= 2 && n.includes(` ${k.join(" ")} `)) return true
    // Dua kata berurutan dari nama siswa (misalnya nama depan + nama belakang) juga dianggap nama.
    return k.slice(0, -1).some((w, i) => n.includes(` ${w} ${k[i + 1]} `))
  })
  if (kena.length)
    throw new Gagal('Catatan memuat nama siswa, sedangkan kebijakan sekolah tidak mengizinkan nama siswa dikirim ke AI. Tulis "Siswa No. <nomor absen>" atau tanpa nama.')
}

// ---------- Ubah ingatan ----------
export type HasilUbah = { pesan: string; catatan: string[] }

function cariSatu(catatan: string[], lama: string): number {
  const q = norm(lama)
  if (!q) throw new Gagal("Tulis potongan teks catatan lama yang ingin diubah/dihapus.")
  const cocok = catatan.map((c, i) => [i, norm(c).includes(q)] as const).filter(([, b]) => b).map(([i]) => i)
  if (!cocok.length) throw new Gagal(`Tidak ada catatan yang memuat "${lama}". Catatan saat ini:\n${catatan.map((c) => `- ${c}`).join("\n") || "(kosong)"}`)
  if (cocok.length > 1) throw new Gagal(`"${lama}" cocok dengan ${cocok.length} catatan; tulis potongan yang lebih khas:\n${cocok.map((i) => `- ${catatan[i]}`).join("\n")}`)
  return cocok[0]
}

function pemakaian(bagian: "guru" | "kerja", catatan: string[]) {
  const n = panjang(catatan)
  return `${Math.round((n / BATAS[bagian]) * 100)}% — ${n}/${BATAS[bagian]} karakter`
}

export function ubahIngatan(akar: string, aksi: "tambah" | "ganti" | "hapus", bagian: "guru" | "kerja", isi?: string, lama?: string): Promise<HasilUbah> {
  return antre(() => ubahIngatanLangsung(akar, aksi, bagian, isi, lama))
}
async function ubahIngatanLangsung(akar: string, aksi: "tambah" | "ganti" | "hapus", bagian: "guru" | "kerja", isi?: string, lama?: string): Promise<HasilUbah> {
  const catatan = await muatBagian(akar, bagian)
  if (aksi === "hapus") {
    const i = cariSatu(catatan, lama ?? isi ?? "")
    const [buang] = catatan.splice(i, 1)
    await simpanBagian(akar, bagian, catatan)
    return { pesan: `Dihapus: "${buang}". (${pemakaian(bagian, catatan)})`, catatan }
  }
  const baru = (isi ?? "").trim().replace(/^[-*]\s+/, "")
  await periksaIsi(akar, baru)
  const sudah = catatan.findIndex((c) => norm(c) === norm(baru))
  if (aksi === "tambah" && sudah >= 0) return { pesan: "Catatan yang sama sudah ada; tidak ditambah lagi.", catatan }
  const hasil = [...catatan]
  if (aksi === "ganti") hasil[cariSatu(catatan, lama ?? "")] = baru
  else hasil.push(baru)
  if (panjang(hasil) > BATAS[bagian])
    throw new Gagal(
      `Ingatan "${bagian === "guru" ? "tentang guru" : "catatan kerja"}" penuh (${pemakaian(bagian, catatan)}; catatan baru ${baru.length} karakter). ` +
        `Ringkas dulu: gabungkan catatan yang mirip dengan aksi "ganti", atau hapus yang sudah tidak berlaku (misalnya pekerjaan yang sudah selesai), lalu simpan lagi. Catatan saat ini:\n${catatan.map((c) => `- ${c}`).join("\n")}`,
    )
  await simpanBagian(akar, bagian, hasil)
  return { pesan: `${aksi === "ganti" ? "Diganti" : "Disimpan"}: "${baru}". (${pemakaian(bagian, hasil)})`, catatan: hasil }
}

// ---------- Pengingat ----------
export type Pengingat = { tanggal: string; isi: string }
export function bacaPengingat(md: string | null): Pengingat[] {
  return bacaCatatan(md)
    .map((c) => c.match(/^(\d{4}-\d{2}-\d{2})\s*[—–:-]+\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ tanggal: m[1], isi: m[2].trim() }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
}
export async function muatPengingat(akar: string) {
  return bacaPengingat(await bacaTeks(akar, BERKAS.pengingat))
}
async function simpanPengingat(akar: string, daftar: Pengingat[]) {
  await simpanBagian(akar, "pengingat", daftar.map((p) => `${p.tanggal} — ${p.isi}`))
}
function muncul(hariIni: string, tanggal: string): string {
  const h = selisihHari(hariIni, tanggal)
  if (h <= 7) return "Akan disampaikan setiap kali Asisten Guru dibuka, mulai sesi berikutnya."
  const [y, m, d] = tanggal.split("-").map(Number)
  return `Akan disampaikan setiap kali Asisten Guru dibuka, mulai ${tanggalBaca(tanggalIso(new Date(y, m - 1, d - 7)))}.`
}
export function ubahPengingat(akar: string, aksi: "tambah" | "hapus", isi?: string, tanggal?: string, hariIni = tanggalIso()): Promise<string> {
  return antre(() => ubahPengingatLangsung(akar, aksi, isi, tanggal, hariIni))
}
async function ubahPengingatLangsung(akar: string, aksi: "tambah" | "hapus", isi?: string, tanggal?: string, hariIni = tanggalIso()): Promise<string> {
  const daftar = await muatPengingat(akar)
  if (aksi === "hapus") {
    const i = cariSatu(daftar.map((p) => `${p.tanggal} — ${p.isi}`), isi ?? "")
    const [p] = daftar.splice(i, 1)
    await simpanPengingat(akar, daftar)
    return `Pengingat dihapus: ${tanggalBaca(p.tanggal)} — ${p.isi}.`
  }
  if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || Number.isNaN(Date.parse(tanggal)))
    throw new Gagal('Pengingat perlu `tanggal` berformat TTTT-BB-HH (misalnya "2026-10-20"). Hitung dari tanggal hari ini bila guru menyebut "besok"/"Senin depan".')
  if (tanggal < hariIni) throw new Gagal(`Tanggal ${tanggal} sudah lewat (hari ini ${hariIni}).`)
  const teks = (isi ?? "").trim()
  await periksaIsi(akar, teks)
  if (daftar.some((p) => p.tanggal === tanggal && norm(p.isi) === norm(teks))) return "Pengingat yang sama sudah ada."
  if (daftar.length >= MAKS_PENGINGAT) throw new Gagal(`Pengingat sudah ${MAKS_PENGINGAT}. Hapus yang sudah selesai dulu.`)
  daftar.push({ tanggal, isi: teks })
  daftar.sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  await simpanPengingat(akar, daftar)
  return `Pengingat disimpan: ${tanggalBaca(tanggal)} — ${teks.replace(/[.\s]+$/, "")}. ${muncul(hariIni, tanggal)} (tidak ada notifikasi saat OpenCode tertutup).`
}

// ---------- Arsip riwayat ----------
type Db = { run(sql: string, ...p: unknown[]): unknown; query(sql: string): { all(...p: unknown[]): any[] }; close(): void }
export const RIWAYAT_DB = `${FOLDER_INGATAN}/riwayat.db`
export const RIWAYAT_MD = `${FOLDER_INGATAN}/riwayat.md`
let sqlite: ((p: string) => Db) | null | undefined

/** Untuk uji: paksa memakai cadangan Markdown (seolah bun:sqlite tidak tersedia). */
export function _tanpaSqlite(ya = true) {
  sqlite = ya ? null : undefined
}

/** bun:sqlite bila tersedia (OpenCode berjalan di Bun); null bila tidak, sehingga riwayat memakai Markdown. */
async function bukaSqlite(): Promise<((p: string) => Db) | null> {
  if (sqlite !== undefined) return sqlite
  try {
    const { Database } = await import("bun:sqlite" as string)
    const uji = new Database(":memory:")
    uji.run("CREATE VIRTUAL TABLE t USING fts5(x)")
    uji.close()
    sqlite = (p: string) => new Database(p)
  } catch {
    sqlite = null
  }
  return sqlite
}

async function denganDb<T>(akar: string, f: (db: Db) => T): Promise<T | null> {
  const buka = await bukaSqlite()
  if (!buka) return null
  await mkdir(join(akar, FOLDER_INGATAN), { recursive: true })
  // Koneksi singkat tanpa WAL: tidak meninggalkan berkas tambahan dan aman bila folder ikut OneDrive.
  const db = buka(join(akar, RIWAYAT_DB))
  try {
    db.run("PRAGMA journal_mode=DELETE")
    db.run("PRAGMA busy_timeout=3000")
    db.run("CREATE VIRTUAL TABLE IF NOT EXISTS riwayat USING fts5(tanggal UNINDEXED, jenis UNINDEXED, isi, tokenize='unicode61 remove_diacritics 2')")
    return f(db)
  } finally {
    db.close()
  }
}

export type Riwayat = { tanggal: string; jenis: string; isi: string }

/** Menambah satu baris ke arsip riwayat. Tidak pernah melempar kesalahan (riwayat bersifat pelengkap). */
export function catatRiwayat(akar: string, jenis: "alat" | "catatan", isi: string, tanggal = tanggalIso()): Promise<boolean> {
  return antre(() => catatRiwayatLangsung(akar, jenis, isi, tanggal))
}
async function catatRiwayatLangsung(akar: string, jenis: "alat" | "catatan", isi: string, tanggal: string): Promise<boolean> {
  const t = isi.replace(/\s+/g, " ").trim().slice(0, 400)
  if (!t) return false
  try {
    const ok = await denganDb(akar, (db) => db.run("INSERT INTO riwayat (tanggal, jenis, isi) VALUES (?, ?, ?)", tanggal, jenis, t))
    if (ok !== null) return true
    const lama = (await bacaTeks(akar, RIWAYAT_MD)) ?? "# Riwayat kerja\n\n"
    await tulisAtomik(akar, RIWAYAT_MD, `${lama}- ${tanggal} [${jenis}] ${t}\n`)
    return true
  } catch {
    return false
  }
}

function kataKunci(q: string): string[] {
  return norm(q).split(" ").filter((w) => w.length >= 2).slice(0, 8)
}

export async function cariRiwayat(akar: string, o: { kata?: string; sejak?: string; sampai?: string; batas?: number }): Promise<Riwayat[]> {
  const batas = Math.min(o.batas ?? 15, 40)
  const sejak = o.sejak ?? "0000-00-00", sampai = o.sampai ?? "9999-99-99"
  const kata = kataKunci(o.kata ?? "")
  const hasil = await denganDb(akar, (db) => {
    if (kata.length) {
      const fts = kata.map((w) => `"${w}"*`).join(" OR ")
      return db.query("SELECT tanggal, jenis, isi FROM riwayat WHERE riwayat MATCH ? AND tanggal >= ? AND tanggal <= ? ORDER BY bm25(riwayat), rowid DESC LIMIT ?").all(fts, sejak, sampai, batas)
    }
    return db.query("SELECT tanggal, jenis, isi FROM riwayat WHERE tanggal >= ? AND tanggal <= ? ORDER BY rowid DESC LIMIT ?").all(sejak, sampai, batas)
  }).catch(() => null)
  if (hasil) return hasil as Riwayat[]
  // Cadangan Markdown: pencarian kata sederhana.
  const baris = bacaCatatan(await bacaTeks(akar, RIWAYAT_MD))
    .map((b) => b.match(/^(\d{4}-\d{2}-\d{2}) \[(\w+)\] (.+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ tanggal: m[1], jenis: m[2], isi: m[3] }))
    .filter((r) => r.tanggal >= sejak && r.tanggal <= sampai)
  const skor = (r: Riwayat) => kata.filter((w) => norm(r.isi).includes(w)).length
  return (kata.length ? baris.filter((r) => skor(r) > 0).sort((a, b) => skor(b) - skor(a)) : baris.reverse()).slice(0, batas)
}

// ---------- Blok ingatan untuk prompt ----------
/** Aturan guru berstatus aktif dari guru/preferensi.md (format skill umpan-balik-guru). */
export async function aturanAktif(akar: string): Promise<string[]> {
  const md = await bacaTeks(akar, "guru/preferensi.md")
  if (!md) return []
  return md
    .split(/^## /m)
    .slice(1)
    .filter((b) => /^Status\s*:\s*aktif/im.test(b))
    .map((b) => {
      const no = b.match(/Aturan\s+(#\d+)/)?.[1] ?? ""
      const cakupan = b.match(/^Cakupan\s*:\s*(.+)$/m)?.[1]?.trim()
      const aturan = b.match(/^Aturan\s*:\s*(.+)$/m)?.[1]?.trim()
      return aturan ? `${no} ${aturan}${cakupan ? ` (${cakupan})` : ""}`.trim() : ""
    })
    .filter(Boolean)
}

export async function blokIngatan(akar: string, hariIni = tanggalIso(), jam = new Date()): Promise<string> {
  const [guru, kerja, pengingat, aturan] = await Promise.all([muatBagian(akar, "guru"), muatBagian(akar, "kerja"), muatPengingat(akar), aturanAktif(akar)])
  const out = [
    "# INGATAN ASISTEN (dimuat otomatis dari sesi-sesi sebelumnya — tidak perlu membaca berkasnya)",
    `Hari ini: ${tanggalBaca(hariIni)}, sesi dimulai pukul ${String(jam.getHours()).padStart(2, "0")}.${String(jam.getMinutes()).padStart(2, "0")} (sapa sesuai waktu: pagi/siang/sore/malam).`,
    "",
    `## Tentang guru (${pemakaian("guru", guru)})`,
    ...(guru.length ? guru.map((c) => `- ${c}`) : ["- (belum ada)"]),
    "",
    `## Catatan kerja (${pemakaian("kerja", kerja)})`,
    ...(kerja.length ? kerja.map((c) => `- ${c}`) : ["- (belum ada)"]),
  ]
  if (aturan.length) out.push("", "## Aturan tetap dari guru (guru/preferensi.md)", ...aturan.map((a) => `- ${a}`))
  const dekat = pengingat
    .map((p) => ({ ...p, h: selisihHari(hariIni, p.tanggal) }))
    .filter((p) => p.h <= 7)
  if (dekat.length) {
    out.push("", "## Pengingat (sampaikan ke guru di awal percakapan)")
    for (const p of dekat)
      out.push(`- ${p.h < 0 ? `TERLEWAT ${-p.h} hari` : p.h === 0 ? "HARI INI" : p.h === 1 ? "BESOK" : `${p.h} hari lagi`} (${tanggalBaca(p.tanggal)}): ${p.isi}`)
  }
  out.push(
    "",
    "Pakai ingatan ini secara wajar (sapa sesuai panggilan, lanjutkan pekerjaan yang tercatat). Simpan hal baru yang perlu diingat lewat alat `ingat`; cari pekerjaan/percakapan lama lewat alat `cari_ingatan`.",
  )
  return out.join("\n")
}

