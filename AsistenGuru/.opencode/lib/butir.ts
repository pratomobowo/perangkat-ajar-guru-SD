// Analisis butir soal (Excel berumus): guru mengisi kunci dan jawaban tiap siswa, Excel menghitung skor, nilai,
// ketuntasan, tingkat kesukaran, daya beda (kelompok atas/bawah 27%), sebaran pilihan jawaban, dan keputusan tiap soal.
// Kategori mengikuti kriteria yang lazim dipakai (Arikunto, Dasar-dasar Evaluasi Pendidikan):
//   tingkat kesukaran P: 0,00–0,30 sukar · 0,31–0,70 sedang · 0,71–1,00 mudah
//   daya beda D: negatif sangat jelek · 0,00–0,20 jelek · 0,21–0,40 cukup · 0,41–0,70 baik · 0,71–1,00 baik sekali

import { kopExcel, ttdExcel } from "./administrasi.ts"
import { type Kebijakan, type Profil, Gagal } from "./berkas.ts"
import { tanggalPanjang } from "./dokumen.ts"
import type { Siswa } from "./siswa.ts"
import { DXF, G, type Lembar, type Sel, buatXlsx, kolom } from "./xlsx.ts"

export type OpsiButir = { judul: string; jumlahSoal: number; opsi?: 4 | 5; kunci?: string | null; batas?: number | null }

export function analisisButirXlsx(profil: Profil, kebijakan: Kebijakan, siswa: Siswa[] | null, o: OpsiButir) {
  const m = o.jumlahSoal
  if (!Number.isInteger(m) || m < 2 || m > 60) throw new Gagal("Jumlah soal harus 2 sampai 60.")
  const huruf = "ABCDE".slice(0, o.opsi ?? 4).split("")
  const kunci = (o.kunci ?? "").toUpperCase().replace(/[^A-E01]/g, "")
  if (kunci && kunci.length !== m) throw new Gagal(`Kunci berisi ${kunci.length} jawaban, padahal jumlah soal ${m}. Kosongkan kunci (diisi guru di Excel) atau tulis ${m} huruf, misalnya "ABCDA…".`)
  const n = siswa?.length || (profil.jumlah_siswa ?? 30)
  const batas = typeof o.batas === "number" ? o.batas : typeof kebijakan.batas_ketuntasan === "number" ? kebijakan.batas_ketuntasan : 75
  const sekolah = kebijakan.nama_sekolah ?? profil.sekolah
  const ket = `${o.judul}  ·  Kelas ${profil.rombel ?? profil.kelas}  ·  Tahun Ajaran ${profil.tahun_ajaran ?? ""}`
  const kertas = kebijakan.kertas === "F4" ? "F4" : "A4"

  // ---------- Lembar Jawaban (diisi guru) ----------
  // Kolom: A No · B Nama · C.. soal 1..m · lalu Benar · Nilai · Tuntas · Kelompok (atas/bawah untuk daya beda)
  const kS = 2, kAkhirS = kS + m - 1
  const kBenar = kAkhirS + 1, kNilai = kBenar + 1, kTuntas = kNilai + 1, kKel = kTuntas + 1
  const J = "Jawaban", S = "Skor"
  const baris: Sel[][] = [], gabung: string[] = []
  kopExcel(baris, gabung, kKel + 1, sekolah, "ANALISIS BUTIR SOAL", ket)
  const rKepala = baris.length + 1
  baris.push([{ v: "No", s: G.kepala }, { v: "Nama Siswa", s: G.kepala }, ...Array.from({ length: m }, (_, i) => ({ v: i + 1, s: G.kepala })), { v: "Benar", s: G.kepala }, { v: "Nilai", s: G.kepala }, { v: "Tuntas", s: G.kepala }, { v: "Kelompok", s: G.kepala }])
  const rKunci = baris.length + 1
  baris.push([{ v: "", s: G.kiriTebal }, { v: "KUNCI JAWABAN", s: G.kiriTebal }, ...Array.from({ length: m }, (_, i) => ({ v: kunci[i] ?? "", s: G.isian })), { v: "", s: G.tengahTebal }, { v: "", s: G.tengahTebal }, { v: "", s: G.tengahTebal }, { v: "", s: G.tengahTebal }])
  const r1 = baris.length + 1, rN = r1 + n - 1
  const cS = kolom(kS), cE = kolom(kAkhirS), cB = kolom(kBenar), cN = kolom(kNilai), cK = kolom(kKel)
  const totalRng = `$${cB}$${r1}:$${cB}$${rN}`
  // Kelompok atas/bawah: 27% siswa dengan skor tertinggi/terendah (minimal 1).
  const kJml = `MAX(1,ROUND(COUNT(${totalRng})*0.27,0))`
  for (let i = 0; i < n; i++) {
    const r = r1 + i
    const isi = `${cS}${r}:${cE}${r}`
    baris.push([
      { v: i + 1, s: G.tengah },
      { v: siswa?.[i]?.nama ?? "", s: G.selInput },
      ...Array.from({ length: m }, () => ({ v: "", s: G.tengahInput })),
      { f: `IF(COUNTA(${isi})=0,"",SUM('${S}'!${cS}${r}:${cE}${r}))`, s: G.tengah },
      { f: `IF(${cB}${r}="","",ROUND(${cB}${r}/${m}*100,0))`, s: G.tengah },
      { f: `IF(${cN}${r}="","",IF(${cN}${r}>=${batas},"Ya","Belum"))`, s: G.tengah },
      { f: `IF(${cB}${r}="","",IF(${cB}${r}>=LARGE(${totalRng},${kJml}),"Atas",IF(${cB}${r}<=SMALL(${totalRng},${kJml}),"Bawah","")))`, s: G.tengah },
    ])
  }
  baris.push([])
  for (const t of [
    `Isi KUNCI JAWABAN (A–${huruf[huruf.length - 1]}) lalu jawaban tiap siswa. Soal isian/uraian benar-salah: kunci 1, jawaban 1 (benar) atau 0 (salah).`,
    `Baris siswa yang kosong semua dianggap tidak ikut. Jawaban salah otomatis merah. Batas tuntas: ${batas}.`,
    "Lembar Analisis Soal terhitung otomatis. Kelompok Atas/Bawah = 27% skor tertinggi/terendah, untuk daya beda.",
  ]) {
    baris.push([{ v: t, s: G.catatan }])
    gabung.push(`A${baris.length}:${kolom(kKel)}${baris.length}`)
  }
  const lJawab: Lembar = {
    nama: J, baris, gabung,
    lebar: [5, 30, ...Array(m).fill(4.5), 7, 7, 8, 10],
    tinggi: { [rKepala]: 22 },
    beku: { baris: rKunci, kolom: 2 },
    kunci: true,
    cetak: { kertas, judulBaris: [rKepala, rKunci] },
    validasi: [
      { sqref: `${cS}${rKunci}:${cE}${rN}`, jenis: "list", rumus1: `"${[...huruf, "0", "1"].join(",")}"`, judul: "Jawaban", pesan: `Isi ${huruf.join("/")} untuk pilihan ganda, atau 1/0 untuk soal benar-salah.` },
    ],
    warna: [
      { sqref: `${cS}${r1}:${cE}${rN}`, aturan: [{ op: "expression", nilai: `AND(${cS}${r1}<>"",${cS}$${rKunci}<>"",UPPER(TRIM(${cS}${r1}&""))<>UPPER(TRIM(${cS}$${rKunci}&"")))`, dxf: DXF.kurang }] },
      { sqref: `${kolom(kTuntas)}${r1}:${kolom(kTuntas)}${rN}`, aturan: [{ op: "equal", nilai: '"Belum"', dxf: DXF.kurang }] },
    ],
  }

  // ---------- Lembar Skor (otomatis, 1 = benar) ----------
  const bS: Sel[][] = []
  for (let i = 1; i < r1; i++) bS.push(i === rKepala ? [{ v: "No", s: G.kepala }, { v: "Skor 1 = benar, 0 = salah (otomatis)", s: G.kepala }, ...Array.from({ length: m }, (_, k) => ({ v: k + 1, s: G.kepala }))] : [])
  for (let i = 0; i < n; i++) {
    const r = r1 + i
    bS.push([
      { v: i + 1, s: G.tengah },
      { f: `IF('${J}'!B${r}="","",'${J}'!B${r})`, s: G.sel },
      ...Array.from({ length: m }, (_, k) => {
        const c = kolom(kS + k)
        return { f: `IF(OR('${J}'!${c}${r}="",'${J}'!${c}$${rKunci}=""),0,IF(UPPER(TRIM('${J}'!${c}${r}&""))=UPPER(TRIM('${J}'!${c}$${rKunci}&"")),1,0))`, s: G.tengah }
      }),
    ])
  }
  const lSkor: Lembar = { nama: S, baris: bS, lebar: [5, 30, ...Array(m).fill(4.5)], beku: { baris: rKepala, kolom: 2 }, kunci: true, cetak: { kertas } }

  // ---------- Lembar Analisis Soal ----------
  const A: Sel[][] = [], gA: string[] = []
  kopExcel(A, gA, 11 + huruf.length, sekolah, "HASIL ANALISIS BUTIR SOAL", ket)
  const peserta = `COUNT('${J}'!${totalRng})`
  // Ringkasan: label digabung A:D, nilai di kolom E (E5 = jumlah siswa, dipakai aturan warna pengecoh).
  const label = (v: string): Sel[] => [{ v, s: G.kiriTebal }, { v: "", s: G.kiriTebal }, { v: "", s: G.kiriTebal }, { v: "", s: G.kiriTebal }]
  A.push([...label("Jumlah siswa yang dinilai"), { f: peserta, s: G.tengahTebal }])
  gA.push(`A${A.length}:D${A.length}`)
  A.push([...label("Rata-rata nilai"), { f: `IFERROR(ROUND(AVERAGE('${J}'!$${cN}$${r1}:$${cN}$${rN}),1),"")`, s: G.tengahTebal }])
  gA.push(`A${A.length}:D${A.length}`)
  A.push([...label("Ketuntasan klasikal"), { f: `IFERROR(COUNTIF('${J}'!$${kolom(kTuntas)}$${r1}:$${kolom(kTuntas)}$${rN},"Ya")/${peserta},"")`, s: G.persen }])
  gA.push(`A${A.length}:D${A.length}`)
  A.push([])
  const rKA = A.length + 1
  A.push([
    ...["Soal", "Kunci", "Benar", "Tingkat Kesukaran (P)", "Kategori", "P Atas", "P Bawah", "Daya Beda (D)", "Kategori", "Keputusan"].map((v) => ({ v, s: G.kepala })),
    ...huruf.map((h) => ({ v: `Pilih ${h}`, s: G.kepala })),
    { v: "Kosong", s: G.kepala },
  ])
  const sR = (c: string) => `'${S}'!$${c}$${r1}:$${c}$${rN}`
  const jR = (c: string) => `'${J}'!$${c}$${r1}:$${c}$${rN}`
  const kelR = jR(cK)
  for (let k = 0; k < m; k++) {
    const c = kolom(kS + k), r = A.length + 1
    // Skor siswa yang tidak ikut selalu 0, jadi jumlah skor = jumlah siswa yang menjawab benar.
    const benar = `SUM(${sR(c)})`
    A.push([
      { v: k + 1, s: G.tengah },
      { f: `IF('${J}'!${c}$${rKunci}="","–",'${J}'!${c}$${rKunci})`, s: G.tengah },
      { f: benar, s: G.tengah },
      { f: `IFERROR(ROUND(C${r}/${peserta},2),"")`, s: G.tengah },
      { f: `IF(D${r}="","",IF(D${r}<=0.3,"Sukar",IF(D${r}<=0.7,"Sedang","Mudah")))`, s: G.tengah },
      { f: `IFERROR(ROUND(COUNTIFS(${kelR},"Atas",${sR(c)},1)/COUNTIF(${kelR},"Atas"),2),"")`, s: G.tengah },
      { f: `IFERROR(ROUND(COUNTIFS(${kelR},"Bawah",${sR(c)},1)/COUNTIF(${kelR},"Bawah"),2),"")`, s: G.tengah },
      { f: `IF(OR(F${r}="",G${r}=""),"",ROUND(F${r}-G${r},2))`, s: G.tengah },
      { f: `IF(H${r}="","",IF(H${r}<0,"Sangat jelek",IF(H${r}<=0.2,"Jelek",IF(H${r}<=0.4,"Cukup",IF(H${r}<=0.7,"Baik","Baik sekali")))))`, s: G.tengah },
      { f: `IF(H${r}="","",IF(H${r}>0.4,"Dipakai",IF(H${r}>0.2,"Dipakai, diperbaiki","Revisi/ganti")))`, s: G.tengah },
      ...huruf.map((h) => ({ f: `COUNTIF(${jR(c)},"${h}")`, s: G.tengah })),
      { f: `COUNTIFS(${jR(cB)},">=0",${jR(c)},"")`, s: G.tengah },
    ])
  }
  const rA1 = rKA + 1, rAN = rKA + m
  A.push([])
  for (const t of [
    "Tingkat kesukaran P = siswa yang menjawab benar ÷ siswa yang ikut. 0,00–0,30 sukar; 0,31–0,70 sedang; 0,71–1,00 mudah.",
    "Daya beda D = P kelompok atas − P kelompok bawah (27% skor tertinggi dan terendah). ≤0,20 jelek; 0,21–0,40 cukup; 0,41–0,70 baik; >0,70 baik sekali; negatif = periksa kunci.",
    "Pengecoh berfungsi bila dipilih minimal 5% siswa. Pengecoh yang hampir tidak dipilih sebaiknya diganti. Kriteria: Arikunto, Dasar-dasar Evaluasi Pendidikan.",
    "Kelas kecil (kurang dari ±20 siswa) membuat daya beda kurang stabil; pakai sebagai bahan pertimbangan, bukan keputusan mutlak.",
  ]) {
    A.push([{ v: t, s: G.catatan }])
    gA.push(`A${A.length}:${kolom(10 + huruf.length)}${A.length}`)
  }
  ttdExcel(A, gA, [0, 4], [5, 10 + huruf.length], kebijakan, profil, tanggalPanjang())
  const lAnalisis: Lembar = {
    nama: "Analisis Soal", baris: A, gabung: gA,
    lebar: [6, 7, 7, 11, 9, 7, 7, 9, 11, 17, ...huruf.map(() => 7), 8],
    tinggi: { [rKA]: 30 },
    beku: { baris: rKA, kolom: 1 },
    kunci: true,
    cetak: { kertas, judulBaris: [rKA, rKA] },
    warna: [
      { sqref: `J${rA1}:J${rAN}`, aturan: [{ op: "equal", nilai: '"Revisi/ganti"', dxf: DXF.kurang }, { op: "equal", nilai: '"Dipakai, diperbaiki"', dxf: DXF.kuning }] },
      { sqref: `H${rA1}:H${rAN}`, aturan: [{ op: "lessThan", nilai: "0", dxf: DXF.merah }] },
      // Pengecoh (bukan kunci) yang dipilih kurang dari 5% siswa.
      ...huruf.map((h, i) => {
        const c = kolom(10 + i)
        return { sqref: `${c}${rA1}:${c}${rAN}`, aturan: [{ op: "expression" as const, nilai: `AND($B${rA1}<>"–",$B${rA1}<>"${h}",${c}${rA1}<0.05*$E$5)`, dxf: DXF.kuning }] }
      }),
    ],
  }
  return { data: buatXlsx([lJawab, lAnalisis, lSkor]), n, m, batas, adaKunci: !!kunci, rKunci, r1 }
}
