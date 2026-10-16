// Uji Daftar Siswa: nama diambil otomatis dari berkas yang sudah ada (Dapodik, e-Rapor, daftar hadir lama, CSV) lalu
// dipakai semua Excel — dan TIDAK PERNAH muncul di teks yang diterima asisten.
// Pakai: cd uji-e2e/fixture && bun uji-siswa.ts

import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buatDocx } from "../../AsistenGuru/.opencode/lib/docx.ts"
import { bacaTabelXlsx } from "../../AsistenGuru/.opencode/lib/masukan.ts"
import { kenaliDaftar, normRombel } from "../../AsistenGuru/.opencode/lib/siswa.ts"
import { buatXlsx } from "../../AsistenGuru/.opencode/lib/xlsx.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i.slice(0, 900).replace(/\n/g, "\n    ")}` : ""}`); if (!b) gagal++ }

const A = ["Andi Pratama", "Bunga Lestari", "Candra Wijaya"] // rombel 4A
const B = ["Dimas Saputra", "Eka Rahmawati"] // rombel 4B
const SEMUA = [...A, ...B, "Fajar Nugroho", "Gita Permata", "Hana Salsabila"]
const xlsx = (baris: (string | number)[][]) => buatXlsx([{ nama: "Lembar1", baris: baris.map((b) => b.map((v) => ({ v }))) }])
const bocor = (t: string) => SEMUA.filter((n) => t.includes(n))

// ---------- Pengenal tabel (tanpa alat) ----------
const dapodik = xlsx([
  ["Daftar Peserta Didik"], ["SD NEGERI UJI"], ["Kecamatan Uji"], [],
  ["No", "Nama", "NIPD", "JK", "NISN", "Tempat Lahir", "Tanggal Lahir", "Rombel Saat Ini"],
  [1, A[0], "2001", "L", "0123456781", "Bandung", "2016-01-02", "Kelas 4A"],
  [2, A[1], "2002", "P", "0123456782", "Bandung", "2016-02-03", "Kelas 4A"],
  [3, B[0], "2003", "L", "0123456783", "Bandung", "2016-03-04", "Kelas 4B"],
  [4, A[2], "2004", "L", "123456784", "Bandung", "2016-04-05", "Kelas 4A"],
  [5, B[1], "2005", "P", "0123456785", "Bandung", "2016-05-06", "Kelas 4B"],
])
let d = kenaliDaftar(bacaTabelXlsx(dapodik, 3000, 40))
cek("Dapodik: tabel di bawah judul dikenali, 5 siswa, rombel terbaca, NISN 9 digit diberi nol depan", d?.siswa.length === 5 && d.adaRombel && d.siswa[3].nisn === "0123456784" && d.siswa[1].jk === "P", JSON.stringify(d))
cek("rombel: 'Kelas IV A', '4 A', '4a' setara", normRombel("Kelas IV A") === "4a" && normRombel("4 A") === "4a" && normRombel("4a") === "4a")
const erapor = xlsx([["FORMAT IMPORT NILAI RAPOR MATEMATIKA (UMUM), KELAS 4A"], [], ["NO", "NISN", "NAMA SISWA", "NILAI RAPOR", "TINGKAT KETERCAPAIAN TP"], ["", "", "", "", "TP.511"], [1, "0123456781", A[0], 83, "T"], [2, "0123456782", A[1], 86, "R"], [3, "0123456784", A[2], 87, "T"]])
d = kenaliDaftar(bacaTabelXlsx(erapor))
cek("format nilai e-Rapor: 3 siswa dengan NISN", d?.siswa.length === 3 && d.siswa.every((s) => s.nisn?.length === 10), JSON.stringify(d))
const guruList = xlsx([["No", "Nama", "NIP", "Jabatan"], [1, "Ibu Guru Satu", "1987", "Guru Kelas"], [2, "Bapak Guru Dua", "1988", "Guru PJOK"]])
cek("daftar guru (Nama + NIP) BUKAN daftar siswa", kenaliDaftar(bacaTabelXlsx(guruList)) === null)
const kalender = xlsx([["Tanggal", "Kegiatan"], ["2026-08-17", "HUT RI"]])
cek("kalender BUKAN daftar siswa", kenaliDaftar(bacaTabelXlsx(kalender)) === null)

// ---------- Lewat plugin (seperti di OpenCode) ----------
const akar = mkdtempSync(join(tmpdir(), "asisten-guru-siswa-"))
const keluaran: string[] = []
try {
  cpSync(join(SINI, "../../AsistenGuru"), akar, { recursive: true })
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  cpSync(join(SINI, "sekolah/kebijakan.json"), join(akar, "sekolah/kebijakan.json"))
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => ({}) } })
  const jalan = async (n: string, a: any = {}) => { const t = (await alat[n].execute(a, {})).content as string; keluaran.push(t); return t }
  const adm = join(akar, "hasil/4 Administrasi")
  const namaDi = (rel: string) => { const s = JSON.stringify(bacaTabelXlsx(readFileSync(join(akar, rel)), 300, 60)); return SEMUA.filter((n) => s.includes(n)) }
  let r: string

  r = await jalan("daftar_siswa")
  cek("belum ada sumber → arahkan menaruh ekspor Dapodik/e-Rapor/daftar hadir lama di folder masukan", r.includes("belum ada") && r.includes("Dapodik") && r.includes("guru\\masukan"), r)
  r = await jalan("buat_absensi_excel", { bulan: 10 })
  const hadirKosong = readdirSync(adm).find((f) => f.startsWith("Daftar Hadir"))!
  cek("absensi tanpa Daftar Siswa: nama kosong + petunjuk menaruh berkas", r.includes("Daftar Siswa belum ada") && namaDi(`hasil/4 Administrasi/${hadirKosong}`).length === 0, r)

  // Ekspor Dapodik satu sekolah ditaruh di folder masukan.
  writeFileSync(join(akar, "guru/masukan/Daftar Peserta Didik SD.xlsx"), dapodik)
  writeFileSync(join(akar, "guru/masukan/Data Siswa.docx"), buatDocx(`| No | Nama | NISN |\n|---|---|---|\n${[...A, ...B].map((n, i) => `| ${i + 1} | ${n} | 012345678${i + 1} |`).join("\n")}\n`, {}).data)
  r = await jalan("baca_masukan")
  cek("masukan: Dapodik dua rombel → isi tidak ditampilkan, tanya rombel dengan jumlah per rombel", r.includes("DAFTAR SISWA") && r.includes("Kelas 4A (3 siswa)") && r.includes("Kelas 4B (2 siswa)"), r)
  cek("masukan: berkas Dapodik dipindah ke folder terkunci", !existsSync(join(akar, "guru/masukan/Daftar Peserta Didik SD.xlsx")) && existsSync(join(adm, "Sumber Daftar Siswa - Daftar Peserta Didik SD.xlsx")), r)
  cek("masukan: Word berisi NISN ditolak tampil (data pribadi)", r.includes("Data Siswa.docx") && r.includes("tidak ditampilkan"), r)
  r = await jalan("baca_masukan", { berkas: "Data Siswa.docx" })
  cek("masukan: membaca Word berisi NISN langsung → GAGAL", r.startsWith("GAGAL") && r.includes("data pribadi"), r)
  r = await jalan("daftar_siswa", { berkas: "Daftar Peserta Didik SD.xlsx", rombel: "4A" })
  cek("daftar_siswa memakai nama berkas lama (sudah dipindah ke folder terkunci) + rombel 4A → 3 siswa (2 L, 1 P), NISN 3/3", r.includes("dibuat") && r.includes("3 siswa (2 L, 1 P), NISN 3/3"), r)
  const profil = JSON.parse(readFileSync(join(akar, "guru/profil.json"), "utf8"))
  cek("profil: jumlah_siswa 3 dan rombel 4A tersimpan (tanpa nama)", profil.jumlah_siswa === 3 && profil.rombel === "4A" && bocor(JSON.stringify(profil)).length === 0)
  cek("Daftar Siswa.xlsx berisi nama rombel 4A saja", JSON.stringify(namaDi("hasil/4 Administrasi/Daftar Siswa.xlsx")) === JSON.stringify(A))

  // Semua Excel berikutnya terisi nama otomatis.
  r = await jalan("buat_absensi_excel", { bulan: 11 })
  const hadir = readdirSync(adm).find((f) => f.includes("11 November"))!
  cek("absensi November: 3 baris, nama terisi otomatis", r.includes("Nama 3 siswa terisi otomatis") && r.includes("3 baris siswa") && JSON.stringify(namaDi(`hasil/4 Administrasi/${hadir}`)) === JSON.stringify(A), r)
  r = await jalan("susun_perencanaan", { mapel: "matematika" })
  r = await jalan("buat_nilai_excel", { mapel: "matematika", semester: 1 })
  const nilai = readdirSync(adm).find((f) => f.startsWith("Buku Nilai"))
  cek("buku nilai: nama terisi otomatis", !!nilai && r.includes("terisi otomatis") && namaDi(`hasil/4 Administrasi/${nilai}`).length === 3, r)
  cpSync(join(SINI, "sekolah"), join(akar, "sekolah"), { recursive: true })

  // Guru menambah siswa pindahan langsung di Excel? Daftar baru dari e-Rapor → tidak langsung mengganti.
  writeFileSync(join(akar, "guru/masukan/f_nilai_4A_Matematika.xlsx"), xlsx([["FORMAT IMPORT NILAI RAPOR"], ["NO", "NISN", "NAMA SISWA", "NILAI RAPOR"], [1, "0123456781", A[0], ""], [2, "0123456782", A[1], ""], [3, "0123456784", A[2], ""], [4, "0123456790", "Fajar Nugroho", ""]]))
  r = await jalan("baca_masukan")
  cek("masukan: format e-Rapor berisi 1 siswa baru → laporkan selisih, tanya dulu sebelum mengganti", r.includes("1 baru, 0 tidak ada lagi") && r.includes("ganti=true"), r)
  const sumber2 = r.match(/berkas="([^"]+)"/)?.[1] ?? ""
  r = await jalan("daftar_siswa", { berkas: sumber2, ganti: true })
  cek("daftar_siswa ganti=true → 4 siswa", r.includes("diganti") && r.includes("4 siswa"), r)

  // CSV dan daftar hadir lama sebagai sumber cadangan.
  rmSync(join(adm, "Daftar Siswa.xlsx"))
  r = await jalan("daftar_siswa")
  cek("Daftar Siswa terhapus → dibuat lagi otomatis dari Excel administrasi terbaru yang berisi nama", r.includes("baru dibuat otomatis dari") && /\d siswa/.test(r), r)
  writeFileSync(join(akar, "guru/masukan/siswa.csv"), `No;Nama Siswa;NISN;L/P\n1;Gita Permata;0123450001;P\n2;Hana Salsabila;0123450002;P\n`)
  r = await jalan("daftar_siswa", { berkas: "siswa.csv", ganti: true })
  cek("CSV (pemisah titik koma) → 2 siswa P, berkas dipindah", r.includes("2 siswa (0 L, 2 P)") && !existsSync(join(akar, "guru/masukan/siswa.csv")), r)
  r = await jalan("daftar_siswa", { berkas: "../sekolah/kebijakan.json" })
  cek("daftar_siswa menolak berkas di luar masukan/administrasi", r.startsWith("GAGAL"), r)

  // Izin OpenCode: asisten tidak bisa membaca/mengubah berkas berisi nama.
  const izin = JSON.parse(readFileSync(join(akar, "opencode.json"), "utf8")).permissions as { action: string; resource: string; effect: string }[]
  const tolak = (a: string, res: string) => izin.some((x) => x.action === a && x.resource === res && x.effect === "deny")
  cek("izin: baca/ubah hasil/4 Administrasi/* ditolak; Penilaian Kokurikuler dikunci; baca guru/masukan/* lewat alat saja; grep mati",
    tolak("read", "hasil/4 Administrasi/*") && tolak("edit", "hasil/4 Administrasi/*") && tolak("read", "hasil/5 Kokurikuler/Penilaian Kokurikuler*") && tolak("read", "guru/masukan/*") && tolak("grep", "*"))
} finally {
  rmSync(akar, { recursive: true, force: true })
}
const semua = keluaran.join("\n")
cek(`PRIVASI: tidak satu pun nama siswa muncul di ${keluaran.length} jawaban alat yang diterima asisten`, bocor(semua).length === 0, bocor(semua).join(", "))
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
