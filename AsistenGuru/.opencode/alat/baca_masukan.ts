import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, stat, copyFile } from "node:fs/promises"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type Profil, Gagal, bacaJson, jalurAman, relatif } from "../lib/berkas.ts"
import { bacaDokumen } from "../lib/masukan.ts"
import { amankanSumber, bacaDaftarSiswa, bacaSumber, ringkas, saringRombel, selisih, simpanDaftarSiswa } from "../lib/siswa.ts"
import { potong } from "../lib/pustaka.ts"

export const FOLDER_MASUKAN = "guru/masukan"

/** Dokumen Word/PDF berisi data pribadi siswa (daftar dengan NISN/NIPD): isinya tidak boleh ditampilkan ke asisten. */
const dataPribadi = (teks: string) => /\b(NISN|NIPD)\b/i.test(teks) && (teks.match(/\b\d{9,10}\b/g)?.length ?? 0) >= 5

/**
 * Daftar siswa (Excel/CSV) di folder masukan diproses tanpa memperlihatkan isinya: disimpan sebagai Daftar Siswa bila
 * belum ada, lalu berkasnya dipindah ke folder administrasi yang terkunci dari asisten. Mengembalikan keterangan
 * (jumlah saja) atau null bila berkas bukan daftar siswa.
 */
async function tanganiDaftarSiswa(akar: string, p: string, nama: string): Promise<string | null> {
  let d
  try {
    d = await bacaSumber(p)
  } catch {
    return null
  }
  if (!d || d.siswa.length < 2) return null
  const aman = await amankanSumber(akar, p)
  const profil = await bacaJson<Profil>(akar, "guru/profil.json")
  let siswa
  try {
    siswa = saringRombel(d, profil)
  } catch (e) {
    return `DAFTAR SISWA (isi tidak ditampilkan, data pribadi). ${(e as Error).message.replace("panggil daftar_siswa lagi", `panggil daftar_siswa dengan berkas="${aman}"`)} Berkas dipindah ke ${aman}.`
  }
  const lama = await bacaDaftarSiswa(akar)
  if (!lama) {
    await simpanDaftarSiswa(akar, siswa, nama)
    return `DAFTAR SISWA (isi tidak ditampilkan, data pribadi): ${ringkas(siswa)} → otomatis disimpan sebagai Daftar Siswa; nama akan terisi di daftar hadir, buku nilai, dan kokurikuler. Berkas dipindah ke ${aman}.`
  }
  const s = selisih(lama, siswa)
  return `DAFTAR SISWA (isi tidak ditampilkan, data pribadi): ${ringkas(siswa)}. Daftar Siswa yang ada: ${ringkas(lama)}${s.tambah || s.hilang ? ` — ${s.tambah} baru, ${s.hilang} tidak ada lagi; tanyakan guru apakah diganti (daftar_siswa berkas="${aman}" ganti=true)` : " — sama"}. Berkas dipindah ke ${aman}.`
}

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
        const siswa = await tanganiDaftarSiswa(akar, p, f)
        if (siswa) {
          baris.push(`- ${f}: ${siswa}`)
          continue
        }
        try {
          const d = await bacaDokumen(f, new Uint8Array(await readFile(p)))
          if (dataPribadi(d.teks)) {
            baris.push(`- ${f} [${d.jenis}]: berisi data pribadi siswa (NISN/NIPD) — isinya tidak ditampilkan. Minta guru menyediakan versi Excel (ekspor Dapodik/e-Rapor) supaya nama diisi otomatis tanpa lewat asisten.`)
            continue
          }
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
    const siswa = await tanganiDaftarSiswa(akar, p, rel.split("/").pop()!)
    if (siswa) return `${rel}: ${siswa}`
    const d = await bacaDokumen(rel, new Uint8Array(await readFile(p)))
    if (dataPribadi(d.teks)) throw new Gagal(`${rel} berisi data pribadi siswa (NISN/NIPD), jadi isinya tidak ditampilkan. Minta guru menyediakan versi Excel (ekspor Dapodik/e-Rapor) supaya nama diisi otomatis tanpa lewat asisten.`)
    return potong(`Isi ${rel} [${d.jenis}${d.halaman ? `, ${d.halaman} halaman` : ""}]:\n\n${d.teks}`)
  },
})
