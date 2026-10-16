// Uji administrasi wali kelas, pembagian kelompok, dan Excel analisis butir soal (struktur + privasi).
// Rumus analisis butir diuji terpisah di uji-e2e/rumus/uji-rumus-butir.ts.
// Pakai: cd uji-e2e/fixture && bun uji-walikelas.ts
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { bacaZip } from "../../AsistenGuru/.opencode/lib/unzip.ts"
import { simpanDaftarSiswa } from "../../AsistenGuru/.opencode/lib/siswa.ts"
import { type Anggota, bagiKelompok, paketWaliKelasXlsx, pengacak, selangJk } from "../../AsistenGuru/.opencode/lib/walikelas.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i.replace(/\n/g, "\n    ")}` : ""}`); if (!b) gagal++ }
const SINI = new URL(".", import.meta.url).pathname
const td = new TextDecoder()
const isiXlsx = (data: Uint8Array) => { const z = bacaZip(data); return [...z.keys()].filter((k) => k.startsWith("xl/worksheets/")).sort().map((k) => td.decode(z.get(k))) }
const namaLembar = (data: Uint8Array) => [...td.decode(bacaZip(data).get("xl/workbook.xml")).matchAll(/<sheet [^>]*name="([^"]*)"/g)].map((m) => m[1])

const NAMA = ["Adi Saputra", "Bunga Lestari", "Candra Wijaya", "Dewi Anggraini", "Eko Prasetyo", "Fitri Handayani", "Gilang Ramadhan", "Hani Maharani", "Irfan Hakim", "Jihan Aulia", "Kevin Pratama", "Laras Ayu", "Miko Ardiansyah", "Nadia Putri", "Oki Setiawan", "Putri Amelia", "Rizal Fahmi", "Salsa Nabila", "Taufik Hidayat", "Umi Kalsum", "Vino Bastian", "Wulan Sari", "Yoga Pratama", "Zahra Aulia", "Bima Sakti", "Citra Kirana", "Dimas Anggara"]
const siswa = NAMA.map((nama, i) => ({ nama, jk: (i % 2 === 0 ? "L" : "P") as "L" | "P" }))
const profil: any = { kelas: 4, rombel: "4A", tahun_ajaran: "2026/2027", mapel: [], nama_lengkap: "Rina Kusumawati", hari_sekolah: ["senin", "selasa", "rabu", "kamis", "jumat"] }

// ---------- Paket wali kelas ----------
const p = paketWaliKelasXlsx(profil, {} as any, siswa, { urutanDuduk: "selang_jk", benih: 1 })
const lembar = namaLembar(p.data), xml = isiXlsx(p.data)
cek("lima lembar: Struktur Organisasi, Jadwal Piket, Denah Tempat Duduk, Kesepakatan Kelas, Daftar Siswa", lembar.join() === "Struktur Organisasi,Jadwal Piket,Denah Tempat Duduk,Kesepakatan Kelas,Daftar Siswa", lembar.join())
cek("struktur organisasi: wali kelas terisi, nama jabatan dari dropdown Daftar Siswa", xml[0].includes("Rina Kusumawati") && xml[0].includes("&apos;Daftar Siswa&apos;!$B$2:$B$28") || xml[0].includes("'Daftar Siswa'!$B$2:$B$28"), xml[0].match(/<dataValidation[^>]*>.*?<\/dataValidation>/)?.[0] ?? "")
cek("jadwal piket: 5 hari, dibagi rata (selisih ≤ 1)", p.hari.join() === "Senin,Selasa,Rabu,Kamis,Jumat" && Math.max(...p.piket) - Math.min(...p.piket) <= 1 && p.piket.reduce((a, b) => a + b, 0) === 27, JSON.stringify(p))
cek("jadwal piket: tiap siswa tepat sekali", NAMA.every((n) => xml[1].split(`>${n}<`).length === 2))
const hariL = (h: number) => selangJk(siswa).filter((_, i) => i % 5 === h).map((s) => s.jk)
cek("jadwal piket: tiap hari ada laki-laki dan perempuan", [0, 1, 2, 3, 4].every((h) => hariL(h).includes("L") && hariL(h).includes("P")))
cek("denah: 14 meja (2 per meja), 4 baris × 4, setiap siswa satu kursi", p.meja === 14 && p.barisMeja === 4 && NAMA.every((n) => xml[2].split(`>${n}<`).length === 2) && xml[2].includes("PAPAN TULIS"))
cek("kesepakatan kelas: 10 kalimat bawaan", (xml[3].match(/<row /g) ?? []).length > 10 && xml[3].includes("Saling membantu"))
const p2 = paketWaliKelasXlsx({ ...profil, hari_sekolah: ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"] }, {} as any, siswa, { kesepakatan: ["Satu.", "Dua."], jabatan: ["Ketua", "Wakil"], perMeja: 1, kolomMeja: 5 })
const x2 = isiXlsx(p2.data)
cek("opsi: 6 hari sekolah, jabatan dan kesepakatan dari guru, 1 siswa per meja", p2.hari.length === 6 && p2.jabatan === 2 && x2[3].includes(">Satu.<") && !x2[3].includes("Saling membantu") && p2.meja === 27 && p2.barisMeja === 6)

// ---------- Pembagian kelompok ----------
const anggota: Anggota[] = siswa.map((s, i) => ({ no: i + 1, nama: s.nama, jk: s.jk, nilai: 50 + ((i * 37) % 50) }))
const semua = (g: Anggota[][]) => g.flat().map((a) => a.no).sort((a, b) => a - b).join()
for (const cara of ["acak", "campur_jk", "campur_nilai"] as const) {
  const g = bagiKelompok(anggota, 6, cara, pengacak(7))
  const uk = g.map((x) => x.length)
  cek(`${cara}: 6 kelompok, ukuran selisih ≤ 1, tiap siswa tepat sekali`, Math.max(...uk) - Math.min(...uk) <= 1 && semua(g) === anggota.map((a) => a.no).join(), uk.join())
}
const gj = bagiKelompok(anggota, 6, "campur_jk", pengacak(3))
cek("campur_jk: jumlah laki-laki per kelompok selisih ≤ 1", (() => { const l = gj.map((x) => x.filter((a) => a.jk === "L").length); return Math.max(...l) - Math.min(...l) <= 1 })())
const gn = bagiKelompok(anggota, 6, "campur_nilai", pengacak(3)), ga = bagiKelompok(anggota, 6, "acak", pengacak(3))
const sebaran = (g: Anggota[][]) => { const r = g.map((x) => x.reduce((s, a) => s + (a.nilai ?? 0), 0) / x.length); return Math.max(...r) - Math.min(...r) }
cek("campur_nilai: rata-rata nilai antarkelompok lebih rapat daripada acak, tiap kelompok punya siswa nilai tertinggi & terendah tersebar", sebaran(gn) < 8 && sebaran(gn) <= sebaran(ga), `${sebaran(gn).toFixed(1)} vs acak ${sebaran(ga).toFixed(1)}`)
cek("kelompok lebih banyak dari siswa → GAGAL", (() => { try { bagiKelompok(anggota.slice(0, 3), 5, "acak", Math.random); return false } catch { return true } })())

// ---------- Lewat plugin (privasi: hasil alat tanpa nama) ----------
const akar = mkdtempSync(join(tmpdir(), "asisten-walikelas-"))
try {
  cpSync(join(SINI, "../../AsistenGuru"), akar, { recursive: true })
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => { throw new Error("x") } } })
  const jalan = async (n: string, i: any = {}) => (await alat[n].execute(i, {})).content as string
  const t0 = await jalan("buat_administrasi_wali_kelas")
  cek("tanpa Daftar Siswa: GAGAL dengan arahan folder masukan", t0.startsWith("GAGAL") && t0.includes("guru\\masukan"), t0)
  await simpanDaftarSiswa(akar, siswa, "uji")
  const t1 = await jalan("buat_administrasi_wali_kelas", { urutan_duduk: "acak" })
  const t2 = await jalan("buat_kelompok", { judul: "IPAS Ekosistem", jumlah_kelompok: 5, kecuali: [3, 4] })
  const t3 = await jalan("buat_analisis_butir_excel", { judul: "STS Matematika Semester 1", jumlah_soal: 20, kunci: "ABCDABCDABCDABCDABCD" })
  const t4 = await jalan("buat_kelompok", { cara: "campur_nilai", mapel: "Matematika" })
  const adm = readdirSync(join(akar, "hasil/4 Administrasi"))
  cek("tiga Excel di hasil/4 Administrasi (terkunci dari asisten)", ["Administrasi Wali Kelas 4", "Kelompok IPAS Ekosistem", "Analisis Butir Soal STS Matematika Semester 1.xlsx"].every((x) => adm.some((f) => f.startsWith(x))), adm.join(" | "))
  cek("hasil alat ke asisten tidak memuat satu pun nama siswa", ![t1, t2, t3, t4].some((t) => NAMA.some((n) => t.includes(n))), [t1, t2, t3].join("\n"))
  cek("kelompok: 25 siswa (2 tidak ikut), ringkasan L/P per kelompok", t2.includes("5 kelompok dari 25 siswa (2 tidak ikut)") && /K1: \d siswa \(L \d, P \d\)/.test(t2), t2)
  cek("campur_nilai tanpa buku nilai berisi → GAGAL yang jelas", t4.startsWith("GAGAL") && t4.includes("campur_jk"), t4)
  const f = adm.find((x) => x.startsWith("Analisis Butir"))!
  const xb = isiXlsx(new Uint8Array(readFileSync(join(akar, "hasil/4 Administrasi", f))))
  cek("analisis butir: nama terisi, kunci 20 soal terisi, validasi A–D/1/0, jawaban salah diwarnai", NAMA.every((n) => xb[0].includes(`>${n}<`)) && (xb[0].match(/>[ABCD]</g) ?? []).length >= 20 && xb[0].includes("&quot;A,B,C,D,0,1&quot;") && xb[0].includes('type="expression"'))
  const kel = adm.find((x) => x.startsWith("Kelompok"))!
  const xk = isiXlsx(new Uint8Array(readFileSync(join(akar, "hasil/4 Administrasi", kel))))[0]
  cek("Excel kelompok: siswa yang tidak ikut tidak tercantum", !xk.includes(`>${NAMA[2]}<`) && !xk.includes(`>${NAMA[3]}<`) && xk.includes(`>${NAMA[0]}<`))
  const r = await jalan("cari_ingatan", { kata: "kelompok" })
  cek("dicatat otomatis di riwayat", r.includes("buat_kelompok"), r)
} finally {
  rmSync(akar, { recursive: true, force: true })
}
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
