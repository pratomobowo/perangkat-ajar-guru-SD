// Uji media interaktif (buat_media): ketepatan gambar dan bangun ruang, validasi spesifikasi, tampilan cetak, alat lewat
// plugin, dan — bila PERAMBAN diisi — uji interaksi sungguhan di Chrome/Edge tanpa tampilan (klik, tantangan, dadu, 3D).
// Pakai: cd uji-e2e/fixture && PERAMBAN=/jalur/chrome-headless-shell bun uji-media.ts

import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { gambar, mediaHtml, rapikanSpek } from "../../AsistenGuru/.opencode/lib/media.ts"
import * as Ru from "../../AsistenGuru/.opencode/lib/media/ruang.js"
import { teksPdfData } from "../../AsistenGuru/.opencode/lib/pustaka.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
const PERAMBAN = process.env.PERAMBAN ?? ""
let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i.slice(0, 700).replace(/\n/g, "\n    ")}` : ""}`); if (!b) gagal++ }
const hitung = (s: string, re: RegExp) => (s.match(re) ?? []).length
const galat = (f: () => unknown) => { try { f(); return "" } catch (e: any) { return String(e?.message ?? e) } }
/** Bagian HTML yang dibuat server (tanpa skrip yang disisipkan). */
const utama = (s: string) => s.match(/<main id="panggung">([\s\S]*?)<\/main>/)?.[1] ?? ""

// ---------- Pecahan: jumlah bagian dan yang diarsir ----------
for (const bentuk of ["lingkaran", "batang", "persegi"]) {
  const s = gambar({ jenis: "pecahan", bentuk, pembilang: 3, penyebut: 8 })
  cek(`pecahan ${bentuk} 3/8: 8 bagian, 3 diarsir`, hitung(s, /data-arsir="/g) === 8 && hitung(s, /data-arsir="1"/g) === 3 && s.includes(">3/8<"), s)
}
let s = gambar({ jenis: "pecahan", bentuk: "persegi", penyebut: 6, arsir: [1, 4] })
cek("pecahan dengan `arsir` (peraga interaktif): bagian 1 dan 4 diarsir → 2/6", hitung(s, /data-arsir="1"/g) === 2 && /data-arsir="1" data-i="1"/.test(s) && /data-arsir="1" data-i="4"/.test(s) && s.includes(">2/6<"))
cek("pecahan pembilang > penyebut ditolak", galat(() => gambar({ jenis: "pecahan", pembilang: 5, penyebut: 4 })).includes("Pembilang"))
cek("bentuk pecahan tak dikenal ditolak", galat(() => gambar({ jenis: "pecahan", bentuk: "bintang", pembilang: 1, penyebut: 2 })).includes("tidak dikenal"))

// ---------- Jam ----------
const sudut = (s: string, j: string) => Number(s.match(new RegExp(`data-jarum="${j}" data-sudut="([\\d.]+)"`))?.[1])
s = gambar({ jenis: "jam", jam: 7, menit: 30 })
cek("jam 07.30: jarum menit 180°, jarum jam 225°", sudut(s, "menit") === 180 && sudut(s, "jam") === 225 && s.includes(">07.30<"))
s = gambar({ jenis: "jam", jam: 10, menit: 15 })
cek("jam 10.15: menit 90°, jam 307,5°", sudut(s, "menit") === 90 && sudut(s, "jam") === 307.5)
cek("jam 25 / menit 60 ditolak", galat(() => gambar({ jenis: "jam", jam: 25 })).includes("Jam") && galat(() => gambar({ jenis: "jam", jam: 7, menit: 60 })).includes("Menit"))

// ---------- Garis bilangan, bangun datar, Dienes, tabel ----------
s = gambar({ jenis: "garis_bilangan", mulai: 0, akhir: 20, lompat: 2, tandai: [6, 14], loncatan: [[0, 4], [4, 8]] })
cek("garis bilangan 0–20 lompat 2: 11 tanda, 2 titik, 2 loncatan", hitung(s, /<text /g) === 11 && hitung(s, /data-titik=/g) === 2 && s.includes('data-loncat="4-8"'))
cek("garis bilangan: > 40 tanda dan titik di luar rentang ditolak", galat(() => gambar({ jenis: "garis_bilangan", mulai: 0, akhir: 100 })).includes("40 tanda") && galat(() => gambar({ jenis: "garis_bilangan", mulai: 0, akhir: 10, tandai: [12] })).includes("Titik"))
for (const [b, n] of [["segitiga", 3], ["trapesium", 4], ["jajar_genjang", 4], ["segi enam", 6]] as const) cek(`bangun datar ${b}: ${n} sisi`, gambar({ jenis: "bangun", bangun: b }).includes(`data-sisi="${n}"`))
s = gambar({ jenis: "dienes", bilangan: 247 })
cek("Dienes 247: 2 ratusan, 4 puluhan, 7 satuan", hitung(s, /data-blok="ratusan"/g) === 2 && hitung(s, /data-blok="puluhan"/g) === 4 && hitung(s, /data-blok="satuan"/g) === 7)
s = gambar({ jenis: "dienes", ratusan: 1, puluhan: 3, satuan: 12 })
cek("Dienes dengan jumlah blok (peraga menukar): 1 ratusan, 3 puluhan, 12 satuan = 142", hitung(s, /data-blok="satuan"/g) === 12 && s.includes('data-bilangan="142"'))
s = gambar({ jenis: "tabel_perkalian", dari: 6, sampai: 9 })
cek("tabel perkalian 6–9: 7×8 = 56, 9×9 = 81", s.includes("<td>56</td>") && s.includes("<td>81</td>") && hitung(s, /<td>/g) === 16)

// ---------- Bangun ruang: jaring-jaring dilipat menjadi bangun tertutup ----------
const dekat = (a: number, b: number) => Math.abs(a - b) < 1e-6
for (const nama of ["kubus", "balok", "prisma segitiga", "limas segiempat", "limas segitiga"]) {
  const b = Ru.bangunRuang({ bentuk: nama })
  const jaring = Ru.jaringDatar(b)!
  const utuh = Ru.kerangka(Ru.lipatJaring(jaring, 0))
  const datar = Ru.lipatJaring(jaring, 1)
  // Bangun tertutup: setiap rusuk dipakai tepat dua sisi.
  const pakai = new Map<string, number>()
  const s3 = Ru.lipatJaring(jaring, 0)
  for (const f of s3) f.titik.forEach((p: number[], k: number) => {
    const q = f.titik[(k + 1) % f.titik.length]
    const id = [utuh.titik.findIndex((v: number[]) => v.every((x, d) => dekat(x, p[d]))), utuh.titik.findIndex((v: number[]) => v.every((x, d) => dekat(x, q[d])))].sort().join("-")
    pakai.set(id, (pakai.get(id) ?? 0) + 1)
  })
  cek(`${nama}: dilipat → ${b.data.sisi} sisi, ${b.data.rusuk} rusuk, ${b.data.titik} titik sudut, tertutup rapat (Euler ${b.data.titik} − ${b.data.rusuk} + ${b.data.sisi} = 2)`,
    s3.length === b.data.sisi && utuh.rusuk.length === b.data.rusuk && utuh.titik.length === b.data.titik && [...pakai.values()].every((v) => v === 2) && b.data.titik - b.data.rusuk + b.data.sisi === 2,
    JSON.stringify({ sisi: s3.length, rusuk: utuh.rusuk.length, titik: utuh.titik.length, pakai: [...pakai.values()] }))
  cek(`${nama}: dibuka penuh → jaring datar (semua z = 0)`, datar.every((f: any) => f.titik.every((p: number[]) => dekat(p[2], 0))))
}
{
  const t = Ru.kerangka(Ru.lipatJaring(Ru.jaringDatar(Ru.bangunRuang({ bentuk: "limas segiempat", s: 6, t: 4 }))!, 0))
  cek("limas segiempat s=6 t=4: puncak tepat setinggi 4 di atas pusat alas", t.titik.some((p: number[]) => dekat(p[0], 3) && dekat(p[1], 3) && dekat(p[2], 4)))
  const p = Ru.kerangka(Ru.lipatJaring(Ru.jaringDatar(Ru.bangunRuang({ bentuk: "prisma segitiga", a: 4, panjang: 6 }))!, 0))
  cek("prisma segitiga a=4: tinggi rusuk atas = 4·√3/2", Math.max(...p.titik.map((q: number[]) => q[2])) - 2 * Math.sqrt(3) < 1e-9)
  const k = Ru.selimutKerucut(3, 4, 0)
  cek("kerucut r=3 t=4 utuh: puncak (0,0,4), tepi alas berjari-jari 3 di tanah", k[0][0].every((v: number, d: number) => dekat(v, [0, 0, 4][d])) && k[8].every((q: number[]) => dekat(Math.hypot(q[0], q[1]), 3) && dekat(q[2], 0)))
  cek("kerucut dibuka: selimut datar (juring berjari-jari garis pelukis 5)", Ru.selimutKerucut(3, 4, 1).flat().every((q: number[]) => dekat(q[2], 0)) && Ru.selimutKerucut(3, 4, 1)[8].every((q: number[]) => dekat(Math.hypot(q[0] - 8, q[1]), 5)))
  cek("tabung r=2 utuh: selimut melingkar berjari-jari 2; dibuka: persegi panjang 2πr", Ru.selimutTabung(2, 5, 0)[0].every((q: number[]) => dekat(Math.hypot(q[0] - 2 * Math.PI, q[2] - 2), 2)) && dekat(Ru.selimutTabung(2, 5, 1)[0].at(-1)[0] - Ru.selimutTabung(2, 5, 1)[0][0][0], 4 * Math.PI))
}
cek("bangun ruang: alias (silinder, limas segi empat) dikenali; nama salah ditolak dengan daftar", Ru.bangunRuang({ bentuk: "Silinder" }).bentuk === "tabung" && Ru.bangunRuang({ bentuk: "limas_segi_empat" }).bentuk === "limas segiempat" && galat(() => rapikanSpek({ judul: "J", bagian: [{ jenis: "ruang", bangun: ["kubus", "piramid"] }] })).includes("kerucut"))
cek("bangun ruang: ukuran di luar batas ditolak", galat(() => rapikanSpek({ judul: "J", bagian: [{ jenis: "ruang", bangun: [{ bentuk: "kubus", s: 50 }] }] })).includes("Ukuran s kubus"))
s = Ru.svgKubusSatuan(4, 3, 2)
cek("kubus satuan 4×3×2: 24 kubus digambar", hitung(s, /data-kubus="1"/g) === 24 && s.includes('data-jumlah="24"'))

// ---------- Validasi dan perapian spesifikasi ----------
const r = rapikanSpek({ judul: "Uji", bagian: [
  { jenis: "kuis", soal: [
    { tanya: "2+2?", pilihan: ["3", "4", "5"], jawaban: "b" },
    { tanya: "Ibu kota?", pilihan: ["Bandung", "Jakarta"], jawaban: "Jakarta" },
    { tanya: "1/2 = …/4", jawaban: 2 },
  ] },
  { jenis: "roda", absen: 30 },
  { jenis: "peraga", alat: "jam", tantangan: ["7:30", "13.05"] },
] })
const kuis = r.bagian[0].soal
cek("kuis: jawaban huruf kecil 'b' → pilihan ke-2; teks pilihan → indeksnya; isian → daftar jawaban", kuis[0].benar === 1 && kuis[1].benar === 1 && JSON.stringify(kuis[2].jawaban) === '["2"]')
cek("peraga jam: tantangan 7:30 dirapikan menjadi 07.30", JSON.stringify(r.bagian[2].tantangan) === '["07.30","13.05"]')
const ditolak: [string, any, string][] = [
  ["kuis: jawaban tidak cocok pilihan", { jenis: "kuis", soal: [{ tanya: "x", pilihan: ["1", "2"], jawaban: "C" }] }, "Tulis hurufnya (A–B)"],
  ["kuis: pilihan kembar", { jenis: "kuis", soal: [{ tanya: "x", pilihan: ["1", "1"], jawaban: "A" }] }, "pilihan yang sama"],
  ["memori > 10 pasangan", { jenis: "pasangkan", mode: "memori", pasangan: Array.from({ length: 11 }, (_, i) => [`a${i}`, `b${i}`]) }, "paling banyak 10"],
  ["urutkan < 3 isian", { jenis: "urutkan", item: ["a", "b"] }, "paling sedikit 3"],
  ["peraga pecahan: tantangan 5/4", { jenis: "peraga", alat: "pecahan", tantangan: ["5/4"] }, "a ≤ b"],
  ["peraga jam: tantangan 25.00", { jenis: "peraga", alat: "jam", tantangan: ["25.00"] }, "JJ.MM"],
  ["peraga tak dikenal", { jenis: "peraga", alat: "timbangan" }, "dienes"],
  ["volume > 8", { jenis: "volume", p: 9 }, "Panjang (p)"],
  ["ular & tangga di petak sama", { jenis: "ular_tangga", tangga: [[5, 20]], ular: [[5, 1]] }, "lebih dari satu"],
  ["bingo jawaban kembar", { jenis: "bingo", ukuran: 3, isi: [{ soal: "2×3", jawaban: "6" }, { soal: "3×2", jawaban: "6" }, "a", "b", "c", "d", "e", "f"] }, "kembar: 6"],
  ["bagian tak dikenal", { jenis: "puzzle" }, "Pilih: kuis"],
]
for (const [n, b, pesan] of ditolak) { const g = galat(() => rapikanSpek({ judul: "J", bagian: [b] })); cek(`ditolak: ${n}`, g.includes(pesan), g) }

// ---------- Tampilan cetak ----------
const isi16 = Array.from({ length: 16 }, (_, i) => String((i + 1) * 4))
s = utama(mediaHtml({ judul: "Bingo", bagian: [{ jenis: "bingo", ukuran: 4, isi: isi16, jumlah_papan: 3 }] }))
const papan = [...s.matchAll(/<table class="bingo">([\s\S]*?)<\/table>/g)].map((m) => [...m[1].matchAll(/<td>([^<]*)<\/td>/g)].map((x) => x[1]))
cek("bingo cetak: 3 papan berbeda, tiap papan 16 isian unik", papan.length === 3 && papan.every((p) => new Set(p).size === 16) && papan[0].join() !== papan[1].join())
s = utama(mediaHtml({ judul: "U", bagian: [{ jenis: "ular_tangga", tangga: [[3, 22]], ular: [[98, 61]], soal: { 5: "1/2 + 1/2" } }] }))
cek("ular tangga cetak: 100 petak, tangga, ular, soal", hitung(s, /data-petak=/g) === 100 && s.includes('data-tangga="3-22"') && s.includes('data-ular="98-61"') && s.includes(">1/2 + 1/2<"))
s = utama(mediaHtml({ judul: "K", bagian: [{ jenis: "kartu", kolom: 2, kartu: [{ teks: "A", balik: { teks: "1" } }, { teks: "B", balik: { teks: "2" } }, { teks: "C", balik: { teks: "3" } }] }] }))
const belakang = s.split("Sisi belakang")[1] ?? ""
cek("kartu bolak-balik: sisi belakang dicerminkan per baris (2 1 | kosong 3)", [...belakang.matchAll(/<div class="teks">([^<]*)</g)].map((m) => m[1]).join("") === "213" && belakang.indexOf("kosong") < belakang.indexOf(">3<"))
s = utama(mediaHtml({ judul: "Q", bagian: [{ jenis: "kuis", soal: [{ tanya: "2+2?", pilihan: ["3", "4"], jawaban: "B" }] }, { jenis: "ruang", bangun: ["kubus", "kerucut", "bola"] }] }))
cek("kuis cetak tanpa kunci jawaban", s.includes("<li>3</li>") && !/benar|kunci/i.test(s.split('data-jenis="ruang"')[0]))
cek("ruang cetak: jaring-jaring kubus dan kerucut + jumlah sisi/rusuk; bola tanpa jaring", s.includes('data-bentuk="kubus"') && s.includes('data-bentuk="kerucut"') && s.includes("Sisi: 6 · Rusuk: 12 · Titik sudut: 8") && s.includes("Titik puncak: 1") && s.includes("Bola tidak memiliki jaring-jaring"))
const tanpa3d = mediaHtml({ judul: "Q", bagian: [{ jenis: "kuis", soal: [{ tanya: "x", jawaban: "1" }] }] })
const dengan3d = mediaHtml({ judul: "Q", bagian: [{ jenis: "volume" }] })
cek("three.js hanya disisipkan bila ada bagian 3D", !tanpa3d.includes("window.MediaTiga = {") && dengan3d.includes("window.MediaTiga = {") && tanpa3d.length < 150_000 && dengan3d.length > 500_000, `${tanpa3d.length} / ${dengan3d.length}`)
s = mediaHtml({ judul: "Aman </script><b>", bagian: [{ jenis: "teks", isi: "</script><script>alert(1)</script>" }] })
cek("teks guru di-escape, JSON aman di dalam <script>", !s.includes("<script>alert(1)") && hitung(s, /<\/script>/g) === 2 && s.includes("\\u003c/script>"))
cek("F4 + kop sekolah; lanskap A4", mediaHtml({ judul: "J", bagian: [{ jenis: "teks", isi: "x" }] }, { sekolah: "SD Uji", kertas: "F4" }).includes("size: 210mm 330mm") && mediaHtml({ judul: "L", orientasi: "lanskap", bagian: [{ jenis: "teks", isi: "x" }] }).includes("size: A4 landscape"))

// ---------- Uji interaksi di peramban (Chrome/Edge tanpa tampilan) ----------
const spekPeramban = {
  judul: "Uji Interaksi",
  bagian: [
    { jenis: "kuis", acak: false, soal: [{ tanya: "2+2?", pilihan: ["3", "4"], jawaban: "B" }, { tanya: "1/2 = …/4", jawaban: "2" }] },
    { jenis: "pasangkan", pasangan: [["1/2", "2/4"], ["1/3", "2/6"], ["3/4", "6/8"]] },
    { jenis: "urutkan", item: ["1/8", "1/4", "1/2", "1"] },
    { jenis: "peraga", alat: "pecahan", penyebut: 4, tantangan: ["3/4", "1/2"] },
    { jenis: "peraga", alat: "jam", tantangan: ["07.30"] },
    { jenis: "peraga", alat: "dienes", tantangan: [247] },
    { jenis: "ular_tangga", tim: 2, tangga: [[3, 22]], ular: [[30, 4]] },
    { jenis: "ruang", bangun: ["kubus", "tabung"] },
    { jenis: "volume", p: 3, l: 2, t: 2, tebak: false },
    { jenis: "roda", isi: ["A", "B", "C"] },
  ],
}
if (PERAMBAN) {
  const dir = mkdtempSync(join(tmpdir(), "asisten-guru-peramban-"))
  try {
    const skrip = `<script>
window.__galat = []; window.addEventListener("error", (e) => window.__galat.push(String(e.message)))
window.addEventListener("load", () => setTimeout(async () => {
  const H = {}, tunggu = (ms) => new Promise((r) => setTimeout(r, ms))
  const sec = (i) => document.querySelector('section[data-i="' + i + '"] .main')
  const klikTeks = (el, t) => [...el.querySelectorAll(".tombol")].find((b) => b.textContent.includes(t)).click()
  try {
    let m = sec(0); m.querySelector('.pilihan button[data-j="1"]').click(); klikTeks(m, "Berikutnya")
    m.querySelector("input.jawab").value = " 2 "; klikTeks(m, "Periksa"); klikTeks(m, "Lihat skor"); H.kuis = m.dataset.selesai
    m = sec(1); for (let k = 0; k < 3; k++) { m.querySelector('.ubin[data-sisi="kiri"][data-pasangan="' + k + '"]').click(); m.querySelector('.ubin[data-sisi="kanan"][data-pasangan="' + k + '"]').click() } H.pasangkan = m.dataset.selesai
    m = sec(2); m.querySelector('.ubin[data-i="1"]').click(); H.urutSalah = m.querySelectorAll(".urut-hasil .ubin").length
    for (let k = 0; k < 4; k++) m.querySelector('.urut-sumber .ubin[data-i="' + k + '"]')?.click(); H.urutkan = m.dataset.selesai
    m = sec(3); m.querySelectorAll("[data-i]")[0].dispatchEvent(new MouseEvent("click", { bubbles: true })); H.pecahanKlik = m.dataset.nilai
    m.__atur([0, 1, 2]); klikTeks(m, "Periksa"); m.__atur([0, 1]); klikTeks(m, "+ bagian"); klikTeks(m, "+ bagian"); klikTeks(m, "+ bagian"); klikTeks(m, "+ bagian"); m.__atur([0, 1, 2, 3]); klikTeks(m, "Periksa"); H.pecahan = m.dataset.tantangan + "|" + m.dataset.nilai + "|" + m.querySelector(".umpan").textContent
    m = sec(4); m.__atur(19, 30); klikTeks(m, "Periksa"); H.jam = m.dataset.tantangan
    m = sec(5); m.__atur(1, 14, 7); klikTeks(m, "10 satuan"); klikTeks(m, "10 puluhan"); H.dienesNilai = m.dataset.nilai; klikTeks(m, "Periksa"); H.dienes = m.dataset.tantangan
    m = sec(6); await m.__lempar(3); H.ularTangga = m.dataset.posisi
    window.MediaAsisten.tampil(7); await tunggu(400); m = sec(7); H.kanvas = !!m.querySelector("canvas"); const sl = m.querySelector("input[type=range]"); sl.value = 100; sl.oninput(); H.buka = m.dataset.buka
    klikTeks(m, "Tabung"); H.bentuk = m.dataset.bentuk
    m = sec(8); klikTeks(m, "Hitung bersama"); window.MediaAsisten.tampil(8); await tunggu(4000); H.volume = m.dataset.tampak + "|" + m.querySelector(".info").textContent
    H.navigasi = document.querySelectorAll(".navigasi .daftar button").length
  } catch (e) { H.galat = String(e && e.stack || e) }
  H.galatHalaman = window.__galat
  document.body.setAttribute("data-uji", JSON.stringify(H))
}, 300))
</script></body>`
    writeFileSync(join(dir, "uji.html"), mediaHtml(spekPeramban as any).replace("</body>", skrip))
    const keluar = spawnSync(PERAMBAN, ["--no-sandbox", "--headless", "--disable-gpu", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--user-data-dir=${join(dir, "profil")}`, "--virtual-time-budget=20000", "--dump-dom", `file://${join(dir, "uji.html")}`], { encoding: "utf8", timeout: 120000 })
    const json = keluar.stdout.match(/data-uji="([^"]*)"/)?.[1]?.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    const H = json ? JSON.parse(json) : {}
    const info = JSON.stringify(H)
    cek("peramban: tidak ada galat JavaScript", !H.galat && Array.isArray(H.galatHalaman) && !H.galatHalaman.length, info + keluar.stderr.slice(-300))
    cek("peramban: kuis — pilihan B benar, isian ' 2 ' benar → skor 2/2", H.kuis === "2/2", info)
    cek("peramban: pasangkan — 3 pasangan benar → selesai", H.pasangkan === "1", info)
    cek("peramban: urutkan — klik salah tidak masuk, urutan benar → selesai", H.urutSalah === 0 && H.urutkan === "1", info)
    cek("peramban: peraga pecahan — ketuk bagian → 1/4; 3/4 tepat; 4/8 diterima senilai 1/2", H.pecahanKlik === "1/4" && H.pecahan?.startsWith("2|4/8|") && H.pecahan.includes("senilai"), info)
    cek("peramban: peraga jam — 19.30 diterima untuk tantangan 07.30 (jam analog)", H.jam === "1", info)
    cek("peramban: Dienes — 1 ratusan + 14 puluhan + 7 satuan ditukar → 247, tantangan tepat", H.dienesNilai === "247" && H.dienes === "1", info)
    cek("peramban: ular tangga — dadu 3 dari start → petak 3 naik tangga ke 22", H.ularTangga === "22,0", info)
    cek("peramban: 3D — kanvas WebGL ada, jaring dibuka penuh, ganti ke tabung", H.kanvas === true && H.buka === "1.00" && H.bentuk === "tabung", info)
    cek("peramban: volume — 12 kubus tersusun, rumus 3 × 2 × 2 = 12", H.volume?.startsWith("12|") && H.volume.includes("3 × 2 × 2 = 12"), info)
    cek("peramban: navigasi 10 layar", H.navigasi === 10, info)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
} else console.log("… PERAMBAN tidak diisi: uji interaksi peramban dilewati")

// ---------- Alat buat_media lewat plugin ----------
const akar = mkdtempSync(join(tmpdir(), "asisten-guru-media-"))
const simpanEnv = { PERAMBAN: process.env.ASISTEN_GURU_PERAMBAN, PATH: process.env.PATH }
try {
  cpSync(join(SINI, "../../AsistenGuru"), akar, { recursive: true })
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => ({}) } })
  const jalan = async (n: string, a: any = {}) => (await alat[n].execute(a, {})).content as string
  const spek = { judul: "Kuis Pecahan Senilai", bagian: [{ jenis: "kuis", soal: [{ tanya: "KODE-MEDIA-77: 1/2 = …/4", pilihan: ["1", "2"], jawaban: "B" }] }, { jenis: "halaman_baru" }, { jenis: "peraga", alat: "jam", jam: 7, menit: 30 }] }
  const dir = "2 Modul dan LKPD/Matematika TP3 Pecahan Senilai"
  let r: string
  r = await jalan("buat_media", { topik: "Matematika TP3 Pecahan Senilai", nama: "Kuis Pecahan", spek })
  cek("alat: HTML interaktif tersimpan, tanpa PDF bila tidak diminta, petunjuk smart TV", existsSync(join(akar, "hasil", dir, "Kuis Pecahan.html")) && !existsSync(join(akar, "hasil", dir, "Kuis Pecahan.pdf")) && r.includes("smart TV") && r.includes("Tidak perlu internet"), r)
  cek("alat: spesifikasi disimpan di guru/draf untuk revisi", JSON.parse(readFileSync(join(akar, "guru/draf", dir, "Kuis Pecahan.json"), "utf8")).judul === "Kuis Pecahan Senilai")
  cek("alat: tanpa spek dan tanpa spesifikasi tersimpan → GAGAL jelas", (await jalan("buat_media", { topik: "Topik Lain" })).startsWith("GAGAL"))
  r = await jalan("buat_media", { topik: "Matematika TP3 Pecahan Senilai", nama: "Rusak", spek: { judul: "X", bagian: [{ jenis: "kuis", soal: [{ tanya: "x", pilihan: ["1", "2"], jawaban: "D" }] }] } })
  cek("alat: spesifikasi salah → GAGAL dengan alasan, tidak menulis berkas", r.startsWith("GAGAL") && r.includes("A–B") && !existsSync(join(akar, "guru/draf", dir, "Rusak.json")), r)
  cek("alat: topik dengan garis miring tidak keluar folder", !(await jalan("buat_media", { topik: "../../luar", spek })).startsWith("GAGAL") && existsSync(join(akar, "hasil/2 Modul dan LKPD/..-..-luar/Media Interaktif.html")))
  process.env.ASISTEN_GURU_PERAMBAN = ""
  process.env.PATH = ""
  r = await jalan("buat_media", { topik: "Matematika TP3 Pecahan Senilai", nama: "Kuis Pecahan", pdf: true })
  process.env.PATH = simpanEnv.PATH
  cek("alat: PDF diminta tanpa peramban → HTML tetap jadi, petunjuk Ctrl+P", r.includes("Ctrl+P") && !existsSync(join(akar, "hasil", dir, "Kuis Pecahan.pdf")), r)
  if (PERAMBAN) {
    process.env.ASISTEN_GURU_PERAMBAN = PERAMBAN
    r = await jalan("buat_media", { topik: "Matematika TP3 Pecahan Senilai", nama: "Kuis Pecahan", pdf: true })
    const pdf = join(akar, "hasil", dir, "Kuis Pecahan.pdf")
    cek("alat: PDF dari spesifikasi tersimpan", r.includes("Versi cetak") && existsSync(pdf), r)
    if (existsSync(pdf)) {
      const data = readFileSync(pdf)
      const hal = await teksPdfData(new Uint8Array(data), "Kuis Pecahan.pdf")
      const semua = hal.join("\n")
      cek("PDF: versi cetak (soal terbaca, tanpa tombol layar), 2 halaman, A4", hal.length === 2 && semua.includes("KODE-MEDIA-77") && !semua.includes("Satu per satu") && !semua.includes("Periksa") && /\/MediaBox\s*\[\s*0 0 59[45]\.?\d* 84[12]\.?\d*\s*\]/.test(data.toString("latin1")), `${hal.length} halaman\n${semua.slice(0, 500)}`)
    }
  }
} finally {
  process.env.ASISTEN_GURU_PERAMBAN = simpanEnv.PERAMBAN ?? ""
  rmSync(akar, { recursive: true, force: true })
}
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
