// Peta perangkat guru: apa yang sudah ada, apa yang belum, dan langkah berikutnya (berdasarkan berkas yang benar-benar ada,
// urutan ketergantungan perangkat, dan tanggal di kalender/Promes). Dipakai /siapkan dan /status.

import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { type ATP, type Kalender, type Kebijakan, type Profil, bacaJson, bacaTeks, frontmatter, slug } from "./berkas.ts"
import { FOLDER } from "./dokumen.ts"
import { hariIni, tambah, tgl } from "./kalender.ts"
import { DASAR_REFLEKSI, jalurRefleksi, pengingatRefleksi } from "./refleksi.ts"

type Langkah = { judul: string; membuat: string; cara: string }
type Promes = { tp?: unknown; minggu?: { semester: number; mulai: string; akhir: string; alokasi: { kode: string }[] }[] }

async function semuaBerkas(akar: string, rel: string): Promise<string[]> {
  const p = join(akar, rel)
  if (!existsSync(p)) return []
  const out: string[] = []
  for (const e of await readdir(p, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name.startsWith("~$")) continue
    if (e.isDirectory()) out.push(...(await semuaBerkas(akar, `${rel}/${e.name}`)).map((x) => x))
    else out.push(`${rel}/${e.name}`)
  }
  return out
}

const tanda = (ok: boolean | null) => (ok === null ? "◐" : ok ? "✔" : "✖")

export async function petaPerangkat(akar: string, tanggal = hariIni()) {
  const baris: string[] = []
  const berikut: Langkah[] = []
  const profil = await bacaJson<Profil>(akar, "guru/profil.json")
  const kalender = await bacaJson<Kalender>(akar, "guru/kalender.json")
  const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
  const hasil = await semuaBerkas(akar, "hasil")
  const draf = await semuaBerkas(akar, "guru/draf")
  const masukan = (await semuaBerkas(akar, "guru/masukan")).filter((f) => !f.endsWith(".gitkeep"))
  const ada = (re: RegExp) => hasil.some((f) => re.test(f))
  const hari = tgl(tanggal)

  // ---------- Dasar ----------
  baris.push("## Dasar")
  const adaProfil = !!profil.kelas && !!profil.mapel?.length
  baris.push(`${tanda(adaProfil)} Profil guru${adaProfil ? `: kelas ${profil.kelas}, ${profil.mapel.map((m) => m.nama).join(", ")}` : ""}`)
  if (!adaProfil) {
    berikut.push({ judul: "Profil guru", membuat: "profil, jadwal mengajar, dan kalender pendidikan", cara: "skill guru-setup (/mulai)" })
    return { teks: [...baris, "", ...langkahTeks(berikut)].join("\n"), berikut }
  }
  const adaKalender = !!kalender.semester?.length
  baris.push(`${tanda(adaKalender)} Kalender pendidikan${adaKalender ? ` (${kalender.semester.length} semester, ${kalender.kegiatan?.length ?? 0} kegiatan)` : ""}`)
  if (!adaKalender) berikut.push({ judul: "Kalender pendidikan", membuat: "data kalender untuk minggu efektif dan semua jadwal", cara: "skill guru-setup (tempel kalender sekolah atau taruh berkasnya di guru/masukan)" })
  const kop = !!kebijakan.nama_sekolah && !!kebijakan.kepala_sekolah?.nama
  baris.push(`${tanda(kop ? true : null)} Data sekolah untuk kop dan tanda tangan${kop ? "" : " (belum lengkap di sekolah/kebijakan.json; kop memakai nama sekolah di profil)"}`)
  // Daftar Siswa: hanya keberadaan dan jumlah (nama tidak pernah dibaca di sini).
  const adaDaftar = existsSync(join(akar, "hasil", FOLDER.administrasi, "Daftar Siswa.xlsx"))
  baris.push(`${tanda(adaDaftar)} Daftar Siswa${adaDaftar ? ` (${profil.jumlah_siswa ?? "?"} siswa; nama terisi otomatis di Excel administrasi)` : " (nama di Excel masih harus diketik)"}`)
  if (!adaDaftar) berikut.push({ judul: "Daftar Siswa", membuat: "satu daftar nama yang otomatis mengisi daftar hadir, buku nilai, dan penilaian kokurikuler", cara: "minta guru menaruh ekspor Dapodik, format nilai e-Rapor, atau daftar hadir lama yang berisi nama di guru/masukan, lalu baca_masukan (diproses otomatis tanpa memperlihatkan nama)" })
  if (masukan.length) baris.push(`◐ Dokumen masukan di guru/masukan: ${masukan.length} berkas (${masukan.map((f) => f.split("/").pop()).join(", ")})`)

  // Semester berjalan dan tanggal STS/SAS dari kalender.
  const sem = kalender.semester?.find((s) => hari >= tgl(s.mulai) && hari <= tgl(s.akhir)) ?? kalender.semester?.find((s) => hari < tgl(s.mulai))
  const semKe = sem?.ke ?? 1
  const tglKegiatan = (re: RegExp) => (kalender.kegiatan ?? []).filter((k) => re.test(k.nama) && sem && tgl(k.mulai) >= tgl(sem.mulai) && tgl(k.mulai) <= tgl(sem.akhir)).map((k) => k.mulai)[0]
  const tglSts = tglKegiatan(/\bSTS\b|tengah semester/i)
  const tglSas = tglKegiatan(/\bSAS\b|\bSAT\b|akhir semester|akhir tahun/i)

  // ---------- Per mapel ----------
  for (const m of profil.mapel) {
    const kode = slug(m.kode ?? m.nama)
    const fase = (profil.fase ?? "").toLowerCase()
    baris.push("", `## ${m.nama}`)
    const cpS = await bacaTeks(akar, `sekolah/referensi/cp/${kode}-fase-${fase}.md`)
    const cpG = await bacaTeks(akar, `guru/referensi/cp/${kode}-fase-${fase}.md`)
    const stS = cpS ? frontmatter(cpS).status : null
    const cpAda = (cpS && stS !== "BELUM-TERISI") || cpG
    const stCp = cpS && stS !== "BELUM-TERISI" ? `sekolah, ${stS}` : cpG ? `diambil otomatis, ${frontmatter(cpG).status}` : "belum ada"
    baris.push(`${tanda(cpAda ? (/TERVERIFIKASI$/.test(stCp) ? true : null) : false)} CP Fase ${fase.toUpperCase()} (${stCp})`)
    if (!cpAda) berikut.push({ judul: `CP ${m.nama}`, membuat: `CP Fase ${fase.toUpperCase()} dari dokumen resmi (atau dari dokumen sekolah di guru/masukan)`, cara: "alat ambil_cp, atau skill siapkan-semua bila sekolah memberi dokumen CP" })

    const buku = [...(await semuaBerkas(akar, "guru/buku")), ...(await semuaBerkas(akar, "sekolah/referensi/buku"))].filter((f) => /\.pdf$/i.test(f) && slug(f).includes(slug(m.nama).split("-")[0]))
    baris.push(`${tanda(buku.length ? true : null)} Buku resmi di pustaka: ${buku.length}`)

    const atp = await bacaJson<ATP>(akar, `guru/data/atp-${kode}.json`)
    const promes = await bacaJson<Promes>(akar, `guru/data/promes-${kode}.json`)
    const nTp = atp.tp?.length ?? 0
    const adaRencana = ada(new RegExp(`^hasil/${FOLDER.perencanaan}/${m.nama} Kelas .*/4 Promes\\.docx$`))
    baris.push(`${tanda(nTp > 0 && adaRencana)} ATP, Prota, Promes${nTp ? ` (${nTp} TP)` : ""}`)
    if (!nTp || !adaRencana) {
      if (cpAda) berikut.push({ judul: `Perencanaan ${m.nama}`, membuat: "minggu efektif, ATP, Prota, dan Promes (Word)", cara: "skill perencanaan-tahunan (/rencana)" })
      continue
    }

    const kktp = await bacaJson<{ tp?: Record<string, { batas?: number }> }>(akar, `guru/data/kktp-${kode}.json`)
    const nKktp = (atp.tp ?? []).filter((t) => typeof kktp.tp?.[t.kode]?.batas === "number").length
    baris.push(`${tanda(nKktp === nTp ? true : nKktp ? null : false)} KKTP: ${nKktp}/${nTp} TP`)
    if (nKktp < nTp) berikut.push({ judul: `KKTP ${m.nama}`, membuat: `KKTP untuk ${nTp - nKktp} TP (Word + data batas tuntas untuk buku nilai)`, cara: "skill asesmen (KKTP)" })

    // Modul: folder draf "<Mapel> TPn ..." di 2 Modul dan LKPD.
    const adaModul = new Set(draf.filter((f) => f.startsWith(`guru/draf/${FOLDER.modul}/`)).map((f) => f.split("/")[3] ?? "").map((d) => d.match(new RegExp(`^${m.nama}\\s+(TP\\d+)\\b`, "i"))?.[1]?.toUpperCase()).filter(Boolean) as string[])
    const duaMinggu = tambah(hari, 14)
    const tpDekat = [...new Set((promes.minggu ?? []).filter((w) => tgl(w.akhir) >= hari && tgl(w.mulai) <= duaMinggu).flatMap((w) => w.alokasi.map((a) => a.kode)))]
    baris.push(`${tanda(adaModul.size ? null : false)} Modul/RPM + LKPD: ${adaModul.size}/${nTp} TP${adaModul.size ? ` (${[...adaModul].join(", ")})` : ""}`)
    const kurang = tpDekat.filter((k) => !adaModul.has(k))
    if (kurang.length) berikut.push({ judul: `Bahan ajar ${m.nama} ${kurang.join(", ")}`, membuat: `RPM/Modul, LKPD, kunci, dan media untuk ${kurang.join(", ")} (diajarkan dalam 2 minggu ke depan menurut Promes)`, cara: "skill modul-ajar (/modul)" })

    // Asesmen
    const asesmen = draf.filter((f) => f.startsWith(`guru/draf/${FOLDER.asesmen}/`)).map((f) => f.split("/")[3] ?? "")
    const uh = new Set(asesmen.map((d) => d.match(new RegExp(`^UH\\s+${m.nama}\\s+(TP\\d+)\\b`, "i"))?.[1]?.toUpperCase()).filter(Boolean))
    const sts = asesmen.some((d) => new RegExp(`^STS\\s+${m.nama}.*Semester\\s+${semKe}\\b`, "i").test(d))
    const sas = asesmen.some((d) => new RegExp(`^(SAS|SAT)\\s+${m.nama}.*Semester\\s+${semKe}\\b`, "i").test(d))
    baris.push(`${tanda(uh.size ? null : false)} Ulangan harian: ${uh.size} TP${uh.size ? ` (${[...uh].join(", ")})` : ""}`)
    const lewat = (t?: string) => !!t && tgl(t) < hari
    baris.push(`${tanda(sts ? true : lewat(tglSts) ? null : false)} STS semester ${semKe}${tglSts ? ` (${tglSts}${!sts && lewat(tglSts) ? ", sudah lewat" : ""})` : ""}`)
    baris.push(`${tanda(sas ? true : lewat(tglSas) ? null : false)} SAS/SAT semester ${semKe}${tglSas ? ` (${tglSas}${!sas && lewat(tglSas) ? ", sudah lewat" : ""})` : ""}`)
    const dekat = (t?: string) => !!t && tgl(t) >= hari && tgl(t) <= tambah(hari, 28)
    if (!sts && dekat(tglSts)) berikut.push({ judul: `STS ${m.nama} semester ${semKe}`, membuat: `kisi-kisi, soal, serta kunci dan penskoran (STS ${tglSts}, cakupan TP dari Promes)`, cara: "skill asesmen (/soal STS …)" })
    if (!sas && dekat(tglSas)) berikut.push({ judul: `SAS ${m.nama} semester ${semKe}`, membuat: `kisi-kisi, soal, serta kunci dan penskoran (SAS ${tglSas})`, cara: "skill asesmen (/soal SAS …)" })

    const nilai = ada(new RegExp(`^hasil/${FOLDER.administrasi}/Buku Nilai ${m.nama} Kelas .* Semester ${semKe}\\b.*\\.xlsx$`))
    baris.push(`${tanda(nilai)} Buku nilai semester ${semKe} (Excel)`)
    if (!nilai) berikut.push({ judul: `Buku nilai ${m.nama} semester ${semKe}`, membuat: "Excel nilai per TP dengan rumus nilai rapor dan TP belum tuntas", cara: "alat buat_nilai_excel (/nilai)" })
  }

  // ---------- Administrasi kelas ----------
  baris.push("", "## Administrasi kelas")
  const bulan = tanggal.slice(0, 7)
  const absen = ada(new RegExp(`^hasil/${FOLDER.administrasi}/Daftar Hadir Kelas ${profil.kelas} ${bulan}\\b`))
  baris.push(`${tanda(absen)} Daftar hadir bulan ini (${bulan})`)
  if (!absen && adaKalender) berikut.push({ judul: `Daftar hadir ${bulan}`, membuat: "Excel daftar hadir dengan rekap otomatis", cara: "alat buat_absensi_excel (/absen)" })
  const jurnal = draf.some((f) => f.endsWith(`Jurnal Mengajar ${bulan}.md`))
  baris.push(`${tanda(jurnal ? true : null)} Jurnal mengajar bulan ini`)
  const kalWord = ada(new RegExp(`^hasil/${FOLDER.perencanaan}/Kalender Pendidikan `))
  baris.push(`${tanda(kalWord)} Kalender pendidikan (Word)`)
  if (!kalWord && adaKalender) berikut.push({ judul: "Kalender pendidikan (Word)", membuat: "kalender per bulan dengan libur, kegiatan, dan hari efektif", cara: "alat buat_kalender_pendidikan (/kalender)" })
  const adaJadwalData = existsSync(join(akar, "guru/jadwal-kelas.json"))
  const jadWord = ada(new RegExp(`^hasil/${FOLDER.administrasi}/Jadwal Pelajaran Kelas `))
  baris.push(`${tanda(jadWord ? true : adaJadwalData ? false : null)} Jadwal pelajaran kelas (Word)${adaJadwalData ? "" : " — data jadwal kelas belum ada"}`)
  if (!jadWord) berikut.push({ judul: "Jadwal pelajaran kelas", membuat: "Word jadwal semua mapel per hari dengan cek bentrok dan JP", cara: adaJadwalData ? "alat buat_jadwal_kelas (/jadwal)" : "skill administrasi-harian, Jadwal pelajaran kelas (kumpulkan jadwal dulu)" })

  // Refleksi diri guru per semester (wajib).
  const adaRefleksi = existsSync(join(akar, "hasil", `${jalurRefleksi(profil, semKe)}.docx`))
  baris.push(`${tanda(adaRefleksi ? true : null)} Refleksi diri semester ${semKe} (wajib, ${DASAR_REFLEKSI}; disusun menjelang akhir semester)`)
  const wajibRefleksi = await pengingatRefleksi(akar, tanggal).catch(() => null)
  if (wajibRefleksi) berikut.push({ judul: "Refleksi diri semester", membuat: "Word refleksi diri guru (penilaian proses pembelajaran) dari data nilai, analisis butir, kehadiran, dan jurnal", cara: "skill refleksi-pembelajaran (alat bahan_refleksi_semester)" })

  // ---------- Kokurikuler ----------
  baris.push("", "## Kokurikuler")
  const koku = (await readdir(join(akar, "guru/data")).catch(() => [] as string[])).filter((f) => /^kokurikuler-.*\.json$/.test(f))
  const kokuPenilaian = hasil.filter((f) => f.startsWith(`hasil/${FOLDER.kokurikuler}/Penilaian Kokurikuler`)).length
  baris.push(`${tanda(koku.length ? true : null)} Kegiatan kokurikuler direncanakan: ${koku.length}${koku.length ? `; Excel penilaian: ${kokuPenilaian}` : ""}`)
  if (!koku.length) berikut.push({ judul: "Kokurikuler", membuat: "perencanaan kegiatan kokurikuler (tema, dimensi profil lulusan, kegiatan, asesmen) dan Excel penilaian", cara: "skill kokurikuler (/kokurikuler)" })

  // ---------- Bagian yang perlu guru ----------
  let perlu = 0
  const perluBerkas: string[] = []
  for (const f of draf.filter((x) => x.endsWith(".md"))) {
    const n = ((await readFile(join(akar, f), "utf8")).match(/\[PERLU (GURU|SEKOLAH)[^\]]*\]/g) ?? []).length
    if (n) { perlu += n; perluBerkas.push(`${f.replace("guru/draf/", "")} (${n})`) }
  }
  baris.push("", "## Perlu keputusan guru", perlu ? `◐ ${perlu} penanda [PERLU GURU/SEKOLAH] di ${perluBerkas.length} draf: ${perluBerkas.slice(0, 8).join("; ")}${perluBerkas.length > 8 ? "; …" : ""}` : "✔ Tidak ada penanda [PERLU GURU] yang tersisa.")

  return { teks: [`Peta perangkat per ${tanggal} (semester ${semKe}). ✔ sudah, ◐ sebagian/opsional, ✖ belum.`, "", ...baris, "", ...langkahTeks(berikut)].join("\n"), berikut }
}

function langkahTeks(berikut: Langkah[]): string[] {
  if (!berikut.length) return ["## Langkah berikutnya", "Semua perangkat utama sudah ada. Lanjutkan bahan ajar bergulir tiap 2 minggu, jurnal harian, dan asesmen sesuai jadwal."]
  return ["## Langkah berikutnya (urut sesuai ketergantungan)", ...berikut.map((l, i) => `${i + 1}. ${l.judul} — akan membuat ${l.membuat}. Cara: ${l.cara}.`)]
}
