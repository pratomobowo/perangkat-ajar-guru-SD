// Agenda harian dan berkas Excel administrasi (daftar hadir, buku nilai).
// Nama siswa TIDAK pernah lewat asisten: alat mengisinya dari Daftar Siswa (lib/siswa.ts) di komputer guru, atau
// kolom nama dikosongkan untuk diketik guru bila daftar belum ada.

import type { ATP, Kalender, Kebijakan, Profil } from "./berkas.ts"
import { Gagal } from "./berkas.ts"
import { NAMA_BULAN, NAMA_HARI, fmt, hariSekolah, statusTanggal, tambah, tgl, tglIndo } from "./kalender.ts"
import type { Siswa } from "./siswa.ts"
import { DXF, G, type Lembar, type Sel, buatXlsx, kolom } from "./xlsx.ts"

type PromesJson = {
  mapel: string
  kode: string
  tp: Record<string, { tujuan: string; materi: string | null }>
  minggu: { semester: number; ke: number; mulai: string; akhir: string; efektif: boolean; keterangan: string[]; alokasi: { kode: string; jp: number }[] }[]
}

export function semesterDari(kal: Kalender, d: Date) {
  return kal.semester.find((s) => d >= tgl(s.mulai) && d <= tgl(s.akhir))
}

export function agenda(args: {
  tanggal: string
  profil: Profil
  kalender: Kalender
  promes: PromesJson[]
  jurnal: (bulan: string) => string | null
  bahan?: string[] // nama folder bahan ajar yang sudah ada (guru/draf/2 Modul dan LKPD/*)
}): string {
  const { profil, kalender, promes } = args
  const d = tgl(args.tanggal)
  const namaHari = NAMA_HARI[d.getUTCDay()]
  const out: string[] = [`Tanggal: ${tglIndo(d, true)}`]
  const hs = hariSekolah(profil)
  const sem = semesterDari(kalender, d)
  const st = statusTanggal(d, kalender)

  if (!sem) out.push("Status: di luar masa semester (libur antarsemester atau belum mulai).")
  else if (!hs.has(d.getUTCDay())) out.push("Status: bukan hari sekolah.")
  else if (st.jenis === "libur") out.push(`Status: LIBUR — ${st.nama.join("; ")}.`)
  else if (st.jenis === "tidak_efektif") out.push(`Status: hari sekolah tetapi tidak efektif untuk pembelajaran — ${st.nama.join("; ")}.`)
  else out.push(`Status: hari belajar efektif (semester ${sem.ke}).`)

  const jadwal = profil.jadwal?.[namaHari] ?? []
  if (sem && hs.has(d.getUTCDay()) && st.jenis !== "libur") {
    if (jadwal.length) out.push(`Jadwal hari ${namaHari}: ` + jadwal.map((j) => `${j.mapel}${j.jam_ke ? ` (jam ke-${j.jam_ke})` : ""}`).join(", ") + ".")
    else if (!profil.jadwal) out.push("Jadwal pelajaran harian belum diisi di profil (opsional; bisa ditambah lewat guru-setup).")
  }

  // Rencana dari Promes: minggu ini dan minggu depan
  const cariMinggu = (x: Date) => {
    const senin = tambah(x, -((x.getUTCDay() + 6) % 7))
    const minggu = tambah(senin, 6)
    return (p: PromesJson) => p.minggu.find((w) => tgl(w.mulai) <= minggu && tgl(w.akhir) >= senin)
  }
  const ringkasAlokasi = (p: PromesJson, w?: PromesJson["minggu"][number]) => {
    if (!w) return "tidak ada di Promes"
    if (!w.efektif) return `minggu tidak efektif (${w.keterangan.join("; ") || "-"})`
    return w.alokasi.map((a) => (a.kode === "Cadangan" ? `cadangan ${a.jp} JP (asesmen/remedial/pengayaan)` : `${a.kode} ${a.jp} JP — ${p.tp[a.kode]?.materi ?? p.tp[a.kode]?.tujuan ?? ""}`)).join("; ")
  }
  if (!promes.length) out.push("Promes belum dibuat. Sarankan guru membuat perencanaan (/rencana) agar agenda bisa menampilkan TP.")
  const statusBahan = (p: PromesJson, w?: PromesJson["minggu"][number]) => {
    if (!w?.efektif || !args.bahan) return ""
    const kode = [...new Set(w.alokasi.map((a) => a.kode).filter((k) => k !== "Cadangan"))]
    return kode
      .map((k) => {
        const ada = args.bahan!.find((b) => new RegExp(`(^|\\s)${k}(\\s|$)`, "i").test(b) && b.toLowerCase().includes(p.mapel.toLowerCase()))
        return ada ? ` Bahan ajar ${k} sudah ada ("${ada}").` : ` Bahan ajar ${k} belum dibuat.`
      })
      .join("")
  }
  for (const p of promes) {
    const ini = cariMinggu(d)(p)
    const depan = cariMinggu(tambah(d, 7))(p)
    out.push(`${p.mapel} minggu ini: ${ringkasAlokasi(p, ini)}.${statusBahan(p, ini)}`)
    out.push(`${p.mapel} minggu depan: ${ringkasAlokasi(p, depan)}.${statusBahan(p, depan)}`)
  }

  // Kegiatan 14 hari ke depan
  const akan = kalender.kegiatan
    .filter((k) => tgl(k.mulai) > d && tgl(k.mulai) <= tambah(d, 14))
    .map((k) => `${k.nama} (${tglIndo(tgl(k.mulai))}${k.akhir && k.akhir !== k.mulai ? ` – ${tglIndo(tgl(k.akhir))}` : ""}${k.jenis === "libur" ? ", libur" : ""})`)
  out.push(akan.length ? `Kegiatan 2 minggu ke depan: ${akan.join("; ")}.` : "Tidak ada kegiatan khusus dalam 2 minggu ke depan.")

  // Pengingat jurnal: hari belajar efektif terakhir sebelum hari ini (yang ada jam mengajar, jika jadwal diisi)
  for (let i = 1; i <= 7; i++) {
    const x = tambah(d, -i)
    if (!semesterDari(kalender, x) || !hs.has(x.getUTCDay()) || statusTanggal(x, kalender).jenis) continue
    if (profil.jadwal && !(profil.jadwal[NAMA_HARI[x.getUTCDay()]] ?? []).length) continue
    const isi = args.jurnal(fmt(x).slice(0, 7))
    const ada = isi?.includes(`## ${fmt(x)}`)
    out.push(ada ? `Jurnal ${tglIndo(x, true)} sudah terisi.` : `Pengingat: jurnal ${tglIndo(x, true)} belum diisi.`)
    break
  }
  return out.join("\n")
}

function hariBelajarBulan(profil: Profil, kal: Kalender, tahun: number, bulan: number): Date[] {
  const hs = hariSekolah(profil)
  const out: Date[] = []
  for (let d = new Date(Date.UTC(tahun, bulan - 1, 1)); d.getUTCMonth() === bulan - 1; d = tambah(d, 1))
    if (hs.has(d.getUTCDay()) && semesterDari(kal, d) && statusTanggal(d, kal).jenis !== "libur") out.push(d)
  return out
}

export function tahunUntukBulan(kal: Kalender, bulan: number): number {
  for (const s of kal.semester) {
    for (let d = tgl(s.mulai); d <= tgl(s.akhir); d = tambah(d, 27)) if (d.getUTCMonth() + 1 === bulan) return d.getUTCFullYear()
    const a = tgl(s.akhir)
    if (a.getUTCMonth() + 1 === bulan) return a.getUTCFullYear()
  }
  throw new Gagal(`Bulan ${NAMA_BULAN[bulan]} tidak termasuk masa semester di kalender.`)
}

// ---------- Excel bersama ----------

export const ISI = (n: number, s: number): Sel[] => Array.from({ length: n }, () => ({ v: "", s }))

/** Baris kop: nama sekolah, judul, dan keterangan, masing-masing digabung selebar tabel. */
export function kopExcel(baris: Sel[][], gabung: string[], lebarKolom: number, sekolah: string | null | undefined, judul: string, ket: string) {
  const akhir = kolom(lebarKolom - 1)
  const tambah = (v: string, s: number) => {
    baris.push([{ v, s }])
    gabung.push(`A${baris.length}:${akhir}${baris.length}`)
  }
  tambah((sekolah ?? "").toUpperCase(), G.subjudul)
  tambah(judul, G.judulTengah)
  tambah(ket, G.ttd)
  baris.push([])
}

/** Blok tanda tangan: kiri (Kepala Sekolah) dan kanan (Guru), masing-masing digabung di rentang kolom yang diberikan. */
export function ttdExcel(
  baris: Sel[][],
  gabung: string[],
  kiri: [number, number],
  kanan: [number, number],
  kebijakan: Kebijakan,
  profil: Profil,
  tanggal: string,
) {
  const titik = "( ...................................... )"
  const isi: [string, string, number][] = [
    ["Mengetahui,", `${kebijakan.kota ?? "...................."}, ${tanggal}`, G.ttd],
    ["Kepala Sekolah", `Guru Kelas ${profil.kelas}`, G.ttd],
    ["", "", G.ttd],
    ["", "", G.ttd],
    ["", "", G.ttd],
    [kebijakan.kepala_sekolah?.nama ?? titik, profil.nama_lengkap ?? titik, -1],
  ]
  if (kebijakan.kepala_sekolah?.nip || profil.nip)
    isi.push([kebijakan.kepala_sekolah?.nip ? `NIP. ${kebijakan.kepala_sekolah.nip}` : "", profil.nip ? `NIP. ${profil.nip}` : "", G.ttd])
  baris.push([])
  for (const [a, b, s] of isi) {
    const r: Sel[] = []
    const gaya = (teks: string) => (s === -1 ? (teks.startsWith("(") ? G.ttd : G.ttdNama) : s)
    r[kiri[0]] = { v: a, s: gaya(a) }
    r[kanan[0]] = { v: b, s: gaya(b) }
    for (let i = 0; i < Math.max(kiri[0], kanan[0]) + 1; i++) if (r[i] === undefined) r[i] = null
    baris.push(r)
    const n = baris.length
    if (kiri[1] > kiri[0]) gabung.push(`${kolom(kiri[0])}${n}:${kolom(kiri[1])}${n}`)
    if (kanan[1] > kanan[0]) gabung.push(`${kolom(kanan[0])}${n}:${kolom(kanan[1])}${n}`)
  }
}

// ---------- Daftar hadir ----------

export function absensiXlsx(profil: Profil, kal: Kalender, kebijakan: Kebijakan, tahun: number, bulan: number, siswa?: Siswa[] | null) {
  const hari = hariBelajarBulan(profil, kal, tahun, bulan)
  if (!hari.length) throw new Gagal(`Tidak ada hari sekolah pada ${NAMA_BULAN[bulan]} ${tahun} menurut kalender.`)
  const n = siswa?.length || (profil.jumlah_siswa ?? 30)
  const nH = hari.length
  const kT = 2 // kolom tanggal pertama (C)
  const kR = kT + nH // kolom rekap pertama
  const nKol = kR + 5
  const baris: Sel[][] = []
  const gabung: string[] = []
  kopExcel(baris, gabung, nKol, kebijakan.nama_sekolah ?? profil.sekolah, "DAFTAR HADIR SISWA",
    `Kelas ${profil.kelas}  ·  ${NAMA_BULAN[bulan]} ${tahun}  ·  Tahun Ajaran ${profil.tahun_ajaran}`)

  const H1 = baris.length + 1 // baris kepala pertama (1-based)
  const r1: Sel[] = [{ v: "No", s: G.kepala }, { v: "Nama Siswa", s: G.kepala }, { v: "Tanggal", s: G.kepala }, ...ISI(nH - 1, G.kepala), { v: "Rekap", s: G.kepala }, ...ISI(4, G.kepala)]
  const r2: Sel[] = [...ISI(2, G.kepala), ...hari.map((d) => ({ v: d.getUTCDate(), s: G.kepala })), ...["S", "I", "A", "H", "% Hadir"].map((v) => ({ v, s: G.kepala }))]
  const r3: Sel[] = [...ISI(2, G.kepala), ...hari.map((d) => ({ v: NAMA_HARI[d.getUTCDay()].slice(0, 3).replace(/^./, (c) => c.toUpperCase()), s: G.kepala })), ...ISI(5, G.kepala)]
  baris.push(r1, r2, r3)
  gabung.push(`A${H1}:A${H1 + 2}`, `B${H1}:B${H1 + 2}`, `${kolom(kT)}${H1}:${kolom(kR - 1)}${H1}`, `${kolom(kR)}${H1}:${kolom(kR + 4)}${H1}`)
  for (let k = 0; k < 5; k++) gabung.push(`${kolom(kR + k)}${H1 + 1}:${kolom(kR + k)}${H1 + 2}`)

  const awal = H1 + 3
  const akhir = awal + n - 1
  const rng = (r: number) => `${kolom(kT)}${r}:${kolom(kR - 1)}${r}`
  for (let i = 0; i < n; i++) {
    const r = awal + i
    const row: Sel[] = [{ v: i + 1, s: G.tengah }, { v: siswa?.[i]?.nama ?? "", s: G.selInput }]
    hari.forEach((d) => row.push({ v: "", s: statusTanggal(d, kal).jenis ? G.libur : G.tengahInput }))
    const S = `${kolom(kR)}${r}`, I = `${kolom(kR + 1)}${r}`, A = `${kolom(kR + 2)}${r}`, Hh = `${kolom(kR + 3)}${r}`
    row.push(
      { f: `IF($B${r}="","",COUNTIF(${rng(r)},"S"))`, s: G.tengah },
      { f: `IF($B${r}="","",COUNTIF(${rng(r)},"I"))`, s: G.tengah },
      { f: `IF($B${r}="","",COUNTIF(${rng(r)},"A"))`, s: G.tengah },
      { f: `IF($B${r}="","",${nH}-${S}-${I}-${A})`, s: G.tengah },
      { f: `IF($B${r}="","",${Hh}/${nH})`, s: G.persen },
    )
    baris.push(row)
  }
  const kaki: Sel[] = [{ v: "", s: G.tengahTebal }, { v: "Jumlah tidak hadir", s: G.kiriTebal }]
  hari.forEach((_, k) => kaki.push({ f: `COUNTA(${kolom(kT + k)}${awal}:${kolom(kT + k)}${akhir})`, s: G.tengahTebal }))
  for (let k = 0; k < 3; k++) kaki.push({ f: `SUM(${kolom(kR + k)}${awal}:${kolom(kR + k)}${akhir})`, s: G.tengahTebal })
  kaki.push({ v: "", s: G.tengahTebal }, { f: `IFERROR(AVERAGE(${kolom(kR + 4)}${awal}:${kolom(kR + 4)}${akhir}),"")`, s: G.persen })
  baris.push(kaki)

  const kegiatan = hari.filter((d) => statusTanggal(d, kal).jenis).map((d) => `${d.getUTCDate()} (${statusTanggal(d, kal).nama.join(", ")})`)
  baris.push([])
  baris.push([{ v: `Keterangan: S = sakit, I = izin, A = alpa. Sel kosong = hadir. Jumlah hari sekolah bulan ini: ${nH}.${kegiatan.length ? ` Kolom abu-abu = kegiatan sekolah: ${kegiatan.join("; ")}.` : ""}`, s: G.catatan }])
  baris.push([{ v: `Rumus terkunci agar tidak terhapus (tanpa kata sandi: Tinjau > Buka Proteksi Lembar). ${siswa?.length ? "Nama siswa diambil dari Daftar Siswa." : "Ketik nama siswa langsung di berkas ini."}`, s: G.catatan }])
  const tglAkhir = hari[hari.length - 1]
  ttdExcel(baris, gabung, [1, 1], [kR, kR + 4], kebijakan, profil, `${tglAkhir.getUTCDate()} ${NAMA_BULAN[bulan]} ${tahun}`)

  const isian = `${kolom(kT)}${awal}:${kolom(kR - 1)}${akhir}`
  const lembar: Lembar = {
    nama: `${NAMA_BULAN[bulan]} ${tahun}`,
    baris,
    lebar: [4.5, 26, ...hari.map(() => 3.6), 4.5, 4.5, 4.5, 4.5, 9.5],
    gabung,
    beku: { baris: H1 + 2, kolom: 2 },
    kunci: true,
    validasi: [{ sqref: isian, jenis: "list", rumus1: '"S,I,A"', judul: "Kehadiran", pesan: "Isi S (sakit), I (izin), atau A (alpa). Kosongkan jika hadir." }],
    warna: [{ sqref: isian, aturan: [{ op: "equal", nilai: '"S"', dxf: DXF.kuning }, { op: "equal", nilai: '"I"', dxf: DXF.biru }, { op: "equal", nilai: '"A"', dxf: DXF.merah }] }],
    cetak: { kertas: kebijakan.kertas === "F4" ? "F4" : "A4", judulBaris: [H1, H1 + 2] },
    tinggi: { 2: 22 },
  }
  return { data: buatXlsx([lembar]), hari: nH, siswa: n, perkiraanSiswa: !siswa?.length && profil.jumlah_siswa == null, namaTerisi: siswa?.length ?? 0 }
}

// ---------- Buku nilai ----------

/** Data KKTP per TP (ditulis skill asesmen di guru/data/kktp-<mapel>.json). */
export type KKTP = { mapel?: string; tp: Record<string, { batas?: number; kriteria?: string }> }

export function nilaiXlsx(profil: Profil, kebijakan: Kebijakan, atp: ATP, mapelNama: string, semester: number, kktp?: KKTP | null, siswa?: Siswa[] | null) {
  const tp = atp.tp.filter((t) => t.semester === semester)
  if (!tp.length) throw new Gagal(`Tidak ada TP untuk semester ${semester} di data ATP.`)
  const bobot = kebijakan.bobot_nilai_rapor ?? { formatif: 50, sts: 25, sas: 25 }
  const bobotSekolah = !!kebijakan.bobot_nilai_rapor
  const n = siswa?.length || (profil.jumlah_siswa ?? 30)
  const nT = tp.length
  const kT = 2
  const kRata = kT + nT
  const nKol = kRata + 7
  // Batas tuntas per TP: dari KKTP bila ada, selain itu batas ketuntasan sekolah.
  const batasTp = tp.map((t) => (typeof kktp?.tp?.[t.kode]?.batas === "number" ? kktp.tp[t.kode].batas! : typeof kebijakan.batas_ketuntasan === "number" ? kebijakan.batas_ketuntasan : null))
  const adaBatas = batasTp.some((b) => b !== null)
  const baris: Sel[][] = []
  const gabung: string[] = []
  kopExcel(baris, gabung, nKol, kebijakan.nama_sekolah ?? profil.sekolah, `BUKU NILAI ${mapelNama.toUpperCase()}`,
    `Kelas ${profil.kelas}  ·  Semester ${semester}  ·  Tahun Ajaran ${profil.tahun_ajaran}`)

  // Baris bobot (dapat diubah guru)
  const RB = baris.length + 1
  baris.push([
    { v: "Bobot nilai rapor (%)", s: G.kiriTebal }, { v: "", s: G.kiriTebal },
    { v: "Formatif", s: G.kepala }, { v: "", s: G.kepala }, { v: bobot.formatif, s: G.isian },
    { v: "STS", s: G.kepala }, { v: bobot.sts, s: G.isian },
    { v: "SAS", s: G.kepala }, { v: bobot.sas, s: G.isian },
    { v: bobotSekolah ? "Sesuai kebijakan sekolah." : "Bobot bawaan; belum ditetapkan sekolah. Ubah sel kuning bila perlu.", s: G.catatan },
  ])
  gabung.push(`A${RB}:B${RB}`, `C${RB}:D${RB}`)
  const BF = `$E$${RB}`, BS = `$G$${RB}`, BA = `$I$${RB}`
  baris.push([])

  const H1 = baris.length + 1
  const r1: Sel[] = [{ v: "No", s: G.kepala }, { v: "Nama Siswa", s: G.kepala }, { v: "Nilai Formatif per TP", s: G.kepala }, ...ISI(nT - 1, G.kepala),
    ...["Rata-rata Formatif", "STS", "SAS", "Nilai Rapor", "TP Tertinggi", "TP Terendah", "TP Belum Tuntas"].map((v) => ({ v, s: G.kepala }))]
  const r2: Sel[] = [...ISI(2, G.kepala), ...tp.map((t) => ({ v: t.kode, s: G.kepala })), ...ISI(7, G.kepala)]
  baris.push(r1, r2)
  gabung.push(`A${H1}:A${H1 + 1}`, `B${H1}:B${H1 + 1}`)
  if (nT > 1) gabung.push(`${kolom(kT)}${H1}:${kolom(kRata - 1)}${H1}`)
  for (let k = 0; k < 7; k++) gabung.push(`${kolom(kRata + k)}${H1}:${kolom(kRata + k)}${H1 + 1}`)
  const hdrTp = `$${kolom(kT)}$${H1 + 1}:$${kolom(kRata - 1)}$${H1 + 1}`

  const awal = H1 + 2
  const akhir = awal + n - 1
  const tpR = (r: number) => `${kolom(kT)}${r}:${kolom(kRata - 1)}${r}`
  for (let i = 0; i < n; i++) {
    const r = awal + i
    const rata = `${kolom(kRata)}${r}`, sts = `${kolom(kRata + 1)}${r}`, sas = `${kolom(kRata + 2)}${r}`
    baris.push([
      { v: i + 1, s: G.tengah }, { v: siswa?.[i]?.nama ?? "", s: G.selInput }, ...ISI(nT, G.isian),
      { f: `IF(COUNT(${tpR(r)})=0,"",ROUND(AVERAGE(${tpR(r)}),0))`, s: G.tengah },
      { v: "", s: G.isian }, { v: "", s: G.isian },
      { f: `IF(OR(${rata}="",${sts}="",${sas}=""),"",ROUND((${rata}*${BF}+${sts}*${BS}+${sas}*${BA})/(${BF}+${BS}+${BA}),0))`, s: G.tengahTebal },
      { f: `IF(COUNT(${tpR(r)})=0,"",INDEX(${hdrTp},1,MATCH(MAX(${tpR(r)}),${tpR(r)},0)))`, s: G.tengah },
      { f: `IF(COUNT(${tpR(r)})=0,"",INDEX(${hdrTp},1,MATCH(MIN(${tpR(r)}),${tpR(r)},0)))`, s: G.tengah },
      // Daftar TP di bawah batas tuntas (untuk remedial); rumus IF biasa agar jalan di Excel lama, WPS, dan LibreOffice.
      adaBatas
        ? { f: `TRIM(${tp.map((t, k) => (batasTp[k] === null ? `""` : `IF(AND(${kolom(kT + k)}${r}<>"",${kolom(kT + k)}${r}<${batasTp[k]}),"${t.kode} ","")`)).join("&")})`, s: G.tengah }
        : { v: "", s: G.tengah },
    ])
  }
  const ringkas = (label: string, fn: string) => {
    const row: Sel[] = [{ v: "", s: G.tengahTebal }, { v: label, s: G.kiriTebal }]
    for (let k = kT; k <= kRata + 3; k++) row.push({ f: `IF(COUNT(${kolom(k)}${awal}:${kolom(k)}${akhir})=0,"",ROUND(${fn}(${kolom(k)}${awal}:${kolom(k)}${akhir}),0))`, s: G.tengahTebal })
    row.push({ v: "", s: G.tengahTebal }, { v: "", s: G.tengahTebal }, { v: "", s: G.tengahTebal })
    baris.push(row)
  }
  ringkas("Rata-rata kelas", "AVERAGE")
  ringkas("Nilai tertinggi", "MAX")
  ringkas("Nilai terendah", "MIN")

  baris.push([])
  baris.push([{ v: "Isi nilai 0–100 pada sel kuning. Rata-rata formatif, nilai rapor, dan TP tertinggi/terendah terhitung otomatis. TP tertinggi/terendah membantu menulis deskripsi capaian rapor.", s: G.catatan }])
  if (kktp && Object.keys(kktp.tp ?? {}).length)
    baris.push([{ v: "Nilai di bawah batas tuntas tiap TP (dari KKTP) berwarna merah dan TP-nya tercantum di kolom TP Belum Tuntas untuk remedial. Kriteria KKTP ada di lembar kedua.", s: G.catatan }])
  else if (typeof kebijakan.batas_ketuntasan === "number")
    baris.push([{ v: `Nilai di bawah ${kebijakan.batas_ketuntasan} (batas ketuntasan sekolah) otomatis berwarna merah dan TP-nya tercantum di kolom TP Belum Tuntas.`, s: G.catatan }])
  baris.push([{ v: "Rumus terkunci agar tidak terhapus (tanpa kata sandi: Tinjau > Buka Proteksi Lembar). Keterangan TP ada di lembar kedua.", s: G.catatan }])
  ttdExcel(baris, gabung, [1, 1], [kRata + 2, kRata + 5], kebijakan, profil, "....................")

  const isianNilai = [`${kolom(kT)}${awal}:${kolom(kRata - 1)}${akhir}`, `${kolom(kRata + 1)}${awal}:${kolom(kRata + 2)}${akhir}`].join(" ")
  const warna = [
    ...tp.flatMap((_, k) => (batasTp[k] === null ? [] : [{ sqref: `${kolom(kT + k)}${awal}:${kolom(kT + k)}${akhir}`, aturan: [{ op: "lessThan" as const, nilai: String(batasTp[k]), dxf: DXF.kurang }] }])),
    ...(typeof kebijakan.batas_ketuntasan === "number"
      ? [{ sqref: `${kolom(kRata)}${awal}:${kolom(kRata + 3)}${akhir}`, aturan: [{ op: "lessThan" as const, nilai: String(kebijakan.batas_ketuntasan), dxf: DXF.kurang }] }]
      : []),
  ]
  const lembar: Lembar = {
    nama: `Nilai Semester ${semester}`,
    baris,
    lebar: [4.5, 26, ...tp.map(() => 6.5), 10, 6.5, 6.5, 8, 9, 9, 14],
    gabung,
    beku: { baris: H1 + 1, kolom: 2 },
    kunci: true,
    validasi: [
      { sqref: isianNilai, jenis: "decimal", rumus1: "0", rumus2: "100", judul: "Nilai", pesan: "Isi angka 0 sampai 100." },
      { sqref: `E${RB} G${RB} I${RB}`, jenis: "decimal", rumus1: "0", rumus2: "100", judul: "Bobot", pesan: "Isi persentase bobot 0 sampai 100." },
    ],
    warna,
    cetak: { kertas: kebijakan.kertas === "F4" ? "F4" : "A4", judulBaris: [H1, H1 + 1] },
    tinggi: { 2: 22, [H1]: 28 },
  }
  const ket: Lembar = {
    nama: "Keterangan TP",
    baris: [
      [{ v: `KETERANGAN TUJUAN PEMBELAJARAN — ${mapelNama.toUpperCase()} SEMESTER ${semester}`, s: G.subjudul }],
      [],
      [{ v: "Kode", s: G.kepala }, { v: "Tujuan Pembelajaran", s: G.kepala }, { v: "JP", s: G.kepala }, { v: "Batas Tuntas", s: G.kepala }, { v: "Kriteria (KKTP)", s: G.kepala }],
      ...tp.map((t, k) => [{ v: t.kode, s: G.tengah }, { v: t.tujuan, s: G.sel }, { v: t.jp, s: G.tengah }, { v: batasTp[k] ?? "", s: G.tengah }, { v: kktp?.tp?.[t.kode]?.kriteria ?? "", s: G.sel }] as Sel[]),
    ],
    gabung: ["A1:E1"],
    lebar: [8, 60, 6, 9, 60],
    cetak: { kertas: kebijakan.kertas === "F4" ? "F4" : "A4" },
  }
  return { data: buatXlsx([lembar, ket]), tp: nT, siswa: n, perkiraanSiswa: !siswa?.length && profil.jumlah_siswa == null, namaTerisi: siswa?.length ?? 0, bobotSekolah, kktpTp: tp.filter((t) => typeof kktp?.tp?.[t.kode]?.batas === "number").length }
}
