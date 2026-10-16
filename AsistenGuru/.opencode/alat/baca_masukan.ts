import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, stat, copyFile } from "node:fs/promises"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { Gagal, jalurAman, relatif } from "../lib/berkas.ts"
import { bacaDokumen } from "../lib/masukan.ts"
import { potong } from "../lib/pustaka.ts"

export const FOLDER_MASUKAN = "guru/masukan"

export default alat<{ berkas?: string; jadikan_buku?: boolean }>({
  nama: "baca_masukan",
  deskripsi:
    "Membaca dokumen yang diberikan guru di folder guru/masukan/ (PDF teks, Word .docx, Excel .xlsx, .txt): tanpa argumen menampilkan daftar berkas beserta cuplikan isinya; dengan `berkas` mengembalikan seluruh teksnya (Word dan Excel sebagai Markdown, tanggal Excel sebagai YYYY-MM-DD). `jadikan_buku`=true menyalin PDF itu ke pustaka guru (guru/buku/) supaya bisa dicari baca_buku. Dipakai skill siapkan-semua untuk mengenali CP, kalender, jadwal, template, KKTP, atau buku dari sekolah.",
  masukan: {
    type: "object",
    properties: {
      berkas: { type: "string", description: "Nama berkas di guru/masukan/ (atau jalur lengkap di dalam folder AsistenGuru)" },
      jadikan_buku: { type: "boolean", description: "true = salin PDF ini ke guru/buku/" },
    },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const folder = join(akar, FOLDER_MASUKAN)
    if (!args.berkas) {
      if (!existsSync(folder)) await mkdir(folder, { recursive: true })
      const daftar = (await readdir(folder)).filter((f) => !f.startsWith(".") && !f.startsWith("~$"))
      if (!daftar.length)
        return `Folder ${FOLDER_MASUKAN}/ masih kosong. Minta guru menaruh dokumen dari sekolah (CP, kalender, jadwal, contoh RPP/modul, KKTP, buku) di folder Documents\\AsistenGuru\\guru\\masukan, lalu bilang "sudah".`
      const baris = [`Dokumen di ${FOLDER_MASUKAN}/ (${daftar.length}):`]
      for (const f of daftar.sort()) {
        const p = join(folder, f)
        if ((await stat(p)).isDirectory()) continue
        try {
          const d = await bacaDokumen(f, new Uint8Array(await readFile(p)))
          const cuplik = d.teks.replace(/=== Halaman \d+ ===/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)
          baris.push(`- ${f} [${d.jenis}${d.halaman ? `, ${d.halaman} halaman` : ""}, ${d.teks.length} karakter]: "${cuplik}"`)
        } catch (e) {
          baris.push(`- ${f}: ${e instanceof Gagal ? e.message : `tidak terbaca (${(e as Error).message})`}`)
        }
      }
      baris.push("", "Baca berkas yang relevan secara lengkap (berkas=...), kenali jenisnya, lalu simpan ke tempat yang sesuai (lihat skill siapkan-semua).")
      return baris.join("\n")
    }
    let rel = relatif(akar, args.berkas)
    if (!rel.includes("/")) rel = `${FOLDER_MASUKAN}/${rel}`
    if (rel.split("/").includes("..") || !rel.startsWith("guru/")) throw new Gagal("Berkas masukan harus berada di dalam folder guru/ (misalnya guru/masukan/).")
    const p = join(akar, rel)
    if (!existsSync(p)) throw new Gagal(`Berkas ${rel} tidak ditemukan.`)
    if (args.jadikan_buku) {
      if (!/\.pdf$/i.test(rel)) throw new Gagal("Hanya PDF yang bisa dijadikan buku pustaka.")
      const tujuan = jalurAman(`guru/buku/${rel.split("/").pop()}`)
      await mkdir(join(akar, "guru/buku"), { recursive: true })
      await copyFile(p, join(akar, tujuan))
      return `Disalin ke pustaka: ${tujuan}. Sekarang bisa dicari dengan baca_buku.`
    }
    const d = await bacaDokumen(rel, new Uint8Array(await readFile(p)))
    return potong(`Isi ${rel} [${d.jenis}${d.halaman ? `, ${d.halaman} halaman` : ""}]:\n\n${d.teks}`)
  },
})
