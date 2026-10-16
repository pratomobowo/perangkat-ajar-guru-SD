// Uji parser CP resmi (lib/cp.ts) dengan teks tiruan yang meniru pola PDF Keputusan Kepala BSKAP 046/H/KR/2025.
// Pakai: cd uji-e2e/fixture && bun uji-cp.ts
import { cpMd, kodeCp, uraiCp } from "../../AsistenGuru/.opencode/lib/cp.ts"
let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i}` : ""}`); if (!b) gagal++ }
const halaman = [
  "II CAPAIAN PEMBELAJARAN PENDIDIKAN PANCASILA\nA. Rasional\nTeks.\nD. Capaian Pembelajaran\n1. Fase A (Umumnya untuk Kelas I dan II\nSD/MI/Program Paket A)\nPada akhir Fase A, murid memiliki kemampuan sebagai\nberikut.\n1.1. Pancasila\nMengenal simbol sila.",
  "2. Fase B (Umumnya untuk Kelas III dan IV\nSD/MI/Program Paket A)\nPada akhir Fase B, murid memiliki kemampuan sebagai\nberikut.\n2.1. Pancasila\nMenjelaskan makna\nsila-sila Pancasila.\nMurid dapat menerapkan nilai\nPancasila di sekolah.\n2.2. Undang-Undang Dasar Negara Republik\nIndonesia Tahun 1945\nMengidentifikasi aturan di rumah.\n2.3. Keterampilan Proses\nMampu menerapkan keterampilan proses yang meliputi:\n● Memproses, Menganalisis Data dan\nInformasi\nDengan panduan pendidik, murid menyajikan data.",
  "3. Fase C (Umumnya untuk Kelas III dan IV\nSD/MI/Program Paket A)\n3.1. Pancasila\nMenganalisis.\nIII.1. CAPAIAN PEMBELAJARAN BAHASA INDONESIA\n1. Fase B (Umumnya untuk Kelas III dan IV\n1.1. Menyimak\nTeks lain.",
]
const b = uraiCp(halaman, "pendidikan-pancasila", "B", 1)
cek("judul mapel tanpa titik ('II CAPAIAN …') dikenali", b.mapel === "PENDIDIKAN PANCASILA")
cek("elemen Fase B, termasuk nama yang terpotong", b.elemen.map((e) => e.nama).join("|") === "Pancasila|Undang-Undang Dasar Negara Republik Indonesia Tahun 1945|Keterampilan Proses", b.elemen.map((e) => e.nama).join("|"))
cek("paragraf baru pada 'Murid …'", b.elemen[0].teks === "Menjelaskan makna sila-sila Pancasila.\n\nMurid dapat menerapkan nilai Pancasila di sekolah.", JSON.stringify(b.elemen[0].teks))
cek("butir ● menjadi daftar berjudul", b.elemen[2].teks.includes("- **Memproses, Menganalisis Data dan Informasi**: Dengan panduan pendidik, murid menyajikan data."), b.elemen[2].teks)
cek("halaman sumber", b.halaman[0] === 2 && b.halaman[1] === 2, String(b.halaman))
const c = uraiCp(halaman, "pendidikan-pancasila", "C", 1)
cek("salah ketik kelas di dokumen: kelas mengikuti fase + catatan", c.kelas === "V–VI" && c.catatan.length === 1 && c.elemen.length === 1, JSON.stringify(c))
cek("berhenti di mapel berikutnya", !c.elemen[0].teks.includes("Teks lain"))
let pesan = ""
try { uraiCp(halaman, "pendidikan-pancasila", "D" as any, 1) } catch (e) { pesan = (e as Error).message }
cek("fase yang tidak ada → pesan jelas", pesan.includes("tidak memuat"), pesan)
const md = cpMd(b, "2026-10-16")
cek("frontmatter: elemen, status OTOMATIS-RESMI, sumber halaman", md.includes("elemen: Pancasila; Undang-Undang Dasar Negara Republik Indonesia Tahun 1945; Keterampilan Proses") && md.includes("status: OTOMATIS-RESMI") && md.includes("halaman PDF 2–2"))
cek("kode mapel: IPAS dan PJOK dikenali", kodeCp("Ilmu Pengetahuan Alam dan Sosial") === "ipas" && kodeCp("PJOK") === "pjok" && kodeCp("PPKn") === "pendidikan-pancasila")
let agama = ""
try { kodeCp("PAI") } catch (e) { agama = (e as Error).message }
cek("CP agama ditolak", agama.includes("2026"))
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
