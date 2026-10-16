import { alat } from "../lib/alat.ts"
import { cariRiwayat, tanggalBaca } from "../lib/ingatan.ts"

export default alat<{ kata?: string; sejak?: string; sampai?: string }>({
  nama: "cari_ingatan",
  deskripsi:
    "Mencari arsip riwayat kerja dari sesi-sesi sebelumnya: dokumen yang pernah dibuat (tercatat otomatis) dan ringkasan pekerjaan yang dicatat asisten. Pakai untuk pertanyaan seperti \"minggu lalu kita bikin apa?\", \"dulu soal remedial pecahan sudah dibuat belum?\", \"kapan terakhir bikin modul IPAS?\". `kata` = kata kunci (kosong = terbaru); `sejak`/`sampai` = rentang TTTT-BB-HH.",
  masukan: {
    type: "object",
    properties: {
      kata: { type: "string" },
      sejak: { type: "string", description: "TTTT-BB-HH" },
      sampai: { type: "string", description: "TTTT-BB-HH" },
    },
    additionalProperties: false,
  },
  async jalankan(a, akar) {
    const r = await cariRiwayat(akar, a)
    if (!r.length) return `Tidak ada riwayat${a.kata ? ` tentang "${a.kata}"` : ""}${a.sejak || a.sampai ? " pada rentang itu" : ""}. Riwayat mulai tercatat sejak fitur ingatan dipasang; cek juga folder hasil (status_perangkat).`
    return [`Riwayat (${r.length}):`, ...r.map((x) => `- ${tanggalBaca(x.tanggal)} · ${x.jenis === "alat" ? "dibuat" : "catatan"}: ${x.isi}`)].join("\n")
  },
})
