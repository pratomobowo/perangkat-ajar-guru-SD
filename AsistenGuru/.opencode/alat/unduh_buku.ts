import { existsSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type Profil, Gagal, bacaJson, jalurAman, tulis } from "../lib/berkas.ts"
import { teksPdf } from "../lib/pustaka.ts"
import { ambil } from "../lib/riset.ts"
import { katalogSd, namaBerkas, pilihBuku } from "../lib/sibi.ts"

const MAKS_UNDUH = 6
const MAKS_UKURAN = 80e6

export default alat<{ mapel?: string; kelas?: number; jenis?: "siswa" | "guru"; unduh?: boolean }>({
  nama: "unduh_buku",
  deskripsi:
    "Mencari buku teks resmi Kurikulum Merdeka (Buku Siswa dan Panduan Guru) di katalog SIBI Kemendikdasmen untuk kelas guru, lalu (jika unduh=true) mengunduh PDF-nya ke pustaka guru (guru/buku/) supaya bisa dibaca baca_buku. Tanpa unduh: hanya menampilkan daftar buku yang tersedia. Kelas bawaan dari profil guru. Unduh hanya setelah guru setuju; buku yang sudah ada dilewati.",
  masukan: {
    type: "object",
    properties: {
      mapel: { type: "string", description: "Mapel, misalnya 'matematika', 'IPAS', 'bahasa indonesia', 'PAI'. Kosong = semua mapel" },
      kelas: { type: "integer", minimum: 1, maximum: 6, description: "Kosongkan untuk kelas di profil guru" },
      jenis: { type: "string", enum: ["siswa", "guru"], description: "Kosong = keduanya" },
      unduh: { type: "boolean", description: "true = unduh ke guru/buku/; false/kosong = tampilkan daftar saja" },
    },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const profil = await bacaJson<Profil>(akar, "guru/profil.json")
    const kelas = Number(args.kelas ?? profil.kelas)
    if (!Number.isInteger(kelas) || kelas < 1 || kelas > 6) throw new Gagal("Sebutkan kelas 1 sampai 6 (atau lengkapi profil guru dengan /mulai).")
    const katalog = await katalogSd()
    // Tanpa mapel: hanya mapel di profil guru (supaya daftar tidak dipenuhi semua mapel dan agama).
    const mapelProfil = args.mapel ? [] : (profil.mapel ?? []).map((m) => m.nama)
    const buku = mapelProfil.length
      ? [...new Map(mapelProfil.flatMap((m) => pilihBuku(katalog, kelas, m, args.jenis)).map((b) => [b.url, b])).values()]
      : pilihBuku(katalog, kelas, args.mapel, args.jenis)
    if (!buku.length)
      return `Tidak ada buku ${args.mapel ? `${args.mapel} ` : ""}kelas ${kelas} di katalog SIBI. Coba sebutan mapel lain, atau cek langsung di buku.kemendikdasmen.go.id.`

    const status = (b: (typeof buku)[number]) => (existsSync(join(akar, jalurAman(`guru/buku/${namaBerkas(b)}`))) ? " [sudah di pustaka]" : "")
    if (!args.unduh)
      return [
        `Buku resmi kelas ${kelas}${args.mapel ? ` (${args.mapel})` : mapelProfil.length ? ` untuk mapel di profil (${mapelProfil.join(", ")})` : ""} di SIBI (${buku.length}):`,
        ...buku.map((b) => `- ${b.judul} — ${b.jenis === "guru" ? "Panduan Guru" : "Buku Siswa"}${status(b)}`),
        "",
        `Tanyakan ke guru buku mana yang mau diunduh (paling banyak ${MAKS_UNDUH} sekali), lalu panggil lagi dengan unduh=true dan mapel/jenis yang sesuai.`,
        mapelProfil.length ? "Mapel lain (misalnya agama atau seni) bisa dilihat dengan menyebut mapelnya." : "",
      ].join("\n")

    if (buku.length > MAKS_UNDUH)
      throw new Gagal(`Ada ${buku.length} buku yang cocok; paling banyak ${MAKS_UNDUH} sekali unduh. Persempit dengan mapel atau jenis.`)
    const hasil: string[] = []
    let tersimpan = 0
    for (const b of buku) {
      const rel = jalurAman(`guru/buku/${namaBerkas(b)}`)
      if (existsSync(join(akar, rel))) {
        hasil.push(`- ${b.judul}: sudah ada, dilewati.`)
        continue
      }
      const r = await ambil(b.url, 300000)
      if (r.jenis !== "pdf" || !r.data || new TextDecoder().decode(r.data.subarray(0, 5)) !== "%PDF-") {
        hasil.push(`- ${b.judul}: GAGAL diunduh (server tidak memberi PDF). Coba lagi nanti.`)
        continue
      }
      if (r.data.length > MAKS_UKURAN) {
        hasil.push(`- ${b.judul}: dilewati, berkas terlalu besar (${Math.round(r.data.length / 1e6)} MB).`)
        continue
      }
      await tulis(akar, rel, r.data)
      tersimpan++
      try {
        const hal = await teksPdf(join(akar, rel))
        const kosong = hal.filter((t) => t.length < 20).length
        hasil.push(`- ${b.judul}: tersimpan (${hal.length} halaman${kosong > hal.length / 2 ? ", sebagian besar berupa gambar sehingga teksnya terbatas" : ""}).`)
      } catch {
        hasil.push(`- ${b.judul}: tersimpan, tetapi teksnya tidak bisa dibaca.`)
      }
    }
    return [
      `Unduhan ke pustaka guru (guru/buku/):`,
      ...hasil,
      "",
      tersimpan ? "Buku baru sekarang bisa dicari dengan baca_buku." : "Tidak ada buku baru yang tersimpan.",
    ].join("\n")
  },
})
