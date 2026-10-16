// Hari libur nasional dan cuti bersama resmi (SKB Menteri Agama, Menteri Ketenagakerjaan, dan Menteri PANRB), untuk
// menyusun kalender perkiraan bila sekolah belum memberi kalender pendidikan. Tanggal Idulfitri/Iduladha final mengikuti
// Keputusan Menteri Agama; libur sekolah (semester, sekitar Lebaran) mengikuti kalender pendidikan dinas/sekolah.
// Sumber: setneg.go.id — SKB 2026 No. 1497/2/5 Tahun 2025 (19 Sep 2025); SKB 2027 No. 1205/3/2 Tahun 2026 (15 Sep 2026).

import { Gagal } from "./berkas.ts"

type Libur = { mulai: string; akhir?: string; nama: string; cuti?: true }
export const LIBUR: Record<number, { sumber: string; daftar: Libur[] }> = {
  2026: {
    sumber: "SKB 3 Menteri No. 1497, 2, 5 Tahun 2025 tentang Hari Libur Nasional dan Cuti Bersama Tahun 2026",
    daftar: [
      { mulai: "2026-01-01", nama: "Tahun Baru Masehi" },
      { mulai: "2026-01-16", nama: "Isra Mikraj" },
      { mulai: "2026-02-16", nama: "Cuti bersama Tahun Baru Imlek", cuti: true },
      { mulai: "2026-02-17", nama: "Tahun Baru Imlek" },
      { mulai: "2026-03-18", nama: "Cuti bersama Nyepi", cuti: true },
      { mulai: "2026-03-19", nama: "Hari Suci Nyepi" },
      { mulai: "2026-03-20", nama: "Cuti bersama Idulfitri", cuti: true },
      { mulai: "2026-03-21", akhir: "2026-03-22", nama: "Idulfitri 1447 H" },
      { mulai: "2026-03-23", akhir: "2026-03-24", nama: "Cuti bersama Idulfitri", cuti: true },
      { mulai: "2026-04-03", nama: "Wafat Yesus Kristus" },
      { mulai: "2026-04-05", nama: "Paskah" },
      { mulai: "2026-05-01", nama: "Hari Buruh Internasional" },
      { mulai: "2026-05-14", nama: "Kenaikan Yesus Kristus" },
      { mulai: "2026-05-15", nama: "Cuti bersama Kenaikan Yesus Kristus", cuti: true },
      { mulai: "2026-05-27", nama: "Iduladha 1447 H" },
      { mulai: "2026-05-28", nama: "Cuti bersama Iduladha", cuti: true },
      { mulai: "2026-05-31", nama: "Waisak" },
      { mulai: "2026-06-01", nama: "Hari Lahir Pancasila" },
      { mulai: "2026-06-16", nama: "Tahun Baru Islam 1448 H" },
      { mulai: "2026-08-17", nama: "Hari Kemerdekaan RI" },
      { mulai: "2026-08-25", nama: "Maulid Nabi Muhammad saw." },
      { mulai: "2026-12-24", nama: "Cuti bersama Natal", cuti: true },
      { mulai: "2026-12-25", nama: "Natal" },
    ],
  },
  2027: {
    sumber: "SKB 3 Menteri No. 1205, 3, 2 Tahun 2026 tentang Hari Libur Nasional dan Cuti Bersama Tahun 2027",
    daftar: [
      { mulai: "2027-01-01", nama: "Tahun Baru Masehi" },
      { mulai: "2027-01-05", nama: "Isra Mikraj" },
      { mulai: "2027-02-05", nama: "Cuti bersama Tahun Baru Imlek", cuti: true },
      { mulai: "2027-02-06", nama: "Tahun Baru Imlek" },
      { mulai: "2027-03-08", nama: "Hari Suci Nyepi" },
      { mulai: "2027-03-09", nama: "Cuti bersama Idulfitri", cuti: true },
      { mulai: "2027-03-10", akhir: "2027-03-11", nama: "Idulfitri 1448 H" },
      { mulai: "2027-03-12", nama: "Cuti bersama Idulfitri", cuti: true },
      { mulai: "2027-03-15", nama: "Cuti bersama Idulfitri", cuti: true },
      { mulai: "2027-03-25", nama: "Cuti bersama Wafat Yesus Kristus", cuti: true },
      { mulai: "2027-03-26", nama: "Wafat Yesus Kristus" },
      { mulai: "2027-03-28", nama: "Paskah" },
      { mulai: "2027-05-01", nama: "Hari Buruh Internasional" },
      { mulai: "2027-05-06", nama: "Kenaikan Yesus Kristus" },
      { mulai: "2027-05-17", nama: "Iduladha 1448 H" },
      { mulai: "2027-05-18", nama: "Cuti bersama Iduladha", cuti: true },
      { mulai: "2027-05-19", nama: "Cuti bersama Waisak", cuti: true },
      { mulai: "2027-05-20", nama: "Waisak" },
      { mulai: "2027-06-01", nama: "Hari Lahir Pancasila" },
      { mulai: "2027-06-06", nama: "Tahun Baru Islam 1449 H" },
      { mulai: "2027-08-15", nama: "Maulid Nabi Muhammad saw." },
      { mulai: "2027-08-17", nama: "Hari Kemerdekaan RI" },
      { mulai: "2027-12-24", nama: "Cuti bersama Natal", cuti: true },
      { mulai: "2027-12-25", nama: "Natal" },
      { mulai: "2027-12-26", nama: "Isra Mikraj" },
    ],
  },
}

/** Libur nasional + cuti bersama untuk satu tahun ajaran (Juli–Juni), dalam format kegiatan kalender paket. */
export function liburTahunAjaran(tahunAjaran: string) {
  const m = String(tahunAjaran).match(/^(\d{4})\s*[/-]\s*(\d{4})$/)
  if (!m || Number(m[2]) !== Number(m[1]) + 1) throw new Gagal('Tahun ajaran ditulis seperti "2026/2027".')
  const a = Number(m[1]), b = Number(m[2])
  const sumber: string[] = []
  const kegiatan: { mulai: string; akhir?: string; jenis: "libur"; nama: string }[] = []
  for (const [th, dari, sampai] of [[a, `${a}-07-01`, `${a}-12-31`], [b, `${b}-01-01`, `${b}-06-30`]] as const) {
    const data = LIBUR[th]
    if (!data) continue
    sumber.push(data.sumber)
    for (const l of data.daftar) if (l.mulai >= dari && l.mulai <= sampai) kegiatan.push({ mulai: l.mulai, ...(l.akhir ? { akhir: l.akhir } : {}), jenis: "libur", nama: l.nama })
  }
  const tidakAda = [a, b].filter((th) => !LIBUR[th])
  return { kegiatan, sumber, tidakAda }
}
