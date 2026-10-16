import { existsSync } from "node:fs"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type Kebijakan, type Profil, Gagal, bacaJson, jalurAman, tulis } from "../lib/berkas.ts"
import { htmlKePdf } from "../lib/cetak.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { type SpekMedia, mediaHtml } from "../lib/media.ts"

export default alat<{ topik: string; nama?: string; spek?: SpekMedia; pdf?: boolean }>({
  nama: "buat_media",
  deskripsi:
    "Membuat media ajar interaktif: SATU berkas HTML yang dibuka di smart TV/papan sentuh, laptop + proyektor, atau HP, tanpa internet. Isinya bagian-bagian: kuis, kartu (kartu kilat bisa dibalik), pasangkan (atau kartu memori), urutkan, roda (acak nomor absen/soal), bingo (dengan pemanggil), ular_tangga (dadu + soal di petak), peraga (pecahan, jam, garis_bilangan, dienes, tabel_perkalian), ruang (bangun ruang 3D + jaring-jaring), volume (kubus satuan 3D), juga gambar/teks/domino. Asisten HANYA menulis spesifikasi (jenis dan isi); tampilan, gambar, dan logika dibuat alat ini dengan tepat. Berkas yang sama bisa dicetak (tombol cetak). Isi `pdf: true` hanya jika guru minta versi cetak PDF. Format spesifikasi: skill modul-ajar, references/media.md. Tanpa `spek` = buat ulang dari spesifikasi tersimpan.",
  masukan: {
    type: "object",
    properties: {
      topik: { type: "string", description: "Nama folder topik, sama dengan modul/LKPD-nya, misalnya 'Matematika TP4 Pecahan'" },
      nama: { type: "string", description: "Nama berkas, bawaan 'Media Interaktif' (misalnya 'Kuis Pecahan', 'Bangun Ruang')" },
      spek: { type: "object", description: "{judul, petunjuk?, bagian:[{jenis, ...}]} — lihat references/media.md" },
      pdf: { type: "boolean", description: "true = juga simpan versi cetak PDF (butuh Edge/Chrome di komputer guru)" },
    },
    required: ["topik"],
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const topik = args.topik.trim().replace(/[\\/]/g, "-")
    const nama = (args.nama ?? "Media Interaktif").trim().replace(/[\\/]/g, "-")
    const dasar = `${FOLDER.modul}/${topik}/${nama}`
    const spekRel = `guru/draf/${dasar}.json`
    let spek = args.spek
    if (!spek) {
      if (!existsSync(join(akar, jalurAman(spekRel)))) throw new Gagal(`Spesifikasi ${spekRel} belum ada. Isi \`spek\` (lihat references/media.md di skill modul-ajar).`)
      spek = await bacaJson<SpekMedia>(akar, jalurAman(spekRel))
    }
    const profil = await bacaJson<Profil>(akar, "guru/profil.json")
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const html = mediaHtml(spek, { sekolah: kebijakan.nama_sekolah ?? profil.sekolah ?? null, kertas: kebijakan.kertas === "F4" ? "F4" : "A4", huruf: kebijakan.huruf ?? undefined })
    await tulis(akar, spekRel, JSON.stringify(spek, null, 2) + "\n")
    const htmlRel = await tulis(akar, `hasil/${dasar}.html`, html)
    const pesan = [
      `Selesai: ${htmlRel} (media interaktif, ${spek.bagian.length} bagian).`,
      "Sampaikan ke guru: klik dua kali berkas itu (terbuka di Edge/Chrome). Di kelas: sambungkan laptop ke smart TV/proyektor, atau salin berkas ke flashdisk lalu buka di peramban smart TV/papan sentuh. Tombol ⤢ = layar penuh, ⏱ = pewaktu, 🏆 = skor tim, 🖨 = cetak. Tidak perlu internet.",
    ]
    if (args.pdf) {
      const pdfRel = htmlRel.replace(/\.html$/, ".pdf")
      await rm(join(akar, pdfRel), { force: true })
      const cetak = await htmlKePdf(join(akar, htmlRel), join(akar, pdfRel))
      pesan.push(cetak ? `Versi cetak: ${pdfRel} (dibuat dengan ${cetak.peramban}).` : `PDF tidak dibuat otomatis (Edge/Chrome tidak ditemukan). Guru bisa membuka HTML-nya lalu menekan 🖨 / Ctrl+P → "Simpan sebagai PDF".`)
    }
    pesan.push(`Spesifikasi tersimpan di ${spekRel} untuk revisi.`)
    return pesan.join("\n")
  },
})
