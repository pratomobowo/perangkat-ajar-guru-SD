import { alat } from "../lib/alat.ts"
import { type Kebijakan, Gagal, bacaJson, slug, tulis } from "../lib/berkas.ts"
import { cari, teksPdf, teksPdfData } from "../lib/pustaka.ts"
import { ambil, aturanRiset, bagianRelevan, domainDari, tepercaya } from "../lib/riset.ts"
import { join } from "node:path"

const MAKS_SUMBER = 3
const MAKS_PDF = 60e6

export default alat<{ pertanyaan?: string; simpan_pdf?: string }>({
  nama: "riset_materi",
  deskripsi:
    "Riset materi pelajaran di web, tetapi hanya dari situs tepercaya yang ditetapkan sekolah (bawaan: situs Kemendikdasmen, Kemenag, BPS, BMKG, Wikipedia bahasa Indonesia). Mengembalikan kutipan isi halaman beserta URL untuk dicantumkan sebagai sumber. Pakai setelah baca_buku jika pustaka buku tidak memuat topiknya, atau untuk data terbaru. Isi `simpan_pdf` dengan URL PDF dari hasil riset untuk menyimpannya ke pustaka guru (guru/buku/). Jangan memasukkan nama murid atau data pribadi ke pertanyaan.",
  masukan: {
    type: "object",
    properties: {
      pertanyaan: { type: "string", description: "Topik atau pertanyaan, misalnya 'pecahan senilai kelas 4 kurikulum merdeka'" },
      simpan_pdf: { type: "string", description: "URL PDF dari situs tepercaya untuk disimpan ke guru/buku/" },
    },
    additionalProperties: false,
  },
  async jalankan(args, akar, konteks) {
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const aturan = aturanRiset(kebijakan)
    if (!aturan.web) throw new Gagal("Riset web dimatikan oleh sekolah (riset.web = false). Pakai pustaka buku saja.")

    if (args.simpan_pdf) {
      if (!tepercaya(args.simpan_pdf, aturan.domain)) throw new Gagal(`PDF hanya boleh disimpan dari situs tepercaya: ${aturan.domain.join(", ")}.`)
      const r = await ambil(args.simpan_pdf, 120000)
      if (r.jenis !== "pdf" || !r.data) throw new Gagal("Alamat itu bukan berkas PDF yang bisa diunduh.")
      if (r.data.length > MAKS_PDF) throw new Gagal("PDF terlalu besar (lebih dari 60 MB).")
      const nama = decodeURIComponent(new URL(args.simpan_pdf).pathname.split("/").pop() || "buku").replace(/\.pdf$/i, "")
      const rel = await tulis(akar, `guru/buku/${slug(nama) || "buku"}.pdf`, r.data)
      const hal = await teksPdf(join(akar, rel))
      return `Tersimpan di pustaka guru: ${rel} (${hal.length} halaman). Sekarang bisa dicari dengan baca_buku.`
    }

    if (!args.pertanyaan?.trim()) throw new Gagal("Isi `pertanyaan` (topik yang mau diriset).")
    if (!konteks.cariWeb) throw new Gagal("Pencarian web tidak tersedia di OpenCode ini. Pakai pustaka buku saja.")
    const q = args.pertanyaan.trim()

    let hasil: Awaited<ReturnType<NonNullable<typeof konteks.cariWeb>>> = []
    try {
      hasil = await konteks.cariWeb(q)
      if (hasil.filter((h) => tepercaya(h.url, aturan.domain)).length < 2) hasil = [...hasil, ...(await konteks.cariWeb(`${q} kemendikdasmen`))]
    } catch (e) {
      throw new Gagal(`Pencarian web gagal (${(e as Error).message}). Coba lagi nanti atau pakai pustaka buku.`)
    }
    const unik = [...new Map(hasil.map((h) => [h.url, h])).values()]
    const pakai = unik.filter((h) => tepercaya(h.url, aturan.domain))
    const dibuang = [...new Set(unik.filter((h) => !tepercaya(h.url, aturan.domain)).map((h) => domainDari(h.url)).filter(Boolean))]

    if (!pakai.length)
      return [
        `Tidak ada hasil dari situs tepercaya untuk "${q}".`,
        dibuang.length ? `Hasil dari situs lain tidak dipakai: ${dibuang.slice(0, 6).join(", ")}.` : "",
        "Tulis materi dari pustaka buku atau pengetahuan umum, dan tandai [PERLU GURU: cek kebenaran].",
      ]
        .filter(Boolean)
        .join("\n")

    const bagian: string[] = []
    for (const h of pakai.slice(0, MAKS_SUMBER)) {
      const r = await ambil(h.url, 60000)
      let isi = h.content?.trim() ?? ""
      if (r.jenis === "html" && r.teks && r.teks.length > isi.length) isi = bagianRelevan(r.teks, q)
      if (r.jenis === "pdf" && r.data && r.data.length <= MAKS_PDF) {
        // PDF dari situs tepercaya (misalnya bahan ajar resmi): ambil halaman yang paling relevan.
        try {
          const hal = await teksPdfData(r.data, h.url)
          const top = cari([{ nama: "pdf", halaman: hal }], q, 2)
          const pilih = top.length ? top.map((t) => t.halaman) : [1]
          isi = `(PDF, ${hal.length} halaman; bisa disimpan ke pustaka dengan simpan_pdf.)\n` +
            pilih.map((n) => `[Halaman PDF ${n}]\n${hal[n - 1].slice(0, 1700)}`).join("\n")
        } catch {
          isi = `(PDF tidak terbaca.) ${isi}`
        }
      }
      bagian.push(`### ${h.title?.trim() || domainDari(h.url)}\nURL: ${h.url}\n${isi.slice(0, 3500) || "(isi tidak terbaca)"}`)
    }
    const kepala = [
      `Hasil riset "${q}" dari ${pakai.length} sumber tepercaya (ditampilkan ${bagian.length}).`,
      "Pakai hanya isi yang relevan, tulis ulang dengan bahasa untuk murid, dan cantumkan judul + URL di bagian Sumber.",
    ]
    if (dibuang.length) kepala.push(`Situs lain diabaikan: ${dibuang.slice(0, 6).join(", ")}.`)
    return [...kepala, "", ...bagian].join("\n")
  },
})
