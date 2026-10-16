import { alat } from "../lib/alat.ts"
import { Gagal } from "../lib/berkas.ts"
import { tgl } from "../lib/kalender.ts"
import { petaPerangkat } from "../lib/status.ts"

export default alat<{ tanggal?: string }>({
  nama: "status_perangkat",
  deskripsi:
    "Peta perangkat guru dari berkas yang benar-benar ada: profil, kalender, CP, ATP/Prota/Promes, KKTP, modul per TP, UH, STS/SAS, buku nilai, daftar hadir, jurnal, kalender dan jadwal Word, kokurikuler, serta jumlah penanda [PERLU GURU]. Diakhiri daftar langkah berikutnya (urut sesuai ketergantungan dan tanggal) beserta apa yang akan dibuat dan caranya. Pakai di awal dan setelah setiap tahap /siapkan, atau saat guru bertanya 'apa yang belum', 'sudah sampai mana'.",
  masukan: {
    type: "object",
    properties: { tanggal: { type: "string", description: "YYYY-MM-DD; kosongkan untuk hari ini" } },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    if (args.tanggal) {
      try { tgl(args.tanggal) } catch (e) { throw new Gagal((e as Error).message) }
    }
    return (await petaPerangkat(akar, args.tanggal)).teks
  },
})
