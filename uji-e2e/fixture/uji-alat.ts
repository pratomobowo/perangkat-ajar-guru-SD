// Uji alat Asisten Guru tanpa OpenCode: menjalankan setiap alat di salinan AsistenGuru berisi data fixture,
// termasuk kondisi khas Windows (BOM dan CRLF dari Notepad, jalur dengan backslash, karakter terlarang).
// Pakai: cd uji-e2e/fixture && bun uji-alat.ts

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { jalurAman, relatif } from "../../AsistenGuru/.opencode/lib/berkas.ts"
import { Gagal } from "../../AsistenGuru/.opencode/lib/berkas.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
const PAKET = join(SINI, "../../AsistenGuru")
const CP = join(SINI, "sekolah/referensi/cp/matematika-fase-b.md")
const DRAF = join(SINI, "../contoh-hasil-v02/guru/draf")

let gagal = 0
function cek(nama: string, benar: boolean, info = "") {
  console.log(`${benar ? "✔" : "✖"} ${nama}${!benar && info ? `\n    ${info.replace(/\n/g, "\n    ")}` : ""}`)
  if (!benar) gagal++
}

/** Salinan paket + data guru fixture. `windows` = berkas sekolah disimpan ala Notepad (BOM + CRLF). */
function siapkan(windows: boolean) {
  const akar = mkdtempSync(join(tmpdir(), "asisten-guru-"))
  cpSync(PAKET, akar, { recursive: true })
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  const notepad = (s: string) => (windows ? "\uFEFF" + s.replace(/\r?\n/g, "\r\n") : s)
  writeFileSync(join(akar, "sekolah/kebijakan.json"), notepad(readFileSync(join(SINI, "sekolah/kebijakan.json"), "utf8")))
  writeFileSync(join(akar, "sekolah/referensi/cp/matematika-fase-b.md"), notepad(readFileSync(CP, "utf8")))
  cpSync(DRAF, join(akar, "guru/draf"), { recursive: true })
  return akar
}

/** Mendaftarkan plugin seperti OpenCode 2 lalu mengembalikan alat yang terdaftar. */
async function daftarAlat(akar: string) {
  const alat: Record<string, any> = {}
  await plugin.setup({
    location: { directory: akar },
    tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) },
  })
  return alat
}

for (const windows of [false, true]) {
  console.log(`\n== Data sekolah ${windows ? "ala Notepad Windows (BOM + CRLF)" : "biasa (UTF-8 + LF)"}`)
  const akar = siapkan(windows)
  try {
    const alat = await daftarAlat(akar)
    const jalan = async (n: string, input: any = {}) => (await alat[n].execute(input, {})).content as string
    cek("plugin mendaftarkan 6 alat", Object.keys(alat).length === 6, Object.keys(alat).join(", "))
    cek("semua alat bukan Code Mode", Object.values(alat).every((t: any) => t.options?.codemode === false))

    let r = await jalan("hitung_minggu_efektif")
    cek("hitung_minggu_efektif: 19 + 19 minggu efektif", /19/.test(r) && !r.startsWith("GAGAL"), r)

    r = await jalan("susun_perencanaan", { mapel: "matematika" })
    cek("susun_perencanaan: CP terbaca dan dokumen tersusun", r.startsWith("Selesai") && r.includes("5 elemen CP tercakup"), r)
    cek("susun_perencanaan: Promes tersimpan", existsSync(join(akar, "guru/data/promes-matematika.json")))
    const profilPath = join(akar, "guru/profil.json")
    const profilAsli = readFileSync(profilPath, "utf8")
    const { fase: _, ...tanpaFase } = JSON.parse(profilAsli)
    writeFileSync(profilPath, JSON.stringify(tanpaFase))
    r = await jalan("susun_perencanaan", { mapel: "matematika" })
    cek("susun_perencanaan: fase diturunkan dari kelas jika tidak ada di profil", r.startsWith("Selesai"), r)
    writeFileSync(profilPath, profilAsli)

    r = await jalan("agenda_hari_ini", { tanggal: "2026-10-16" })
    cek("agenda_hari_ini: jadwal dan TP minggu ini", r.includes("Jadwal hari jumat") && r.includes("minggu ini: TP"), r)
    r = await jalan("agenda_hari_ini", { tanggal: "16-10-2026" })
    cek("agenda_hari_ini: tanggal salah format → GAGAL yang jelas", r.startsWith("GAGAL"), r)

    const lkpd = "guru/draf/2 Modul dan LKPD/Matematika TP5 Kalimat Matematika dan Pola Bilangan/LKPD.md"
    r = await jalan("ekspor_word", { berkas: lkpd })
    cek("ekspor_word: jalur biasa", r.startsWith("Selesai") && r.includes("lembar_siswa"), r)
    r = await jalan("ekspor_word", { berkas: lkpd.replace(/\//g, "\\") })
    cek("ekspor_word: jalur Windows (backslash)", r.startsWith("Selesai"), r)
    r = await jalan("ekspor_word", { berkas: join(akar, lkpd) })
    cek("ekspor_word: jalur absolut di dalam folder", r.startsWith("Selesai"), r)
    r = await jalan("ekspor_word", { berkas: "sekolah/kebijakan.json" })
    cek("ekspor_word: menolak berkas di luar guru/draf", r.startsWith("GAGAL"), r)
    const crlf = "guru/draf/3 Asesmen/Uji CRLF/Soal.md"
    await Bun.write(join(akar, crlf), "\uFEFF# SOAL\r\n\r\n1. Berapa 2 + 3?\r\nA. 4\r\nB. 5\r\nC. 6\r\nD. 7\r\n")
    r = await jalan("ekspor_word", { berkas: crlf })
    cek("ekspor_word: draf CRLF + BOM", r.startsWith("Selesai"), r)
    const docXml = new TextDecoder().decode(readFileSync(join(akar, "hasil/3 Asesmen/Uji CRLF/Soal.docx")))
    cek("ekspor_word: tidak ada karakter CR di Word", !docXml.includes("\r"))

    r = await jalan("buat_absensi_excel", { bulan: 10 })
    cek("buat_absensi_excel: Oktober 2026", r.includes("Oktober 2026") && r.includes("22 hari sekolah"), r)
    r = await jalan("buat_absensi_excel", { bulan: 10 })
    cek("buat_absensi_excel: tidak menimpa berkas lama", r.includes("(2).xlsx"), r)
    r = await jalan("buat_absensi_excel", { bulan: 13 })
    cek("buat_absensi_excel: bulan 13 ditolak", r.startsWith("GAGAL"), r)

    r = await jalan("buat_nilai_excel", { mapel: "Matematika", semester: 1 })
    cek("buat_nilai_excel: semester 1", r.startsWith("Selesai") && r.includes("kolom TP"), r)
    r = await jalan("buat_nilai_excel", { mapel: "IPAS", semester: 1 })
    cek("buat_nilai_excel: mapel tidak ada → GAGAL", r.startsWith("GAGAL"), r)
  } finally {
    rmSync(akar, { recursive: true, force: true })
  }
}

console.log("\n== Jalur Windows")
cek("jalurAman: titik dua diganti", jalurAman("hasil/2 Modul/Matematika: Pecahan/LKPD.docx") === "hasil/2 Modul/Matematika- Pecahan/LKPD.docx")
cek("jalurAman: titik/spasi di ujung nama dibuang", jalurAman("guru/draf/Topik. /A.md") === "guru/draf/Topik/A.md")
cek("jalurAman: nama perangkat Windows", jalurAman("guru/draf/CON/a.md") === "guru/draf/_CON/a.md")
cek("relatif: backslash", relatif("C:\\Users\\Rina\\AsistenGuru", "guru\\draf\\a.md") === "guru/draf/a.md")
cek("relatif: absolut Windows (beda huruf besar)", relatif("C:\\Users\\Rina\\AsistenGuru", "c:\\users\\rina\\AsistenGuru\\guru\\draf\\a.md") === "guru/draf/a.md")
cek("Gagal tetap Error", new Gagal("x") instanceof Error)

console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
