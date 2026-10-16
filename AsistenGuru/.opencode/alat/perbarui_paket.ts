import { alat } from "../lib/alat.ts"
import { Gagal } from "../lib/berkas.ts"
import { bandingVersi, isiPaket, paketTerpasang, rilisTerbaru, terapkanPaket, unduh } from "../lib/paket.ts"

export default alat<{ cek_saja?: boolean }>({
  nama: "perbarui_paket",
  deskripsi:
    "Mengecek versi Asisten Guru yang terpasang dan versi rilis terbaru di GitHub, lalu (jika cek_saja tidak true) memperbarui paket. Pembaruan hanya mengganti berkas paket; data guru (guru/, hasil/) dan isian sekolah (sekolah/) tidak disentuh, dan berkas lama dicadangkan di .cadangan/. Pakai cek_saja=true saat guru bertanya versi atau apakah ada pembaruan; perbarui hanya jika guru setuju.",
  masukan: {
    type: "object",
    properties: { cek_saja: { type: "boolean", description: "true = hanya cek versi, tidak memperbarui" } },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const terpasang = await paketTerpasang(akar)
    const versiLama = terpasang?.versi ?? null
    const rilis = await rilisTerbaru()
    const perlu = !versiLama || bandingVersi(versiLama, rilis.versi) < 0
    if (args.cek_saja || !perlu)
      return [
        `Versi terpasang: ${versiLama ?? "tidak diketahui"}. Versi terbaru: ${rilis.versi}.`,
        perlu ? "Ada pembaruan. Tanyakan ke guru apakah mau diperbarui sekarang." : "Sudah versi terbaru, tidak perlu diperbarui.",
      ].join("\n")

    const isi = isiPaket(await unduh(rilis.zip))
    const h = await terapkanPaket(akar, isi, versiLama)
    const baru = await paketTerpasang(akar)
    if (!baru) throw new Gagal("Pembaruan tidak lengkap: berkas versi paket tidak ditemukan setelah dipasang.")
    return [
      `Selesai diperbarui: ${versiLama ?? "lama"} → ${baru.versi}. ${h.ditulis} berkas paket diperbarui, ${h.dihapus} berkas lama dihapus.`,
      h.cadangan ? `Berkas paket lama dicadangkan di ${h.cadangan}.` : "",
      h.sekolahBaru.length ? `Berkas sekolah baru ditambahkan: ${h.sekolahBaru.join(", ")}.` : "",
      "Data guru, hasil, dan isian sekolah tidak diubah.",
      "Sampaikan ke guru: tutup OpenCode lalu buka lagi supaya versi baru dipakai. Lihat VERSI.md untuk daftar perubahan.",
    ]
      .filter(Boolean)
      .join("\n")
  },
})
