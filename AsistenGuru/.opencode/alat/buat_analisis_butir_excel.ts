import { existsSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type Kebijakan, type Profil, bacaJson, jalurAman, tulis } from "../lib/berkas.ts"
import { analisisButirXlsx } from "../lib/butir.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { pastikanDaftarSiswa } from "../lib/siswa.ts"

type Masukan = { judul: string; jumlah_soal: number; opsi?: 4 | 5; kunci?: string; batas?: number }

export default alat<Masukan>({
  nama: "buat_analisis_butir_excel",
  deskripsi:
    "Membuat Excel analisis butir soal untuk satu ulangan/STS/SAS: guru mengisi kunci dan jawaban tiap siswa (nama terisi otomatis dari Daftar Siswa), Excel otomatis menghitung skor, nilai, ketuntasan, tingkat kesukaran, daya beda (kelompok atas/bawah 27%), sebaran pilihan jawaban (pengecoh), dan keputusan tiap soal (dipakai / diperbaiki / revisi). Jawaban salah otomatis merah. Untuk soal isian/uraian benar-salah, kunci 1 dan jawaban 1/0. `kunci` boleh diisi bila soalnya dibuat asisten (huruf berurutan, misalnya \"ABCDA…\"); bila tidak, guru mengisinya di Excel.",
  masukan: {
    type: "object",
    properties: {
      judul: { type: "string", description: 'Misalnya "STS Matematika Semester 1"' },
      jumlah_soal: { type: "integer", minimum: 2, maximum: 60 },
      opsi: { type: "integer", enum: [4, 5], description: "Pilihan A–D (4, bawaan) atau A–E (5)" },
      kunci: { type: "string", description: "Kunci berurutan, satu huruf per soal (1 untuk soal benar-salah)" },
      batas: { type: "number", description: "Batas tuntas; bawaan dari kebijakan sekolah" },
    },
    required: ["judul", "jumlah_soal"],
    additionalProperties: false,
  },
  async jalankan(a, akar) {
    const profil = await bacaJson<Profil>(akar, "guru/profil.json", "Profil guru belum ada. Jalankan skill guru-setup dulu (/mulai).")
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const d = await pastikanDaftarSiswa(akar)
    const h = analisisButirXlsx(profil, kebijakan, d?.siswa ?? null, { judul: a.judul, jumlahSoal: a.jumlah_soal, opsi: a.opsi, kunci: a.kunci, batas: a.batas })
    const dasar = `hasil/${FOLDER.administrasi}/Analisis Butir Soal ${a.judul.trim()}`
    let rel = `${dasar}.xlsx`
    for (let i = 2; existsSync(join(akar, jalurAman(rel))); i++) rel = `${dasar} (${i}).xlsx`
    rel = await tulis(akar, rel, h.data)
    return [
      `Selesai: ${rel} (${h.m} soal, ${h.n} baris siswa${d?.siswa.length ? ", nama terisi otomatis" : "; Daftar Siswa belum ada sehingga nama kosong"}; batas tuntas ${h.batas}).`,
      h.adaKunci ? "Kunci jawaban sudah terisi." : "Kunci jawaban belum terisi: guru mengisinya di baris KUNCI JAWABAN.",
      "Sampaikan ke guru: isi jawaban tiap siswa per nomor (huruf, atau 1/0 untuk isian), lalu buka lembar Analisis Soal — tingkat kesukaran, daya beda, pengecoh, dan keputusan tiap soal terhitung otomatis. Jawaban salah berwarna merah. Jangan menyebut nama siswa.",
    ].join("\n")
  },
})
