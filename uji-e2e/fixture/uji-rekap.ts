// Uji pengisian rekap nilai buatan sekolah (diisi guru, dimasukkan operator ke e-Rapor). Templat tiruan meniru struktur
// berkas sekolah asli (baris kode tersembunyi, judul mapel digabung, sub-kolom UH/TUGAS/UTS, kolom SDIT, kehadiran),
// dengan nama dan nomor samaran.
// Pakai: cd uji-e2e/fixture && bun uji-rekap.ts
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { bacaTabelXlsx } from "../../AsistenGuru/.opencode/lib/masukan.ts"
import { adalahRekap, cocokMapel, jenisDariJudul } from "../../AsistenGuru/.opencode/lib/rekapsekolah.ts"
import { bacaZip } from "../../AsistenGuru/.opencode/lib/unzip.ts"
import { G, buatXlsx } from "../../AsistenGuru/.opencode/lib/xlsx.ts"
import { buatZip } from "../../AsistenGuru/.opencode/lib/zip.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i.slice(0, 1500).replace(/\n/g, "\n    ")}` : ""}`); if (!b) gagal++ }
const NAMA = ["Andi Pratama", "Bunga Lestari", "Andika Putra", "Dewi Anggraini"]
const NISN = ["0123456710", "0123456711", "0123456712", "0123456713"]

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

/** Templat tiruan: A NO, B NAMA, C NIS, D NISN, E–G PAI, H–J MATEMATIKA, K–M SUNDANESSE, N TAHSIN, O SAKIT, P IZIN, Q ALFA. */
function templat(isiSiswa: boolean, urut = [0, 1, 2, 3]) {
  const k = (v: string) => ({ v, s: G.kepala })
  const baris: any[][] = [
    ["NO", "NAMA ", "NIS ", "NISN ", "PAI 1", "PAI 2", "PAI 3", "MTK 1", "MTK 2", "MTK 3 ", "SL 1", "SL 2", "SL 3", "TAHSIN ", "SAKIT ", "IZIN ", "ALFA "].map(k),
    ["NO", "NAMA ", "NIS ", "NISN ", "PENDIDIKAN AGAMA ISLAM ", "", "", "MATEMATIKA ", "", "", "SUNDANESSE LANGUAGE ", "", "", "TAHSIN ", "SAKIT ", "IZIN ", "ALFA"].map(k),
    ["", "", "", "", "NILAI UH ", "NILAI TUGAS ", "NILAI UTS ", "NILAI UH ", "NILAI TUGAS ", "NILAI UTS ", "NILAI UH ", "NILAI TUGAS ", "NILAI UTS ", "", "", "", ""].map(k),
  ]
  if (isiSiswa) urut.forEach((i, r) => baris.push([{ v: r + 1 }, { v: NAMA[i] }, { v: 262701000 + i }, { v: Number(NISN[i]) }, ...Array(13).fill({ v: "", s: G.tengahInput })]))
  return buatXlsx([{ nama: "Sheet1", baris, gabung: ["A2:A3", "B2:B3", "C2:C3", "D2:D3", "E2:G2", "H2:J2", "K2:M2", "N2:N3", "O2:O3", "P2:P3", "Q2:Q3"] }])
}

// ---------- Pengenal judul ----------
cek("jenis kolom dari judul", jenisDariJudul("NILAI UH ") === "uh" && jenisDariJudul("NILAI UTS") === "uts" && jenisDariJudul("NILAI TUGAS") === "tugas" && jenisDariJudul("PAS") === "uas" && jenisDariJudul("NISN ") === "nisn" && jenisDariJudul("NIS ") === "nis" && jenisDariJudul("ALFA") === "alfa" && jenisDariJudul("IBADAH") === "lain")
const mp = ["Pendidikan Agama Islam dan Budi Pekerti", "Matematika", "Bahasa Inggris", "Seni Rupa"]
cek("mapel dari judul/singkatan", cocokMapel("MTK 1", mp) === "Matematika" && cocokMapel("PENDIDIKAN AGAMA ISLAM ", mp) === mp[0] && cocokMapel("ENGLISH LANGUAGE", mp) === "Bahasa Inggris" && cocokMapel("SENI BUDAYA & PRAKARYA", mp) === "Seni Rupa" && cocokMapel("ICT", mp) === null)
cek("adalahRekap: templat rekap ya, daftar siswa biasa tidak", adalahRekap(templat(true)) && !adalahRekap(buatXlsx([{ nama: "S", baris: [["No", "Nama", "NISN"], [1, "A", "1"]].map((b) => b.map((v) => ({ v }))) }])))

const akar = mkdtempSync(join(tmpdir(), "asisten-rekap-"))
try {
  cpSync(join(SINI, "../../AsistenGuru"), akar, { recursive: true })
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  cpSync(join(SINI, "sekolah/kebijakan.json"), join(akar, "sekolah/kebijakan.json"))
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => ({}) } })
  const jalan = async (n: string, a: any = {}) => (await alat[n].execute(a, {})).content as string
  const adm = join(akar, "hasil/4 Administrasi")

  // Daftar Siswa dan data guru (buku nilai Matematika semester 1, daftar hadir Oktober).
  writeFileSync(join(akar, "guru/masukan/daftar.xlsx"), buatXlsx([{ nama: "S", baris: [["No", "Nama Siswa", "NISN", "NIS", "L/P"], ...NAMA.map((n, i) => [i + 1, n, NISN[i], String(262701000 + i), i % 2 ? "P" : "L"])].map((b) => b.map((v) => ({ v }))) }]))
  await jalan("baca_masukan")
  await jalan("susun_perencanaan", { mapel: "matematika" })
  await jalan("buat_nilai_excel", { mapel: "matematika", semester: 1 })
  await jalan("buat_absensi_excel", { bulan: 10 })
  const f = (a: string) => join(adm, readdirSync(adm).find((x) => x.startsWith(a))!)
  isiSel(f("Buku Nilai"), {
    C9: 85, D9: 80, E9: 75, F9: 90, G9: 88, I9: 82, J9: 84, C10: 90, D10: 78, E10: 60, F10: 72, G10: 95, I10: 70, J10: 74,
    C11: 70, D11: 72, E11: 80, F11: 65, G11: 70, C12: 95, D12: 92, E12: 88, F12: 90, G12: 96, I12: 90, J12: 93,
  })
  isiSel(f("Daftar Hadir"), { C9: "S", D9: "S", E9: "I", F9: "A", C10: "A", D10: "A", E10: "A" })

  // Daftar hadir Juli–September (sudah diisi guru) agar rentang semester s.d. Oktober lengkap.
  for (const b of [7, 8, 9]) {
    await jalan("buat_absensi_excel", { bulan: b })
    isiSel(join(adm, readdirSync(adm).find((x) => x.startsWith(`Daftar Hadir Kelas 4 2026-0${b}`))!), { C8: "S" })
  }

  // Templat dari operator: urutan siswa berbeda (dicocokkan lewat NISN), satu sel UTS sudah diisi guru.
  const t = templat(true, [3, 1, 0, 2])
  writeFileSync(join(akar, "guru/masukan/KELAS_4A_STS_GANJIL_2026.xlsx"), t)
  isiSel(join(akar, "guru/masukan/KELAS_4A_STS_GANJIL_2026.xlsx"), { J4: 99 })
  const m = await jalan("baca_masukan")
  cek("baca_masukan mengenali rekap dan menawarkan isi_rekap_sekolah (tanpa nama)", m.includes("REKAP NILAI") && m.includes("isi_rekap_sekolah") && !NAMA.some((n) => m.includes(n)), m)
  const r = await jalan("isi_rekap_sekolah", { berkas: "KELAS_4A_STS_GANJIL_2026.xlsx", semester: 1, sampai: "2026-10-31" })
  cek("hasil: 4 baris cocok, Matematika UH dan UTS + kehadiran terisi, 1 sel yang sudah diisi tidak ditimpa", r.includes("4 baris siswa; 4 cocok") && /Matematika UH 4 sel/.test(r) && /Matematika UTS 2 sel/.test(r) && /kehadiran 12 sel/.test(r) && r.includes("1 sel sudah berisi"), r)
  cek("kolom yang masih diisi guru disebut (PAI, TUGAS, Sunda, Tahsin)", ["Matematika (TUGAS)", "PENDIDIKAN AGAMA ISLAM", "SUNDANESSE LANGUAGE", "TAHSIN"].every((x) => r.includes(x)), r)
  cek("hasil alat tanpa nama siswa", !NAMA.some((n) => r.includes(n)), r)
  const out = readdirSync(adm).find((x) => x.endsWith("(diisi).xlsx"))!
  cek("nama hasil bersih (tanpa awalan folder terkunci)", out === "KELAS_4A_STS_GANJIL_2026 (diisi).xlsx", out)
  const sel = bacaTabelXlsx(new Uint8Array(readFileSync(join(adm, out))), 20, 20)[0].sel
  const baris = (nama: string) => sel.find((b) => b[1] === nama)!
  // Dewi (baris 4): UH = rata(95,92,88,90,96)=92, UTS 90 tapi sel sudah 99 → tetap 99. Bunga: UH 79, UTS 70, S0 I0 A3.
  cek("Dewi: UH 92, UTS tetap 99 (diisi guru)", baris("Dewi Anggraini")[7] === "92" && baris("Dewi Anggraini")[9] === "99", JSON.stringify(baris("Dewi Anggraini")))
  // Daftar hadir: data mulai baris 8, jadi baris 9 = Bunga (S S I A) dan baris 10 = Andika (A A A).
  cek("Bunga: UH 79, UTS 70; sakit 2, izin 1, alfa 1", baris("Bunga Lestari")[7] === "79" && baris("Bunga Lestari")[9] === "70" && baris("Bunga Lestari")[14] === "2" && baris("Bunga Lestari")[15] === "1" && baris("Bunga Lestari")[16] === "1", JSON.stringify(baris("Bunga Lestari")))
  cek("Andi: sakit 3 (Juli–Sep), alfa 0 ditulis '-' seperti kebiasaan templat; Andika alfa 3, tanpa STS → UTS kosong", baris("Andi Pratama")[14] === "3" && baris("Andi Pratama")[16] === "-" && baris("Andika Putra")[16] === "3" && !baris("Andika Putra")[9], JSON.stringify([baris("Andi Pratama"), baris("Andika Putra")]))
  cek("PAI, TUGAS, Sunda, Tahsin tetap kosong", [4, 5, 6, 8, 10, 11, 12, 13].every((k) => !baris("Dewi Anggraini")[k]))
  const asli = bacaZip(t), hasil = bacaZip(new Uint8Array(readFileSync(join(adm, out))))
  const td = new TextDecoder()
  cek("format sekolah dipertahankan: gabungan sel, gaya, lembar sama", td.decode(hasil.get("xl/styles.xml")) === td.decode(asli.get("xl/styles.xml")) && (td.decode(hasil.get("xl/worksheets/sheet1.xml")).match(/<mergeCell /g) ?? []).length === 11 && td.decode(hasil.get("xl/workbook.xml")) === td.decode(asli.get("xl/workbook.xml")))
  cek("templat dipindah dari folder masukan ke folder terkunci", !existsSync(join(akar, "guru/masukan/KELAS_4A_STS_GANJIL_2026.xlsx")) && readdirSync(adm).some((x) => x.includes("KELAS_4A_STS_GANJIL_2026") && !x.includes("(diisi)")))
  const r2 = await jalan("isi_rekap_sekolah", { berkas: "KELAS_4A_STS_GANJIL_2026.xlsx", semester: 1, sampai: "2026-10-31", timpa: true })
  const out2 = readdirSync(adm).find((x) => x.endsWith("(diisi) 2.xlsx"))!
  const sel2 = bacaTabelXlsx(new Uint8Array(readFileSync(join(adm, out2))), 20, 20)[0].sel
  cek("timpa=true: UTS Dewi menjadi 90 dari buku nilai; berkas hasil sebelumnya tidak ditimpa", sel2.find((b) => b[1] === "Dewi Anggraini")![9] === "90" && !!out, r2)

  const r5 = await jalan("isi_rekap_sekolah", { semester: 1, sampai: "2026-10-31" })
  cek("tanpa berkas: memakai templat rekap terakhir di folder terkunci (isi ulang)", r5.startsWith("Selesai") && r5.includes("KELAS_4A_STS_GANJIL_2026"), r5)

  // Bulan November belum diisi → kehadiran sampai November tidak boleh diisi sama sekali.
  await jalan("buat_absensi_excel", { bulan: 11 })
  const r4 = await jalan("isi_rekap_sekolah", { berkas: "KELAS_4A_STS_GANJIL_2026.xlsx", semester: 1, sampai: "2026-11-20" })
  cek("daftar hadir November kosong → S/I/A tidak diisi, bulan disebut, larangan membuat daftar hadir kosong", !/kehadiran \d+ sel/.test(r4) && r4.includes("TIDAK diisi") && r4.includes("2026-11"), r4)

  // Templat kosong (hanya judul): identitas diisi dari Daftar Siswa.
  writeFileSync(join(akar, "guru/masukan/Rekap Kosong.xlsx"), templat(false))
  const r3 = await jalan("isi_rekap_sekolah", { berkas: "Rekap Kosong.xlsx", semester: 1, sampai: "2026-10-31" })
  const out3 = readdirSync(adm).find((x) => x.startsWith("Rekap Kosong (diisi)"))!
  const sel3 = bacaTabelXlsx(new Uint8Array(readFileSync(join(adm, out3))), 20, 20)[0].sel
  cek("templat kosong: 4 siswa diisi berurutan (NO, nama, NIS, NISN) beserta nilai", sel3[3]?.[0] === "1" && sel3[3]?.[1] === NAMA[0] && sel3[3]?.[3] === NISN[0] && sel3[6]?.[1] === NAMA[3] && sel3[6]?.[7] === "92", JSON.stringify(sel3.slice(3, 7)) + "\n" + r3)
} finally {
  rmSync(akar, { recursive: true, force: true })
}
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
