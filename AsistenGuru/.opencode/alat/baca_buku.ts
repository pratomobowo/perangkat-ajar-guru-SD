import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { Gagal } from "../lib/berkas.ts"
import { FOLDER_BUKU, cari, daftarBuku, potong, rentang, teksPdf } from "../lib/pustaka.ts"

export default alat<{ cari?: string; buku?: string; halaman?: string }>({
  nama: "baca_buku",
  deskripsi:
    "Pustaka buku resmi (PDF di sekolah/referensi/buku/ dan guru/buku/). Tanpa argumen: daftar buku. Dengan `cari`: halaman paling relevan untuk suatu topik di semua buku (atau satu buku jika `buku` diisi), lengkap dengan cuplikan. Dengan `buku` dan `halaman`: teks lengkap halaman itu. Pakai sebelum menulis materi, modul, LKPD, atau soal, supaya isi mengikuti buku resmi dan sumbernya bisa dicantumkan. Nomor halaman = nomor halaman PDF; nomor halaman cetak ditulis bila terbaca.",
  masukan: {
    type: "object",
    properties: {
      cari: { type: "string", description: "Topik atau kata kunci, misalnya 'pecahan senilai'" },
      buku: { type: "string", description: "Nama berkas buku (sebagian nama cukup), dari daftar buku" },
      halaman: { type: "string", description: "Halaman PDF: '57', '57-60', atau '57,59' (paling banyak 15)" },
    },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const semua = await daftarBuku(akar)
    if (!semua.length)
      return `Belum ada buku di pustaka. Buku resmi (PDF) bisa diunduh dari buku.kemendikdasmen.go.id lalu ditaruh operator di ${FOLDER_BUKU[0]}/, atau oleh guru di ${FOLDER_BUKU[1]}/. Sementara itu, materi ditulis dari pengetahuan umum dan ditandai [PERLU GURU: cek kebenaran].`

    let dipilih = semua
    if (args.buku) {
      const k = args.buku.toLowerCase()
      dipilih = semua.filter((b) => b.nama.toLowerCase().includes(k) || b.rel.toLowerCase().includes(k))
      if (!dipilih.length) throw new Gagal(`Buku "${args.buku}" tidak ada. Buku yang ada: ${semua.map((b) => b.nama).join("; ")}.`)
    }

    if (!args.cari && !args.halaman)
      return ["Buku di pustaka:", ...semua.map((b) => `- ${b.nama} (${b.rel}, ${b.ukuranMb} MB)`)].join("\n")

    if (args.halaman) {
      if (dipilih.length !== 1) throw new Gagal("Untuk membaca halaman, sebutkan satu buku (isi `buku`).")
      const b = dipilih[0]
      const hal = await teksPdf(join(akar, b.rel))
      const nomor = rentang(args.halaman, hal.length)
      return potong(
        [`Buku: ${b.nama} (${hal.length} halaman PDF)`, ...nomor.map((n) => `\n=== Halaman PDF ${n} ===\n${hal[n - 1] || "(halaman tanpa teks, mungkin gambar)"}`)].join("\n"),
      )
    }

    const isi = []
    for (const b of dipilih) isi.push({ nama: b.nama, halaman: await teksPdf(join(akar, b.rel)) })
    const temuan = cari(isi, args.cari!)
    if (!temuan.length) return `Topik "${args.cari}" tidak ditemukan di ${dipilih.length} buku. Coba kata kunci lain yang lebih umum.`
    return [
      `Hasil pencarian "${args.cari}" (urut dari paling relevan). Baca halaman lengkapnya dengan buku + halaman sebelum menulis materi.`,
      ...temuan.map((t) => `- ${t.buku}, halaman PDF ${t.halaman}${t.cetak ? ` (halaman cetak ${t.cetak})` : ""}: "${t.cuplikan}"`),
    ].join("\n")
  },
})
