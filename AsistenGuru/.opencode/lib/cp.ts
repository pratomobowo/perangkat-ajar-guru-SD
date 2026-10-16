// Capaian Pembelajaran resmi dari PDF Keputusan Kepala BSKAP No. 046/H/KR/2025 (Lampiran II: SD/MI, SMP/MTs, SMA/MA).
// Teks CP di guru.kemendikdasmen.go.id (JSON) masih versi lama, jadi sumber yang dipakai adalah PDF keputusan ini.

import { Gagal, slug } from "./berkas.ts"

export const CP_URL = "https://kurikulum.kemendikdasmen.go.id/file/1753929861_manage_file.pdf"
export const CP_SUMBER = "Keputusan Kepala BSKAP No. 046/H/KR/2025, Lampiran II"

/** Kode mapel (slug di profil) → judul bagian di PDF dan perkiraan halaman PDF awalnya (dipakai untuk mempercepat). */
export const MAPEL_CP: Record<string, { judul: string; halaman: number }> = {
  "pendidikan-pancasila": { judul: "PENDIDIKAN PANCASILA", halaman: 76 },
  "bahasa-indonesia": { judul: "BAHASA INDONESIA", halaman: 88 },
  matematika: { judul: "MATEMATIKA", halaman: 106 },
  "bahasa-inggris": { judul: "BAHASA INGGRIS", halaman: 126 },
  ipas: { judul: "ILMU PENGETAHUAN ALAM DAN SOSIAL", halaman: 146 },
  "seni-musik": { judul: "SENI MUSIK", halaman: 234 },
  "seni-rupa": { judul: "SENI RUPA", halaman: 243 },
  "seni-tari": { judul: "SENI TARI", halaman: 250 },
  "seni-teater": { judul: "SENI TEATER", halaman: 260 },
  pjok: { judul: "PENDIDIKAN JASMANI", halaman: 302 },
  "koding-dan-kecerdasan-artifisial": { judul: "KODING DAN KECERDASAN ARTIFISIAL", halaman: 338 },
}
const ALIAS: Record<string, string> = {
  "ilmu-pengetahuan-alam-dan-sosial": "ipas",
  "pendidikan-jasmani-olahraga-dan-kesehatan": "pjok",
  ppkn: "pendidikan-pancasila",
  pkn: "pendidikan-pancasila",
  "b-indonesia": "bahasa-indonesia",
  "b-inggris": "bahasa-inggris",
  koding: "koding-dan-kecerdasan-artifisial",
  kka: "koding-dan-kecerdasan-artifisial",
}

export function kodeCp(mapel: string): string {
  const s = slug(mapel)
  if (MAPEL_CP[s]) return s
  if (ALIAS[s]) return ALIAS[s]
  if (/agama|budi-pekerti|kepercayaan|^pai$/.test(s))
    throw new Gagal("CP Pendidikan Agama dan Kepercayaan diubah tahun 2026 (Kepka BKPDM 020 dan 021 Tahun 2026) dan dokumennya berupa hasil pindaian, jadi tidak bisa diambil otomatis. Minta operator/guru agama mengisinya manual di sekolah/referensi/cp/.")
  throw new Gagal(`Mapel "${mapel}" belum dikenali untuk CP otomatis. Mapel SD yang didukung: ${Object.values(MAPEL_CP).map((m) => m.judul.toLowerCase()).join(", ")}.`)
}

// "IV.1. CAPAIAN PEMBELAJARAN MATEMATIKA", "VI. CAPAIAN ...", juga "II CAPAIAN ..." (tanpa titik).
const JUDUL_MAPEL = /^[IVX]+(?:\.\d+)?\.?\s+CAPAIAN PEMBELAJARAN\s+(.+)$/
const KELAS_FASE: Record<string, string> = { A: "I–II", B: "III–IV", C: "V–VI" }

export type HasilCp = { mapel: string; fase: string; kelas: string; catatan: string[]; pengantar: string; elemen: { nama: string; teks: string }[]; halaman: [number, number] }

/** Rapikan potongan baris PDF menjadi paragraf. */
function rapikan(baris: string[]): string {
  const par: string[] = []
  let cur = ""
  let butir = false // sedang di judul butir "●" yang belum diberi uraian
  for (const b of baris.map((x) => x.trim()).filter(Boolean)) {
    // Butir "● Mengamati" lalu "Murid mengamati ..." → "- **Mengamati**: Murid mengamati ..."
    if (/^[●•▪]/.test(b)) {
      if (cur) par.push(cur)
      cur = `- **${b.replace(/^[●•▪]\s*/, "")}`
      butir = true
      continue
    }
    // Judul butir boleh berlanjut ke baris pendek yang setiap katanya berhuruf kapital ("Informasi"); selain itu uraian.
    if (butir && b.length <= 40 && /^[A-Z][\w,-]*(\s+([A-Z][\w,-]*|dan|atau))*$/.test(b)) { cur += ` ${b}`; continue }
    if (butir) { cur += `**: ${b}`; butir = false; continue }
    // Kalimat baru yang diawali "Murid ..." setelah titik dianggap paragraf baru (pola di dokumen CP).
    if (cur && /[.:]$/.test(cur) && /^(Murid|Pada akhir)\b/.test(b)) { par.push(cur); cur = b; continue }
    cur = cur ? `${cur}${cur.endsWith("-") && /^[a-z]/.test(b) ? "" : " "}${b}` : b
  }
  if (cur) par.push(butir ? `${cur}**` : cur)
  return par.join("\n\n").replace(/\s+([,.;:])/g, "$1").replace(/ {2,}/g, " ")
}

/**
 * Mengambil CP satu mapel dan satu fase dari teks halaman PDF (indeks 0 = halaman 1).
 * `mulai` = halaman PDF (1-based) tempat mencari judul mapel lebih dulu.
 */
export function uraiCp(halaman: string[], kode: string, fase: string, mulai = 1): HasilCp {
  const info = MAPEL_CP[kode]
  const F = fase.toUpperCase()
  // Baris beserta nomor halamannya.
  const baris: { t: string; h: number }[] = []
  for (let i = 0; i < halaman.length; i++) for (const t of halaman[i].split("\n")) baris.push({ t: t.trim(), h: i + 1 })
  const cocokJudul = (i: number) => {
    const t = `${baris[i].t} ${baris[i + 1]?.t ?? ""}`
    const m = t.match(JUDUL_MAPEL)
    if (!m) return false
    const judul = m[1].replace(/\s+/g, " ")
    // "MATEMATIKA" tidak boleh cocok dengan "MATEMATIKA TINGKAT LANJUT".
    return judul.startsWith(info.judul) && !/TINGKAT LANJUT/.test(judul.slice(info.judul.length, info.judul.length + 20))
  }
  let awal = baris.findIndex((b, i) => b.h >= mulai && cocokJudul(i))
  if (awal < 0) awal = baris.findIndex((_, i) => cocokJudul(i))
  if (awal < 0) throw new Gagal(`Bagian CP ${info.judul} tidak ditemukan di dokumen resmi.`)
  let akhir = baris.findIndex((b, i) => i > awal && JUDUL_MAPEL.test(b.t))
  if (akhir < 0) akhir = baris.length

  const reFase = /^(\d+)\.\s+Fase\s+([A-F])\b/
  const iFase = baris.findIndex((b, i) => i > awal && i < akhir && reFase.test(b.t) && b.t.match(reFase)![2] === F)
  if (iFase < 0) throw new Gagal(`Dokumen resmi tidak memuat CP ${info.judul} untuk Fase ${F} (mapel ini tidak diajarkan di fase itu).`)
  const nomor = baris[iFase].t.match(reFase)![1]
  let iAkhir = baris.findIndex((b, i) => i > iFase && i < akhir && reFase.test(b.t))
  if (iAkhir < 0) iAkhir = akhir

  // Keterangan kelas di judul fase, misalnya "(Umumnya untuk Kelas III dan IV SD/MI/Program Paket A)".
  let judulFase = baris[iFase].t
  let j = iFase + 1
  while (!judulFase.includes(")") && j < iAkhir) judulFase += ` ${baris[j++].t}`
  const kelasDok = judulFase.match(/Kelas\s+([IVX]+)\s+dan\s+([IVX]+)/)?.slice(1, 3).join("–") ?? ""
  // Fase menentukan kelas (Diktum KEEMPAT: A = I–II, B = III–IV, C = V–VI); perbedaan di dokumen dicatat.
  const kelas = KELAS_FASE[F] ?? kelasDok
  const catatan = kelasDok && kelasDok !== kelas ? [`Judul fase di dokumen resmi tertulis "Kelas ${kelasDok.replace("–", " dan ")}" (diduga salah ketik); dipakai kelas ${kelas} sesuai ketentuan fase.`] : []

  const reElemen = new RegExp(`^${nomor}\\.(\\d+)\\.\\s+(.+)$`)
  const isi = baris.slice(j, iAkhir)
  const elemen: { nama: string; teks: string[] }[] = []
  const pengantar: string[] = []
  let namaBelumLengkap = false
  let barisSetelahNama = false
  for (const b of isi) {
    const m = b.t.match(reElemen)
    // Lanjutan nama elemen tanpa tanda kurung, misalnya "Undang-Undang Dasar Negara Republik" + "Indonesia Tahun 1945":
    // baris pendek tepat setelah nama yang setiap katanya berhuruf awal kapital atau angka.
    if (!m && barisSetelahNama && elemen.length && b.t.length <= 40 && /^[A-Z0-9][\w-]*(\s+[A-Z0-9][\w-]*)*$/.test(b.t)) {
      elemen[elemen.length - 1].nama += ` ${b.t}`
      continue
    }
    barisSetelahNama = !!m
    // Nama elemen yang terpotong ke baris berikutnya, misalnya "Berpikir dan Bekerja Artistik (Thinking and" + "Working)".
    if (!m && namaBelumLengkap && elemen.length) {
      elemen[elemen.length - 1].nama += ` ${b.t}`
      namaBelumLengkap = (elemen[elemen.length - 1].nama.match(/\(/g) ?? []).length > (elemen[elemen.length - 1].nama.match(/\)/g) ?? []).length
      continue
    }
    if (m) {
      elemen.push({ nama: m[2].trim(), teks: [] })
      namaBelumLengkap = (m[2].match(/\(/g) ?? []).length > (m[2].match(/\)/g) ?? []).length
    }
    else if (elemen.length) elemen[elemen.length - 1].teks.push(b.t)
    else pengantar.push(b.t)
  }
  if (!elemen.length) throw new Gagal(`Elemen CP ${info.judul} Fase ${F} tidak terbaca dari dokumen resmi.`)
  return {
    mapel: info.judul,
    fase: F,
    kelas,
    catatan,
    pengantar: rapikan(pengantar),
    elemen: elemen.map((e) => ({ nama: e.nama, teks: rapikan(e.teks) })),
    halaman: [baris[iFase].h, baris[Math.max(iFase, iAkhir - 1)].h],
  }
}

export const judulKapital = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).replace(/\b(Dan|Di|Ke)\b/g, (k) => k.toLowerCase())

/** Isi berkas CP (frontmatter dibaca susun_perencanaan; elemen harus persis untuk validasi ATP). */
export function cpMd(h: HasilCp, tanggal: string): string {
  const mapel = judulKapital(h.mapel)
  return [
    "---",
    `mapel: ${mapel}`,
    `fase: ${h.fase}`,
    `kelas: ${h.kelas}`,
    `sumber: ${CP_SUMBER}, ${mapel} Fase ${h.fase} (halaman PDF ${h.halaman[0]}–${h.halaman[1]})`,
    `url: ${CP_URL}`,
    `elemen: ${h.elemen.map((e) => e.nama).join("; ")}`,
    "status: OTOMATIS-RESMI      # diambil otomatis dari PDF resmi; ganti menjadi TERVERIFIKASI setelah dicocokkan",
    `diambil: ${tanggal}`,
    "diverifikasi_oleh:",
    "tanggal_verifikasi:",
    "---",
    "",
    `# Capaian Pembelajaran ${mapel} Fase ${h.fase}`,
    "",
    `Diambil otomatis dari ${CP_SUMBER} (halaman PDF ${h.halaman[0]}–${h.halaman[1]}). Cocokkan dengan dokumen resmi sebelum mengubah status menjadi TERVERIFIKASI.`,
    "",
    ...h.catatan.map((c) => `> Catatan: ${c}\n`),
    h.pengantar,
    "",
    ...h.elemen.flatMap((e) => [`## ${e.nama}`, "", e.teks, ""]),
  ].join("\n")
}
