// Perhitungan kalender: hari sekolah, minggu efektif, status tanggal.
// Semua tanggal diproses sebagai UTC agar tidak terpengaruh zona waktu.

import type { Kalender, Profil } from "./berkas.ts"

export const NAMA_HARI = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
export const NAMA_BULAN = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

export function tgl(s: string): Date {
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) throw new Error(`Format tanggal harus YYYY-MM-DD, bukan "${s}"`)
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
}
export const fmt = (d: Date) => d.toISOString().slice(0, 10)
export const tambah = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)
export const bulanKey = (d: Date) => fmt(d).slice(0, 7)
export function namaBulan(key: string): string {
  const [y, m] = key.split("-")
  return `${NAMA_BULAN[+m]} ${y}`
}
export function tglIndo(d: Date, denganHari = false): string {
  const s = `${d.getUTCDate()} ${NAMA_BULAN[d.getUTCMonth() + 1].slice(0, 3)} ${d.getUTCFullYear()}`
  return denganHari ? `${NAMA_HARI[d.getUTCDay()][0].toUpperCase()}${NAMA_HARI[d.getUTCDay()].slice(1)}, ${s}` : s
}
export function hariIni(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function hariSekolah(profil: Profil): Set<number> {
  const h = profil.hari_sekolah?.length ? profil.hari_sekolah : ["senin", "selasa", "rabu", "kamis", "jumat"]
  return new Set(h.map((x) => NAMA_HARI.indexOf(x.toLowerCase().replace("'", ""))).filter((i) => i >= 0))
}

/** Kegiatan kalender yang mengenai tanggal ini (libur menang atas tidak_efektif). */
export function statusTanggal(d: Date, kal: Kalender) {
  const kena = kal.kegiatan.filter((k) => {
    const a = tgl(k.mulai)
    const b = tgl(k.akhir ?? k.mulai)
    return d >= a && d <= b
  })
  const jenis = kena.some((k) => k.jenis === "libur") ? "libur" : kena.length ? "tidak_efektif" : null
  return { jenis, nama: kena.map((k) => k.nama) }
}

export type Minggu = {
  semester: number
  ke: number
  senin: string
  mulai: string
  akhir: string
  bulan: string // YYYY-MM, ditentukan oleh hari Rabu minggu itu
  hari_sekolah: number
  hari_efektif: number
  efektif: boolean
  keterangan: string[]
}

export function mingguSemester(kal: Kalender, profil: Profil, minHari: number): Minggu[] {
  const hs = hariSekolah(profil)
  const out: Minggu[] = []
  for (const sem of kal.semester) {
    const a = tgl(sem.mulai)
    const b = tgl(sem.akhir)
    let senin = tambah(a, -((a.getUTCDay() + 6) % 7))
    let ke = 0
    while (senin <= b) {
      const hari: Date[] = []
      for (let i = 0; i < 7; i++) {
        const d = tambah(senin, i)
        if (d >= a && d <= b && hs.has(d.getUTCDay())) hari.push(d)
      }
      if (hari.length) {
        const ket = new Set<string>()
        let efektif = 0
        for (const d of hari) {
          const st = statusTanggal(d, kal)
          st.nama.forEach((n) => ket.add(n))
          if (!st.jenis) efektif++
        }
        ke++
        out.push({
          semester: sem.ke,
          ke,
          senin: fmt(senin),
          mulai: fmt(hari[0]),
          akhir: fmt(hari[hari.length - 1]),
          bulan: bulanKey(tambah(senin, 2)),
          hari_sekolah: hari.length,
          hari_efektif: efektif,
          efektif: efektif >= minHari,
          keterangan: [...ket],
        })
      }
      senin = tambah(senin, 7)
    }
  }
  return out
}

export function ringkasBulan(minggu: Minggu[]) {
  const peta = new Map<string, { bulan: string; semester: number; jumlah: number; efektif: number; ket: Set<string> }>()
  for (const m of minggu) {
    const k = `${m.semester}|${m.bulan}`
    const r = peta.get(k) ?? { bulan: m.bulan, semester: m.semester, jumlah: 0, efektif: 0, ket: new Set<string>() }
    r.jumlah++
    if (m.efektif) r.efektif++
    m.keterangan.forEach((x) => r.ket.add(x))
    peta.set(k, r)
  }
  return [...peta.values()]
}
