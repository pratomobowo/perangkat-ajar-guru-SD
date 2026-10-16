// Uji refleksi diri guru (penilaian proses pembelajaran, Permendikdasmen 1/2026 Pasal 15): bahan dari buku nilai,
// analisis butir (dihitung ulang dari jawaban), daftar hadir, dan jurnal; pengingat kewajiban; kerangka Word.
// Pakai: cd uji-e2e/fixture && bun uji-refleksi.ts
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { blokIngatan } from "../../AsistenGuru/.opencode/lib/ingatan.ts"
import { bacaButir, pengingatRefleksi } from "../../AsistenGuru/.opencode/lib/refleksi.ts"
import { bacaZip } from "../../AsistenGuru/.opencode/lib/unzip.ts"
import { buatXlsx } from "../../AsistenGuru/.opencode/lib/xlsx.ts"
import { buatZip } from "../../AsistenGuru/.opencode/lib/zip.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i.slice(0, 1500).replace(/\n/g, "\n    ")}` : ""}`); if (!b) gagal++ }
const NAMA = ["Andi Pratama", "Bunga Lestari", "Andika Putra", "Dewi Anggraini"]

function isiSel(p: string, sel: Record<string, number | string>) {
  const z = bacaZip(new Uint8Array(readFileSync(p)))
  const isi: Record<string, any> = {}
  for (const [k, v] of z) isi[k] = v
  let xml = new TextDecoder().decode(z.get("xl/worksheets/sheet1.xml")!)
  for (const [ref, v] of Object.entries(sel)) {
    const baru = typeof v === "number" ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${v}</t></is></c>`
    const re = new RegExp(`<c r="${ref}"(?:[^>]*?/>|[^>]*?>[\\s\\S]*?</c>)`)
    if (!re.test(xml)) throw new Error(`sel ${ref} tidak ada`)
    xml = xml.replace(re, baru)
  }
  isi["xl/worksheets/sheet1.xml"] = xml
  writeFileSync(p, buatZip(isi))
}

const akar = mkdtempSync(join(tmpdir(), "asisten-refleksi-"))
try {
  cpSync(join(SINI, "../../AsistenGuru"), akar, { recursive: true })
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  cpSync(join(SINI, "sekolah/kebijakan.json"), join(akar, "sekolah/kebijakan.json"))
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => ({}) } })
  const jalan = async (n: string, a: any = {}) => (await alat[n].execute(a, {})).content as string
  const adm = join(akar, "hasil/4 Administrasi")

  let r = await jalan("bahan_refleksi_semester", { semester: 1, tanggal: "2026-12-10" })
  cek("tanpa data: tetap bisa, dengan penjelasan, jalur draf, dan dasar hukum", r.includes("Belum ada data") && r.includes("Refleksi Diri Semester 1 2026-2027.md") && r.includes("Permendikdasmen No. 1 Tahun 2026"), r)

  writeFileSync(join(akar, "guru/masukan/daftar.xlsx"), buatXlsx([{ nama: "S", baris: [["No", "Nama Siswa", "NISN", "L/P"], ...NAMA.map((n, i) => [i + 1, n, `01234567${i}0`, i % 2 ? "P" : "L"])].map((b) => b.map((v) => ({ v }))) }]))
  await jalan("baca_masukan")
  await jalan("susun_perencanaan", { mapel: "matematika" })
  await jalan("buat_nilai_excel", { mapel: "matematika", semester: 1 })
  await jalan("buat_absensi_excel", { bulan: 10 })
  await jalan("buat_analisis_butir_excel", { judul: "UH Pecahan", jumlah_soal: 5, kunci: "ABCD1" })
  const f = (a: string) => join(adm, readdirSync(adm).find((x) => x.startsWith(a))!)
  isiSel(f("Buku Nilai"), {
    C9: 85, D9: 80, E9: 75, F9: 90, G9: 88, C10: 90, D10: 78, E10: 60, F10: 72, G10: 95,
    C11: 70, D11: 72, E11: 80, F11: 65, G11: 70, C12: 95, D12: 92, E12: 88, F12: 90, G12: 96,
  })
  isiSel(f("Daftar Hadir"), { C9: "S", D9: "S", E9: "I", F9: "A", C10: "A", D10: "A", E10: "A" })
  // Jawaban: kop 4 baris, kepala baris 5, kunci baris 6, siswa mulai baris 7; soal 1–5 = kolom C–G.
  const jwb = ["ABCA1", "ABCA1", "BCCD0", "CCAD0"]
  const sel: Record<string, string | number> = {}
  jwb.forEach((j, s) => j.split("").forEach((v, k) => (sel[`${"CDEFG"[k]}${7 + s}`] = /\d/.test(v) ? Number(v) : v)))
  isiSel(f("Analisis Butir Soal"), sel)
  const hb = bacaButir(new Uint8Array(readFileSync(f("Analisis Butir Soal"))), "UH Pecahan")!
  cek("analisis butir dihitung ulang dari jawaban: 4 siswa, rata 55, mudah/sedang/sukar 1/4/0, daya beda negatif soal 4", hb.peserta === 4 && hb.rataNilai === 55 && `${hb.mudah}/${hb.sedang}/${hb.sukar}` === "1/4/0" && hb.dayaNegatif.join() === "4", JSON.stringify(hb))

  mkdirSync(join(akar, "guru/draf/4 Administrasi"), { recursive: true })
  writeFileSync(join(akar, "guru/draf/4 Administrasi/Jurnal Mengajar 2026-10.md"), "# JURNAL MENGAJAR\n\n## 2026-10-14 (Rabu)\n\n| Jam ke | Mapel | TP / materi | Kegiatan | Kehadiran | Catatan dan tindak lanjut |\n|---|---|---|---|---|---|\n| 1-2 | Matematika | TP3 Pecahan | Kertas lipat | 26 hadir | 4 murid belum paham penyebut berbeda |\n\n## 2026-10-15 (Kamis)\n\n| Jam ke | Mapel | TP / materi | Kegiatan | Kehadiran | Catatan dan tindak lanjut |\n|---|---|---|---|---|---|\n| 1-2 | Matematika | TP3 Pecahan | Diskusi | 28 hadir | - |\n")
  writeFileSync(join(akar, "guru/draf/4 Administrasi/Jurnal Mengajar 2026-06.md"), "# JURNAL MENGAJAR\n\n## 2026-06-10 (Rabu)\n\n| Jam ke | Mapel | TP / materi | Kegiatan | Kehadiran | Catatan dan tindak lanjut |\n|---|---|---|---|---|---|\n| 1 | IPAS | - | - | - | catatan semester lalu |\n")

  r = await jalan("bahan_refleksi_semester", { semester: 1, tanggal: "2026-12-10" })
  cek("nilai per TP: TP3 4 siswa, rata-rata 76, tuntas 75%", /\| TP3 \| [^|]+ \| 4 \| 76 \| 75% \|/.test(r), r)
  cek("tabel analisis butir: UH Pecahan, 4 siswa, 5 soal, rata 55, 1/4/0, negatif nomor 4", /\| UH Pecahan \| 4 \| 5 \| 55 \| 1 \/ 4 \/ 0 \| [^|]+ \| 4 \|/.test(r), r)
  cek("kehadiran: sakit 2, izin 1, alpa 4", /Kehadiran rata-rata [\d.]+% \(1 bulan; sakit 2, izin 1, alpa 4/.test(r), r)
  cek("jurnal: 2 hari semester ini, catatan tindak lanjut ikut, catatan semester lalu tidak", r.includes("Jurnal mengajar terisi 2 hari") && r.includes("2026-10-14: 4 murid belum paham penyebut berbeda") && !r.includes("semester lalu"), r)
  cek("TP berketuntasan < 75% disebut", r.includes("TP dengan ketuntasan di bawah 75%") || r.includes("tuntas oleh ≥75%"), r)
  cek("tidak ada nama siswa di bahan refleksi", !NAMA.some((n) => r.includes(n) || r.includes(n.split(" ")[0])), r)

  // Pengingat kewajiban: 21 hari sebelum akhir semester (18 Des) sampai 45 hari sesudahnya.
  cek("pengingat: belum muncul 16 Okt (akhir semester masih jauh)", (await pengingatRefleksi(akar, "2026-10-16")) === null)
  const p = await pengingatRefleksi(akar, "2026-12-01")
  cek("pengingat: muncul 1 Des, menyebut wajib, dasar hukum, dan tanggal akhir semester", !!p && p.includes("wajib") && p.includes("Pasal 15") && p.includes("18 Desember 2026"), String(p))
  cek("blok ingatan memuat KEWAJIBAN refleksi", (await blokIngatan(akar, "2026-12-01")).includes("KEWAJIBAN: Refleksi diri semester 1"))
  const st = await jalan("status_perangkat", { tanggal: "2026-12-01" }).catch(() => "")
  cek("status perangkat: baris refleksi dan langkah berikutnya", st.includes("Refleksi diri semester 1") && st.includes("skill refleksi-pembelajaran"), st.slice(-1500))

  // Draf belum lengkap → catatan bagian yang hilang; lengkap → pengingat hilang.
  const dir = "guru/draf/3 Asesmen/Refleksi Pembelajaran"
  mkdirSync(join(akar, dir), { recursive: true })
  writeFileSync(join(akar, dir, "Refleksi Diri Semester 1 2026-2027.md"), "# REFLEKSI DIRI GURU\n\n## A. Data Hasil Belajar Murid\nData.\n\n## B. Refleksi Perencanaan Pembelajaran\nIsi.\n")
  let w = await jalan("ekspor_word", { berkas: `${dir}/Refleksi Diri Semester 1 2026-2027.md` })
  cek("ekspor draf tidak lengkap → daftar bagian refleksi yang belum ada", w.includes("Bagian refleksi diri yang belum ada") && w.includes("F. Rencana Perbaikan Semester Berikutnya"), w)
  cek("setelah Word refleksi ada → pengingat kewajiban hilang", (await pengingatRefleksi(akar, "2026-12-01")) === null)
} finally {
  rmSync(akar, { recursive: true, force: true })
}
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
