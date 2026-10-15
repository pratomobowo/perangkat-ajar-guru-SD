// Inti perencanaan: minggu efektif, validasi ATP, Prota, dan Promes.
// Semua angka di dokumen berasal dari sini, sehingga ATP, Prota, dan Promes selalu konsisten.

import { type ATP, type Kalender, type Kebijakan, type Mapel, type Profil, Gagal, slug } from "./berkas.ts"
import { type Minggu, NAMA_BULAN, mingguSemester, namaBulan, ringkasBulan, tgl, tglIndo } from "./kalender.ts"

export type CpInfo = { path: string; status: string; sumber?: string; elemen: string[] }

function identitas(profil: Profil, kebijakan: Kebijakan, mapel?: Mapel): string {
  const baris = [
    `Satuan pendidikan: ${kebijakan.nama_sekolah ?? profil.sekolah ?? "[PERLU GURU: nama sekolah]"}`,
    mapel ? `Mata pelajaran: ${mapel.nama}` : null,
    `Kelas / Fase: ${profil.kelas}${profil.fase ? ` / ${profil.fase}` : ""}`,
    mapel ? `Alokasi waktu: ${mapel.jp_per_minggu} JP per minggu${mapel.menit_per_jp ? ` (1 JP = ${mapel.menit_per_jp} menit)` : ""}` : null,
    `Tahun ajaran: ${profil.tahun_ajaran}`,
    `Guru: ${profil.nama_lengkap ?? profil.nama_panggilan ?? "-"}`,
  ]
  return ["```identitas", ...baris.filter(Boolean), "```"].join("\n")
}

function rentang(a: string, b: string): string {
  const x = tgl(a)
  const y = tgl(b)
  if (a === b) return tglIndo(x)
  const bln = (d: Date) => NAMA_BULAN[d.getUTCMonth() + 1].slice(0, 3)
  if (x.getUTCFullYear() !== y.getUTCFullYear()) return `${tglIndo(x)} – ${tglIndo(y)}`
  if (x.getUTCMonth() === y.getUTCMonth()) return `${x.getUTCDate()}–${tglIndo(y)}`
  return `${x.getUTCDate()} ${bln(x)} – ${tglIndo(y)}`
}

export function minHariEfektif(kebijakan: Kebijakan): { nilai: number; dariSekolah: boolean } {
  const n = kebijakan.minggu_efektif?.min_hari_efektif
  return typeof n === "number" ? { nilai: n, dariSekolah: true } : { nilai: 3, dariSekolah: false }
}

export function mingguEfektif(profil: Profil, kalender: Kalender, kebijakan: Kebijakan) {
  const aturan = minHariEfektif(kebijakan)
  const minggu = mingguSemester(kalender, profil, aturan.nilai)
  const perSem = kalender.semester.map((s) => {
    const m = minggu.filter((x) => x.semester === s.ke)
    return { ke: s.ke, mulai: s.mulai, akhir: s.akhir, jumlah: m.length, efektif: m.filter((x) => x.efektif).length }
  })

  const md: string[] = []
  md.push("# RINCIAN MINGGU EFEKTIF", "", identitas(profil, kebijakan), "")
  md.push(
    `Aturan hitung: satu minggu dihitung **efektif** jika ada minimal **${aturan.nilai} hari belajar efektif** ` +
      `(hari sekolah yang bukan libur dan bukan kegiatan tidak efektif seperti MPLS, asesmen sumatif, atau class meeting). ` +
      `Satu minggu dimasukkan ke bulan tempat hari Rabu-nya berada.`,
  )
  if (!aturan.dariSekolah)
    md.push("", `[PERLU GURU: batas ${aturan.nilai} hari adalah bawaan asisten. Mohon waka kurikulum menetapkannya di sekolah/kebijakan.json.]`)
  md.push("")

  for (const s of perSem) {
    md.push(`## Semester ${s.ke} (${tglIndo(tgl(s.mulai))} – ${tglIndo(tgl(s.akhir))})`, "")
    md.push("| Bulan | Jumlah minggu | Minggu tidak efektif | Minggu efektif | Keterangan |", "|---|---|---|---|---|")
    for (const b of ringkasBulan(minggu).filter((x) => x.semester === s.ke))
      md.push(`| ${namaBulan(b.bulan)} | ${b.jumlah} | ${b.jumlah - b.efektif} | ${b.efektif} | ${[...b.ket].join("; ") || "-"} |`)
    md.push(`| **Jumlah** | **${s.jumlah}** | **${s.jumlah - s.efektif}** | **${s.efektif}** | |`, "")
  }

  md.push("## JP tersedia per mata pelajaran", "", "| Mata pelajaran | JP/minggu | " + perSem.map((s) => `Smt ${s.ke}: minggu efektif / JP`).join(" | ") + " | JP setahun |")
  md.push("|---|---|" + perSem.map(() => "---|").join("") + "---|")
  for (const m of profil.mapel)
    md.push(
      `| ${m.nama} | ${m.jp_per_minggu} | ` +
        perSem.map((s) => `${s.efektif} / ${s.efektif * m.jp_per_minggu}`).join(" | ") +
        ` | ${perSem.reduce((t, s) => t + s.efektif * m.jp_per_minggu, 0)} |`,
    )
  md.push("", "<!-- halaman-baru -->", "", "## Lampiran: rincian per minggu", "")
  md.push("| Smt | Minggu ke | Tanggal | Hari efektif | Status | Keterangan |", "|---|---|---|---|---|---|")
  for (const w of minggu)
    md.push(
      `| ${w.semester} | ${w.ke} | ${rentang(w.mulai, w.akhir)} | ${w.hari_efektif}/${w.hari_sekolah} | ${w.efektif ? "Efektif" : "Tidak efektif"} | ${w.keterangan.join("; ") || "-"} |`,
    )

  const ringkas =
    perSem.map((s) => `Semester ${s.ke}: ${s.jumlah} minggu, ${s.efektif} efektif`).join("; ") +
    `. Aturan: minimal ${aturan.nilai} hari efektif per minggu${aturan.dariSekolah ? " (kebijakan sekolah)" : " (bawaan, perlu ditetapkan sekolah)"}.`
  return { minggu, perSem, md: md.join("\n"), ringkas, aturan }
}

type Alokasi = { kode: string; jp: number }
export type MingguPromes = Minggu & { alokasi: Alokasi[] }

export function susunPerencanaan(args: {
  profil: Profil
  kalender: Kalender
  kebijakan: Kebijakan
  mapel: Mapel
  atp: ATP
  cp: CpInfo | null
}) {
  const { profil, kalender, kebijakan, mapel, atp, cp } = args
  const me = mingguEfektif(profil, kalender, kebijakan)
  const masalah: string[] = []

  // 1. Validasi struktur TP
  if (!Array.isArray(atp.tp) || !atp.tp.length) throw new Gagal("Data ATP belum berisi TP (field tp kosong).")
  const kodeSet = new Set<string>()
  const semesterAda = new Set(kalender.semester.map((s) => s.ke))
  for (const [i, t] of atp.tp.entries()) {
    const nama = t.kode || `TP urutan ${i + 1}`
    if (!t.kode) masalah.push(`${nama}: kode kosong.`)
    if (kodeSet.has(t.kode)) masalah.push(`${nama}: kode dipakai lebih dari sekali.`)
    kodeSet.add(t.kode)
    if (!t.tujuan?.trim()) masalah.push(`${nama}: rumusan tujuan kosong.`)
    if (!semesterAda.has(t.semester)) masalah.push(`${nama}: semester harus salah satu dari ${[...semesterAda].join("/")}.`)
    if (!Number.isInteger(t.jp) || t.jp <= 0) masalah.push(`${nama}: JP harus bilangan bulat positif.`)
    if (!Array.isArray(t.elemen) || !t.elemen.length) masalah.push(`${nama}: elemen CP belum disebut.`)
  }

  // 2. Elemen CP
  const elemenCp = cp?.elemen ?? []
  const cocok = (e: string) => elemenCp.find((x) => slug(x) === slug(e))
  if (elemenCp.length) {
    for (const t of atp.tp) for (const e of t.elemen ?? []) if (!cocok(e)) masalah.push(`${t.kode}: elemen "${e}" tidak ada di CP. Pilihan: ${elemenCp.join("; ")}.`)
  }
  if (masalah.length) throw new Gagal("Data ATP perlu diperbaiki dulu:\n- " + masalah.join("\n- "))

  const dikecualikan = new Map((atp.elemen_tidak_di_kelas_ini ?? []).map((x) => [slug(x.elemen), x.alasan]))
  const cakupan = elemenCp.map((e) => ({
    elemen: e,
    tp: atp.tp.filter((t) => t.elemen.some((x) => slug(x) === slug(e))).map((t) => t.kode),
    alasan: dikecualikan.get(slug(e)),
  }))
  const tidakTercakup = cakupan.filter((c) => !c.tp.length && !c.alasan)
  if (tidakTercakup.length)
    throw new Gagal(
      `Elemen CP berikut belum punya TP: ${tidakTercakup.map((c) => c.elemen).join("; ")}. ` +
        `Tambahkan TP-nya, atau jika memang diajarkan di kelas lain dalam fase ini, isi elemen_tidak_di_kelas_ini beserta alasannya.`,
    )

  // 3. Kapasitas JP per semester
  const cadanganDari = (ke: number): { jp: number; sumber: string } => {
    const a = atp.cadangan_jp?.[String(ke)]
    if (typeof a === "number") return { jp: a, sumber: "usulan guru di data ATP" }
    if (typeof kebijakan.cadangan_jp_per_semester === "number") return { jp: kebijakan.cadangan_jp_per_semester, sumber: "kebijakan sekolah" }
    return { jp: 0, sumber: "belum ditetapkan" }
  }
  const sem = me.perSem.map((s) => {
    const tp = atp.tp.filter((t) => t.semester === s.ke)
    const jpTp = tp.reduce((a, t) => a + t.jp, 0)
    const cad = cadanganDari(s.ke)
    const tersedia = s.efektif * mapel.jp_per_minggu
    return { ...s, tp, jpTp, cad, tersedia, sisa: tersedia - jpTp - cad.jp }
  })
  const lebih = sem.filter((s) => s.sisa < 0)
  if (lebih.length)
    throw new Gagal(
      lebih
        .map(
          (s) =>
            `Semester ${s.ke}: JP tersedia ${s.tersedia} (${s.efektif} minggu efektif × ${mapel.jp_per_minggu} JP), ` +
            `tetapi TP ${s.jpTp} JP + cadangan ${s.cad.jp} JP = ${s.jpTp + s.cad.jp} JP. Kurangi ${-s.sisa} JP ` +
            `(kecilkan JP beberapa TP, pindahkan TP ke semester lain, atau kurangi cadangan).`,
        )
        .join("\n"),
    )

  // 4. Alokasi berurutan ke minggu efektif; sisa JP di akhir semester menjadi cadangan.
  const promes: MingguPromes[] = []
  for (const s of sem) {
    const antre = s.tp.map((t) => ({ kode: t.kode, sisa: t.jp }))
    for (const w of me.minggu.filter((x) => x.semester === s.ke)) {
      const alokasi: Alokasi[] = []
      if (w.efektif) {
        let jp = mapel.jp_per_minggu
        while (jp > 0 && antre.length) {
          const a = antre[0]
          const ambil = Math.min(jp, a.sisa)
          alokasi.push({ kode: a.kode, jp: ambil })
          a.sisa -= ambil
          jp -= ambil
          if (a.sisa === 0) antre.shift()
        }
        if (jp > 0) alokasi.push({ kode: "Cadangan", jp })
      }
      promes.push({ ...w, alokasi })
    }
  }
  const waktuTp = (kode: string) => {
    const w = promes.filter((p) => p.alokasi.some((a) => a.kode === kode))
    if (!w.length) return "-"
    const a = w[0]
    const b = w[w.length - 1]
    const bulan = a.bulan === b.bulan ? namaBulan(a.bulan) : `${namaBulan(a.bulan).split(" ")[0]}–${namaBulan(b.bulan)}`
    return `${bulan} (minggu ke-${a.ke}${a.ke !== b.ke ? `–${b.ke}` : ""})`
  }

  // 5. Dokumen
  const statusCp = cp?.status ?? "TIDAK-ADA"
  const draf = statusCp !== "TERVERIFIKASI" ? [`DRAF — CP belum diverifikasi (status: ${statusCp}). Periksa ulang setelah CP resmi diverifikasi sekolah.`, ""] : []
  const pakaiIslam = atp.tp.some((t) => t.nilai_islam?.trim())
  const judul = (n: string) => `# ${n.toUpperCase()}`
  const sumber = [
    "## Dasar penyusunan",
    "",
    `- Capaian Pembelajaran: ${cp?.sumber ?? "dokumen CP sekolah"}${statusCp === "TERVERIFIKASI" ? "." : ` (status: ${statusCp.toLowerCase().replace(/-/g, " ")}).`}`,
    `- Kalender pendidikan ${profil.tahun_ajaran}: ${me.perSem.map((s) => `semester ${s.ke} ${s.efektif} minggu efektif`).join(", ")}; satu minggu efektif bila ada minimal ${me.aturan.nilai} hari belajar${me.aturan.dariSekolah ? "" : " [PERLU GURU: aturan ini belum ditetapkan sekolah]"}.`,
    ...sem.map((s) => `- Cadangan semester ${s.ke} (asesmen, remedial, pengayaan): ${s.tersedia - s.jpTp} JP.`),
    "- Angka JP pada ATP, Prota, dan Promes disusun dari data yang sama sehingga saling konsisten.",
  ]


  const atpMd = [
    ...draf,
    judul("Alur Tujuan Pembelajaran (ATP)"),
    "",
    identitas(profil, kebijakan, mapel),
    "",
    "## Alur tujuan pembelajaran",
    "",
    `| No | Kode | Tujuan pembelajaran | Materi pokok | Elemen | JP | Smt |${pakaiIslam ? " Integrasi nilai Islam |" : ""}`,
    `|---|---|---|---|---|---|---|${pakaiIslam ? "---|" : ""}`,
    ...atp.tp.map(
      (t, i) =>
        `| ${i + 1} | ${t.kode} | ${t.tujuan} | ${t.materi ?? "-"} | ${t.elemen.join(", ")} | ${t.jp} | ${t.semester} |${pakaiIslam ? ` ${t.nilai_islam ?? "-"} |` : ""}`,
    ),
    `| | | **Jumlah** | | | **${atp.tp.reduce((a, t) => a + t.jp, 0)}** | | ${pakaiIslam ? "|" : ""}`,
    "",
    "## Cakupan elemen CP",
    "",
    "| Elemen | TP di kelas ini |",
    "|---|---|",
    ...(cakupan.length
      ? cakupan.map((c) => `| ${c.elemen} | ${c.tp.length ? c.tp.join(", ") : `Tidak di kelas ini: ${c.alasan}`} |`)
      : ["| (daftar elemen tidak ada di berkas CP) | - |"]),
    "",
    ...(atp.catatan?.length ? ["## Catatan untuk guru", "", ...atp.catatan.map((c) => `- ${c}`), ""] : []),
    ...sumber,
  ].join("\n")

  const protaMd = [
    ...draf,
    judul("Program Tahunan (Prota)"),
    "",
    identitas(profil, kebijakan, mapel),
    "",
    "| Smt | Kode | Tujuan pembelajaran / materi | JP | Perkiraan waktu |",
    "|---|---|---|---|---|",
    ...sem.flatMap((s) => [
      ...s.tp.map((t) => `| ${s.ke} | ${t.kode} | ${t.materi ?? t.tujuan} | ${t.jp} | ${waktuTp(t.kode)} |`),
      `| ${s.ke} | — | Cadangan: asesmen, remedial, pengayaan | ${s.tersedia - s.jpTp} | ${waktuTp("Cadangan") === "-" ? "tersebar" : "akhir semester"} |`,
      `| | | **Jumlah semester ${s.ke}** (${s.efektif} minggu efektif × ${mapel.jp_per_minggu} JP) | **${s.tersedia}** | |`,
    ]),
    `| | | **Jumlah setahun** | **${sem.reduce((a, s) => a + s.tersedia, 0)}** | |`,
    "",
    ...sumber,
  ].join("\n")

  const promesMd = [
    ...draf,
    judul("Program Semester (Promes)"),
    "",
    identitas(profil, kebijakan, mapel),
    "",
    ...sem.flatMap((s) => [
      `## Semester ${s.ke}`,
      "",
      "| Minggu ke | Tanggal | Bulan | Status | Alokasi (JP) |",
      "|---|---|---|---|---|",
      ...promes
        .filter((p) => p.semester === s.ke)
        .map(
          (p) =>
            `| ${p.ke} | ${rentang(p.mulai, p.akhir)} | ${NAMA_BULAN[+p.bulan.slice(5)]} | ${p.efektif ? "Efektif" : "Tidak efektif"} | ${
              p.alokasi.length ? p.alokasi.map((a) => `${a.kode} (${a.jp})`).join(", ") : p.keterangan.join("; ") || "-"
            }${p.efektif && p.keterangan.length ? ` — catatan: ${p.keterangan.join("; ")}` : ""} |`,
        ),
      "",
      "Keterangan TP:",
      "",
      ...s.tp.map((t) => `- **${t.kode}** (${t.jp} JP): ${t.tujuan}`),
      "",
    ]),
    "Catatan: minggu efektif yang memuat libur satu hari tetap diberi alokasi penuh; kekurangan JP-nya diambil dari cadangan.",
    "",
    ...sumber,
  ].join("\n")

  const cek = [
    ...sem.map(
      (s) =>
        `✔ Semester ${s.ke}: TP ${s.jpTp} JP + cadangan ${s.tersedia - s.jpTp} JP = ${s.tersedia} JP tersedia (${s.efektif} minggu efektif × ${mapel.jp_per_minggu}).`,
    ),
    elemenCp.length
      ? `✔ Semua ${elemenCp.length} elemen CP tercakup${dikecualikan.size ? ` (${dikecualikan.size} dinyatakan di kelas lain)` : ""}.`
      : "✖ Daftar elemen CP tidak ditemukan di frontmatter berkas CP; cakupan elemen tidak bisa dicek.",
    "✔ Tidak ada TP di minggu tidak efektif (dihitung otomatis).",
    "✔ Angka ATP, Prota, dan Promes berasal dari data yang sama.",
    statusCp === "TERVERIFIKASI" ? "✔ CP terverifikasi." : `✖ CP berstatus ${statusCp}: semua dokumen diberi label DRAF.`,
    ...sem.filter((s) => s.cad.sumber === "belum ditetapkan").map((s) => `✖ Cadangan JP semester ${s.ke} belum ditetapkan guru/sekolah.`),
    ...sem
      .filter((s) => s.sisa > mapel.jp_per_minggu)
      .map(
        (s) =>
          `✖ Semester ${s.ke}: ${s.sisa} JP (sekitar ${Math.round(s.sisa / mapel.jp_per_minggu)} minggu) belum terpakai di luar cadangan ${s.cad.jp} JP. ` +
          `Tambahkan JP pada TP yang butuh waktu lebih, tambah TP, atau naikkan cadangan secara sengaja.`,
      ),
    "• Urutan prasyarat antar-TP perlu dinilai guru (alat tidak bisa memeriksanya).",
  ]

  const promesJson = {
    mapel: mapel.nama,
    kode: slug(mapel.kode ?? mapel.nama),
    kelas: profil.kelas,
    tahun_ajaran: profil.tahun_ajaran,
    jp_per_minggu: mapel.jp_per_minggu,
    tp: Object.fromEntries(atp.tp.map((t) => [t.kode, { tujuan: t.tujuan, materi: t.materi ?? null, semester: t.semester, jp: t.jp }])),
    minggu: promes.map((p) => ({ semester: p.semester, ke: p.ke, mulai: p.mulai, akhir: p.akhir, efektif: p.efektif, keterangan: p.keterangan, alokasi: p.alokasi })),
  }

  return { me, sem, cek, dokumen: { atp: atpMd, prota: protaMd, promes: promesMd }, promesJson }
}
