// Struktur kurikulum SD resmi: alokasi JP per tahun (Permendikdasmen No. 13 Tahun 2025, Lampiran II Tabel 1–5).
// Dipakai saat guru belum tahu JP per minggu tiap mapel, supaya angka tidak ditebak model.
// Asumsi panduan: 36 minggu per tahun (kelas VI: 32 minggu), 1 JP = 35 menit.

import { Gagal, slug } from "./berkas.ts"

type Baris = { mapel: string; intra: (number | null)[]; koku: (number | null)[] } // indeks 0..5 = kelas I..VI
const T: Baris[] = [
  { mapel: "Pendidikan Agama dan Budi Pekerti", intra: [108, 108, 108, 108, 108, 96], koku: [36, 36, 36, 36, 36, 32] },
  { mapel: "Pendidikan Pancasila", intra: [144, 144, 144, 144, 144, 128], koku: [36, 36, 36, 36, 36, 32] },
  { mapel: "Bahasa Indonesia", intra: [252, 288, 216, 216, 216, 192], koku: [36, 36, 36, 36, 36, 32] },
  { mapel: "Matematika", intra: [144, 180, 180, 180, 180, 160], koku: [36, 36, 36, 36, 36, 32] },
  { mapel: "IPAS", intra: [null, null, 180, 180, 180, 160], koku: [null, null, 36, 36, 36, 32] },
  { mapel: "PJOK", intra: [108, 108, 108, 108, 108, 96], koku: [36, 36, 36, 36, 36, 32] },
  { mapel: "Seni dan Budaya", intra: [108, 108, 108, 108, 108, 96], koku: [36, 36, 36, 36, 36, 32] },
  { mapel: "Bahasa Inggris", intra: [null, null, 72, 72, 72, 64], koku: [null, null, null, null, null, null] },
  { mapel: "Koding dan Kecerdasan Artifisial (pilihan)", intra: [null, null, null, null, 72, 64], koku: [null, null, null, null, null, null] },
  { mapel: "Muatan Lokal", intra: [72, 72, 72, 72, 72, 64], koku: [null, null, null, null, null, null] },
]
const ALIAS: Record<string, string> = {
  "pendidikan-agama": "Pendidikan Agama dan Budi Pekerti", agama: "Pendidikan Agama dan Budi Pekerti", pai: "Pendidikan Agama dan Budi Pekerti",
  pancasila: "Pendidikan Pancasila", ppkn: "Pendidikan Pancasila", pkn: "Pendidikan Pancasila",
  "bahasa-indonesia": "Bahasa Indonesia", "b-indonesia": "Bahasa Indonesia", matematika: "Matematika", mtk: "Matematika",
  ipas: "IPAS", "ilmu-pengetahuan-alam-dan-sosial": "IPAS", pjok: "PJOK", olahraga: "PJOK", penjas: "PJOK",
  seni: "Seni dan Budaya", "seni-rupa": "Seni dan Budaya", "seni-musik": "Seni dan Budaya", "seni-tari": "Seni dan Budaya", "seni-teater": "Seni dan Budaya", sbdp: "Seni dan Budaya",
  "bahasa-inggris": "Bahasa Inggris", inggris: "Bahasa Inggris", koding: "Koding dan Kecerdasan Artifisial (pilihan)", mulok: "Muatan Lokal", "muatan-lokal": "Muatan Lokal",
}
const cari = (m: string) => {
  const s = slug(m)
  const nama = ALIAS[s] ?? Object.entries(ALIAS).find(([k]) => s.includes(k))?.[1] ?? T.find((b) => slug(b.mapel) === s)?.mapel
  return T.find((b) => b.mapel === nama)
}

/** JP per minggu resmi untuk kelas dan mapel: intrakurikuler, serta total bila jam kokurikuler dibagi ke mapel. */
export function acuanJp(kelas: number, mapel?: string[]) {
  if (!Number.isInteger(kelas) || kelas < 1 || kelas > 6) throw new Gagal("Kelas harus 1 sampai 6.")
  const minggu = kelas === 6 ? 32 : 36
  const pilih = mapel?.length ? mapel.map((m) => ({ diminta: m, b: cari(m) })) : T.map((b) => ({ diminta: b.mapel, b }))
  const baris = pilih.map(({ diminta, b }) => {
    const intra = b?.intra[kelas - 1] ?? null, koku = b?.koku[kelas - 1] ?? null
    return { diminta, mapel: b?.mapel ?? null, intraTahun: intra, intraMinggu: intra === null ? null : intra / minggu, totalMinggu: intra === null ? null : (intra + (koku ?? 0)) / minggu }
  })
  return { minggu, baris }
}
