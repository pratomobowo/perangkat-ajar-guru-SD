// Uji Pendamping PPG: pemeriksa tujuh aspek Ujian Kinerja dan checklist berkas sesuai Juknis UKPPPG 2026.
// Pakai: cd uji-e2e/fixture && bun uji-ppg.ts
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { periksaPerangkat, laporanPeriksa, checklistPpg } from "../../AsistenGuru/.opencode/lib/ppg.ts"
import { bacaZip } from "../../AsistenGuru/.opencode/lib/unzip.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i.replace(/\n/g, "\n    ")}` : ""}`); if (!b) gagal++ }

const LENGKAP = `# PERANGKAT PEMBELAJARAN
## Identifikasi Murid
Murid kelas 4, 28 orang.
## Dimensi Profil Lulusan
Penalaran kritis.
## Tujuan Pembelajaran
Murid dapat membandingkan pecahan berpenyebut berbeda.
## Praktik Pedagogik
Pembelajaran berbasis masalah.
## Lingkungan Pembelajaran
Kelas berkelompok.
## Langkah Pembelajaran
### Pertemuan 1 (2 × 35 menit)
**Awal (10 menit)**
- Guru dan murid mengingat kesepakatan kelas; guru memberi apresiasi kelompok yang siap.
- Guru menyampaikan tujuan pembelajaran.
**Inti — Memahami (20 menit)**
- Guru menjelaskan konsep pecahan senilai dengan kertas lipat dan gambar batang pecahan.
- Pertanyaan pemantik: "Mana yang lebih besar, 1/2 atau 2/4?"
**Inti — Mengaplikasi (30 menit)**
- Murid berdiskusi dalam kelompok mengerjakan LKPD; guru berkeliling dan mengarahkan kembali murid yang kurang fokus.
**Penutup — Merefleksi (10 menit)**
- Kuis 3 soal (exit ticket), guru memberi umpan balik dan murid menulis refleksi.
## Asesmen dan Tindak Lanjut
| Kriteria | Memenuhi | Belum Memenuhi |
|---|---|---|
| Membandingkan pecahan | benar 2 dari 3 | kurang dari 2 |
## Sumber
Buku Matematika Kelas 4, Kemendikdasmen.
`
const p = periksaPerangkat(LENGKAP, 35)
cek("perangkat lengkap: tujuh aspek terlihat", p.aspek.every((a) => a.ok), p.aspek.filter((a) => !a.ok).map((a) => a.kode).join(","))
cek("durasi dihitung dari menit tiap tahap = 70", p.durasi.total === 70 && p.target === 70)
cek("instrumen dan sumber terdeteksi", p.adaInstrumen && p.adaSumber)
cek("laporan lengkap mengarahkan ke skenario video", laporanPeriksa(LENGKAP).includes("skenario rekaman video"))

const TIPIS = LENGKAP.replace(/\*\*Penutup[\s\S]*?(?=## Asesmen)/, "").replace(/kesepakatan kelas; guru memberi apresiasi kelompok yang siap/, "berdoa").replace(/; guru berkeliling dan mengarahkan kembali murid yang kurang fokus/, "")
const q = periksaPerangkat(TIPIS, 35)
const kurang = q.aspek.filter((a) => !a.ok).map((a) => a.kode).join("")
cek("tanpa penutup dan pengelolaan perilaku: aspek a, f, g ditandai", kurang === "afg", kurang)
cek("durasi tanpa penutup = 60, bukan 70", q.durasi.total === 60)
const lap = laporanPeriksa(TIPIS)
cek("laporan memberi saran untuk aspek yang kurang dan menyebut bukan instrumen resmi", /BELUM TERLIHAT[\s\S]*kesepakatan kelas/.test(lap) && lap.includes("bukan instrumen penilaian resmi"))
const SINGKAT = "## Langkah Pembelajaran\n**Awal (10 menit)** Guru menyampaikan TP: pecahan senilai. Murid menyepakati aturan kelompok.\n"
const r = periksaPerangkat(SINGKAT, 35).aspek
cek("singkatan TP dan 'menyepakati aturan kelompok' dikenali (temuan E2E)", r.find((a) => a.kode === "b")!.ok && r.find((a) => a.kode === "f")!.ok)
cek("durasi tak tertulis → diminta menulis menit", laporanPeriksa("## Langkah Pembelajaran\n- awal, inti, penutup").includes("menit per tahap belum tertulis"))

const c = checklistPpg({ nama: "Siti Aminah", nim: "2026123456" })
cek("checklist: nama berkas resmi terisi", ["Perangkat Pembelajaran _Siti Aminah_2026123456", "Video utuh_Siti Aminah_2026123456", "Videoedit_Siti Aminah_2026123456"].every((x) => c.includes(x)))
cek("checklist: fakta juknis (35 PCK, 30 SJT 1–5, 120 menit, uraian 30 menit, 2 JP MP4, KTP, 10 GB, Exambppp, tautan UKin)", ["35 soal", "30 soal", "1–5", "120 menit", "30 menit", "2 JP", "MP4", "KTP asli", "10 GB", "Exambppp", "ukin-ukpppg.bppp.kemendikdasmen.go.id"].every((x) => c.includes(x)))
cek("checklist: tiap butir satu baris (baris lanjutan memecah butir di Word; temuan E2E)", !/\n[ \t]+\S/.test(c))
cek("checklist tanpa NIM → penanda PERLU GURU", checklistPpg({ nama: "Siti" }).includes("[PERLU GURU: NIM PPG]"))

// Alat lewat plugin
const akar = mkdtempSync(join(tmpdir(), "asisten-ppg-"))
try {
  cpSync(join(new URL(".", import.meta.url).pathname, "../../AsistenGuru"), akar, { recursive: true })
  cpSync(join(new URL(".", import.meta.url).pathname, "guru"), join(akar, "guru"), { recursive: true })
  const alat: Record<string, any> = {}
  await plugin.setup({ location: { directory: akar }, tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) }, websearch: { query: async () => { throw new Error("x") } } })
  const jalan = async (n: string, i: any = {}) => (await alat[n].execute(i, {})).content as string
  const b = await jalan("berkas_ppg", { nama: "Siti Aminah", nim: "2026123456", mapel: "Matematika" })
  const docx = join(akar, "hasil/7 PPG/Checklist UKPPPG.docx")
  cek("berkas_ppg membuat Word di hasil/7 PPG", existsSync(docx), b)
  const xml = new TextDecoder().decode(bacaZip(new Uint8Array(readFileSync(docx))).get("word/document.xml"))
  cek("Word checklist berisi nama berkas resmi, tanpa blok tanda tangan kepala sekolah", xml.includes("Videoedit_Siti Aminah_2026123456") && !xml.includes("Mengetahui"))
  cek("berkas_ppg memberi jalur draf perangkat sesuai juknis", b.includes("guru/draf/7 PPG/Perangkat Pembelajaran _Siti Aminah_2026123456.md"))
  const draf = "guru/draf/7 PPG/Perangkat Pembelajaran _Siti Aminah_2026123456.md"
  mkdirSync(join(akar, "guru/draf/7 PPG"), { recursive: true })
  writeFileSync(join(akar, draf), TIPIS)
  const h = await jalan("periksa_perangkat_ppg", { berkas: draf })
  cek("periksa_perangkat_ppg melaporkan aspek yang belum terlihat", h.includes("✖ (f)") && h.includes("✖ (g)") && h.includes("60 menit"), h)
  const salah = await jalan("periksa_perangkat_ppg", { berkas: "hasil/7 PPG/x.docx" })
  cek("periksa_perangkat_ppg menolak berkas di luar guru/draf", salah.includes("guru/draf"), salah)
} finally {
  rmSync(akar, { recursive: true, force: true })
}
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
