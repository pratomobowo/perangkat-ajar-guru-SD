// Uji cek_kesiapan: bahan apa yang kurang untuk tiap tugas, mana yang bisa diambilkan otomatis, mana yang perlu guru.
// Pakai: cd uji-e2e/fixture && bun uji-kesiapan.ts

import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i.slice(0, 1200).replace(/\n/g, "\n    ")}` : ""}`); if (!b) gagal++ }

async function siapkan(isi: (akar: string) => void) {
  const akar = mkdtempSync(join(tmpdir(), "asisten-guru-kesiapan-"))
  cpSync(join(SINI, "../../AsistenGuru"), akar, { recursive: true })
  isi(akar)
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => ({}) } })
  return { akar, cek: async (a: any) => (await alat.cek_kesiapan.execute(a, {})).content as string, alat }
}
const baris = (r: string, awal: string) => r.split("\n").find((x) => x.includes(awal)) ?? ""

// Guru baru: belum ada profil.
let w = await siapkan(() => {})
let r = await w.cek({ tugas: "modul" })
cek("guru baru → profil guru belum ada, langkah berikutnya profil", r.includes("✖ Profil guru") && r.includes("LANGKAH BERIKUTNYA (satu saja): Profil guru") && r.includes("DARI GURU"), r)
rmSync(w.akar, { recursive: true, force: true })

// Guru dengan profil, kalender, dan ATP (dari fixture), tanpa CP dan tanpa buku.
w = await siapkan((a) => cpSync(join(SINI, "guru"), join(a, "guru"), { recursive: true }))
r = await w.cek({ tugas: "modul", mapel: "matematika" })
cek("modul dengan ATP ada: CP dan buku hanya dianjurkan (◐), boleh dimulai", baris(r, "CP Matematika").startsWith("◐") && baris(r, "Buku pelajaran").startsWith("◐") && r.includes("BISA DIMULAI"), r)
cek("buku belum ada → tawaran unduh otomatis (unduh_buku) atau PDF guru di folder masukan", r.includes("unduh_buku") && r.includes("Documents\\AsistenGuru\\guru\\masukan"), r)
r = await w.cek({ tugas: "rencana", mapel: "matematika" })
cek("rencana tanpa CP → BELUM SIAP, langkah berikutnya CP lewat ambil_cp dengan izin guru", r.includes("BELUM SIAP") && baris(r, "CP Matematika").startsWith("✖") && r.includes("LANGKAH BERIKUTNYA (satu saja): CP Matematika Fase B — tawarkan mengambilkannya otomatis dan minta izin guru"), r)
cek("istilah dijelaskan dengan bahasa awam (CP = target kemampuan dari pemerintah)", r.includes("target kemampuan dari pemerintah"), r)
mkdirSync(join(w.akar, "guru/buku"), { recursive: true })
writeFileSync(join(w.akar, "guru/buku/Matematika BS Kelas 4.pdf"), "%PDF-1.4")
cpSync(join(SINI, "sekolah/referensi/cp/matematika-fase-b.md"), join(w.akar, "sekolah/referensi/cp/matematika-fase-b.md"))
r = await w.cek({ tugas: "modul", mapel: "matematika" })
cek("CP sekolah dan buku ada → SIAP", r.includes("SIAP: semua bahan ada") && baris(r, "Buku pelajaran").startsWith("✔"), r)
r = await w.cek({ tugas: "absen" })
cek("absen: kalender ada, Daftar Siswa dianjurkan dengan langkah menaruh berkas Dapodik", baris(r, "Kalender").startsWith("✔") && baris(r, "Daftar Siswa").startsWith("◐") && r.includes("Dapodik"), r)
r = await w.cek({ tugas: "analisis" })
cek("analisis tanpa nilai terisi → BELUM SIAP, buat buku nilai otomatis atau langkah mengisi Excel (Ctrl+S)", r.includes("BELUM SIAP") && r.includes("buat_nilai_excel") && r.includes("Ctrl+S"), r)
rmSync(join(w.akar, "guru/data/atp-matematika.json"))
r = await w.cek({ tugas: "soal", mapel: "matematika" })
cek("soal tanpa ATP → ATP wajib (✖) dengan tawaran susun otomatis", baris(r, "ATP Matematika").startsWith("✖") && r.includes("perencanaan-tahunan"), r)
rmSync(join(w.akar, "guru/kalender.json"))
r = await w.cek({ tugas: "absen" })
cek("absen tanpa kalender → langkah guru: taruh kalender sekolah, atau sebutkan tanggal semester", baris(r, "Kalender").startsWith("✖") && r.includes("sebutkan tanggal awal dan akhir semester"), r)
r = (await w.alat.cek_kesiapan.execute({ tugas: "rapor" }, {})).content as string
cek("tugas tidak dikenal → GAGAL", r.startsWith("GAGAL"), r)
rmSync(w.akar, { recursive: true, force: true })

console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
