import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { mingguEfektif, susunPerencanaan } from "../../AsistenGuru/.opencode/lib/perencanaan.ts"
import { agenda, absensiXlsx, nilaiXlsx } from "../../AsistenGuru/.opencode/lib/administrasi.ts"
import { buatDocx } from "../../AsistenGuru/.opencode/lib/docx.ts"
import { opsiDokumen, tebakJenis } from "../../AsistenGuru/.opencode/lib/dokumen.ts"
const j = (p: string) => JSON.parse(readFileSync(p, "utf8"))
const profil = j("guru/profil.json"), kalender = j("guru/kalender.json"), atp = j("guru/data/atp-matematika.json"), kebijakan = j("sekolah/kebijakan.json")
const cp = { path: "sekolah/referensi/cp/matematika-fase-b.md", status: "SEKUNDER", elemen: ["Bilangan","Aljabar","Pengukuran","Geometri","Analisis Data dan Peluang"] }
const h = susunPerencanaan({ profil, kalender, kebijakan, mapel: profil.mapel[0], atp, cp })
console.log(h.cek.join("\n"))
mkdirSync("out", { recursive: true })
const o = opsiDokumen(profil, kebijakan)
for (const [n, md] of [["me", h.me.md], ["atp", h.dokumen.atp], ["prota", h.dokumen.prota], ["promes", h.dokumen.promes]] as const) {
  const r = buatDocx(md, o); writeFileSync(`out/${n}.docx`, r.data); console.log(n, r.lanskap ? "lanskap" : "potret")
}
// dokumen buatan model (dari uji v0.2): LKPD, kunci, soal, modul
const W = "/private/tmp/claude-501/-Volumes-Kerjaan-vibe-code-opencode-skill-guru/85bb43ca-489e-4c13-951c-8c3fe139da7b/scratchpad/ws2/AsistenGuru/hasil"
for (const [n, f] of [["lkpd", "modul/matematika-TP5-kalimat-matematika-pola-bilangan/lkpd.md"], ["kunci", "modul/matematika-TP5-kalimat-matematika-pola-bilangan/kunci-lkpd.md"], ["modul", "modul/matematika-TP5-kalimat-matematika-pola-bilangan/modul.md"], ["soal", "asesmen/uh-matematika-tp3-perkalian-pembagian/soal.md"], ["kisi", "asesmen/uh-matematika-tp3-perkalian-pembagian/kisi-kisi.md"], ["jurnal", "administrasi/jurnal-2026-10.md"]]) {
  const jenis = tebakJenis(f.split("/").pop()!.replace("kunci-lkpd", "Kunci LKPD").replace("lkpd", "LKPD").replace("soal", "Soal"))
  writeFileSync(`out/${n}.docx`, buatDocx(readFileSync(`${W}/${f}`, "utf8"), { ...o, jenis }).data); console.log(n, jenis)
}
writeFileSync("out/absen.xlsx", absensiXlsx(profil, kalender, kebijakan, 2026, 10).data)
writeFileSync("out/nilai.xlsx", nilaiXlsx(profil, kebijakan, atp, "Matematika", 1).data)
console.log(agenda({ tanggal: "2026-10-16", profil, kalender, promes: [h.promesJson], jurnal: () => null }))
