// Rumus analisis butir soal dihitung HyperFormula dan dibandingkan dengan hitungan manual (JavaScript).
// Pakai: cd uji-e2e/rumus && bun install && bun uji-rumus-butir.ts
import { HyperFormula } from "hyperformula"
import { analisisButirXlsx } from "../../AsistenGuru/.opencode/lib/butir.ts"
import { bacaZip } from "../../AsistenGuru/.opencode/lib/unzip.ts"

const dec = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
const colIdx = (c: string) => [...c].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1
const kol = (i: number) => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26) } return s }
function lembar(xml: string) {
  const data: any[][] = []
  for (const m of xml.matchAll(/<c r="([A-Z]+)(\d+)"[^>]*?(?:\/>|>(.*?)<\/c>)/g)) {
    const r = +m[2] - 1, c = colIdx(m[1]), isi = m[3] ?? ""
    const f = isi.match(/<f>(.*?)<\/f>/), v = isi.match(/<v>(.*?)<\/v>/), t = isi.match(/<t[^>]*>(.*?)<\/t>/)
    ;(data[r] ??= [])[c] = f ? "=" + dec(f[1]) : v ? +v[1] : t ? dec(t[1]) : null
  }
  for (let r = 0; r < data.length; r++) data[r] ??= []
  return data
}

let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i}` : ""}`); if (!b) gagal++ }

const KUNCI = "ABCD1"
// 10 baris siswa; baris ke-10 kosong (tidak ikut). Soal 5 isian: 1 benar, 0 salah.
const JAWAB = ["ABCD1", "ABCA1", "ABDD0", "ACCD1", "BBCD0", "ABBA0", "DCCD1", "AACB0", "CDAB0", ""]
const siswa = JAWAB.map((_, i) => ({ nama: `Siswa ${i + 1}` }))
const prof: any = { kelas: 4, tahun_ajaran: "2026/2027", mapel: [], sekolah: "SD Uji" }
const h = analisisButirXlsx(prof, { batas_ketuntasan: 75 } as any, siswa, { judul: "Uji", jumlahSoal: 5, kunci: "" })
const z = bacaZip(h.data)
const td = new TextDecoder()
const wb = td.decode(z.get("xl/workbook.xml"))
const nama = [...wb.matchAll(/<sheet [^>]*name="([^"]*)"/g)].map((m) => m[1])
const sheets: Record<string, any[][]> = Object.fromEntries(nama.map((n, i) => [n, lembar(td.decode(z.get(`xl/worksheets/sheet${i + 1}.xml`)))]))
cek("tiga lembar: Jawaban, Analisis Soal, Skor", nama.join() === "Jawaban,Analisis Soal,Skor", nama.join())

// Isi kunci (angka 1 untuk soal isian disimpan sebagai angka, seperti diketik di Excel) dan jawaban.
const J = sheets["Jawaban"]
const isi = (r: number, c: number, v: string) => { (J[r - 1] ??= [])[c] = /^\d$/.test(v) ? Number(v) : v }
KUNCI.split("").forEach((k, i) => isi(h.rKunci, 2 + i, k))
JAWAB.forEach((j, s) => j.split("").forEach((v, i) => isi(h.r1 + s, 2 + i, v)))
const hf = HyperFormula.buildFromSheets(sheets, { licenseKey: "gpl-v3" })
const nilai = (sh: string, a: string) => { const m = a.match(/([A-Z]+)(\d+)/)!; return hf.getCellValue({ sheet: nama.indexOf(sh), row: +m[2] - 1, col: colIdx(m[1]) }) }

// ---------- Hitungan manual ----------
const ikut = JAWAB.map((j, i) => ({ i, j })).filter((x) => x.j)
const skor = ikut.map((x) => x.j.split("").map((v, k) => (v.toUpperCase() === KUNCI[k] ? 1 : 0)))
const total = skor.map((s) => s.reduce((a: number, b: number) => a + b, 0))
const kN = Math.max(1, Math.round(ikut.length * 0.27))
const atasB = [...total].sort((a, b) => b - a)[kN - 1], bawahB = [...total].sort((a, b) => a - b)[kN - 1]
const grup = total.map((t) => (t >= atasB ? "Atas" : t <= bawahB ? "Bawah" : ""))
const r2 = (x: number) => Math.round(x * 100) / 100

const cB = kol(2 + 5), cN = kol(2 + 6), cT = kol(2 + 7), cK = kol(2 + 8)
let ok = true
ikut.forEach((x, s) => {
  const r = h.r1 + x.i
  const b = nilai("Jawaban", `${cB}${r}`), n = nilai("Jawaban", `${cN}${r}`), t = nilai("Jawaban", `${cT}${r}`), g = nilai("Jawaban", `${cK}${r}`)
  const nh = Math.round((total[s] / 5) * 100)
  if (b !== total[s] || n !== nh || t !== (nh >= 75 ? "Ya" : "Belum") || (g ?? "") !== grup[s]) { ok = false; console.log("   baris", r, { b, n, t, g }, { b: total[s], n: nh, g: grup[s] }) }
})
cek("per siswa: benar, nilai, tuntas, kelompok atas/bawah sesuai hitungan manual", ok)
const kosong = h.r1 + 9
cek("baris siswa kosong tidak dihitung (Benar/Nilai/Tuntas kosong)", [cB, cN, cT].every((c) => (nilai("Jawaban", `${c}${kosong}`) ?? "") === ""))

// Lembar Analisis Soal: baris kepala tabel = baris ke-9 (kop 4 + ringkasan 3 + kosong 1 + kepala 1).
const rA = 10
cek("ringkasan: jumlah siswa dinilai = 9", nilai("Analisis Soal", "E5") === 9)
const rataH = r2(total.reduce((a, b) => a + Math.round((b / 5) * 100), 0) / 9 * 10) / 10
cek("ringkasan: rata-rata nilai dan ketuntasan klasikal", Math.abs((nilai("Analisis Soal", "E6") as number) - Math.round((total.reduce((a, b) => a + Math.round((b / 5) * 100), 0) / 9) * 10) / 10) < 1e-9 && Math.abs((nilai("Analisis Soal", "E7") as number) - total.filter((t) => Math.round((t / 5) * 100) >= 75).length / 9) < 1e-9, String([nilai("Analisis Soal", "E6"), nilai("Analisis Soal", "E7"), rataH]))
ok = true
for (let k = 0; k < 5; k++) {
  const r = rA + k
  const benar = skor.reduce((a, s) => a + s[k], 0)
  const P = r2(benar / 9)
  const pa = r2(skor.filter((_, s) => grup[s] === "Atas").reduce((a, s) => a + s[k], 0) / grup.filter((g) => g === "Atas").length)
  const pb = r2(skor.filter((_, s) => grup[s] === "Bawah").reduce((a, s) => a + s[k], 0) / grup.filter((g) => g === "Bawah").length)
  const D = r2(pa - pb)
  const katP = P <= 0.3 ? "Sukar" : P <= 0.7 ? "Sedang" : "Mudah"
  const katD = D < 0 ? "Sangat jelek" : D <= 0.2 ? "Jelek" : D <= 0.4 ? "Cukup" : D <= 0.7 ? "Baik" : "Baik sekali"
  const kep = D > 0.4 ? "Dipakai" : D > 0.2 ? "Dipakai, diperbaiki" : "Revisi/ganti"
  const pilih = "ABCD".split("").map((o) => ikut.filter((x) => x.j[k] === o).length)
  const dapat = ["C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"].map((c) => nilai("Analisis Soal", `${c}${r}`))
  const harap = [benar, P, katP, pa, pb, D, katD, kep, ...pilih]
  const sama = harap.every((v, i) => (typeof v === "number" ? Math.abs((dapat[i] as number) - v) < 1e-9 : dapat[i] === v))
  if (!sama) { ok = false; console.log("   soal", k + 1, "dapat", dapat, "harap", harap) }
  if (nilai("Analisis Soal", `O${r}`) !== 0) { ok = false; console.log("   kosong", nilai("Analisis Soal", `O${r}`)) }
}
cek("per soal: benar, P + kategori, P atas/bawah, D + kategori, keputusan, sebaran pilihan A–D, kosong", ok)
cek("kunci tampil di analisis", nilai("Analisis Soal", `B${rA}`) === "A" && nilai("Analisis Soal", `B${rA + 4}`) === 1)
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSEMUA RUMUS BUTIR BENAR")
process.exit(gagal ? 1 : 0)
