import { existsSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { Gagal, jalurAman, muatDasar, tulis } from "../lib/berkas.ts"
import { absensiXlsx, tahunUntukBulan } from "../lib/administrasi.ts"
import { NAMA_BULAN } from "../lib/kalender.ts"
import { FOLDER } from "../lib/dokumen.ts"

export default alat<{ bulan: number; tahun?: number }>({
  nama: "buat_absensi_excel",
  deskripsi:
    "Membuat berkas Excel daftar hadir satu bulan: kolom tanggal hanya hari sekolah (libur dilewati, hari kegiatan diberi warna abu-abu), rumus rekap S/I/A/H dan persentase kehadiran otomatis. Nama siswa dikosongkan untuk diketik guru sendiri. Tidak pernah menimpa berkas yang sudah ada.",
  masukan: {
    type: "object",
    properties: {
      bulan: { type: "integer", minimum: 1, maximum: 12, description: "Bulan 1-12" },
      tahun: { type: "integer", description: "Kosongkan agar ditentukan dari kalender tahun ajaran" },
    },
    required: ["bulan"],
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const bulan = Number(args.bulan)
    if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) throw new Gagal("Bulan harus angka 1 sampai 12.")
    const { profil, kalender, kebijakan } = await muatDasar(akar)
    const tahun = args.tahun ?? tahunUntukBulan(kalender, bulan)
    const h = absensiXlsx(profil, kalender, kebijakan, tahun, bulan)
    const dasar = `hasil/${FOLDER.administrasi}/Daftar Hadir Kelas ${profil.kelas} ${tahun}-${String(bulan).padStart(2, "0")} ${NAMA_BULAN[bulan]}`
    let rel = `${dasar}.xlsx`
    for (let i = 2; existsSync(join(akar, jalurAman(rel))); i++) rel = `${dasar} (${i}).xlsx`
    rel = await tulis(akar, rel, h.data)
    return [
      `Selesai: ${rel} — ${NAMA_BULAN[bulan]} ${tahun}, ${h.hari} hari sekolah, ${h.siswa} baris siswa.`,
      h.perkiraanSiswa ? "Jumlah siswa belum ada di profil, jadi dibuat 30 baris. Tanyakan jumlah siswa dan simpan di guru/profil.json." : "",
      "Sampaikan ke guru: ketik nama siswa langsung di Excel, isi S/I/A saja (kosong = hadir), rekap terhitung otomatis.",
    ]
      .filter(Boolean)
      .join("\n")
  },
})
