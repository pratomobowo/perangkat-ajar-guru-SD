// Uji analisis_siswa: guru mengisi nilai/absensi di Excel, lalu bertanya tentang satu anak atau kelas.
// Data dihitung lokal; teks untuk asisten memakai nomor absen, laporan bernama hanya di folder terkunci.
// Pakai: cd uji-e2e/fixture && bun uji-analisis.ts

import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { bacaTabelXlsx } from "../../AsistenGuru/.opencode/lib/masukan.ts"
import { bacaZip } from "../../AsistenGuru/.opencode/lib/unzip.ts"
import { buatXlsx } from "../../AsistenGuru/.opencode/lib/xlsx.ts"
import { buatZip } from "../../AsistenGuru/.opencode/lib/zip.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i.slice(0, 1400).replace(/\n/g, "\n    ")}` : ""}`); if (!b) gagal++ }
const NAMA = ["Andi Pratama", "Bunga Lestari", "Andika Putra", "Dewi Anggraini"]
const bocor = (t: string) => NAMA.filter((n) => t.includes(n) || t.includes(n.split(" ")[1]))

/** Meniru guru mengisi sel di Excel (lembar pertama). Angka → nilai, teks → teks. */
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

const akar = mkdtempSync(join(tmpdir(), "asisten-guru-analisis-"))
const keluaran: string[] = []
try {
  cpSync(join(SINI, "../../AsistenGuru"), akar, { recursive: true })
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  cpSync(join(SINI, "sekolah/kebijakan.json"), join(akar, "sekolah/kebijakan.json"))
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => ({}) } })
  const jalan = async (n: string, a: any = {}) => { const t = (await alat[n].execute(a, {})).content as string; keluaran.push(t); return t }
  const adm = join(akar, "hasil/4 Administrasi")
  let r: string

  r = await jalan("analisis_siswa", { siswa: "Bunga" })
  cek("belum ada data → GAGAL dengan arahan", r.startsWith("GAGAL") && r.includes("/nilai"), r)

  // Daftar siswa dari berkas guru → buku nilai dan daftar hadir terisi nama.
  writeFileSync(join(akar, "guru/masukan/daftar.xlsx"), buatXlsx([{ nama: "S", baris: [["No", "Nama Siswa", "NISN", "L/P"], ...NAMA.map((n, i) => [i + 1, n, `01234567${i}0`, i % 2 ? "P" : "L"])].map((b) => b.map((v) => ({ v }))) }]))
  await jalan("baca_masukan")
  await jalan("susun_perencanaan", { mapel: "matematika" })
  await jalan("buat_nilai_excel", { mapel: "matematika", semester: 1 })
  await jalan("buat_absensi_excel", { bulan: 10 })
  const fNilai = join(adm, readdirSync(adm).find((f) => f.startsWith("Buku Nilai"))!)
  const fHadir = join(adm, readdirSync(adm).find((f) => f.startsWith("Daftar Hadir"))!)
  // Guru mengisi Excel: baris data mulai 9 (nilai) dan 8 (hadir). TP1..TP5 = C..G, STS I, SAS J.
  isiSel(fNilai, {
    C9: 85, D9: 80, E9: 75, F9: 90, G9: 88, I9: 82, J9: 84, // Andi
    C10: 90, D10: 78, E10: 60, F10: 72, G10: 95, I10: 70, J10: 74, // Bunga: TP3 belum tuntas
    C11: 70, D11: 72, E11: 80, F11: 65, G11: 70, // Andika: TP4 belum tuntas
    C12: 95, D12: 92, E12: 88, F12: 90, G12: 96, I12: 90, J12: 93, // Dewi
  })
  isiSel(fHadir, { C9: "S", D9: "S", E9: "I", F9: "A", C10: "A", D10: "A", E10: "A" }) // Bunga (baris 9) dan Andika (baris 10)

  r = await jalan("analisis_siswa", { siswa: "Bunga" })
  cek("analisis 'Bunga' → Siswa No. 2, TP3 60 BELUM TUNTAS (batas 70), rata-rata kelas TP3 76", r.includes("Siswa No. 2") && /TP3[^\n]*\| 60 \| 70 \| 76 \| BELUM TUNTAS/.test(r), r)
  cek("analisis: nilai rapor 76 dari bobot 50/25/25 (formatif 79, STS 70, SAS 74 → 75,5 dibulatkan seperti Excel), terkuat TP5 / terlemah TP3", r.includes("Nilai rapor: 76") && r.includes("Terkuat: TP5 (95)") && r.includes("Terlemah: TP3 (60)"), r)
  cek("analisis: kehadiran Oktober 2 sakit, 1 izin, 1 alpa", /Oktober 2026 \| \d+ \| 2 \| 1 \| 1 \|/.test(r), r)
  cek("analisis per nomor absen (\"2\") sama dengan per nama", (await jalan("analisis_siswa", { siswa: "2" })) === r)
  r = await jalan("analisis_siswa", { siswa: "andi" })
  cek("nama ganda ('andi' = Andi & Andika) → minta nama lengkap/nomor, hanya nomor yang disebut", r.startsWith("GAGAL") && r.includes("No. 1, No. 3"), r)
  r = await jalan("analisis_siswa", { siswa: "Andi Pratama" })
  cek("nama lengkap → tepat satu (No. 1)", r.includes("Siswa No. 1"), r)
  r = await jalan("analisis_siswa", { siswa: "Zaskia" })
  cek("nama tidak ada → GAGAL minta cek ejaan", r.startsWith("GAGAL") && r.includes("tidak ditemukan"), r)

  r = await jalan("analisis_siswa", {})
  cek("ringkasan kelas: TP3 belum tuntas No. 2, TP4 belum tuntas No. 3, alpa ≥ 3: No. 3", /TP3[^\n]*No\. 2/.test(r) && /TP4[^\n]*No\. 3/.test(r) && r.includes("Alpa 3 kali atau lebih: No. 3"), r)
  const laporan = readdirSync(adm).find((f) => f.startsWith("Analisis Kelas"))
  const isiLap = laporan ? JSON.stringify(bacaTabelXlsx(readFileSync(join(adm, laporan)), 50, 20)) : ""
  cek("laporan Excel kelas dengan nama dibuat di folder terkunci", !!laporan && NAMA.every((n) => isiLap.includes(n)) && r.includes(`hasil/4 Administrasi/${laporan}`), r)

  const paket = JSON.parse(readFileSync(join(SINI, "../../AsistenGuru/sekolah/kebijakan.json"), "utf8"))
  cek("kebijakan bawaan paket: privasi.nama_ke_ai = true (untuk model berbayar; sekolah bisa mengubah ke false)", paket.privasi?.nama_ke_ai === true)
  // Saklar sekolah: nama boleh ke AI (dengan persetujuan orang tua).
  const kp = join(akar, "sekolah/kebijakan.json")
  writeFileSync(kp, JSON.stringify({ ...JSON.parse(readFileSync(kp, "utf8")), privasi: { nama_ke_ai: true } }))
  const r2 = (await alat.analisis_siswa.execute({ siswa: "Bunga" }, {})).content as string
  cek("kebijakan privasi.nama_ke_ai = true → nama ikut di analisis", r2.includes("Bunga Lestari (No. 2)"), r2)
} finally {
  rmSync(akar, { recursive: true, force: true })
}
const semua = keluaran.join("\n")
cek(`PRIVASI (bawaan): tidak ada nama siswa di ${keluaran.length} jawaban alat`, bocor(semua).length === 0, bocor(semua).join(", "))
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
