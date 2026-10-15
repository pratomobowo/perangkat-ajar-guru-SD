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
function uji(nama: string, file: string, isi: Record<string, any>, harap: Record<string, any>) {
  const data = lembar(bacaZip(file)["xl/worksheets/sheet1.xml"])
  for (const [a, v] of Object.entries(isi)) { const { row, col } = ref(a); (data[row] ??= [])[col] = v }
  const hf = HyperFormula.buildFromArray(data, { licenseKey: "gpl-v3" })
  let ok = true
  for (const [a, v] of Object.entries(harap)) {
    const got = hf.getCellValue({ sheet: 0, ...ref(a) })
    const sama = typeof v === "number" ? Math.abs((got as number) - v) < 1e-9 : got === v
    if (!sama) ok = false
    console.log(`${sama ? "✔" : "✖"} ${nama} ${a}: dapat=${JSON.stringify(got)} harap=${JSON.stringify(v)}`)
  }
  return ok
}
const d = process.argv[2]
let ok = uji("absen-e2e", `${d}/out/absen.xlsx`,
  { B8: "Siswa 1", C8: "S", D8: "S", E8: "A", B9: "Siswa 2", F9: "I" },
  { Y8: 2, Z8: 0, AA8: 1, AB8: 19, AC8: 19 / 22, AB9: 21, Y10: "", AC10: "", Y36: 2, AC36: (19 / 22 + 21 / 22) / 2 })
// 7 TP: C..I, rata J, STS K, SAS L, rapor M, tertinggi N, terendah O; bobot E5/G5/I5
ok = uji("nilai-e2e", `${d}/out/nilai.xlsx`,
  { B9: "Siswa 1", C9: 80, D9: 90, E9: 70, F9: 60, G9: 100, H9: 85, I9: 75, K9: 75, L9: 85, B10: "Siswa 2", C10: 50 },
  { J9: 80, M9: 80, N9: "TP5", O9: "TP4", J10: 50, M10: "", N10: "TP1", O10: "TP1", C37: 65, J37: 65, C38: 80, C39: 50 }) && ok
ok = uji("nilai-e2e-bobot", `${d}/out/nilai.xlsx`, { E5: 40, G5: 30, I5: 30, C9: 80, D9: 90, E9: 70, F9: 60, G9: 100, H9: 85, I9: 75, K9: 75, L9: 85 }, { M9: 80 }) && ok
ok = uji("nilai-e2e-bobot2", `${d}/out/nilai.xlsx`, { E5: 60, G5: 20, I5: 20, C9: 90, K9: 60, L9: 70 }, { M9: 80 }) && ok
console.log(ok ? "SEMUA RUMUS BENAR" : "ADA RUMUS SALAH")
