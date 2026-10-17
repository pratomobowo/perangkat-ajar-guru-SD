// Administrasi wali kelas dan pembagian kelompok. Nama siswa diambil dari Daftar Siswa dan ditulis langsung ke Excel di
// hasil/4 Administrasi (terkunci dari asisten); asisten hanya menerima jumlah dan ringkasan angka.

import { kopExcel, ttdExcel } from "./administrasi.ts"
import { type Kebijakan, type Profil, Gagal } from "./berkas.ts"
import { tanggalPanjang } from "./dokumen.ts"
import { NAMA_HARI, hariSekolah } from "./kalender.ts"
import type { Siswa } from "./siswa.ts"
import { G, type Lembar, type Sel, buatXlsx, kolom } from "./xlsx.ts"

const kapital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const JABATAN_BAWAAN = [
  "Ketua Kelas", "Wakil Ketua Kelas", "Sekretaris 1", "Sekretaris 2", "Bendahara 1", "Bendahara 2",
  "Seksi Kebersihan", "Seksi Ketertiban", "Seksi Kesehatan", "Seksi Keagamaan", "Seksi Perlengkapan",
]

/** Kalimat positif (disiplin positif) yang bisa disepakati bersama murid; guru boleh mengubahnya di Excel. */
export const KESEPAKATAN_BAWAAN = [
  "Datang tepat waktu dan mengikuti doa bersama.",
  "Mengangkat tangan dan menunggu giliran sebelum berbicara.",
  "Mendengarkan saat guru atau teman berbicara.",
  "Menggunakan kata-kata yang sopan dan baik kepada semua orang.",
  "Saling membantu dan tidak mengejek teman.",
  "Menjaga kebersihan kelas dan membuang sampah pada tempatnya.",
  "Merawat barang milik sendiri, teman, dan kelas.",
  "Meminta izin sebelum keluar kelas.",
  "Menyelesaikan tugas dengan jujur dan sebaik-baiknya.",
  "Mengembalikan barang ke tempatnya setelah dipakai.",
]

export type UrutanDuduk = "absen" | "acak" | "selang_jk"

/** Pengacak dengan benih (hasil bisa diulang dalam uji); tanpa benih memakai Math.random. */
export function pengacak(benih?: number): () => number {
  if (benih === undefined) return Math.random
  let a = benih >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function acak<T>(xs: T[], r: () => number): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
/** Laki-laki dan perempuan berselang-seling (sisa di belakang); urutan dalam tiap kelompok mengikuti `xs`. */
export function selangJk<T extends { jk?: string }>(xs: T[]): T[] {
  const l = xs.filter((s) => s.jk === "L"), p = xs.filter((s) => s.jk === "P"), lain = xs.filter((s) => s.jk !== "L" && s.jk !== "P")
  const out: T[] = []
  for (let i = 0; i < Math.max(l.length, p.length); i++) {
    if (l[i]) out.push(l[i])
    if (p[i]) out.push(p[i])
  }
  return [...out, ...lain]
}

export type OpsiWaliKelas = {
  jabatan?: string[]
  kesepakatan?: string[]
  kolomMeja?: number
  perMeja?: 1 | 2
  urutanDuduk?: UrutanDuduk
  benih?: number
}

/** Paket wali kelas: struktur organisasi, jadwal piket, denah tempat duduk, kesepakatan kelas, dan daftar acuan nama. */
export function paketWaliKelasXlsx(profil: Profil, kebijakan: Kebijakan, siswa: Siswa[], o: OpsiWaliKelas = {}) {
  if (!siswa.length) throw new Gagal("Daftar Siswa belum ada.")
  const r = pengacak(o.benih)
  const sekolah = kebijakan.nama_sekolah ?? profil.sekolah
  const kelas = `Kelas ${profil.rombel ?? profil.kelas}`
  const ket = `${kelas}  ·  Tahun Ajaran ${profil.tahun_ajaran ?? ""}`
  const tanggal = tanggalPanjang()
  const n = siswa.length
  const lembar: Lembar[] = []

  // ----- Struktur organisasi: nama dipilih guru dari daftar (dropdown) -----
  {
    const baris: Sel[][] = [], gabung: string[] = []
    kopExcel(baris, gabung, 3, sekolah, "STRUKTUR ORGANISASI KELAS", ket)
    baris.push([{ v: "No", s: G.kepala }, { v: "Jabatan", s: G.kepala }, { v: "Nama", s: G.kepala }])
    const awal = baris.length + 1
    baris.push([{ v: 1, s: G.tengah }, { v: "Wali Kelas", s: G.kiriTebal }, { v: profil.nama_lengkap ?? "", s: G.selInput }])
    const jabatan = o.jabatan?.length ? o.jabatan : JABATAN_BAWAAN
    jabatan.forEach((j, i) => baris.push([{ v: i + 2, s: G.tengah }, { v: j, s: G.sel }, { v: "", s: G.selInput }]))
    const akhir = baris.length
    const tinggi: Record<number, number> = {}
    for (let i = awal; i <= akhir; i++) tinggi[i] = 22
    baris.push([])
    baris.push([{ v: "Klik sel Nama lalu pilih dari daftar (tanda panah). Jabatan boleh diubah atau ditambah.", s: G.catatan }])
    gabung.push(`A${baris.length}:C${baris.length}`)
    ttdExcel(baris, gabung, [0, 1], [2, 2], kebijakan, profil, tanggal)
    lembar.push({
      nama: "Struktur Organisasi", baris, gabung, tinggi, lebar: [6, 28, 38], kunci: true, cetak: { kertas: kebijakan.kertas === "F4" ? "F4" : "A4", potret: true },
      validasi: [{ sqref: `C${awal + 1}:C${akhir}`, jenis: "list", rumus1: `'Daftar Siswa'!$B$2:$B$${n + 1}`, judul: "Pilih nama", pesan: "Pilih nama siswa dari daftar." }],
    })
  }

  // ----- Jadwal piket: dibagi rata per hari sekolah, laki-laki dan perempuan bercampur -----
  const hari = [...hariSekolah(profil)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  const per: Siswa[][] = hari.map(() => [])
  selangJk(siswa).forEach((s, i) => per[i % hari.length].push(s))
  {
    const baris: Sel[][] = [], gabung: string[] = []
    kopExcel(baris, gabung, hari.length + 1, sekolah, "JADWAL PIKET KELAS", ket)
    baris.push([{ v: "No", s: G.kepala }, ...hari.map((h) => ({ v: kapital(NAMA_HARI[h]), s: G.kepala }))])
    const maks = Math.max(...per.map((x) => x.length))
    for (let i = 0; i < maks; i++) baris.push([{ v: i + 1, s: G.tengah }, ...per.map((x) => ({ v: x[i]?.nama ?? "", s: G.selInput }))])
    baris.push([])
    baris.push([{ v: "Tugas piket: menyapu dan merapikan kelas, menghapus papan tulis, menyiram tanaman, membuang sampah. Nama boleh dipindah antarhari.", s: G.catatan }])
    gabung.push(`A${baris.length}:${kolom(hari.length)}${baris.length}`)
    ttdExcel(baris, gabung, [0, Math.max(1, Math.floor(hari.length / 2))], [Math.max(2, Math.floor(hari.length / 2) + 1), hari.length], kebijakan, profil, tanggal)
    lembar.push({ nama: "Jadwal Piket", baris, gabung, lebar: [6, ...hari.map(() => 24)], kunci: true, cetak: { kertas: kebijakan.kertas === "F4" ? "F4" : "A4", potret: hari.length <= 5 } })
  }

  // ----- Denah tempat duduk: papan tulis di depan, meja per baris -----
  const perMeja = o.perMeja ?? 2
  const kolomMeja = Math.max(1, Math.min(o.kolomMeja ?? 4, 6))
  const urut = o.urutanDuduk === "acak" ? acak(siswa, r) : o.urutanDuduk === "selang_jk" ? selangJk(siswa) : siswa
  const meja = Math.ceil(n / perMeja)
  const barisMeja = Math.ceil(meja / kolomMeja)
  {
    // Tiap meja = perMeja kolom kursi, dipisah satu kolom lorong.
    const lebarGrid = kolomMeja * perMeja + (kolomMeja - 1)
    const baris: Sel[][] = [], gabung: string[] = []
    kopExcel(baris, gabung, lebarGrid, sekolah, "DENAH TEMPAT DUDUK", ket)
    baris.push([{ v: "PAPAN TULIS", s: G.tengahTebal }, ...Array(lebarGrid - 1).fill({ v: "", s: G.tengahTebal })])
    gabung.push(`A${baris.length}:${kolom(lebarGrid - 1)}${baris.length}`)
    const guru: Sel[] = Array(lebarGrid).fill(null)
    guru[lebarGrid - 1] = { v: "Meja Guru", s: G.tengahTebal }
    baris.push(guru)
    baris.push([])
    let k = 0
    const tinggi: Record<number, number> = {}
    for (let b = 0; b < barisMeja; b++) {
      const r1: Sel[] = []
      for (let m = 0; m < kolomMeja; m++) {
        for (let d = 0; d < perMeja; d++) r1.push({ v: urut[k] ? urut[k++].nama : "", s: G.tengahInput })
        if (m < kolomMeja - 1) r1.push(null)
      }
      baris.push(r1)
      tinggi[baris.length] = 36
      baris.push([])
    }
    baris.push([{ v: `Tampak dari belakang kelas (papan tulis di depan). ${meja} meja, ${perMeja} siswa per meja. Nama boleh ditukar langsung di sel.`, s: G.catatan }])
    gabung.push(`A${baris.length}:${kolom(lebarGrid - 1)}${baris.length}`)
    const tengah = Math.floor(lebarGrid / 2)
    ttdExcel(baris, gabung, [0, Math.max(0, tengah - 1)], [tengah, lebarGrid - 1], kebijakan, profil, tanggal)
    const lebar = Array.from({ length: lebarGrid }, (_, i) => ((i + 1) % (perMeja + 1) === 0 ? 3 : perMeja === 1 ? 22 : 17))
    lembar.push({ nama: "Denah Tempat Duduk", baris, gabung, lebar, tinggi, kunci: true, cetak: { kertas: kebijakan.kertas === "F4" ? "F4" : "A4", potret: lebarGrid <= 8 } })
  }

  // ----- Kesepakatan kelas -----
  {
    const baris: Sel[][] = [], gabung: string[] = []
    kopExcel(baris, gabung, 2, sekolah, "KESEPAKATAN KELAS", ket)
    baris.push([{ v: "Kami, warga kelas ini, sepakat untuk:", s: G.kiriTebal }, { v: "", s: G.kiriTebal }])
    gabung.push(`A${baris.length}:B${baris.length}`)
    const isi = o.kesepakatan?.length ? o.kesepakatan : KESEPAKATAN_BAWAAN
    isi.forEach((t, i) => {
      baris.push([{ v: i + 1, s: G.tengah }, { v: t, s: G.selInput }])
      baris.push([])
    })
    baris.push([{ v: "Disusun bersama murid di awal tahun. Kalimat boleh diubah sesuai kesepakatan kelas.", s: G.catatan }])
    gabung.push(`A${baris.length}:B${baris.length}`)
    ttdExcel(baris, gabung, [0, 0], [1, 1], kebijakan, profil, tanggal)
    lembar.push({ nama: "Kesepakatan Kelas", baris, gabung, lebar: [6, 80], kunci: true, cetak: { kertas: kebijakan.kertas === "F4" ? "F4" : "A4", potret: true } })
  }

  // ----- Daftar acuan nama (sumber dropdown) -----
  lembar.push({
    nama: "Daftar Siswa",
    baris: [[{ v: "No", s: G.kepala }, { v: "Nama", s: G.kepala }, { v: "L/P", s: G.kepala }], ...siswa.map((s, i) => [{ v: i + 1, s: G.tengah }, { v: s.nama, s: G.sel }, { v: s.jk ?? "", s: G.tengah }] as Sel[])],
    lebar: [6, 36, 6],
    kunci: true,
    cetak: { potret: true },
  })
  return { data: buatXlsx(lembar), jumlah: n, hari: hari.map((h) => kapital(NAMA_HARI[h])), piket: per.map((x) => x.length), meja, barisMeja, kolomMeja, perMeja, jabatan: (o.jabatan?.length ? o.jabatan : JABATAN_BAWAAN).length }
}

// ---------- Pembagian kelompok ----------
export type CaraKelompok = "acak" | "campur_jk" | "campur_nilai"
export type Anggota = { no: number; nama: string; jk?: string; nilai?: number | null }

/** Membagi siswa ke `k` kelompok dengan ukuran selisih paling banyak satu. */
export function bagiKelompok(anggota: Anggota[], k: number, cara: CaraKelompok, r: () => number): Anggota[][] {
  if (k < 1) throw new Gagal("Jumlah kelompok minimal 1.")
  if (k > anggota.length) throw new Gagal(`Jumlah kelompok (${k}) lebih banyak dari jumlah siswa (${anggota.length}).`)
  const g: Anggota[][] = Array.from({ length: k }, () => [])
  const kecil = () => g.reduce((m, x, i) => (x.length < g[m].length ? i : m), 0)
  if (cara === "acak") {
    acak(anggota, r).forEach((a, i) => g[i % k].push(a))
  } else if (cara === "campur_jk") {
    // Laki-laki dibagi berputar, lalu perempuan melanjutkan putaran: ukuran dan komposisi seimbang.
    let i = 0
    for (const a of [...acak(anggota.filter((x) => x.jk === "L"), r), ...acak(anggota.filter((x) => x.jk === "P"), r), ...acak(anggota.filter((x) => x.jk !== "L" && x.jk !== "P"), r)]) g[i++ % k].push(a)
  } else {
    // Ular tangga (snake draft) dari nilai tertinggi: tiap kelompok mendapat siswa kuat dan siswa yang perlu dibantu.
    const ada = acak(anggota.filter((a) => typeof a.nilai === "number"), r).sort((a, b) => (b.nilai as number) - (a.nilai as number))
    ada.forEach((a, i) => {
      const putaran = Math.floor(i / k), pos = i % k
      g[putaran % 2 === 0 ? pos : k - 1 - pos].push(a)
    })
    for (const a of acak(anggota.filter((x) => typeof x.nilai !== "number"), r)) g[kecil()].push(a)
  }
  return g
}

export function kelompokXlsx(profil: Profil, kebijakan: Kebijakan, kelompok: Anggota[][], judul: string, cara: CaraKelompok) {
  const sekolah = kebijakan.nama_sekolah ?? profil.sekolah
  const baris: Sel[][] = [], gabung: string[] = []
  kopExcel(baris, gabung, 4, sekolah, "PEMBAGIAN KELOMPOK", `${judul}  ·  Kelas ${profil.rombel ?? profil.kelas}  ·  ${tanggalPanjang()}`)
  baris.push([{ v: "Kelompok", s: G.kepala }, { v: "No Absen", s: G.kepala }, { v: "Nama", s: G.kepala }, { v: "L/P", s: G.kepala }])
  kelompok.forEach((x, i) => {
    const mulai = baris.length + 1
    ;[...x].sort((a, b) => a.no - b.no).forEach((a, j) => baris.push([{ v: j === 0 ? `Kelompok ${i + 1}` : "", s: G.kiriTebal }, { v: a.no, s: G.tengah }, { v: a.nama, s: G.selInput }, { v: a.jk ?? "", s: G.tengah }]))
    if (x.length > 1) gabung.push(`A${mulai}:A${baris.length}`)
  })
  baris.push([])
  const ket = { acak: "acak", campur_jk: "acak dengan laki-laki dan perempuan seimbang", campur_nilai: "campuran kemampuan (dari buku nilai; nilai tidak ditampilkan)" }[cara]
  baris.push([{ v: `Dibagi ${ket}. Nama boleh dipindah langsung di sel.`, s: G.catatan }])
  gabung.push(`A${baris.length}:D${baris.length}`)
  return buatXlsx([{ nama: "Kelompok", baris, gabung, lebar: [14, 9, 38, 6], kunci: true, beku: { baris: 5, kolom: 0 }, cetak: { kertas: kebijakan.kertas === "F4" ? "F4" : "A4", potret: true, judulBaris: [5, 5] } }])
}

/** Susunan piket dan tempat duduk (dipakai juga untuk penanda {{piket_senin}}, {{duduk_1}} di format sekolah/guru). */
export function susunanWaliKelas(profil: Profil, siswa: Siswa[], o: OpsiWaliKelas = {}) {
  const hari = [...hariSekolah(profil)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  const piket: Siswa[][] = hari.map(() => [])
  selangJk(siswa).forEach((s, i) => piket[i % hari.length].push(s))
  const r = pengacak(o.benih)
  const duduk = o.urutanDuduk === "acak" ? acak(siswa, r) : o.urutanDuduk === "selang_jk" ? selangJk(siswa) : siswa
  const penanda: Record<string, string> = {}
  hari.forEach((h, i) => {
    penanda[`piket_${NAMA_HARI[h]}`] = piket[i].map((s) => s.nama).join(", ")
    piket[i].forEach((s, j) => (penanda[`piket_${NAMA_HARI[h]}_${j + 1}`] = s.nama))
  })
  duduk.forEach((s, i) => (penanda[`duduk_${i + 1}`] = s.nama))
  return { hari: hari.map((h) => kapital(NAMA_HARI[h])), piket, duduk, penanda }
}
