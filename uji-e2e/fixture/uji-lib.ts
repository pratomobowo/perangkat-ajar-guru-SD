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
// dokumen buatan model (dari uji v0.2): LKPD, kunci, soal, modul, kisi-kisi, jurnal
const W = new URL("../contoh-hasil-v02/guru/draf/", import.meta.url).pathname
const M = "2 Modul dan LKPD/Matematika TP5 Kalimat Matematika dan Pola Bilangan", A = "3 Asesmen/UH Matematika TP3 Perkalian dan Pembagian"
for (const [n, f] of [["lkpd", `${M}/LKPD.md`], ["kunci", `${M}/Kunci LKPD.md`], ["modul", `${M}/RPM.md`], ["soal", `${A}/Soal.md`], ["kisi", `${A}/Kisi-kisi.md`], ["jurnal", "4 Administrasi/Jurnal Mengajar 2026-10.md"]]) {
  const jenis = tebakJenis(f)
  writeFileSync(`out/${n}.docx`, buatDocx(readFileSync(`${W}/${f}`, "utf8"), { ...o, jenis }).data); console.log(n, jenis)
}
writeFileSync("out/absen.xlsx", absensiXlsx(profil, kalender, kebijakan, 2026, 10).data)
writeFileSync("out/nilai.xlsx", nilaiXlsx(profil, kebijakan, atp, "Matematika", 1).data)
console.log(agenda({ tanggal: "2026-10-16", profil, kalender, promes: [h.promesJson], jurnal: () => null }))
