import { alat } from "../lib/alat.ts"
import { type Kebijakan, type Profil, Gagal, bacaJson, jalurAman } from "../lib/berkas.ts"
import { FOLDER, opsiDokumen, simpanDokumen } from "../lib/dokumen.ts"
import { checklistPpg } from "../lib/ppg.ts"

export default alat<{ nama?: string; nim?: string; mapel?: string; tahap?: string }>({
  nama: "berkas_ppg",
  deskripsi:
    "Untuk guru peserta PPG (UKPPPG bagi Guru Tertentu): membuat Word 'Checklist UKPPPG' di hasil/7 PPG/ berisi ketentuan Ujian Kinerja (perangkat, video utuh dan video edit, unggah) dan Ujian Tertulis (PCK, SJT, uraian reflektif, spesifikasi laptop/HP, ruang ujian) menurut Juknis 2026, dengan nama berkas resmi yang sudah diisi nama dan NIM guru. Juga mengembalikan jalur draf perangkat yang namanya sesuai juknis.",
  masukan: {
    type: "object",
    properties: {
      nama: { type: "string", description: "Nama lengkap peserta (bawaan: nama_lengkap di profil)" },
      nim: { type: "string", description: "NIM PPG guru; kosongkan bila belum tahu" },
      mapel: { type: "string", description: "Mapel yang dipakai untuk Ujian Kinerja" },
      tahap: { type: "string", description: 'Misalnya "PPG Guru Tertentu Tahap 3 2026"' },
    },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const profil = await bacaJson<Profil>(akar, "guru/profil.json")
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const nama = (args.nama ?? profil.nama_lengkap ?? "").trim()
    if (!nama) throw new Gagal("Nama lengkap guru belum ada di profil. Tanyakan nama lengkap sesuai data PPG, lalu panggil berkas_ppg dengan nama.")
    const nim = args.nim?.trim() || null
    const md = checklistPpg({ nama, nim, mapel: args.mapel, kelas: profil.kelas, tahap: args.tahap })
    const sub = `${FOLDER.ppg}/Checklist UKPPPG`
    const opsi = opsiDokumen({ kelas: 0, tahun_ajaran: "", mapel: [], ...profil }, kebijakan, "dokumen_guru")
    opsi.ttd = null
    const { docx } = await simpanDokumen(akar, sub, md, opsi)
    const perangkat = `guru/draf/${FOLDER.ppg}/${jalurAman(`Perangkat Pembelajaran _${nama}_${nim ?? "NIM"}`)}.md`
    return [
      `Selesai: ${docx}.`,
      `Draf perangkat Ujian Kinerja ditulis di: ${perangkat} (nama sesuai juknis${nim ? "" : "; ganti NIM setelah guru tahu NIM-nya"}). Setelah guru menulis/menyetujui isinya: periksa_perangkat_ppg lalu ekspor_word.`,
      "Video: Video utuh_" + nama + "_" + (nim ?? "NIM") + " dan Videoedit_" + nama + "_" + (nim ?? "NIM") + " (MP4).",
      "Jadwal tidak ada di juknis — minta guru mengecek laman/WA resmi UKPPPG; jangan menebak tanggal.",
    ].join("\n")
  },
})
