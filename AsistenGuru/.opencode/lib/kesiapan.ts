// Cek kesiapan bahan sebelum membuat perangkat: apa yang sudah ada, apa yang belum, dan untuk tiap kekurangan —
// bisa diambilkan asisten otomatis (dengan izin guru) atau perlu dari guru (dengan langkah sederhana).
// Dipakai supaya asisten tidak membuat dokumen tanpa bahan, dan bisa membimbing guru yang belum paham langkah demi langkah.

import { existsSync } from "node:fs"
import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { muatData } from "./analisis.ts"
import { type ATP, type Kalender, type Profil, bacaJson, bacaTeks, frontmatter, slug } from "./berkas.ts"
import { FOLDER } from "./dokumen.ts"

export const TUGAS = ["modul", "soal", "rencana", "nilai", "absen", "kokurikuler", "analisis"] as const
export type Tugas = (typeof TUGAS)[number]
const NAMA_TUGAS: Record<Tugas, string> = {
  modul: "membuat modul ajar/RPM, LKPD, dan media",
  soal: "membuat soal ulangan/STS/SAS dan kuncinya",
  rencana: "menyusun perencanaan setahun (ATP, Prota, Promes)",
  nilai: "membuat buku nilai Excel",
  absen: "membuat daftar hadir Excel",
  kokurikuler: "menyiapkan kegiatan kokurikuler",
  analisis: "menganalisis nilai dan kehadiran siswa",
}

type Butir = { nama: string; ada: boolean; wajib: boolean; arti: string; otomatis?: string; guru?: string[] }
const MASUKAN = "Documents\\AsistenGuru\\guru\\masukan"

async function adaPdf(akar: string, rel: string, kunci: string) {
  const p = join(akar, rel)
  if (!existsSync(p)) return 0
  return (await readdir(p)).filter((f) => /\.pdf$/i.test(f) && slug(f).includes(kunci)).length
}

export async function cekKesiapan(akar: string, tugas: Tugas, mapelDiminta?: string): Promise<string> {
  const profil = await bacaJson<Profil>(akar, "guru/profil.json")
  const kalender = await bacaJson<Kalender>(akar, "guru/kalender.json")
  const butir: Butir[] = []
  const adaProfil = !!profil.kelas && !!profil.mapel?.length
  butir.push({
    nama: "Profil guru", ada: adaProfil, wajib: true,
    arti: "kelas yang diajar, mata pelajaran, dan jam pelajaran per minggu — dasar semua dokumen",
    guru: ["Jawab beberapa pertanyaan singkat: kelas berapa, mapel apa saja, berapa jam pelajaran (JP) per minggu tiap mapel (skill guru-setup / perintah /mulai)."],
  })

  const mapel = adaProfil ? (profil.mapel.find((m) => mapelDiminta && slug(m.nama).includes(slug(mapelDiminta))) ?? profil.mapel[0]) : null
  const kode = mapel ? slug(mapel.kode ?? mapel.nama) : ""
  const fase = String(profil.fase ?? (profil.kelas ? "ABC"[Math.ceil(profil.kelas / 2) - 1] : "")).toLowerCase()
  const label = mapel ? ` ${mapel.nama}` : ""

  const butirKalender = (wajib: boolean) =>
    butir.push({
      nama: "Kalender pendidikan", ada: !!kalender.semester?.length, wajib,
      arti: "tanggal awal-akhir semester, libur, dan kegiatan sekolah — untuk menghitung minggu efektif dan jadwal",
      guru: [
        `Jika punya kalender dari sekolah/dinas (Excel, Word, atau PDF teks), taruh berkasnya di folder ${MASUKAN}, lalu bilang "sudah".`,
        "Jika tidak punya berkasnya, cukup sebutkan tanggal awal dan akhir semester serta libur yang diingat; asisten menyusunnya (skill guru-setup).",
      ],
    })
  const butirCp = (wajib = true) => {
    const cpS = frontmatter((bacaTeksSync.get(`sekolah/referensi/cp/${kode}-fase-${fase}.md`) ?? "")).status
    const ada = (!!bacaTeksSync.get(`sekolah/referensi/cp/${kode}-fase-${fase}.md`) && cpS !== "BELUM-TERISI") || !!bacaTeksSync.get(`guru/referensi/cp/${kode}-fase-${fase}.md`)
    butir.push({
      nama: `CP${label} Fase ${fase.toUpperCase()}`, ada, wajib,
      arti: "Capaian Pembelajaran — target kemampuan dari pemerintah untuk satu fase (2 tahun); sumber semua tujuan pembelajaran",
      otomatis: `Ambil CP resmi (Keputusan BSKAP 046/2025) otomatis dengan alat ambil_cp (mapel "${mapel?.nama ?? ""}", fase ${fase.toUpperCase()}). Butuh internet. Mapel agama tidak didukung.`,
      guru: [`Atau, bila sekolah punya dokumen CP sendiri, taruh di folder ${MASUKAN}.`],
    })
  }
  const butirAtp = (wajib: boolean) => {
    const atp = atpData
    butir.push({
      nama: `ATP${label}`, ada: !!atp.tp?.length, wajib,
      arti: "Alur Tujuan Pembelajaran — daftar tujuan pembelajaran (TP) setahun yang diurutkan; dipakai modul, soal, dan nilai",
      otomatis: "Susun otomatis bersama Prota dan Promes (skill perencanaan-tahunan / perintah /rencana). Butuh CP dan kalender.",
    })
  }
  const butirBuku = (wajib: boolean) =>
    butir.push({
      nama: `Buku pelajaran${label}`, ada: nBuku > 0, wajib,
      arti: "Buku Siswa/Panduan Guru — sumber isi materi supaya materi, istilah, dan soal sesuai buku yang dipakai murid",
      otomatis: `Unduh buku resmi Kemendikdasmen (Buku Siswa dan Panduan Guru kelas ${profil.kelas ?? ""}) otomatis dengan alat unduh_buku. Butuh internet.`,
      guru: [
        `Atau taruh PDF buku yang dipakai sekolah di folder ${MASUKAN}.`,
        "Jika belum ada buku sama sekali, materi bisa dicari dari situs tepercaya (riset_materi), tetapi bagian tanpa buku ditandai untuk dicek guru.",
      ],
    })
  const butirSiswa = () =>
    butir.push({
      nama: "Daftar Siswa", ada: existsSync(join(akar, "hasil", FOLDER.administrasi, "Daftar Siswa.xlsx")), wajib: false,
      arti: "nama siswa untuk mengisi Excel otomatis (tidak wajib; tanpa ini kolom nama dikosongkan)",
      guru: [`Taruh ekspor daftar peserta didik dari Dapodik, format nilai e-Rapor, atau daftar hadir lama yang sudah berisi nama di folder ${MASUKAN}, lalu bilang "sudah".`],
    })

  // Bacaan sekali di awal (CP, ATP, buku) supaya fungsi butir sederhana.
  const bacaTeksSync = new Map<string, string | null>()
  for (const rel of [`sekolah/referensi/cp/${kode}-fase-${fase}.md`, `guru/referensi/cp/${kode}-fase-${fase}.md`]) bacaTeksSync.set(rel, mapel ? await bacaTeks(akar, rel) : null)
  const atpData = mapel ? await bacaJson<ATP>(akar, `guru/data/atp-${kode}.json`) : ({} as ATP)
  const kunciBuku = mapel ? slug(mapel.nama).split("-")[0] : "-"
  const nBuku = (await adaPdf(akar, "guru/buku", kunciBuku)) + (await adaPdf(akar, "sekolah/referensi/buku", kunciBuku))

  if (adaProfil) {
    switch (tugas) {
      // CP hanya wajib bila ATP belum ada (TP diturunkan dari CP; bila ATP sudah ada, modul/soal cukup memakai TP-nya).
      case "modul":
        butirCp(!atpData.tp?.length); butirAtp(false); butirBuku(false)
        break
      case "soal":
        butirCp(!atpData.tp?.length); butirAtp(true); butirBuku(false)
        break
      case "rencana":
        butirKalender(true); butirCp()
        break
      case "nilai":
        butirAtp(true); butirSiswa()
        break
      case "absen":
        butirKalender(true); butirSiswa()
        break
      case "kokurikuler":
        butirKalender(false); butirSiswa()
        break
      case "analisis": {
        const d = await muatData(akar)
        const terisi = d.nilai.some((b) => b.baris.some((r) => r.tp.some((v) => v !== null) || r.sts !== null)) || d.hadir.some((h) => h.baris.some((r) => r.s + r.i + r.a > 0))
        butir.push({
          nama: "Nilai/kehadiran yang sudah diisi", ada: terisi, wajib: true,
          arti: "analisis hanya bisa dari angka yang sudah diisi guru di buku nilai atau daftar hadir Excel",
          otomatis: d.nilai.length || d.hadir.length ? undefined : "Buat dulu buku nilai (alat buat_nilai_excel) atau daftar hadir (alat buat_absensi_excel).",
          guru: [
            `Buka folder Documents\\AsistenGuru\\hasil\\4 Administrasi, klik dua kali berkas Buku Nilai (atau Daftar Hadir).`,
            "Isi nilai 0–100 di kotak kuning (atau S/I/A di daftar hadir), lalu simpan dengan Ctrl+S dan tutup Excel.",
          ],
        })
        butirSiswa()
        break
      }
    }
  }

  const tanda = (b: Butir) => (b.ada ? "✔" : b.wajib ? "✖" : "◐")
  const out = [`Kesiapan untuk ${NAMA_TUGAS[tugas]}${label}:`]
  for (const b of butir) {
    out.push(`${tanda(b)} ${b.nama} — ${b.arti}${b.ada ? "" : b.wajib ? " [BELUM ADA, diperlukan]" : " [belum ada, dianjurkan]"}`)
    if (!b.ada) {
      if (b.otomatis) out.push(`   → BISA DIAMBILKAN OTOMATIS: ${b.otomatis}`)
      for (const g of b.guru ?? []) out.push(`   → DARI GURU: ${g}`)
    }
  }
  const kurang = butir.filter((b) => !b.ada && b.wajib)
  const anjuran = butir.filter((b) => !b.ada && !b.wajib)
  const pertama = kurang[0] ?? anjuran[0]
  out.push("")
  if (!pertama) out.push(`SIAP: semua bahan ada. Lanjutkan ${NAMA_TUGAS[tugas]}.`)
  else {
    out.push(kurang.length ? `BELUM SIAP: ${kurang.length} bahan wajib belum ada.` : `BISA DIMULAI, tetapi hasil lebih baik bila ${anjuran.map((b) => b.nama).join(" dan ")} dilengkapi.`)
    out.push(`LANGKAH BERIKUTNYA (satu saja): ${pertama.nama} — ${pertama.otomatis ? "tawarkan mengambilkannya otomatis dan minta izin guru" : "bimbing guru dengan langkah di atas"}.`)
  }
  out.push("Sampaikan ke guru dengan bahasa awam (ikuti skill pendamping-guru): jelaskan istilahnya, satu langkah per pesan, beri pilihan bernomor, dan jangan membuat dokumen dari bahan yang belum ada.")
  return out.join("\n")
}
