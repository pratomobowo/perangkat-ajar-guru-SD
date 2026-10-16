// Kalender pendidikan dan jadwal pelajaran kelas sebagai dokumen Word (Markdown untuk lib/docx.ts).

import { type Kalender, type Profil, Gagal, slug } from "./berkas.ts"
import { NAMA_BULAN, NAMA_HARI, fmt, hariSekolah, statusTanggal, tambah, tgl } from "./kalender.ts"

const HARI_KAPITAL = (h: string) => h[0].toUpperCase() + h.slice(1)
const SINGKAT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

/** Kalender per bulan, ringkasan hari efektif, dan daftar kegiatan dari guru/kalender.json. */
export function kalenderMd(profil: Profil, kal: Kalender): { md: string; ringkas: string } {
  const hs = hariSekolah(profil)
  const kolom = [1, 2, 3, 4, 5, 6, 0]
  const out: string[] = [`# KALENDER PENDIDIKAN TAHUN AJARAN ${profil.tahun_ajaran}`, "", "```identitas"]
  if (profil.sekolah) out.push(`Satuan pendidikan: ${profil.sekolah}`)
  out.push(`Kelas: ${profil.kelas}`, `Hari sekolah: ${[...hs].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => HARI_KAPITAL(NAMA_HARI[d])).join(", ")}`, "```", "")
  out.push("Keterangan: **L** = libur, **K** = kegiatan sekolah (tidak ada pembelajaran reguler), (angka) = bukan hari sekolah atau di luar semester, angka tanpa tanda = hari belajar efektif.", "")

  const ringkasan: string[][] = []
  let totalEfektif = 0
  for (const sem of kal.semester) {
    out.push(`## Semester ${sem.ke} (${tglPendek(sem.mulai)} – ${tglPendek(sem.akhir)})`, "")
    const a = tgl(sem.mulai)
    const b = tgl(sem.akhir)
    let bulan = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1))
    while (bulan <= b) {
      const y = bulan.getUTCFullYear()
      const m = bulan.getUTCMonth()
      const hariBulan = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
      const baris: string[][] = []
      let minggu: string[] = kolom.map(() => "")
      let sekolah = 0
      let efektif = 0
      const ket = new Map<string, string[]>()
      for (let d = 1; d <= hariBulan; d++) {
        const t = new Date(Date.UTC(y, m, d))
        const dalam = t >= a && t <= b
        const hari = t.getUTCDay()
        const st = dalam ? statusTanggal(t, kal) : { jenis: null, nama: [] as string[] }
        const masuk = dalam && hs.has(hari)
        let tanda = ""
        if (masuk && st.jenis === "libur") tanda = " L"
        else if (masuk && st.jenis === "tidak_efektif") tanda = " K"
        if (masuk) { sekolah++; if (!st.jenis) efektif++ }
        for (const n of st.nama) ket.set(n, [...(ket.get(n) ?? []), String(d)])
        const k = kolom.indexOf(hari)
        if (k >= 0) minggu[k] = masuk ? `${d}${tanda}` : `(${d})`
        if (hari === 0 || d === hariBulan) {
          if (minggu.some(Boolean)) baris.push(minggu)
          minggu = kolom.map(() => "")
        }
      }
      totalEfektif += efektif
      out.push(`### ${NAMA_BULAN[m + 1]} ${y}`, "", `| ${kolom.map((d) => SINGKAT[d]).join(" | ")} |`, `|${kolom.map(() => "---").join("|")}|`)
      for (const r of baris) out.push(`| ${r.join(" | ")} |`)
      out.push("")
      if (ket.size) out.push(`Kegiatan: ${[...ket].map(([n, h]) => `${n} (${rentangHari(h)})`).join("; ")}.`, "")
      out.push(`Hari sekolah ${sekolah}, hari belajar efektif ${efektif}.`, "")
      ringkasan.push([`${NAMA_BULAN[m + 1]} ${y}`, String(sem.ke), String(sekolah), String(efektif)])
      bulan = new Date(Date.UTC(y, m + 1, 1))
    }
    out.push("<!-- halaman-baru -->", "")
  }

  out.push("## Ringkasan hari belajar efektif", "", "| Bulan | Semester | Hari sekolah | Hari efektif |", "|---|---|---|---|")
  for (const r of ringkasan) out.push(`| ${r.join(" | ")} |`)
  out.push(`| **Jumlah** |  | **${ringkasan.reduce((n, r) => n + +r[2], 0)}** | **${totalEfektif}** |`, "")

  out.push("## Daftar kegiatan dan libur", "", "| Tanggal | Kegiatan | Jenis |", "|---|---|---|")
  for (const k of [...kal.kegiatan].sort((x, y) => x.mulai.localeCompare(y.mulai)))
    out.push(`| ${tglPendek(k.mulai)}${k.akhir && k.akhir !== k.mulai ? ` – ${tglPendek(k.akhir)}` : ""} | ${k.nama} | ${k.jenis === "libur" ? "Libur" : "Kegiatan (tidak efektif)"} |`)
  out.push("")
  return { md: out.join("\n"), ringkas: `${ringkasan.length} bulan, ${totalEfektif} hari belajar efektif, ${kal.kegiatan.length} kegiatan/libur` }
}

function tglPendek(s: string) {
  const d = tgl(s)
  return `${d.getUTCDate()} ${NAMA_BULAN[d.getUTCMonth() + 1]} ${d.getUTCFullYear()}`
}

/** ["13","14","15","17"] → "13–15, 17" */
function rentangHari(h: string[]): string {
  const n = [...new Set(h.map(Number))].sort((a, b) => a - b)
  const out: string[] = []
  for (let i = 0; i < n.length; i++) {
    let j = i
    while (j + 1 < n.length && n[j + 1] === n[j] + 1) j++
    out.push(i === j ? `${n[i]}` : `${n[i]}–${n[j]}`)
    i = j
  }
  return out.join(", ")
}

export type JamPelajaran = { ke?: number; mulai: string; akhir: string; istirahat?: boolean; nama?: string }
export type JadwalKelas = { jam: JamPelajaran[]; hari: Record<string, { jam_ke: string; mapel: string; guru?: string }[]> }

/** "2-3" → [2, 3]; "1" → [1] */
function jamKe(s: string): number[] {
  const m = String(s).match(/^(\d+)(?:\s*-\s*(\d+))?$/)
  if (!m) throw new Gagal(`Jam ke "${s}" tidak dikenali. Contoh: "1" atau "2-3".`)
  const a = +m[1]
  const b = m[2] ? +m[2] : a
  return Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => Math.min(a, b) + i)
}

export function jadwalMd(profil: Profil, j: JadwalKelas): { md: string; cek: string[] } {
  if (!j?.jam?.length || !j?.hari) throw new Gagal("guru/jadwal-kelas.json belum lengkap: butuh daftar `jam` (jam ke-, mulai, akhir) dan `hari`.")
  const hs = [...hariSekolah(profil)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => NAMA_HARI[d])
  const isi = new Map<string, string>() // "senin|3" → mapel
  const jp = new Map<string, number>()
  const cek: string[] = []
  for (const [hari, daftar] of Object.entries(j.hari)) {
    const h = hari.toLowerCase().replace("'", "")
    if (!hs.includes(h)) cek.push(`✖ Hari "${hari}" bukan hari sekolah di profil.`)
    for (const s of daftar ?? []) {
      for (const k of jamKe(s.jam_ke)) {
        const kunci = `${h}|${k}`
        if (isi.has(kunci)) cek.push(`✖ ${HARI_KAPITAL(h)} jam ke-${k} terisi dua mapel (${isi.get(kunci)} dan ${s.mapel}).`)
        isi.set(kunci, s.guru ? `${s.mapel}<br>(${s.guru})` : s.mapel)
        const ns = slug(s.mapel)
        jp.set(ns, (jp.get(ns) ?? 0) + 1)
      }
    }
  }
  const out = [`# JADWAL PELAJARAN KELAS ${profil.kelas}`, "", "```identitas"]
  if (profil.sekolah) out.push(`Satuan pendidikan: ${profil.sekolah}`)
  out.push(`Kelas: ${profil.kelas}`, `Tahun ajaran: ${profil.tahun_ajaran}`)
  if (profil.nama_lengkap) out.push(`Wali kelas: ${profil.nama_lengkap}`)
  out.push("```", "", `| Jam | Waktu | ${hs.map(HARI_KAPITAL).join(" | ")} |`, `|---|---|${hs.map(() => "---").join("|")}|`)
  for (const jam of j.jam) {
    if (jam.istirahat) out.push(`| – | ${jam.mulai}–${jam.akhir} | ${hs.map(() => jam.nama ?? "Istirahat").join(" | ")} |`)
    else out.push(`| ${jam.ke} | ${jam.mulai}–${jam.akhir} | ${hs.map((h) => isi.get(`${h}|${jam.ke}`) ?? "").join(" | ")} |`)
  }
  out.push("")
  const maksJam = Math.max(...j.jam.filter((x) => !x.istirahat).map((x) => x.ke ?? 0))
  for (const k of isi.keys()) if (+k.split("|")[1] > maksJam) cek.push(`✖ ${k.replace("|", " jam ke-")} melebihi jam terakhir (${maksJam}).`)
  out.push("## Jumlah JP per minggu", "", "| Mata pelajaran | JP terjadwal |", "|---|---|")
  const nama = new Map<string, string>()
  for (const d of Object.values(j.hari)) for (const s of d ?? []) nama.set(slug(s.mapel), s.mapel)
  for (const [k, n] of [...jp].sort((a, b) => b[1] - a[1])) out.push(`| ${nama.get(k)} | ${n} |`)
  out.push(`| **Jumlah** | **${[...jp.values()].reduce((a, b) => a + b, 0)}** |`, "")
  for (const m of profil.mapel ?? []) {
    const n = jp.get(slug(m.nama)) ?? jp.get(slug(m.kode ?? "")) ?? 0
    if (n !== m.jp_per_minggu) cek.push(`✖ ${m.nama}: terjadwal ${n} JP, di profil ${m.jp_per_minggu} JP per minggu.`)
    else cek.push(`✔ ${m.nama}: ${n} JP per minggu sesuai profil.`)
  }
  return { md: out.join("\n"), cek }
}
