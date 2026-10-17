// Mengisi berkas rekap nilai buatan sekolah (diserahkan guru ke operator untuk dimasukkan ke e-Rapor). Memakai mesin
// templat Excel (lib/templatexcel.ts): kolom dikenali dari judulnya, hanya sel kosong yang diisi, format dipertahankan.

import type { BukuNilai, Hadir } from "./analisis.ts"
import type { Siswa } from "./siswa.ts"
import { isiTemplat } from "./templatexcel.ts"

export { adalahRekap, cocokMapel, jenisDariJudul, norm } from "./templatexcel.ts"
export type { JenisKolom } from "./templatexcel.ts"

export type DataGuru = { siswa: Siswa[]; nilai: BukuNilai[]; hadir: Hadir[] }
export type HasilIsi = ReturnType<typeof isiTemplat>

export function isiRekap(berkas: Uint8Array, d: DataGuru, o: { timpa?: boolean; nolStrip?: boolean } = {}): HasilIsi {
  return isiTemplat(berkas, d, o)
}
