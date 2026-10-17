import { existsSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { isiDariTemplat, penandaDasar, templatExcel } from "../lib/formatexcel.ts"
import { Gagal, jalurAman, muatDasar, tulis } from "../lib/berkas.ts"
import { absensiXlsx, hariBelajarBulan, tahunUntukBulan } from "../lib/administrasi.ts"
import { NAMA_BULAN } from "../lib/kalender.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { pastikanDaftarSiswa } from "../lib/siswa.ts"

const pesanNama = (h: { namaTerisi: number }, d: { baru?: string } | null) =>
  h.namaTerisi
    ? `Nama ${h.namaTerisi} siswa terisi otomatis dari Daftar Siswa${d?.baru ? ` (baru dibuat dari ${d.baru})` : ""}. Jangan menyebut atau meminta nama siswa di chat.`
    : "Daftar Siswa belum ada, jadi kolom nama kosong. Sampaikan ke guru: taruh ekspor Dapodik, format nilai e-Rapor, atau daftar hadir lama yang sudah berisi nama di folder guru\\masukan — nama akan terisi otomatis di semua Excel berikutnya. Jangan meminta guru mengetik nama di chat."


export default alat<{ bulan: number; tahun?: number }>({
  nama: "buat_absensi_excel",
  deskripsi:
    "Membuat berkas Excel daftar hadir satu bulan: kolom tanggal hanya hari sekolah (libur dilewati, hari kegiatan diberi warna abu-abu), rumus rekap S/I/A/H dan persentase kehadiran otomatis. Nama siswa diisi otomatis oleh alat dari Daftar Siswa (asisten tidak melihat nama). Tidak pernah menimpa berkas yang sudah ada.",
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
    const d = await pastikanDaftarSiswa(akar)
    const dasar = `hasil/${FOLDER.administrasi}/Daftar Hadir Kelas ${profil.kelas} ${tahun}-${String(bulan).padStart(2, "0")} ${NAMA_BULAN[bulan]}`
    let rel = `${dasar}.xlsx`
    for (let i = 2; existsSync(join(akar, jalurAman(rel))); i++) rel = `${dasar} (${i}).xlsx`
    // Format sekolah/guru didahulukan.
    const t = await templatExcel(akar, "Daftar Hadir")
    if (t) {
      const hari = hariBelajarBulan(profil, kalender, tahun, bulan)
      const penanda: Record<string, string> = { ...penandaDasar(profil, kebijakan), bulan: NAMA_BULAN[bulan], tahun: String(tahun), jumlah_hari_efektif: String(hari.length) }
      hari.forEach((x, i) => (penanda[`tanggal_${i + 1}`] = String(x.getUTCDate())))
      const r = await isiDariTemplat(akar, t, { siswa: d?.siswa ?? [], penanda })
      rel = await tulis(akar, rel, r.data)
      return [`Selesai: ${rel}.`, r.pesan, d?.siswa.length ? "" : pesanNama({ namaTerisi: 0 }, d)].filter(Boolean).join("\n")
    }
    const h = absensiXlsx(profil, kalender, kebijakan, tahun, bulan, d?.siswa)
    rel = await tulis(akar, rel, h.data)
    return [
      `Selesai: ${rel} — ${NAMA_BULAN[bulan]} ${tahun}, ${h.hari} hari sekolah, ${h.siswa} baris siswa.`,
      pesanNama(h, d),
      h.perkiraanSiswa ? "Jumlah siswa belum diketahui, jadi dibuat 30 baris." : "",
      "Sampaikan ke guru: isi S/I/A saja (kosong = hadir), rekap terhitung otomatis.",
    ]
      .filter(Boolean)
      .join("\n")
  },
})
