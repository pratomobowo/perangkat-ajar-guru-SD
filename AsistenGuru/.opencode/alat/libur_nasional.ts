import { alat } from "../lib/alat.ts"
import { liburTahunAjaran } from "../lib/libur.ts"

export default alat<{ tahun_ajaran: string }>({
  nama: "libur_nasional",
  deskripsi:
    "Hari libur nasional dan cuti bersama resmi (SKB 3 Menteri) untuk satu tahun ajaran, dalam format kegiatan guru/kalender.json. Pakai saat menyusun kalender bila sekolah belum memberi kalender pendidikan — jangan menebak tanggal libur.",
  masukan: { type: "object", properties: { tahun_ajaran: { type: "string", description: 'Misalnya "2026/2027"' } }, required: ["tahun_ajaran"], additionalProperties: false },
  async jalankan(args) {
    const { kegiatan, sumber, tidakAda } = liburTahunAjaran(args.tahun_ajaran)
    return [
      `Libur nasional dan cuti bersama tahun ajaran ${args.tahun_ajaran} (${kegiatan.length} entri):`,
      "```json",
      JSON.stringify(kegiatan, null, 1),
      "```",
      `Sumber: ${sumber.join("; ")}.`,
      tidakAda.length ? `Data tahun ${tidakAda.join(", ")} belum ada di paket (SKB belum terbit atau belum dimasukkan) — tandai [PERLU GURU] dan minta kalender sekolah.` : "",
      "Masukkan entri ini ke `kegiatan` di guru/kalender.json. Libur semester, libur sekitar Lebaran/Ramadan yang lebih panjang, MPLS, STS/SAS, dan bagi rapor mengikuti kalender dinas/sekolah: bila belum diketahui, tulis perkiraan dengan nama berakhiran \"(perkiraan)\" dan sampaikan ke guru untuk dicocokkan. Tanggal Idulfitri/Iduladha final mengikuti Keputusan Menteri Agama.",
    ].filter(Boolean).join("\n")
  },
})
