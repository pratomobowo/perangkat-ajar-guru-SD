import { alat } from "../lib/alat.ts"
import { analisisKelas, analisisSiswa, cariSiswa, muatData } from "../lib/analisis.ts"
import { type Kebijakan, Gagal, bacaJson } from "../lib/berkas.ts"
import { hariIni } from "../lib/kalender.ts"

export default alat<{ siswa?: string; mapel?: string; semester?: number }>({
  nama: "analisis_siswa",
  deskripsi:
    "Menganalisis belajar siswa dari Excel yang sudah diisi guru (buku nilai per TP, daftar hadir, penilaian kokurikuler) — dihitung di komputer guru. Dengan `siswa` (nama yang disebut guru atau nomor absen): nilai tiap TP dibanding batas tuntas dan rata-rata kelas, STS/SAS/nilai rapor, TP terkuat/terlemah, kehadiran per bulan, kokurikuler — untuk menjawab \"anak ini kurangnya di mana\". Tanpa `siswa`: ringkasan kelas (TP yang banyak belum tuntas, siapa perlu remedial, kehadiran) dengan nomor absen saja, plus laporan Excel lengkap dengan nama untuk guru. Data dikirim dengan label nomor absen, tanpa nama/NISN.",
  masukan: {
    type: "object",
    properties: {
      siswa: { type: "string", description: "Nama (boleh sebagian, seperti yang diketik guru) atau nomor absen; kosongkan untuk ringkasan kelas" },
      mapel: { type: "string", description: "Batasi ke satu mapel (opsional)" },
      semester: { type: "integer", enum: [1, 2], description: "Batasi ke satu semester (opsional)" },
    },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const d = await muatData(akar)
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const opsi = { mapel: args.mapel, semester: args.semester, namaKeAi: kebijakan.privasi?.nama_ke_ai === true }
    if (!d.nilai.length && !d.hadir.length && !d.koku.length)
      throw new Gagal("Belum ada buku nilai, daftar hadir, atau penilaian kokurikuler di folder hasil. Buat dulu (/nilai, /absen) lalu minta guru mengisinya di Excel.")
    if (!args.siswa) return await analisisKelas(akar, d, opsi, hariIni())
    if (!d.daftar.length && !/^\d{1,2}$/.test(args.siswa.trim()))
      throw new Gagal("Daftar Siswa belum ada, jadi nama tidak bisa dicocokkan. Minta guru menyebut nomor absen, atau taruh daftar siswa (Dapodik/e-Rapor/daftar hadir lama) di guru/masukan.")
    const s = cariSiswa(d.daftar, args.siswa)
    if (!s) throw new Gagal(`Siswa "${args.siswa}" tidak ditemukan di Daftar Siswa. Minta guru mengecek ejaan atau menyebut nomor absen.`)
    if ("ganda" in s) throw new Gagal(`Ada ${s.ganda.length} siswa yang cocok (No. ${s.ganda.join(", No. ")}). Minta guru menyebut nama lengkap atau nomor absen.`)
    return analisisSiswa(d, s.no, opsi)
  },
})
