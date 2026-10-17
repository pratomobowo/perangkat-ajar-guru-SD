import { existsSync } from "node:fs"
import { copyFile, mkdir, readFile, rename } from "node:fs/promises"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type Kebijakan, Gagal, bacaJson, jalurAman, relatif, tulis } from "../lib/berkas.ts"
import { JENIS_EXCEL, templatExcel } from "../lib/formatexcel.ts"
import { kunciDokumen } from "../lib/gaya.ts"
import { bacaBuku, kenaliTabel, kosongkanBarisSiswa } from "../lib/templatexcel.ts"
import { bacaZip } from "../lib/unzip.ts"

const NAMA_JENIS: Record<string, string> = Object.fromEntries(JENIS_EXCEL.map((j) => [kunciDokumen(j), j]))
const LABEL: Record<string, string> = { no: "NO", nama: "NAMA", nis: "NIS", nisn: "NISN", jk: "L/P", kelompok: "KELOMPOK", tp: "TP", uh: "UH", tugas: "TUGAS", uts: "UTS/STS", uas: "UAS/SAS", rapor: "RAPOR", sakit: "SAKIT", izin: "IZIN", alfa: "ALFA" }

function waktu() {
  const d = new Date(), p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

export default alat<{ berkas?: string; dokumen: string; hapus?: boolean }>({
  nama: "simpan_template_excel",
  deskripsi:
    `Menjadikan Excel (.xlsx) sebagai format untuk satu jenis Excel administrasi, menggantikan format bawaan: format dari sekolah yang ditaruh guru di folder masukan, atau Excel hasil asisten yang sudah diubah guru ("pakai yang ini sebagai format daftar hadir"). Jenis: ${JENIS_EXCEL.join(", ")} (boleh khusus mapel, misalnya "Buku Nilai Matematika"). Isi baris siswa dikosongkan sebelum disimpan (nama tidak ikut tersimpan); tampilan, rumus, dan judul kolom tetap. Pembuatan berikutnya untuk jenis itu mengisi format ini: kolom dikenali dari judulnya (NO, NAMA, NIS, NISN, L/P, TP1…, UH, UTS/STS, UAS/SAS, SAKIT/IZIN/ALFA, KELOMPOK) dan penanda {{...}} di sel teks ({{bulan}}, {{mapel}}, {{kelas}}, {{nama_guru}}, {{nama_1}}, …). \`hapus\`=true kembali ke format bawaan.`,
  masukan: {
    type: "object",
    properties: {
      berkas: { type: "string", description: "Excel di folder AsistenGuru: guru/masukan/…, guru/…, atau hasil/… (yang sudah diubah guru)" },
      dokumen: { type: "string", description: `Jenis: ${JENIS_EXCEL.join(" / ")} (boleh ditambah nama mapel)` },
      hapus: { type: "boolean", description: "true = hapus format guru untuk jenis ini (kembali ke format bawaan atau format sekolah)" },
    },
    required: ["dokumen"],
    additionalProperties: false,
  },
  async jalankan(a, akar) {
    const kunci = kunciDokumen(a.dokumen)
    const dasar = Object.entries(NAMA_JENIS).find(([k]) => kunci === k || kunci.startsWith(`${k}-`))
    if (!dasar) throw new Gagal(`Jenis "${a.dokumen}" tidak dikenal. Pilih: ${JENIS_EXCEL.join(", ")} (boleh ditambah mapel, misalnya "Buku Nilai Matematika"). Untuk Word, pakai simpan_template_word.`)
    const khusus = a.dokumen.trim().slice(dasar[1].length).trim()
    const nama = khusus ? `${dasar[1]} ${khusus}` : dasar[1]
    const tujuan = `guru/template/${nama}.xlsx`
    const lama = join(akar, jalurAman(tujuan))
    const cadangkan = async () => {
      if (!existsSync(lama)) return null
      const folder = `guru/template/.lama/${waktu()} ${nama}`
      await mkdir(join(akar, folder), { recursive: true })
      await rename(lama, join(akar, folder, `${nama}.xlsx`))
      return folder
    }
    if (a.hapus) {
      const c = await cadangkan()
      const sisa = await templatExcel(akar, dasar[1] as any, khusus || null)
      return c ? `Format guru untuk ${nama} dihapus (cadangan: ${c}). Berikutnya memakai ${sisa ? `format ${sisa.asal} (${sisa.rel})` : "format bawaan"}.` : `Belum ada format guru untuk ${nama}.`
    }
    if (!a.berkas) throw new Gagal("Sebutkan berkas Excel yang dijadikan format.")
    const rel = relatif(akar, a.berkas)
    const p = join(akar, jalurAman(rel))
    if (rel.split("/").includes("..") || !existsSync(p)) throw new Gagal(`Berkas ${rel} tidak ditemukan di folder AsistenGuru.`)
    if (!/\.xlsx$/i.test(p)) throw new Gagal("Format harus Excel .xlsx (dari Google Sheets: File › Download › Microsoft Excel; dari .xls lama: buka di Excel lalu Simpan Sebagai .xlsx).")
    const asli = new Uint8Array(await readFile(p))
    const { data, dikosongkan } = kosongkanBarisSiswa(asli)
    const { lembar, shared } = bacaBuku(bacaZip(data))
    const ringkas: string[] = []
    for (const l of lembar) {
      const st = kenaliTabel(l, [])
      if (!st) continue
      const jenis = st.kolom.map((k) => k.jenis).filter((j) => j !== "lain")
      const hitung = (j: string) => jenis.filter((x) => x === j).length
      const tanggal = st.kolom.filter((k) => k.judul.some((j) => /^([1-9]|[12]\d|3[01])(\.0)?$/.test(j.trim()))).length
      ringkas.push(`lembar "${l.nama}": ${[...new Set(jenis)].map((j) => `${LABEL[j] ?? j}${hitung(j) > 1 ? ` ×${hitung(j)}` : ""}`).join(", ")}${tanggal ? `, ${tanggal} kolom tanggal` : ""}; data mulai baris ${st.barisData}`)
    }
    const penanda = new Set([...shared, ...lembar.flatMap((l) => [...l.nilai.values()])].flatMap((s) => [...s.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)].map((m) => m[1])))
    if (!ringkas.length && !penanda.size)
      throw new Gagal("Excel ini tidak berisi tabel siswa (kolom NAMA di 15 baris teratas) maupun penanda {{...}}, jadi asisten tidak tahu bagian mana yang diisi. Minta guru menambahkan judul kolom NAMA, atau menulis penanda seperti {{nama_1}} di sel yang ingin diisi.")
    const c = await cadangkan()
    await tulis(akar, tujuan, data)
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const efektif = await templatExcel(akar, dasar[1] as any, khusus || null)
    return [
      `Format ${nama} disimpan: ${tujuan}${c ? ` (format lama dicadangkan di ${c})` : ""}.${dikosongkan ? ` ${dikosongkan} sel data siswa dikosongkan.` : ""}`,
      ringkas.length ? `Dikenali — ${ringkas.join("; ")}.` : "",
      penanda.size ? `Penanda: ${[...penanda].map((x) => `{{${x}}}`).join(", ")}.` : "",
      efektif && efektif.rel !== tujuan ? `Catatan: format ${efektif.asal} (${efektif.rel}) tetap didahulukan${kebijakan.template_wajib ? " karena sekolah mewajibkannya" : ""}.` : `Mulai sekarang ${nama} dibuat dengan format ini. Sampaikan ke guru dan tawarkan membuat ulang berkas terakhir.`,
    ].filter(Boolean).join("\n")
  },
})
