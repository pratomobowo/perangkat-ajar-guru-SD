// Uji aturan wajib: setiap Excel bawaan bisa diganti format sekolah atau format guru (templat), lalu diisi otomatis
// tanpa mengubah tampilan dan rumus; data yang diisi guru di format itu tetap terbaca oleh analisis/rekap.
// Pakai: cd uji-e2e/fixture && bun uji-format.ts
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { bacaTabelXlsx } from "../../AsistenGuru/.opencode/lib/masukan.ts"
import { bacaZip } from "../../AsistenGuru/.opencode/lib/unzip.ts"
import { G, buatXlsx } from "../../AsistenGuru/.opencode/lib/xlsx.ts"
import { buatZip } from "../../AsistenGuru/.opencode/lib/zip.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i.slice(0, 1500).replace(/\n/g, "\n    ")}` : ""}`); if (!b) gagal++ }
const NAMA = ["Andi Pratama", "Bunga Lestari", "Andika Putra", "Dewi Anggraini"]
const td = new TextDecoder()
const xmlLembar = (p: string, i = 1) => td.decode(bacaZip(new Uint8Array(readFileSync(p))).get(`xl/worksheets/sheet${i}.xml`)!)
const sel = (p: string, i = 0) => bacaTabelXlsx(new Uint8Array(readFileSync(p)), 60, 60)[i].sel
function isiSel(p: string, isi: Record<string, number | string>, lembar = 1) {
  const z = bacaZip(new Uint8Array(readFileSync(p))); const o: Record<string, any> = {}; for (const [k, v] of z) o[k] = v
  let x = td.decode(z.get(`xl/worksheets/sheet${lembar}.xml`)!)
  for (const [ref, v] of Object.entries(isi)) {
    const re = new RegExp(`<c r="${ref}"(?:[^>]*?/>|[^>]*?>[\\s\\S]*?</c>)`)
    if (!re.test(x)) throw new Error(`sel ${ref} tidak ada`)
    x = x.replace(re, typeof v === "number" ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`)
  }
  o[`xl/worksheets/sheet${lembar}.xml`] = x; writeFileSync(p, buatZip(o))
}
const k = (v: string) => ({ v, s: G.kepala })
const kosong = (n: number) => Array(n).fill({ v: "", s: G.tengahInput })

/** Format daftar hadir sekolah: judul berpenanda, NO | NAMA SISWA | L/P | 1..31 | S I A (rumus COUNTIF). */
function formatHadir() {
  const baris: any[][] = [[{ v: "DAFTAR HADIR SISWA BULAN {{bulan}} {{tahun}} — KELAS {{rombel}}", s: G.judul }], [], [k("NO"), k("NAMA SISWA"), k("L/P"), ...Array.from({ length: 31 }, (_, i) => k(String(i + 1))), k("S"), k("I"), k("A")]]
  for (let r = 4; r <= 9; r++) baris.push([{ v: "", s: G.tengahInput }, { v: "", s: G.selInput }, ...kosong(32), { f: `COUNTIF(D${r}:AH${r},"S")`, s: G.tengah }, { f: `COUNTIF(D${r}:AH${r},"I")`, s: G.tengah }, { f: `COUNTIF(D${r}:AH${r},"A")`, s: G.tengah }])
  return buatXlsx([{ nama: "Absen", baris, gabung: ["A1:AK1"] }])
}
/** Format buku nilai sekolah: NO | NAMA | NISN | TP1..TP3 | STS | SAS | NA (rumus). */
function formatNilai() {
  const baris: any[][] = [[{ v: "BUKU NILAI {{mapel}} SEMESTER {{semester}}", s: G.judul }], [{ v: "TP1: {{tp_1}}", s: G.catatan }], [k("NO"), k("NAMA"), k("NISN"), k("TP1"), k("TP2"), k("TP3"), k("STS"), k("SAS"), k("NA")]]
  for (let r = 4; r <= 8; r++) baris.push([{ v: "", s: G.tengahInput }, { v: "", s: G.selInput }, ...kosong(6), { f: `IFERROR(ROUND(AVERAGE(D${r}:H${r}),0),"")`, s: G.tengah }])
  return buatXlsx([{ nama: "Nilai", baris }])
}

const akar = mkdtempSync(join(tmpdir(), "asisten-format-"))
try {
  cpSync(join(SINI, "../../AsistenGuru"), akar, { recursive: true })
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  cpSync(join(SINI, "sekolah/kebijakan.json"), join(akar, "sekolah/kebijakan.json"))
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => ({}) } })
  const keluaran: string[] = []
  const jalan = async (n: string, a: any = {}) => { const t = (await alat[n].execute(a, {})).content as string; keluaran.push(t); return t }
  const adm = join(akar, "hasil/4 Administrasi")
  const terbaru = (awal: string) => join(adm, readdirSync(adm).filter((x) => x.startsWith(awal)).sort().pop()!)

  writeFileSync(join(akar, "guru/masukan/daftar.xlsx"), buatXlsx([{ nama: "S", baris: [["No", "Nama Siswa", "NISN", "L/P"], ...NAMA.map((n, i) => [i + 1, n, `012345671${i}`, i % 2 ? "P" : "L"])].map((b) => b.map((v) => ({ v }))) }]))
  await jalan("baca_masukan")
  await jalan("susun_perencanaan", { mapel: "matematika" })

  // ---------- Format daftar hadir dari sekolah ----------
  writeFileSync(join(akar, "guru/masukan/Format Absen Sekolah.xlsx"), formatHadir())
  const m = await jalan("baca_masukan")
  cek("baca_masukan: format kosong dikenali, ditebak Daftar Hadir, disarankan simpan_template_excel", m.includes("FORMAT EXCEL KOSONG") && m.includes("Daftar Hadir") && m.includes("simpan_template_excel"), m)
  const s1 = await jalan("simpan_template_excel", { berkas: "guru/masukan/Format Absen Sekolah.xlsx", dokumen: "Daftar Hadir" })
  cek("simpan_template_excel: dikenali NAMA, L/P, 31 kolom tanggal, S/I/A; penanda bulan/tahun/rombel", s1.includes("guru/template/Daftar Hadir.xlsx") && s1.includes("NAMA") && s1.includes("31 kolom tanggal") && s1.includes("{{bulan}}"), s1)
  const a1 = await jalan("buat_absensi_excel", { bulan: 10 })
  const fH = terbaru("Daftar Hadir Kelas 4 2026-10")
  const sh = sel(fH)
  cek("daftar hadir mengikuti format sekolah: judul terisi, nama + L/P terisi, rumus COUNTIF tetap", a1.includes("Mengikuti format guru") && sh[0][0] === "DAFTAR HADIR SISWA BULAN Oktober 2026 — KELAS 4" && sh[3][1] === NAMA[0] && sh[3][2] === "L" && sh[4][2] === "P" && sh[3][0] === "1" && (xmlLembar(fH).match(/COUNTIF/g) ?? []).length === 18, JSON.stringify(sh.slice(0, 5)) + "\n" + a1)
  cek("laporan alat: kolom tanggal diringkas, judul dokumen tidak dikira judul kolom", a1.includes("31 kolom tanggal harian") && !a1.includes("{{rombel}}") && !/, S, I, A/.test(a1), a1)
  // Guru mengisi kehadiran di format sekolah → analisis siswa tetap membacanya.
  isiSel(fH, { D4: "S", E4: "S", F4: "I", D5: "A" })
  const an = await jalan("analisis_siswa", { siswa: "Andi Pratama" })
  cek("analisis_siswa membaca daftar hadir berformat sekolah (sakit 2, izin 1)", /\| 2 \| 1 \| 0 \|/.test(an), an)

  // ---------- Format buku nilai sekolah (khusus mapel) ----------
  writeFileSync(join(akar, "guru/masukan/Nilai Sekolah.xlsx"), formatNilai())
  const s2 = await jalan("simpan_template_excel", { berkas: "guru/masukan/Nilai Sekolah.xlsx", dokumen: "Buku Nilai Matematika" })
  const a2 = await jalan("buat_nilai_excel", { mapel: "matematika", semester: 1 })
  const fN = terbaru("Buku Nilai Matematika")
  const sn = sel(fN)
  cek("buku nilai mengikuti format sekolah khusus mapel: judul {{mapel}}/{{semester}}, {{tp_1}}, nama + NISN terisi, rumus NA tetap", s2.includes("TP ×3") && a2.includes("Mengikuti format") && sn[0][0] === "BUKU NILAI Matematika SEMESTER 1" && /^TP1: TP1 /.test(sn[1][0]) && sn[3][1] === NAMA[0] && sn[3][2] === "0123456710" && (xmlLembar(fN).match(/AVERAGE/g) ?? []).length === 5, JSON.stringify(sn.slice(0, 5)))
  isiSel(fN, { D4: 80, E4: 90, F4: 70, G4: 85, D5: 60, E5: 65, F5: 55, G5: 62 })
  const an2 = await jalan("analisis_siswa", { siswa: "Bunga Lestari" })
  cek("analisis_siswa membaca buku nilai berformat sekolah (TP1 60, STS 62)", an2.includes("Siswa No. 2") && /TP1[^\n]*60/.test(an2) && an2.includes("62"), an2)

  // ---------- Format guru dari Excel bawaan yang sudah diubah (berisi nama) ----------
  const s3 = await jalan("simpan_template_excel", { berkas: `hasil/4 Administrasi/${fH.split("/").pop()}`, dokumen: "Daftar Hadir" })
  const tpl = join(akar, "guru/template/Daftar Hadir.xlsx")
  cek("format dari berkas berisi nama: nama dikosongkan sebelum disimpan, format lama dicadangkan", s3.includes("dikosongkan") && s3.includes("dicadangkan") && !NAMA.some((n) => readFileSync(tpl).includes(Buffer.from(n))) && (xmlLembar(tpl).match(/COUNTIF/g) ?? []).length === 18, s3)

  // ---------- Kelompok berformat sekolah ----------
  writeFileSync(join(akar, "guru/masukan/Format Kelompok.xlsx"), buatXlsx([{ nama: "K", baris: [[{ v: "KELOMPOK {{judul}}", s: G.judul }], [k("KELOMPOK"), k("NO"), k("NAMA")], ...Array.from({ length: 4 }, () => kosong(3))] }]))
  await jalan("simpan_template_excel", { berkas: "guru/masukan/Format Kelompok.xlsx", dokumen: "Kelompok" })
  const a4 = await jalan("buat_kelompok", { judul: "IPAS", jumlah_kelompok: 2, cara: "acak" })
  const sk = sel(terbaru("Kelompok IPAS"))
  cek("kelompok mengikuti format: label Kelompok 1/2, nomor urut per kelompok, 4 nama", sk[0][0] === "KELOMPOK IPAS" && sk.slice(2, 6).filter((b) => /^Kelompok [12]$/.test(b[0] ?? "")).length === 4 && sk.slice(2, 6).every((b) => NAMA.includes(b[2])) && sk[2][1] === "1", JSON.stringify(sk.slice(0, 6)) + "\n" + a4)

  // ---------- Wali kelas berformat bebas (penanda) ----------
  writeFileSync(join(akar, "guru/masukan/Denah Sekolah.xlsx"), buatXlsx([{ nama: "Denah", baris: [[{ v: "DENAH KELAS {{rombel}}" }], [{ v: "{{duduk_1}}" }, { v: "{{duduk_2}}" }], [{ v: "{{duduk_3}}" }, { v: "{{duduk_4}}" }], [{ v: "Piket Senin: {{piket_senin}}" }]] }]))
  await jalan("simpan_template_excel", { berkas: "guru/masukan/Denah Sekolah.xlsx", dokumen: "Administrasi Wali Kelas" })
  const a5 = await jalan("buat_administrasi_wali_kelas", {})
  const sw = sel(terbaru("Administrasi Wali Kelas"))
  cek("wali kelas berformat bebas: penanda denah dan piket terisi nama", sw[0][0] === "DENAH KELAS 4" && sw[1][0] === NAMA[0] && sw[2][1] === NAMA[3] && /^Piket Senin: .+/.test(sw[3][0]) && !sw[3][0].includes("{{"), JSON.stringify(sw) + "\n" + a5)

  // ---------- Prioritas dan hapus ----------
  mkdirSync(join(akar, "sekolah/template"), { recursive: true })
  writeFileSync(join(akar, "sekolah/template/Daftar Hadir.xlsx"), buatXlsx([{ nama: "S", baris: [[{ v: "FORMAT WAJIB SEKOLAH {{bulan}}" }], [k("NO"), k("NAMA")], kosong(2)] }]))
  const kb = join(akar, "sekolah/kebijakan.json")
  writeFileSync(kb, JSON.stringify({ ...JSON.parse(readFileSync(kb, "utf8").replace(/^﻿/, "")), template_wajib: true }))
  await jalan("buat_absensi_excel", { bulan: 11 })
  cek("template_wajib: format sekolah mengalahkan format guru", sel(terbaru("Daftar Hadir Kelas 4 2026-11"))[0][0] === "FORMAT WAJIB SEKOLAH November")
  writeFileSync(kb, JSON.stringify({ ...JSON.parse(readFileSync(kb, "utf8")), template_wajib: false }))
  rmSync(join(akar, "sekolah/template/Daftar Hadir.xlsx"))
  const h1 = await jalan("simpan_template_excel", { dokumen: "Daftar Hadir", hapus: true })
  await jalan("buat_absensi_excel", { bulan: 12 })
  cek("hapus: kembali ke format bawaan (lembar bawaan berjudul DAFTAR HADIR + rekap)", h1.includes("format bawaan") && !existsSync(tpl) && sel(terbaru("Daftar Hadir Kelas 4 2026-12")).some((b) => b.some((c) => /DAFTAR HADIR/.test(c ?? ""))), h1)

  cek("jenis tidak dikenal → GAGAL yang menyebut jenis yang ada", (await jalan("simpan_template_excel", { berkas: "guru/masukan/Denah Sekolah.xlsx", dokumen: "Laporan Keuangan" })).includes("Daftar Hadir"))
  cek("tidak ada nama siswa di hasil alat mana pun (kecuali analisis_siswa yang diizinkan kebijakan)", !keluaran.filter((t) => !t.includes("Siswa No.")).some((t) => NAMA.some((n) => t.includes(n))), keluaran.find((t) => NAMA.some((n) => t.includes(n))) ?? "")
} finally {
  rmSync(akar, { recursive: true, force: true })
}
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
