import { HyperFormula } from "hyperformula"
import { readFileSync } from "node:fs"
// Ambil berkas dari zip "stored" buatan kita
function bacaZip(p: string) {
  const b = readFileSync(p); const out: Record<string, string> = {}; let i = 0
  while (b.readUInt32LE(i) === 0x04034b50) {
    const n = b.readUInt32LE(i + 18), ln = b.readUInt16LE(i + 26), le = b.readUInt16LE(i + 28)
    const nama = b.subarray(i + 30, i + 30 + ln).toString(); const s = i + 30 + ln + le
    out[nama] = b.subarray(s, s + n).toString(); i = s + n
  }
  return out
}
const colIdx = (c: string) => [...c].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1
function lembar(xml: string) {
  const data: any[][] = []
  for (const m of xml.matchAll(/<c r="([A-Z]+)(\d+)"[^>]*?(?:\/>|>(.*?)<\/c>)/g)) {
    const r = +m[2] - 1, c = colIdx(m[1]), isi = m[3] ?? ""
    const f = isi.match(/<f>(.*?)<\/f>/), v = isi.match(/<v>(.*?)<\/v>/), t = isi.match(/<t[^>]*>(.*?)<\/t>/)
    const dec = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    ;(data[r] ??= [])[c] = f ? "=" + dec(f[1]) : v ? +v[1] : t ? dec(t[1]) : null
  }
  for (let r = 0; r < data.length; r++) data[r] ??= []
  return data
}
const ref = (a: string) => { const m = a.match(/([A-Z]+)(\d+)/)!; return { row: +m[2] - 1, col: colIdx(m[1]) } }
/** Semua lembar dalam buku kerja (nama sesuai workbook.xml), supaya rumus lintas lembar ikut terhitung. */
function semuaLembar(file: string) {
  const z = bacaZip(file)
  const nama = [...z["xl/workbook.xml"].matchAll(/<sheet [^>]*name="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))
  return Object.fromEntries(nama.map((n, i) => [n, lembar(z[`xl/worksheets/sheet${i + 1}.xml`])]))
}
function uji(nama: string, file: string, isi: Record<string, any>, harap: Record<string, any>) {
  const lembaran = semuaLembar(file)
  const data = Object.values(lembaran)[0]
  for (const [a, v] of Object.entries(isi)) { const { row, col } = ref(a); (data[row] ??= [])[col] = v }
  const hf = HyperFormula.buildFromSheets(lembaran, { licenseKey: "gpl-v3" })
  const baca = (lembarKe: number, a: string) => hf.getCellValue({ sheet: lembarKe, ...ref(a) })
  let ok = true
  for (const [a, v0] of Object.entries(harap)) {
    const v = typeof v0 === "function" ? v0(baca) : v0
    const got = hf.getCellValue({ sheet: 0, ...ref(a) })
    const sama = typeof v === "number" ? Math.abs((got as number) - v) < 1e-9 : got === v
    if (!sama) ok = false
    console.log(`${sama ? "✔" : "✖"} ${nama} ${a}: dapat=${JSON.stringify(got)} harap=${JSON.stringify(v)}`)
  }
  return ok
}
const d = process.argv[2]
// Daftar hadir Okt 2026: 22 hari; kepala baris 5-7, data mulai baris 8; tanggal C..X, rekap Y..AC
let ok = uji("absen", `${d}/out/absen.xlsx`,
  { B8: "Siswa 1", C8: "S", D8: "S", E8: "A", B9: "Siswa 2", F9: "I" },
  { Y8: 2, Z8: 0, AA8: 1, AB8: 19, AC8: 19 / 22, Y9: 0, Z9: 1, AB9: 21, Y10: "", AC10: "", C36: 1, F36: 1, Y36: 2, Z36: 1, AA36: 1, AC36: (19 / 22 + 21 / 22) / 2 })
// Buku nilai smt 1: 5 TP (C..G), rata H, STS I, SAS J, rapor K, max L, min M, belum tuntas N; bobot D5/F5/H5; data mulai baris 9
ok = uji("nilai", `${d}/out/nilai.xlsx`,
  { B9: "Siswa 1", C9: 80, D9: 90, E9: 70, F9: 60, G9: 100, I9: 75, J9: 85, B10: "Siswa 2", C10: 50, E10: 71 },
  { H9: 80, K9: 80, L9: "TP5", M9: "TP4", H10: 61, K10: "", L10: "TP3", M10: "TP1", H11: "", C37: 65, H37: 71, C38: 80, C39: 50, N9: "TP4", N10: "TP1", N11: "" }) && ok
// Draf deskripsi rapor (kolom O) gaya BSKAP: frasa TP diambil dari lembar Keterangan TP (kolom F, baris 4 = TP1).
const frasa = (b: any, k: number) => b(1, `F${3 + k}`)
ok = uji("deskripsi", `${d}/out/nilai.xlsx`,
  { B9: "Siswa 1", C9: 80, D9: 90, E9: 70, F9: 60, G9: 100, B10: "Siswa 2", C10: 90, D10: 90, E10: 90, F10: 90, G10: 90, B11: "Siswa 3", C11: 95, D11: 85 },
  {
    O9: (b: any) => `Ananda sudah mampu ${frasa(b, 5)}. Ananda masih perlu bimbingan dalam ${frasa(b, 4)}.`,
    O10: (b: any) => `Ananda sudah mampu ${frasa(b, 1)}.`,
    O11: (b: any) => `Ananda sudah mampu ${frasa(b, 1)}. Ananda perlu penguatan dalam ${frasa(b, 2)}.`,
    O12: "",
  }) && ok
// KKTP per TP: TP1 < 85 dan TP3 < 75 ikut tercatat belum tuntas
ok = uji("nilai-kktp", `${d}/out/nilai-kktp.xlsx`,
  { C9: 80, D9: 90, E9: 70, F9: 60, G9: 100, C10: 90, D10: 70, E10: 75 },
  { N9: "TP1 TP3 TP4", N10: "", N11: "" }) && ok
// Bobot sekolah diubah guru: 40/30/30
ok = uji("nilai-bobot", `${d}/out/nilai.xlsx`,
  { E5: 40, G5: 30, I5: 30, C9: 80, D9: 90, E9: 70, F9: 60, G9: 100, I9: 75, J9: 85 }, { K9: 80 }) && ok
// Kokurikuler: kop 1-3, kepala 5-6, data mulai baris 7; dimensi C..E, catatan F, menguat G, perlu H, deskripsi I
const T = " pada kegiatan kokurikuler bertema Lingkunganku Sehat, Aku Kuat."
ok = uji("kokurikuler", `${d}/out/kokurikuler.xlsx`,
  { C7: "SB", D7: "C", E7: "K", C9: "B" },
  { G7: "penalaran kritis saat mencari solusi masalah sampah", H7: "kolaborasi (kerja sama), mengomunikasikan gagasan",
    I7: "Ananda sudah baik dalam penalaran kritis saat mencari solusi masalah sampah dan masih perlu pendampingan dalam kolaborasi (kerja sama), mengomunikasikan gagasan" + T,
    I8: "", G9: "penalaran kritis saat mencari solusi masalah sampah", H9: "", I9: "Ananda sudah baik dalam penalaran kritis saat mencari solusi masalah sampah" + T }) && ok
ok = uji("kokurikuler-7kaih", `${d}/out/kokurikuler-7kaih.xlsx`,
  { C7: "Belum Terbiasa", D7: "Terbiasa" },
  // 2 dimensi: C..D, catatan E, menguat F, perlu G, deskripsi H
  { F7: "makan sehat dan bergizi", G7: "membiasakan bangun pagi", H7: "Ananda sudah baik dalam makan sehat dan bergizi dan masih perlu pendampingan dalam membiasakan bangun pagi pada kegiatan kokurikuler bertema Hidup Sehat." }) && ok
console.log(ok ? "SEMUA RUMUS BENAR" : "ADA RUMUS SALAH")
