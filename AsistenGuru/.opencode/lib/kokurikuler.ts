// Penilaian kokurikuler (Permendikdasmen 13/2025; Panduan Kokurikuler 2025): Excel per kegiatan dengan kolom per
// dimensi/subdimensi profil lulusan, lalu daftar dimensi yang menguat/perlu penguatan dan draf deskripsi rapor.
// Rapor kokurikuler berupa deskripsi tanpa angka (Panduan Kokurikuler hlm. 56; Panduan Pembelajaran dan Asesmen).

import type { Siswa } from "./siswa.ts"
import { ISI, kopExcel, ttdExcel } from "./administrasi.ts"
import { type Kebijakan, type Profil, Gagal } from "./berkas.ts"
import { G, type Lembar, type Sel, buatXlsx, kolom } from "./xlsx.ts"

export const DIMENSI = [
  "Keimanan dan Ketakwaan terhadap Tuhan YME",
  "Kewargaan",
  "Penalaran Kritis",
  "Kreativitas",
  "Kolaborasi",
  "Kemandirian",
  "Kesehatan",
  "Komunikasi",
]

/** Skala penilaian: nilai yang dianggap sudah menguat dan yang masih perlu penguatan. */
export const SKALA: Record<string, { pilihan: string[]; kuat: string[]; keterangan: string }> = {
  "SB/B/C/K": { pilihan: ["SB", "B", "C", "K"], kuat: ["SB", "B"], keterangan: "SB = sangat baik, B = baik, C = cukup, K = kurang (contoh rubrik Panduan Kokurikuler 2025)" },
  "Mahir/Cakap/Berkembang": { pilihan: ["Mahir", "Cakap", "Berkembang"], kuat: ["Mahir", "Cakap"], keterangan: "tahapan Alur Perkembangan Kompetensi (Kepka BSKAP 058/H/KR/2025); cakap = standar kelulusan" },
  "Terbiasa/Belum Terbiasa": { pilihan: ["Terbiasa", "Belum Terbiasa"], kuat: ["Terbiasa"], keterangan: "lembar penilaian kebiasaan Gerakan 7 Kebiasaan Anak Indonesia Hebat" },
}

export type DimensiKegiatan = { dimensi: string; subdimensi?: string; frasa?: string }
export type Kokurikuler = {
  tema: string
  bentuk?: string
  kelas?: number
  semester?: number
  alokasi_jp?: number
  mapel_terkait?: string[]
  skala?: string
  dimensi: DimensiKegiatan[]
}

export function periksaKokurikuler(k: Kokurikuler): string[] {
  const salah: string[] = []
  if (!k?.tema) salah.push("tema belum diisi")
  if (!k?.dimensi?.length) salah.push("dimensi yang dinilai belum diisi")
  for (const d of k?.dimensi ?? [])
    if (!DIMENSI.some((x) => x.toLowerCase().startsWith(d.dimensi?.toLowerCase().slice(0, 8) ?? "?")))
      salah.push(`"${d.dimensi}" bukan salah satu dari 8 dimensi profil lulusan`)
  if (k?.skala && !SKALA[k.skala]) salah.push(`skala harus salah satu dari: ${Object.keys(SKALA).join(", ")}`)
  return salah
}

const kutip = (s: string) => s.replace(/"/g, '""')

export function penilaianKokurikulerXlsx(profil: Profil, kebijakan: Kebijakan, k: Kokurikuler, siswa?: Siswa[] | null) {
  const salah = periksaKokurikuler(k)
  if (salah.length) throw new Gagal(`Data kokurikuler belum lengkap: ${salah.join("; ")}.`)
  const skala = SKALA[k.skala ?? "SB/B/C/K"]
  const n = siswa?.length || (profil.jumlah_siswa ?? 30)
  const nD = k.dimensi.length
  const kD = 2
  const kCat = kD + nD
  const kKuat = kCat + 1
  const kPerlu = kCat + 2
  const kDes = kCat + 3
  const nKol = kDes + 1
  const baris: Sel[][] = []
  const gabung: string[] = []
  kopExcel(baris, gabung, nKol, kebijakan.nama_sekolah ?? profil.sekolah, "PENILAIAN KOKURIKULER",
    `Tema: ${k.tema}  ·  Kelas ${k.kelas ?? profil.kelas}${k.semester ? `  ·  Semester ${k.semester}` : ""}  ·  Tahun Ajaran ${profil.tahun_ajaran}`)

  const H1 = baris.length + 1
  baris.push([
    { v: "No", s: G.kepala }, { v: "Nama Murid", s: G.kepala }, { v: "Hasil Asesmen per Dimensi", s: G.kepala }, ...ISI(nD - 1, G.kepala),
    { v: "Catatan Pendidik", s: G.kepala }, { v: "Dimensi Menguat", s: G.kepala }, { v: "Perlu Penguatan", s: G.kepala }, { v: "Draf Deskripsi Rapor Kokurikuler", s: G.kepala },
  ])
  baris.push([...ISI(2, G.kepala), ...k.dimensi.map((d) => ({ v: d.subdimensi ? `${d.dimensi}: ${d.subdimensi}` : d.dimensi, s: G.kepala })), ...ISI(4, G.kepala)])
  gabung.push(`A${H1}:A${H1 + 1}`, `B${H1}:B${H1 + 1}`)
  if (nD > 1) gabung.push(`${kolom(kD)}${H1}:${kolom(kCat - 1)}${H1}`)
  for (let c = kCat; c < nKol; c++) gabung.push(`${kolom(c)}${H1}:${kolom(c)}${H1 + 1}`)

  const frasa = k.dimensi.map((d) => kutip((d.frasa ?? (d.subdimensi ? `${d.dimensi} (${d.subdimensi})` : d.dimensi)).toLowerCase()))
  const awal = H1 + 2
  const akhir = awal + n - 1
  // Daftar frasa yang memenuhi syarat, dipisah koma; MID membuang ", " di depan (jalan di Excel, WPS, LibreOffice).
  const daftar = (r: number, kuat: boolean) =>
    `MID(${k.dimensi
      .map((_, i) => {
        const sel = `${kolom(kD + i)}${r}`
        const syarat = kuat ? `OR(${skala.kuat.map((v) => `${sel}="${v}"`).join(",")})` : `AND(${sel}<>"",NOT(OR(${skala.kuat.map((v) => `${sel}="${v}"`).join(",")})))`
        return `IF(${syarat},", ${frasa[i]}","")`
      })
      .join("&")},3,500)`
  const tema = kutip(k.tema)
  for (let i = 0; i < n; i++) {
    const r = awal + i
    const kuat = `${kolom(kKuat)}${r}`
    const perlu = `${kolom(kPerlu)}${r}`
    baris.push([
      { v: i + 1, s: G.tengah }, { v: siswa?.[i]?.nama ?? "", s: G.selInput }, ...ISI(nD, G.tengahInput), { v: "", s: G.selInput },
      { f: daftar(r, true), s: G.sel },
      { f: daftar(r, false), s: G.sel },
      {
        f: `IF(COUNTA(${kolom(kD)}${r}:${kolom(kCat - 1)}${r})=0,"","Ananda"&IF(${kuat}<>""," sudah baik dalam "&${kuat},"")&IF(AND(${kuat}<>"",${perlu}<>"")," dan","")&IF(${perlu}<>""," masih perlu pendampingan dalam "&${perlu},"")&" pada kegiatan kokurikuler bertema ${tema}.")`,
        s: G.sel,
      },
    ])
  }
  baris.push([])
  baris.push([{ v: `Isi hasil asesmen tiap dimensi dengan pilihan di sel (${skala.keterangan}). Dimensi menguat, perlu penguatan, dan draf deskripsi rapor terisi otomatis; sesuaikan kalimatnya sebelum disalin ke rapor (kolom Kokurikuler, tanpa angka).`, s: G.catatan }])
  baris.push([{ v: "Nama murid hanya diketik di berkas ini, jangan dikirim ke asisten. Rumus terkunci tanpa kata sandi (Tinjau > Buka Proteksi Lembar).", s: G.catatan }])
  ttdExcel(baris, gabung, [1, 1], [kPerlu, kDes], kebijakan, profil, "....................")

  const isian = `${kolom(kD)}${awal}:${kolom(kCat - 1)}${akhir}`
  const lembar: Lembar = {
    nama: "Penilaian Kokurikuler",
    baris,
    lebar: [4.5, 24, ...k.dimensi.map(() => 12), 22, 26, 26, 60],
    gabung,
    beku: { baris: H1 + 1, kolom: 2 },
    kunci: true,
    validasi: [{ sqref: isian, jenis: "list", rumus1: `"${skala.pilihan.join(",")}"`, judul: "Hasil asesmen", pesan: `Pilih ${skala.pilihan.join(", ")}.` }],
    warna: [],
    cetak: { kertas: kebijakan.kertas === "F4" ? "F4" : "A4", judulBaris: [H1, H1 + 1] },
    tinggi: { 2: 22, [H1]: 24, [H1 + 1]: 42 },
  }
  const ket: Lembar = {
    nama: "Keterangan",
    baris: [
      [{ v: `KETERANGAN KEGIATAN KOKURIKULER — ${k.tema.toUpperCase()}`, s: G.subjudul }],
      [],
      [{ v: "Bentuk kegiatan", s: G.kiriTebal }, { v: k.bentuk ?? "", s: G.sel }],
      [{ v: "Alokasi waktu", s: G.kiriTebal }, { v: k.alokasi_jp ? `${k.alokasi_jp} JP` : "", s: G.sel }],
      [{ v: "Mata pelajaran terkait", s: G.kiriTebal }, { v: (k.mapel_terkait ?? []).join(", "), s: G.sel }],
      [{ v: "Skala", s: G.kiriTebal }, { v: skala.keterangan, s: G.sel }],
      [],
      [{ v: "Dimensi", s: G.kepala }, { v: "Subdimensi", s: G.kepala }, { v: "Frasa di deskripsi rapor", s: G.kepala }],
      ...k.dimensi.map((d, i) => [{ v: d.dimensi, s: G.sel }, { v: d.subdimensi ?? "", s: G.sel }, { v: frasa[i].replace(/""/g, '"'), s: G.sel }] as Sel[]),
      [],
      [{ v: "Dasar: Permendikdasmen No. 13 Tahun 2025; Panduan Kokurikuler 2025 (Kemendikdasmen). Rapor kokurikuler berupa deskripsi dimensi yang sudah menguat dan yang masih perlu penguatan.", s: G.catatan }],
    ],
    gabung: ["A1:C1"],
    lebar: [36, 40, 60],
    cetak: { kertas: kebijakan.kertas === "F4" ? "F4" : "A4" },
  }
  return { data: buatXlsx([lembar, ket]), dimensi: nD, siswa: n, perkiraanSiswa: !siswa?.length && profil.jumlah_siswa == null, namaTerisi: siswa?.length ?? 0 }
}
