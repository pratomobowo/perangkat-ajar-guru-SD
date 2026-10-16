// Refleksi diri guru = penilaian proses pembelajaran oleh pendidik (Permendikdasmen No. 1 Tahun 2026 tentang Standar
// Proses, Pasal 15): asesmen terhadap perencanaan dan pelaksanaan pembelajaran, dilakukan pendidik melalui refleksi diri
// paling sedikit sekali dalam satu semester, dan dapat mengacu pada analisis asesmen hasil belajar murid (ayat 5).
// Alat ini mengumpulkan bahan refleksi dari berkas guru (buku nilai, analisis butir, daftar hadir, jurnal) dalam bentuk
// angka kelas — tanpa nama siswa — supaya guru merefleksikan dari data, bukan dari ingatan saja.

import { existsSync } from "node:fs"
import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"
import { type BukuNilai, type Hadir, muatData } from "./analisis.ts"
import { type Kalender, type Kebijakan, type Profil, bacaJson, bacaTeks } from "./berkas.ts"
import { FOLDER } from "./dokumen.ts"
import { NAMA_BULAN, tgl } from "./kalender.ts"
import { bacaTabelXlsx } from "./masukan.ts"

export const DASAR_REFLEKSI = "Permendikdasmen No. 1 Tahun 2026 tentang Standar Proses, Pasal 15"

const ta = (p: Profil) => (p.tahun_ajaran ?? "").replace("/", "-")
export const jalurRefleksi = (profil: Profil, ke: number) => `${FOLDER.asesmen}/Refleksi Pembelajaran/Refleksi Diri Semester ${ke} ${ta(profil)}`

type Semester = { ke: number; mulai: string; akhir: string }
/** Semester yang sedang berjalan, atau yang terakhir selesai bila tanggal di antara/sesudah semester. */
export function pilihSemester(kal: Kalender, tanggal: string, ke?: number): Semester | null {
  const s = kal.semester ?? []
  if (ke) return s.find((x) => x.ke === ke) ?? null
  const t = tgl(tanggal)
  return s.find((x) => t >= tgl(x.mulai) && t <= tgl(x.akhir)) ?? [...s].reverse().find((x) => t > tgl(x.akhir)) ?? s[0] ?? null
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const r2 = (x: number) => Math.round(x * 100) / 100

// ---------- Analisis butir dari Excel yang sudah diisi guru ----------
export type HasilButir = { judul: string; peserta: number; soal: number; mudah: number; sedang: number; sukar: number; dayaJelek: number[]; dayaNegatif: number[]; rataNilai: number }

/** Menghitung ulang tingkat kesukaran dan daya beda dari kunci dan jawaban (tidak bergantung pada nilai rumus tersimpan). */
export function bacaButir(data: Uint8Array, judul: string): HasilButir | null {
  const l = bacaTabelXlsx(data, 200, 70).find((x) => x.nama === "Jawaban")
  if (!l) return null
  const sel = l.sel
  const rK = sel.findIndex((b) => String(b?.[1] ?? "").trim().toUpperCase() === "KUNCI JAWABAN")
  if (rK < 1) return null
  const kepala = sel[rK - 1] ?? []
  let m = 0
  while (String(kepala[2 + m] ?? "").trim() === String(m + 1)) m++
  const kunci = Array.from({ length: m }, (_, i) => String(sel[rK][2 + i] ?? "").trim().toUpperCase())
  if (!m || kunci.some((k) => !k)) return null
  const skor: number[][] = []
  for (let r = rK + 1; r < sel.length && /^\d+$/.test(String(sel[r]?.[0] ?? "").trim()); r++) {
    const j = Array.from({ length: m }, (_, i) => String(sel[r]?.[2 + i] ?? "").trim().toUpperCase())
    if (j.every((x) => !x)) continue
    skor.push(j.map((x, i) => (x && x === kunci[i] ? 1 : 0)))
  }
  const n = skor.length
  if (!n) return null
  const total = skor.map((s) => s.reduce((a, b) => a + b, 0))
  const k = Math.max(1, Math.round(n * 0.27))
  const atasB = [...total].sort((a, b) => b - a)[k - 1], bawahB = [...total].sort((a, b) => a - b)[k - 1]
  const atas = skor.filter((_, i) => total[i] >= atasB), bawah = skor.filter((_, i) => total[i] < atasB && total[i] <= bawahB)
  const h: HasilButir = { judul, peserta: n, soal: m, mudah: 0, sedang: 0, sukar: 0, dayaJelek: [], dayaNegatif: [], rataNilai: Math.round(total.reduce((a, b) => a + Math.round((b / m) * 100), 0) / n) }
  for (let i = 0; i < m; i++) {
    const p = r2(skor.reduce((a, s) => a + s[i], 0) / n)
    if (p <= 0.3) h.sukar++
    else if (p <= 0.7) h.sedang++
    else h.mudah++
    if (atas.length && bawah.length) {
      const d = r2(r2(atas.reduce((a, s) => a + s[i], 0) / atas.length) - r2(bawah.reduce((a, s) => a + s[i], 0) / bawah.length))
      if (d < 0) h.dayaNegatif.push(i + 1)
      else if (d <= 0.2) h.dayaJelek.push(i + 1)
    }
  }
  return h
}

// ---------- Ringkasan per sumber ----------
function ringkasNilai(b: BukuNilai, batasSekolah: number | null) {
  const tp = b.tp.map((t, i) => {
    const v = b.baris.map((r) => r.tp[i]).filter((x): x is number => typeof x === "number")
    const batas = t.batas ?? batasSekolah
    const tuntas = batas === null ? null : v.filter((x) => x >= batas).length
    return { kode: t.kode, tujuan: t.tujuan, n: v.length, rata: v.length ? Math.round(v.reduce((a, c) => a + c, 0) / v.length) : null, tuntas: tuntas === null ? null : pct(tuntas, v.length), batas }
  }).filter((x) => x.n > 0)
  return { mapel: b.mapel, tp }
}

function ringkasHadir(h: Hadir[]) {
  let hari = 0, absen = 0, s = 0, i = 0, a = 0
  for (const x of h) {
    const rows = x.baris.filter((r) => String(r.nama ?? "").trim())
    hari += x.hari * rows.length
    for (const r of rows) { s += r.s; i += r.i; a += r.a }
  }
  absen = s + i + a
  return { bulan: h.length, persenHadir: hari ? Math.round(((hari - absen) / hari) * 1000) / 10 : null, s, i, a }
}

/** Catatan tindak lanjut dari jurnal mengajar (kolom terakhir tabel harian) dalam rentang semester. */
async function catatanJurnal(akar: string, mulai: string, akhir: string) {
  const dir = join(akar, "guru/draf", FOLDER.administrasi)
  if (!existsSync(dir)) return { hari: 0, catatan: [] as string[] }
  let hari = 0
  const catatan: string[] = []
  for (const f of (await readdir(dir)).filter((x) => /^Jurnal Mengajar \d{4}-\d{2}\.md$/.test(x)).sort()) {
    const md = (await bacaTeks(akar, `guru/draf/${FOLDER.administrasi}/${f}`)) ?? ""
    for (const blok of md.split(/^## /m).slice(1)) {
      const t = blok.slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || t < mulai || t > akhir) continue
      hari++
      for (const b of blok.split("\n").filter((x) => /^\|/.test(x) && !/^\|\s*-/.test(x) && !/Jam ke/i.test(x))) {
        const c = b.split("|").map((x) => x.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)
        const isi = c[c.length - 1]
        if (isi && isi !== "-" && catatan.length < 15) catatan.push(`${t}: ${isi}`)
      }
    }
  }
  return { hari, catatan }
}

async function jumlahFolder(akar: string, rel: string) {
  const p = join(akar, rel)
  return existsSync(p) ? (await readdir(p, { withFileTypes: true })).filter((e) => e.isDirectory()).length : 0
}

// ---------- Bahan refleksi ----------
export async function bahanRefleksi(akar: string, tanggal: string, ke?: number) {
  const profil = await bacaJson<Profil>(akar, "guru/profil.json")
  const kal = await bacaJson<Kalender>(akar, "guru/kalender.json")
  const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
  const sem = pilihSemester(kal, tanggal, ke)
  const semKe = sem?.ke ?? ke ?? 1
  const mulai = sem?.mulai ?? "0000-00-00", akhir = sem?.akhir ?? "9999-99-99"
  const batas = typeof kebijakan.batas_ketuntasan === "number" ? kebijakan.batas_ketuntasan : null
  const d = await muatData(akar)

  const nilai = d.nilai.filter((b) => b.semester === null || b.semester === semKe).map((b) => ringkasNilai(b, batas)).filter((x) => x.tp.length)
  const bulanSem = (b: string) => { const m = b.match(/(\d{4})-(\d{2})/); return m ? `${m[1]}-${m[2]}` >= mulai.slice(0, 7) && `${m[1]}-${m[2]}` <= akhir.slice(0, 7) : false }
  const hadir = ringkasHadir(d.hadir.filter((h) => bulanSem(h.berkas)))
  const butir: HasilButir[] = []
  const batasButir = new Date(tgl(akhir === "9999-99-99" ? "2999-12-31" : akhir).getTime() + 45 * 86400000).toISOString().slice(0, 10)
  const dirAdm = join(akar, "hasil", FOLDER.administrasi)
  if (existsSync(dirAdm))
    for (const f of (await readdir(dirAdm)).filter((x) => x.startsWith("Analisis Butir Soal ") && x.endsWith(".xlsx"))) {
      const p = join(dirAdm, f)
      const t = (await stat(p)).mtime.toISOString().slice(0, 10)
      // Analisis butir yang dibuat selama semester (sampai 45 hari sesudahnya untuk SAS).
      if (sem && (t < mulai || t > batasButir)) continue
      const h = bacaButir(new Uint8Array(await readFile(p)), f.replace(/^Analisis Butir Soal /, "").replace(/\.xlsx$/, ""))
      if (h) butir.push(h)
    }
  const jurnal = await catatanJurnal(akar, mulai, akhir)
  const modul = await jumlahFolder(akar, `guru/draf/${FOLDER.modul}`)
  const asesmen = await jumlahFolder(akar, `guru/draf/${FOLDER.asesmen}`)

  // Tabel data untuk bagian A draf (siap tempel; tanpa nama siswa).
  const tabel: string[] = []
  for (const m of nilai) {
    tabel.push(`**${m.mapel}**`, "", "| TP | Tujuan pembelajaran | Siswa dinilai | Rata-rata | Tuntas |", "|---|---|---|---|---|")
    for (const t of m.tp) tabel.push(`| ${t.kode} | ${t.tujuan.replace(/\|/g, "/")} | ${t.n} | ${t.rata ?? "-"} | ${t.tuntas === null ? "-" : `${t.tuntas}%`} |`)
    tabel.push("")
  }
  if (butir.length) {
    tabel.push("**Analisis butir soal**", "", "| Penilaian | Siswa | Soal | Rata-rata nilai | Mudah / Sedang / Sukar | Daya beda jelek (nomor) | Daya beda negatif (nomor) |", "|---|---|---|---|---|---|---|")
    for (const b of butir) tabel.push(`| ${b.judul} | ${b.peserta} | ${b.soal} | ${b.rataNilai} | ${b.mudah} / ${b.sedang} / ${b.sukar} | ${b.dayaJelek.join(", ") || "-"} | ${b.dayaNegatif.join(", ") || "-"} |`)
    tabel.push("")
  }
  if (hadir.persenHadir !== null) tabel.push(`Kehadiran rata-rata ${hadir.persenHadir}% (${hadir.bulan} bulan; sakit ${hadir.s}, izin ${hadir.i}, alpa ${hadir.a} hari-siswa).`, "")
  tabel.push(`Jurnal mengajar terisi ${jurnal.hari} hari. Modul/RPM disusun untuk ${modul} topik; ${asesmen} paket asesmen.`)

  const rendah = nilai.flatMap((m) => m.tp.filter((t) => t.tuntas !== null && t.tuntas < 75).map((t) => `${m.mapel} ${t.kode} (${t.tuntas}% tuntas)`))
  const kosong = !nilai.length && !butir.length && hadir.persenHadir === null && !jurnal.hari
  return {
    semKe, mulai, akhir, profil, jalur: jalurRefleksi(profil, semKe),
    teks: [
      `Bahan refleksi semester ${semKe}${sem ? ` (${mulai} s.d. ${akhir})` : ""} — angka kelas, tanpa nama siswa. Dasar: ${DASAR_REFLEKSI}.`,
      kosong ? "Belum ada data nilai, analisis butir, daftar hadir, atau jurnal yang terisi untuk semester ini; refleksi tetap bisa disusun dari jawaban guru, tetapi sampaikan bahwa data hasil belajar memperkuat refleksi." : "",
      "",
      "## Data untuk bagian A (tempel apa adanya)",
      ...tabel,
      "",
      rendah.length ? `TP dengan ketuntasan di bawah 75% siswa: ${rendah.join("; ")}.` : nilai.length ? "Semua TP yang dinilai tuntas oleh ≥75% siswa." : "",
      jurnal.catatan.length ? `Catatan tindak lanjut dari jurnal (bahan pertanyaan refleksi):\n${jurnal.catatan.map((c) => `- ${c}`).join("\n")}` : "",
      "",
      `Draf: guru/draf/${jalurRefleksi(profil, semKe)}.md lalu ekspor_word. Ikuti skill refleksi-pembelajaran.`,
    ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n"),
  }
}

/** Pengingat kewajiban refleksi: 21 hari sebelum akhir semester sampai 45 hari sesudahnya, bila Word-nya belum ada. */
export async function pengingatRefleksi(akar: string, tanggal: string): Promise<string | null> {
  const profil = await bacaJson<Profil>(akar, "guru/profil.json")
  const kal = await bacaJson<Kalender>(akar, "guru/kalender.json")
  const t = tgl(tanggal).getTime()
  for (const s of kal.semester ?? []) {
    const akhir = tgl(s.akhir).getTime()
    if (t < akhir - 21 * 86400000 || t > akhir + 45 * 86400000) continue
    if (existsSync(join(akar, "hasil", `${jalurRefleksi(profil, s.ke)}.docx`))) continue
    const [y, m, d] = s.akhir.split("-").map(Number)
    return `Refleksi diri semester ${s.ke} belum dibuat (wajib minimal sekali per semester, ${DASAR_REFLEKSI}; semester berakhir ${d} ${NAMA_BULAN[m]} ${y}). Tawarkan menyusunnya bersama (skill refleksi-pembelajaran).`
  }
  return null
}
