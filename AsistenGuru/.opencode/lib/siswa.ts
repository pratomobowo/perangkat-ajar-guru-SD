// Daftar Siswa: satu sumber nama murid untuk semua Excel administrasi (daftar hadir, buku nilai, penilaian kokurikuler).
// Guru cukup menaruh berkas yang sudah ada (ekspor Dapodik, format e-Rapor, daftar hadir lama yang sudah berisi nama);
// alat ini mengenalinya, menyaring rombel kelas guru, lalu menyimpannya di hasil/4 Administrasi/Daftar Siswa.xlsx.
// Berkas di folder itu dikunci dari asisten (opencode.json): nama hanya dibaca dan ditulis oleh alat di komputer guru,
// asisten hanya menerima jumlah. Fungsi di sini TIDAK BOLEH mengembalikan nama ke teks yang dibaca asisten.

import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, rename, stat } from "node:fs/promises"
import { join } from "node:path"
import { ISI, kopExcel } from "./administrasi.ts"
import { type Kebijakan, type Profil, Gagal, bacaJson, jalurAman, tulis } from "./berkas.ts"
import { FOLDER } from "./dokumen.ts"
import { bacaTabelXlsx } from "./masukan.ts"
import { G, type Sel, buatXlsx } from "./xlsx.ts"

export type Siswa = { nama: string; nisn?: string; nis?: string; jk?: "L" | "P" }
export const DAFTAR_SISWA = `hasil/${FOLDER.administrasi}/Daftar Siswa.xlsx`
export const AWALAN_SUMBER = "Sumber Daftar Siswa - "

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9/]/g, "")
const KEPALA = {
  nama: ["nama", "namasiswa", "namapesertadidik", "namalengkap", "namamurid", "namapd", "namalengkapsiswa", "namalengkappesertadidik"],
  nisn: ["nisn"],
  nis: ["nis", "nipd", "noinduk", "nomorinduk", "noindukpesertadidik", "nisnipd"],
  jk: ["jk", "l/p", "lp", "jeniskelamin", "kelamin", "gender"],
  rombel: ["rombel", "rombelsaatini", "rombonganbelajar", "namarombel", "kelas"],
  no: ["no", "nomor", "noabsen", "nourut", "noabs"],
}
const PENUTUP = /^(jumlah|rata|keterangan|catatan|tertinggi|terendah|kepala|wali|guru|mengetahui|total|ttd|tanda)/i
const ROMAWI: Record<string, string> = { vi: "6", iv: "4", v: "5", iii: "3", ii: "2", i: "1" }

/** "Kelas IV A" / "4 A" / "4A" → "4a". */
export function normRombel(s: string): string {
  let t = String(s).toLowerCase().replace(/kelas|rombel|kls/g, " ").trim()
  t = t.replace(/^(vi|iv|v|iii|ii|i)\b/, (m) => ROMAWI[m])
  return t.replace(/[^a-z0-9]/g, "")
}

/** Menemukan tabel daftar siswa di lembar-lembar tabel (baris × kolom teks). null bila bukan daftar siswa. */
export function kenaliDaftar(lembar: { nama: string; sel: string[][] }[]): { siswa: (Siswa & { rombel?: string })[]; adaRombel: boolean } | null {
  let terbaik: { siswa: (Siswa & { rombel?: string })[]; adaRombel: boolean } | null = null
  for (const { sel } of lembar) {
    for (let r = 0; r < Math.min(sel.length, 40); r++) {
      const kep = (sel[r] ?? []).map(norm)
      const cari = (daftar: string[]) => kep.findIndex((x) => daftar.includes(x))
      const kNama = cari(KEPALA.nama)
      if (kNama < 0) continue
      const kNisn = cari(KEPALA.nisn), kNis = cari(KEPALA.nis), kJk = cari(KEPALA.jk), kNo = cari(KEPALA.no)
      let kRombel = cari(KEPALA.rombel)
      if (kRombel === kNama) kRombel = -1
      // "Nama" saja terlalu umum (bisa daftar guru): wajib ada penanda murid.
      const jelasMurid = kep[kNama] !== "nama" && kep[kNama] !== "namalengkap"
      if (!jelasMurid && kNisn < 0 && kNis < 0) continue
      const siswa: (Siswa & { rombel?: string })[] = []
      for (let i = r + 1; i < sel.length; i++) {
        const b = sel[i] ?? []
        const nama = String(b[kNama] ?? "").replace(/\s+/g, " ").trim()
        if (!nama) continue
        if (PENUTUP.test(nama)) break
        if (!/[a-z]/i.test(nama) || nama.length > 80 || KEPALA.nama.includes(norm(nama))) continue
        if (kNo >= 0 && b[kNo] && !/^\d+(\.0+)?$/.test(String(b[kNo]).trim())) continue
        const s: Siswa & { rombel?: string } = { nama }
        const nisn = String(b[kNisn] ?? "").replace(/\D/g, "")
        if (kNisn >= 0 && nisn) s.nisn = nisn.length === 9 ? `0${nisn}` : nisn
        if (kNis >= 0 && String(b[kNis] ?? "").trim()) s.nis = String(b[kNis]).trim()
        const jk = norm(b[kJk])
        if (kJk >= 0 && jk) s.jk = jk.startsWith("l") ? "L" : jk.startsWith("p") ? "P" : undefined
        if (!s.jk) delete s.jk
        if (kRombel >= 0 && String(b[kRombel] ?? "").trim()) s.rombel = String(b[kRombel]).trim()
        siswa.push(s)
      }
      if (siswa.length && (!terbaik || siswa.length > terbaik.siswa.length)) terbaik = { siswa, adaRombel: kRombel >= 0 }
      break
    }
  }
  return terbaik
}

/** CSV/TSV sederhana → satu "lembar". */
function tabelCsv(teks: string): { nama: string; sel: string[][] }[] {
  const baris = teks.replace(/^﻿/, "").split(/\r?\n/).filter((x) => x.trim())
  const pemisah = [";", "\t", ","].map((p) => [p, baris[0]?.split(p).length ?? 0] as const).sort((a, b) => b[1] - a[1])[0][0]
  return [{ nama: "csv", sel: baris.map((b) => b.split(pemisah).map((x) => x.replace(/^"|"$/g, "").trim())) }]
}

/** Membaca berkas (xlsx/csv) dan mengembalikan daftar siswa bila berkas itu daftar siswa; null bila bukan. */
export async function bacaSumber(p: string): Promise<ReturnType<typeof kenaliDaftar>> {
  const n = p.toLowerCase()
  if (n.endsWith(".xlsx")) return kenaliDaftar(bacaTabelXlsx(new Uint8Array(await readFile(p)), 3000, 40))
  if (n.endsWith(".csv")) return kenaliDaftar(tabelCsv(await readFile(p, "utf8")))
  return null
}

/** Menyaring rombel kelas guru bila sumber berisi banyak rombel (ekspor Dapodik satu sekolah). */
export function saringRombel(d: NonNullable<ReturnType<typeof kenaliDaftar>>, profil: Profil, rombel?: string): Siswa[] {
  const ada = [...new Set(d.siswa.map((s) => s.rombel).filter(Boolean))] as string[]
  if (!d.adaRombel || ada.length <= 1) return d.siswa.map(({ rombel: _r, ...s }) => s)
  const target = rombel ?? profil.rombel
  const pilih = target ? ada.filter((r) => normRombel(r) === normRombel(target)) : ada.filter((r) => normRombel(r).match(/^\d+/)?.[0] === String(profil.kelas))
  if (pilih.length !== 1) {
    const hitung = ada.map((r) => `${r} (${d.siswa.filter((s) => s.rombel === r).length} siswa)`).join(", ")
    throw new Gagal(`Berkas berisi beberapa rombel: ${hitung}. Tanyakan rombel guru (misalnya "4A"), simpan di guru/profil.json sebagai "rombel", lalu panggil daftar_siswa lagi dengan \`rombel\`.`)
  }
  return d.siswa.filter((s) => s.rombel === pilih[0]).map(({ rombel: _r, ...s }) => s)
}

/** Isi Daftar Siswa saat ini (dibaca alat dari Excel yang mungkin sudah diubah guru), atau null. */
export async function bacaDaftarSiswa(akar: string): Promise<Siswa[] | null> {
  const p = join(akar, jalurAman(DAFTAR_SISWA))
  if (!existsSync(p)) return null
  const d = kenaliDaftar(bacaTabelXlsx(new Uint8Array(await readFile(p)), 300, 10))
  return d?.siswa.length ? d.siswa.map(({ rombel: _r, ...s }) => s) : null
}

export async function simpanDaftarSiswa(akar: string, siswa: Siswa[], sumber: string) {
  const profil = await bacaJson<Profil>(akar, "guru/profil.json")
  const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
  const baris: Sel[][] = []
  const gabung: string[] = []
  kopExcel(baris, gabung, 5, kebijakan.nama_sekolah ?? profil.sekolah, "DAFTAR SISWA", `Kelas ${profil.rombel ?? profil.kelas}  ·  Tahun Ajaran ${profil.tahun_ajaran ?? ""}`)
  baris.push(["No", "NISN", "NIS", "Nama Siswa", "L/P"].map((v) => ({ v, s: G.kepala })))
  siswa.forEach((s, i) => baris.push([{ v: i + 1, s: G.tengah }, { v: s.nisn ?? "", s: G.selInput }, { v: s.nis ?? "", s: G.selInput }, { v: s.nama, s: G.selInput }, { v: s.jk ?? "", s: G.selInput }]))
  baris.push([])
  baris.push([{ v: `Dibuat otomatis dari: ${sumber}. Boleh diubah langsung di sini (tambah/hapus baris); Excel daftar hadir, nilai, dan kokurikuler berikutnya memakai daftar ini.`, s: G.catatan }, ...ISI(4, G.catatan)])
  gabung.push(`A${baris.length}:E${baris.length}`)
  await tulis(akar, DAFTAR_SISWA, buatXlsx([{ nama: "Daftar Siswa", baris, gabung, lebar: [5, 14, 12, 38, 6], beku: { baris: baris.length - siswa.length - 2, kolom: 0 } }]))
  // Jumlah (bukan nama) disimpan di profil supaya alat lain tahu banyak baris.
  const p = join(akar, "guru/profil.json")
  if (existsSync(p)) {
    const prof = JSON.parse((await readFile(p, "utf8")).replace(/^﻿/, ""))
    if (prof.jumlah_siswa !== siswa.length) {
      prof.jumlah_siswa = siswa.length
      await tulis(akar, "guru/profil.json", JSON.stringify(prof, null, 2) + "\n")
    }
  }
}

/** Ringkasan tanpa nama: jumlah, L/P, kelengkapan NISN. */
export function ringkas(siswa: Siswa[]): string {
  const l = siswa.filter((s) => s.jk === "L").length, p = siswa.filter((s) => s.jk === "P").length
  const nisn = siswa.filter((s) => s.nisn).length
  return `${siswa.length} siswa${l + p ? ` (${l} L, ${p} P)` : ""}${nisn ? `, NISN ${nisn}/${siswa.length}` : ""}`
}

/** Selisih dua daftar (jumlah saja). */
export function selisih(lama: Siswa[], baru: Siswa[]) {
  const kunci = (s: Siswa) => s.nisn || norm(s.nama)
  const a = new Set(lama.map(kunci)), b = new Set(baru.map(kunci))
  return { tambah: [...b].filter((x) => !a.has(x)).length, hilang: [...a].filter((x) => !b.has(x)).length }
}

/** Pindahkan berkas sumber ke folder administrasi yang terkunci dari asisten. */
export async function amankanSumber(akar: string, p: string): Promise<string> {
  const nama = p.split(/[\\/]/).pop()!
  let rel = `hasil/${FOLDER.administrasi}/${AWALAN_SUMBER}${nama}`
  for (let i = 2; existsSync(join(akar, jalurAman(rel))); i++) rel = `hasil/${FOLDER.administrasi}/${AWALAN_SUMBER}${nama.replace(/(\.\w+)$/, ` (${i})$1`)}`
  await mkdir(join(akar, "hasil", FOLDER.administrasi), { recursive: true })
  await rename(p, join(akar, jalurAman(rel)))
  return rel
}

/**
 * Daftar siswa untuk mengisi Excel: Daftar Siswa bila ada; bila belum, dibuat otomatis dari Excel administrasi lama
 * yang sudah berisi nama (daftar hadir/buku nilai terbaru). null bila belum ada sumber sama sekali.
 */
export async function pastikanDaftarSiswa(akar: string): Promise<{ siswa: Siswa[]; baru?: string } | null> {
  const ada = await bacaDaftarSiswa(akar)
  if (ada) return { siswa: ada }
  const dir = join(akar, "hasil", FOLDER.administrasi)
  if (!existsSync(dir)) return null
  const calon = []
  for (const f of await readdir(dir)) {
    if (!f.endsWith(".xlsx") || f.startsWith("~$") || f === "Daftar Siswa.xlsx") continue
    calon.push({ f, t: (await stat(join(dir, f))).mtimeMs })
  }
  for (const { f } of calon.sort((a, b) => b.t - a.t)) {
    try {
      const d = await bacaSumber(join(dir, f))
      if (!d || d.siswa.length < 2) continue
      const siswa = d.siswa.map(({ rombel: _r, ...s }) => s)
      await simpanDaftarSiswa(akar, siswa, f)
      return { siswa, baru: f }
    } catch {}
  }
  return null
}
