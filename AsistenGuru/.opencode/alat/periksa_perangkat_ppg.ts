import { alat } from "../lib/alat.ts"
import { type Profil, Gagal, bacaJson, bacaTeks, relatif } from "../lib/berkas.ts"
import { laporanPeriksa } from "../lib/ppg.ts"

export default alat<{ berkas: string; menit_per_jp?: number }>({
  nama: "periksa_perangkat_ppg",
  deskripsi:
    "Untuk guru peserta PPG (UKPPPG): memeriksa draf perangkat Ujian Kinerja (rancangan pembelajaran/modul ajar di guru/draf/) terhadap tujuh aspek ruang lingkup penilaian Ujian Kinerja dalam Juknis UKPPPG bagi Guru Tertentu 2026 (alur dan tahapan, kesesuaian dengan rencana, penguasaan bahan ajar, interaksi, media/alat bantu, perlakuan terhadap perilaku siswa, evaluasi dan umpan balik), durasi 2 JP, instrumen asesmen, dan kelengkapan bagian. Pakai setiap kali guru selesai menulis atau mengubah perangkat ujiannya.",
  masukan: {
    type: "object",
    properties: {
      berkas: { type: "string", description: "Draf .md, misalnya 'guru/draf/7 PPG/Perangkat Pembelajaran _Nama_NIM.md'" },
      menit_per_jp: { type: "integer", minimum: 20, maximum: 60, description: "Bawaan dari profil, atau 35 menit (SD)" },
    },
    required: ["berkas"],
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const rel = relatif(akar, args.berkas)
    if (!rel.startsWith("guru/draf/") || !rel.toLowerCase().endsWith(".md"))
      throw new Gagal("Perangkat yang diperiksa harus draf .md di guru/draf/ (misalnya guru/draf/7 PPG/Perangkat Pembelajaran _Nama_NIM.md). Bila guru punya Word sendiri, baca dulu dengan baca_masukan lalu salin isinya ke draf.")
    const md = await bacaTeks(akar, rel)
    if (md === null) throw new Gagal(`Berkas ${rel} tidak ditemukan.`)
    const profil = await bacaJson<Profil>(akar, "guru/profil.json")
    const menit = args.menit_per_jp ?? profil.mapel?.find((m) => m.menit_per_jp)?.menit_per_jp ?? 35
    return laporanPeriksa(md, menit)
  },
})
