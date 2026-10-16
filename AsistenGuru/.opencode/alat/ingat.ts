import { alat } from "../lib/alat.ts"
import { Gagal } from "../lib/berkas.ts"
import { catatRiwayat, ubahIngatan, ubahPengingat } from "../lib/ingatan.ts"

type Masukan = { aksi: "tambah" | "ganti" | "hapus" | "catat_riwayat"; bagian?: "guru" | "kerja" | "pengingat"; isi?: string; lama?: string; tanggal?: string }

export default alat<Masukan>({
  nama: "ingat",
  deskripsi:
    "Menyimpan ingatan yang terbawa ke sesi berikutnya (ingatan dimuat otomatis di setiap sesi). Panggil TANPA DIMINTA saat mengetahui hal yang tahan lama: " +
    "bagian `guru` = tentang guru (panggilan, kebiasaan kerja, kondisi kelas secara umum, rencana besar seperti PPG); " +
    "bagian `kerja` = pekerjaan berjalan dan langkah berikutnya (perbarui/hapus bila sudah selesai); " +
    "bagian `pengingat` = hal bertanggal (`tanggal` TTTT-BB-HH). Aksi `ganti`/`hapus` memakai `lama` = potongan teks catatan lama. " +
    "Aksi `catat_riwayat` = ringkasan satu-dua kalimat pekerjaan besar yang baru selesai, ke arsip yang bisa dicari dengan `cari_ingatan`. " +
    "Satu catatan = satu kalimat singkat. Jangan simpan isi dokumen, hal sekali pakai, nomor identitas, atau aturan format dokumen (itu skill umpan-balik-guru).",
  masukan: {
    type: "object",
    properties: {
      aksi: { type: "string", enum: ["tambah", "ganti", "hapus", "catat_riwayat"] },
      bagian: { type: "string", enum: ["guru", "kerja", "pengingat"], description: "Wajib untuk tambah/ganti/hapus" },
      isi: { type: "string", description: "Catatan baru (satu kalimat)" },
      lama: { type: "string", description: "Potongan teks catatan lama untuk ganti/hapus" },
      tanggal: { type: "string", description: "Untuk pengingat: TTTT-BB-HH" },
    },
    required: ["aksi"],
    additionalProperties: false,
  },
  async jalankan(a, akar) {
    if (a.aksi === "catat_riwayat") {
      if (!a.isi?.trim()) throw new Gagal("Tulis ringkasan pekerjaan di `isi`.")
      return (await catatRiwayat(akar, "catatan", a.isi)) ? "Dicatat di riwayat." : "Riwayat tidak bisa ditulis saat ini; lanjutkan saja."
    }
    if (!a.bagian) throw new Gagal("Isi `bagian`: guru, kerja, atau pengingat.")
    if (a.bagian === "pengingat") {
      if (a.aksi === "ganti") throw new Gagal("Untuk mengubah pengingat: hapus yang lama lalu tambah yang baru.")
      return ubahPengingat(akar, a.aksi, a.aksi === "hapus" ? (a.lama ?? a.isi) : a.isi, a.tanggal)
    }
    const r = await ubahIngatan(akar, a.aksi, a.bagian, a.isi, a.lama)
    return `${r.pesan} Berlaku mulai sesi berikutnya. Sampaikan ke guru dalam satu kalimat singkat apa yang diingat (guru bisa melihat/menghapusnya dengan /ingat).`
  },
})
