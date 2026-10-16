// Uji alat Asisten Guru tanpa OpenCode: menjalankan setiap alat di salinan AsistenGuru berisi data fixture,
// termasuk kondisi khas Windows (BOM dan CRLF dari Notepad, jalur dengan backslash, karakter terlarang).
// Pakai: cd uji-e2e/fixture && bun uji-alat.ts

import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { jalurAman, relatif } from "../../AsistenGuru/.opencode/lib/berkas.ts"
import { Gagal } from "../../AsistenGuru/.opencode/lib/berkas.ts"
import plugin from "../../AsistenGuru/.opencode/plugins/asisten-guru.ts"

const SINI = new URL(".", import.meta.url).pathname
const PAKET = join(SINI, "../../AsistenGuru")
const CP = join(SINI, "sekolah/referensi/cp/matematika-fase-b.md")
const DRAF = join(SINI, "../contoh-hasil-v02/guru/draf")

let gagal = 0
function cek(nama: string, benar: boolean, info = "") {
  console.log(`${benar ? "✔" : "✖"} ${nama}${!benar && info ? `\n    ${info.replace(/\n/g, "\n    ")}` : ""}`)
  if (!benar) gagal++
}

/** Salinan paket + data guru fixture. `windows` = berkas sekolah disimpan ala Notepad (BOM + CRLF). */
function siapkan(windows: boolean) {
  const akar = mkdtempSync(join(tmpdir(), "asisten-guru-"))
  cpSync(PAKET, akar, { recursive: true })
  cpSync(join(SINI, "guru"), join(akar, "guru"), { recursive: true })
  const notepad = (s: string) => (windows ? "\uFEFF" + s.replace(/\r?\n/g, "\r\n") : s)
  writeFileSync(join(akar, "sekolah/kebijakan.json"), notepad(readFileSync(join(SINI, "sekolah/kebijakan.json"), "utf8")))
  writeFileSync(join(akar, "sekolah/referensi/cp/matematika-fase-b.md"), notepad(readFileSync(CP, "utf8")))
  cpSync(DRAF, join(akar, "guru/draf"), { recursive: true })
  cpSync(join(SINI, "buku/uji-buku.pdf"), join(akar, "sekolah/referensi/buku/Buku Uji Pecahan.pdf"))
  return akar
}

/** Mendaftarkan plugin seperti OpenCode 2 lalu mengembalikan alat yang terdaftar. */
async function daftarAlat(akar: string) {
  const alat: Record<string, any> = {}
  await plugin.setup({
    location: { directory: akar },
    tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) },
    websearch: { query: async () => { throw new Error("tidak ada penyedia") } },
  })
  return alat
}

/** Seperti daftarAlat, dengan `ctx.websearch.query` tiruan (bentuk respons klien OpenCode 2). */
async function daftarAlatDengan(akar: string, cari: () => Promise<any[]>) {
  const alat: Record<string, any> = {}
  await plugin.setup({
    location: { directory: akar },
    tool: { transform: async (f: any) => f({ add: (t: any) => (alat[t.name] = t) }) },
    websearch: { query: async () => ({ data: { providerID: "tiruan", results: await cari() } }) },
  })
  return alat
}

for (const windows of [false, true]) {
  console.log(`\n== Data sekolah ${windows ? "ala Notepad Windows (BOM + CRLF)" : "biasa (UTF-8 + LF)"}`)
  const akar = siapkan(windows)
  try {
    const alat = await daftarAlat(akar)
    const jalan = async (n: string, input: any = {}) => (await alat[n].execute(input, {})).content as string
    cek("plugin mendaftarkan 27 alat", Object.keys(alat).length === 27, Object.keys(alat).join(", "))
    cek("semua alat bukan Code Mode", Object.values(alat).every((t: any) => t.options?.codemode === false))

    let r = await jalan("hitung_minggu_efektif")
    cek("hitung_minggu_efektif: 19 + 19 minggu efektif", /19/.test(r) && !r.startsWith("GAGAL"), r)

    r = await jalan("susun_perencanaan", { mapel: "matematika" })
    cek("susun_perencanaan: CP terbaca dan dokumen tersusun", r.startsWith("Selesai") && r.includes("5 elemen CP tercakup"), r)
    cek("susun_perencanaan: Promes tersimpan", existsSync(join(akar, "guru/data/promes-matematika.json")))
    const profilPath = join(akar, "guru/profil.json")
    const profilAsli = readFileSync(profilPath, "utf8")
    const { fase: _, ...tanpaFase } = JSON.parse(profilAsli)
    writeFileSync(profilPath, JSON.stringify(tanpaFase))
    r = await jalan("susun_perencanaan", { mapel: "matematika" })
    cek("susun_perencanaan: fase diturunkan dari kelas jika tidak ada di profil", r.startsWith("Selesai"), r)
    writeFileSync(profilPath, profilAsli)

    r = await jalan("agenda_hari_ini", { tanggal: "2026-10-16" })
    cek("agenda_hari_ini: jadwal dan TP minggu ini", r.includes("Jadwal hari jumat") && r.includes("minggu ini: TP"), r)
    r = await jalan("agenda_hari_ini", { tanggal: "16-10-2026" })
    cek("agenda_hari_ini: tanggal salah format → GAGAL yang jelas", r.startsWith("GAGAL"), r)

    const lkpd = "guru/draf/2 Modul dan LKPD/Matematika TP5 Kalimat Matematika dan Pola Bilangan/LKPD.md"
    r = await jalan("ekspor_word", { berkas: lkpd })
    cek("ekspor_word: jalur biasa", r.startsWith("Selesai") && r.includes("lembar_siswa"), r)
    r = await jalan("ekspor_word", { berkas: lkpd.replace(/\//g, "\\") })
    cek("ekspor_word: jalur Windows (backslash)", r.startsWith("Selesai"), r)
    r = await jalan("ekspor_word", { berkas: join(akar, lkpd) })
    cek("ekspor_word: jalur absolut di dalam folder", r.startsWith("Selesai"), r)
    // Tanpa template sekolah, RPM diperiksa terhadap kerangka contoh resmi BSKAP (PPA 2025 Lampiran 7).
    const rpm = "guru/draf/2 Modul dan LKPD/Matematika TP5 Uji BSKAP/RPM.md"
    await Bun.write(join(akar, rpm), "# RPM\n\n## Identifikasi Murid\nx\n\n## Tujuan Pembelajaran\n1. x\n\n## Langkah Pembelajaran\nx\n")
    r = await jalan("ekspor_word", { berkas: rpm })
    cek("ekspor_word: RPM tanpa template dicek terhadap kerangka BSKAP (bagian yang belum ada disebut)", r.startsWith("Selesai") && r.includes("standar BSKAP") && r.includes("Dimensi Profil Lulusan") && r.includes("Asesmen dan Tindak Lanjut") && !r.includes("Identifikasi Murid;"), r)
    const lengkap = ["Identifikasi Murid", "Dimensi Profil Lulusan", "Tujuan Pembelajaran", "Praktik Pedagogik", "Mitra Pembelajaran", "Lingkungan Pembelajaran", "Pemanfaatan Digital", "Langkah Pembelajaran", "Asesmen dan Tindak Lanjut", "Sumber"].map((j) => `## ${j}\nx\n`).join("\n")
    await Bun.write(join(akar, rpm), `# RPM\n\n${lengkap}`)
    r = await jalan("ekspor_word", { berkas: rpm })
    cek("ekspor_word: RPM lengkap sesuai kerangka BSKAP → tanpa catatan bagian hilang", r.startsWith("Selesai") && !r.includes("standar BSKAP"), r)
    r = await jalan("ekspor_word", { berkas: "sekolah/kebijakan.json" })
    cek("ekspor_word: menolak berkas di luar guru/draf", r.startsWith("GAGAL"), r)
    const crlf = "guru/draf/3 Asesmen/Uji CRLF/Soal.md"
    await Bun.write(join(akar, crlf), "\uFEFF# SOAL\r\n\r\n1. Berapa 2 + 3?\r\nA. 4\r\nB. 5\r\nC. 6\r\nD. 7\r\n")
    r = await jalan("ekspor_word", { berkas: crlf })
    cek("ekspor_word: draf CRLF + BOM", r.startsWith("Selesai"), r)
    const docXml = new TextDecoder().decode(readFileSync(join(akar, "hasil/3 Asesmen/Uji CRLF/Soal.docx")))
    cek("ekspor_word: tidak ada karakter CR di Word", !docXml.includes("\r"))

    r = await jalan("buat_absensi_excel", { bulan: 10 })
    cek("buat_absensi_excel: Oktober 2026", r.includes("Oktober 2026") && r.includes("22 hari sekolah"), r)
    r = await jalan("buat_absensi_excel", { bulan: 10 })
    cek("buat_absensi_excel: tidak menimpa berkas lama", r.includes("(2).xlsx"), r)
    r = await jalan("buat_absensi_excel", { bulan: 13 })
    cek("buat_absensi_excel: bulan 13 ditolak", r.startsWith("GAGAL"), r)

    r = await jalan("buat_nilai_excel", { mapel: "Matematika", semester: 1 })
    cek("buat_nilai_excel: semester 1", r.startsWith("Selesai") && r.includes("kolom TP"), r)
    r = await jalan("buat_nilai_excel", { mapel: "IPAS", semester: 1 })
    cek("buat_nilai_excel: mapel tidak ada → GAGAL", r.startsWith("GAGAL"), r)
    // Kalender pendidikan, jadwal kelas, dan media kartu
    r = await jalan("buat_kalender_pendidikan")
    cek("buat_kalender_pendidikan: Word tersimpan", r.startsWith("Selesai: hasil/1 Perencanaan/Kalender Pendidikan 2026-2027.docx") && r.includes("hari belajar efektif"), r)
    const kalDoc = new TextDecoder().decode((await import("../../AsistenGuru/.opencode/lib/unzip.ts")).bacaZip(new Uint8Array(readFileSync(join(akar, "hasil/1 Perencanaan/Kalender Pendidikan 2026-2027.docx")))).get("word/document.xml")!)
    cek("kalender: tanda K untuk MPLS dan L untuk HUT RI", kalDoc.includes(">13 K<") && kalDoc.includes(">17 L<") && !kalDoc.includes('w:orient="landscape"'))
    r = await jalan("buat_jadwal_kelas")
    cek("buat_jadwal_kelas: tanpa data → GAGAL dengan petunjuk", r.startsWith("GAGAL") && r.includes("jadwal-kelas.json"), r)
    writeFileSync(join(akar, "guru/jadwal-kelas.json"), JSON.stringify({
      jam: [{ ke: 1, mulai: "07.15", akhir: "07.50" }, { ke: 2, mulai: "07.50", akhir: "08.25" }, { istirahat: true, mulai: "08.25", akhir: "08.40" }, { ke: 3, mulai: "08.40", akhir: "09.15" }],
      hari: { senin: [{ jam_ke: "1-2", mapel: "Matematika" }, { jam_ke: "3", mapel: "PJOK", guru: "Pak Dedi" }], rabu: [{ jam_ke: "1-2", mapel: "Matematika" }], jumat: [{ jam_ke: "3", mapel: "Matematika" }] },
    }))
    r = await jalan("buat_jadwal_kelas")
    cek("buat_jadwal_kelas: Word lanskap + JP sesuai profil", r.includes("Jadwal Pelajaran Kelas 4") && r.includes("✔ Matematika: 5 JP"), r)
    const media = "guru/draf/2 Modul dan LKPD/Matematika TP5 Kalimat Matematika dan Pola Bilangan/Media.md"
    writeFileSync(join(akar, media), "# KARTU PECAHAN\n\nGunting sesuai garis putus-putus.\n\n```kartu kolom=3 ukuran=40 tinggi=5\n1/2 || setengah\n2/4\n3/6\n4/8\n```\n")
    r = await jalan("ekspor_word", { berkas: media })
    const medDoc = new TextDecoder().decode((await import("../../AsistenGuru/.opencode/lib/unzip.ts")).bacaZip(new Uint8Array(readFileSync(join(akar, media.replace("guru/draf/", "hasil/").replace(".md", ".docx"))))).get("word/document.xml")!)
    cek("media kartu: lembar siswa, garis putus-putus, 2 baris kartu", r.includes("lembar_siswa") && medDoc.includes('w:val="dashed"') && (medDoc.match(/w:hRule="exact"/g) ?? []).length === 2 && medDoc.includes(">setengah<"), r)

    // Kokurikuler: penilaian per dimensi
    r = await jalan("buat_penilaian_kokurikuler_excel", { tema: "Lingkunganku Sehat" })
    cek("penilaian kokurikuler: tanpa data → GAGAL dengan petunjuk", r.startsWith("GAGAL") && r.includes("skill kokurikuler"), r)
    writeFileSync(join(akar, "guru/data/kokurikuler-lingkunganku-sehat-aku-kuat.json"), JSON.stringify({ tema: "Lingkunganku Sehat, Aku Kuat", kelas: 4, dimensi: [{ dimensi: "Penalaran Kritis", subdimensi: "Penyelesaian masalah" }, { dimensi: "Kolaborasi" }] }))
    r = await jalan("buat_penilaian_kokurikuler_excel", { tema: "Lingkunganku Sehat" })
    cek("penilaian kokurikuler: Excel di 5 Kokurikuler", r.includes("hasil/5 Kokurikuler/Penilaian Kokurikuler Lingkunganku Sehat, Aku Kuat Kelas 4.xlsx") && r.includes("2 kolom dimensi"), r)
    writeFileSync(join(akar, "guru/data/kokurikuler-salah.json"), JSON.stringify({ tema: "Salah", dimensi: [{ dimensi: "Gotong Royong" }] }))
    r = await jalan("buat_penilaian_kokurikuler_excel", { tema: "salah" })
    cek("penilaian kokurikuler: dimensi bukan 8 dimensi → GAGAL", r.startsWith("GAGAL") && r.includes("8 dimensi"), r)

    // CP otomatis: jalur yang tidak butuh internet
    r = await jalan("ambil_cp", { mapel: "matematika" })
    cek("ambil_cp: CP sekolah yang sudah terisi diutamakan", r.includes("CP dari sekolah sudah ada"), r)
    r = await jalan("ambil_cp", { mapel: "Pendidikan Agama Islam" })
    cek("ambil_cp: CP agama ditolak dengan alasan", r.startsWith("GAGAL") && r.includes("2026"), r)

    // Pustaka buku dan riset web (pencarian ditiru; tidak butuh internet).
    r = await jalan("baca_buku")
    cek("baca_buku: daftar buku", r.includes("Buku Uji Pecahan"), r)
    r = await jalan("baca_buku", { cari: "pecahan senilai" })
    cek("baca_buku: pencarian menemukan halaman", r.includes("halaman PDF 1"), r)
    r = await jalan("baca_buku", { buku: "uji", halaman: "1" })
    cek("baca_buku: teks halaman terbaca", r.includes("ZEBRA-4417") && r.includes("1/2 = 2/4 = 3/6"), r)
    r = await jalan("baca_buku", { buku: "uji", halaman: "1-40" })
    cek("baca_buku: halaman di luar jangkauan dipangkas", r.includes("ZEBRA-4417"), r)
    r = await jalan("baca_buku", { buku: "tidak-ada" })
    cek("baca_buku: buku tidak ada → GAGAL", r.startsWith("GAGAL"), r)
    const tiruCari = async () => [
      { url: "https://www.youtube.com/watch?v=x", title: "Video", content: "pecahan senilai" },
      { url: "https://evil-kemendikdasmen.go.id.example.com/a", title: "Tiruan", content: "pecahan senilai" },
      { url: "https://guru.kemendikdasmen.go.id/materi", title: "Materi Pecahan", content: "Pecahan senilai adalah pecahan yang nilainya sama." },
    ]
    const jalanWeb = async (input: any) => (await alat.riset_materi.execute(input, {})).content as string
    const fetchSimpan = globalThis.fetch
    globalThis.fetch = (async () => { throw new Error("offline") }) as any
    try {
      const plug = await daftarAlatDengan(akar, tiruCari)
      r = (await plug.riset_materi.execute({ pertanyaan: "pecahan senilai" }, {})).content
      cek("riset_materi: hanya domain tepercaya dipakai", r.includes("guru.kemendikdasmen.go.id/materi") && !r.includes("### Video") && !r.includes("### Tiruan"), r)
      cek("riset_materi: domain tiruan tidak lolos", r.includes("evil-kemendikdasmen.go.id.example.com"), r)
      r = (await plug.riset_materi.execute({ simpan_pdf: "https://contoh.com/buku.pdf" }, {})).content
      cek("riset_materi: simpan PDF dari situs lain ditolak", r.startsWith("GAGAL"), r)
      r = await jalanWeb({ pertanyaan: "pecahan" })
      cek("riset_materi: tanpa layanan pencarian → GAGAL yang jelas", r.startsWith("GAGAL"), r)
    } finally {
      globalThis.fetch = fetchSimpan
    }

    // unduh_buku: katalog SIBI dan server berkas ditiru, dengan keanehan katalog asli.
    const pdfUji = readFileSync(join(SINI, "buku/uji-buku.pdf"))
    const lama = "https://static.buku.kemdikbud.go.id/content/pdf/bukuteks/kurikulum21"
    const katalogTiruan = { results: [
      { title: "Matematika untuk SD/MI Kelas IV", subject: "matematika", class: "4", level: "SD/MI", type: "pdf", attachment: `${lama}/Matematika-BS-KLS-IV.pdf` },
      { title: "Buku Panduan Guru Matematika untuk SD/MI Kelas IV", subject: "matematika", class: "4", level: "SD/MI", type: "pdf", book_type: "buku_siswa", attachment: `${lama}/Matematika-BG-KLS-IV.pdf` },
      { title: "Buku Audio Bahasa Indonesia: Lihat Sekitar! untuk SD/MI Kelas IV (Edisi Revisi)", subject: "bahasa_Indonesia", class: "4", level: "SD/MI", type: "audio", attachment: `${lama}/Bahasa_Indonesia_BS_KLS_IV_Rev.pdf` },
      { title: "Bahasa Indonesia untuk SD/MI Kelas IV", subject: "bahasa_Indonesia", class: "4", level: "SD/MI", type: "pdf", attachment: `${lama}/Bahasa-Indonesia-BS-KLS-IV.pdf` },
      { title: "Pendidikan Agama Islam dan Budi Pekerti untuk SD Kelas IV", subject: "agama_islam", class: "4", level: "SD", type: "pdf", attachment: `${lama}/Islam-BS-KLS-IV.pdf` },
      { title: "Matematika untuk SMP Kelas VII", subject: "matematika", class: "7", level: "SMP/MTs", type: "pdf", attachment: `${lama}/Matematika-BS-KLS-VII.pdf` },
      { title: "Buku Interaktif", subject: "matematika", class: "4", level: "SD/MI", type: "interactive", attachment: "https://x/book.html" },
    ] }
    const diminta: string[] = []
    const fetchAsli2 = globalThis.fetch
    globalThis.fetch = (async (u: any) => {
      const url = String(u); diminta.push(url)
      if (url.includes("getPenggerakTextBooks")) return new Response(JSON.stringify(katalogTiruan))
      if (url.startsWith("https://static.sc.cloudapp.web.id/")) return new Response(pdfUji, { headers: { "content-type": "application/pdf" } })
      return new Response("tidak ada", { status: 404 })
    }) as any
    try {
      r = await jalan("unduh_buku")
      cek("unduh_buku: bawaan hanya mapel di profil (tanpa agama)", r.includes("Matematika untuk SD/MI Kelas IV — Buku Siswa") && !r.includes("Agama"), r)
      cek("unduh_buku: Panduan Guru dikenali walau label katalog salah", r.includes("Buku Panduan Guru Matematika untuk SD/MI Kelas IV — Panduan Guru"), r)
      cek("unduh_buku: buku SMP tidak ikut", !r.includes("SMP"), r)
      r = await jalan("unduh_buku", { mapel: "bahasa indonesia" })
      cek("unduh_buku: entri audio berlampiran PDF ikut, edisi revisi diutamakan", r.includes("Lihat Sekitar") && !r.includes("- Bahasa Indonesia untuk SD/MI Kelas IV"), r)
      r = await jalan("unduh_buku", { mapel: "PAI" })
      cek("unduh_buku: alias PAI", r.includes("Pendidikan Agama Islam"), r)
      r = await jalan("unduh_buku", { mapel: "matematika", jenis: "siswa", unduh: true })
      cek("unduh_buku: unduh ke guru/buku lewat host baru", r.includes("tersimpan (1 halaman)") && existsSync(join(akar, "guru/buku/Matematika untuk SD-MI Kelas IV.pdf")) && diminta.some((u) => u.startsWith("https://static.sc.cloudapp.web.id/content/pdf/bukuteks/kurikulum21/Matematika-BS-KLS-IV.pdf")), r)
      r = await jalan("unduh_buku", { mapel: "matematika", jenis: "siswa", unduh: true })
      cek("unduh_buku: buku yang sudah ada dilewati", r.includes("sudah ada, dilewati"), r)
      r = await jalan("baca_buku", { cari: "pecahan senilai", buku: "Matematika untuk SD" })
      cek("unduh_buku: buku hasil unduhan bisa dicari baca_buku", r.includes("halaman PDF 1"), r)
      r = await jalan("unduh_buku", { mapel: "fisika kuantum" })
      cek("unduh_buku: mapel tidak ada → pesan jelas", r.startsWith("Tidak ada buku"), r)
    } finally {
      globalThis.fetch = fetchAsli2
    }

    // perbarui_paket: GitHub ditiru supaya uji tidak butuh internet (pemasangan penuh diuji di uji-e2e/pasang/).
    const fetchAsli = globalThis.fetch
    const tiruTag = (tags: string[]) =>
      (globalThis.fetch = (async () => new Response(JSON.stringify(tags.map((name) => ({ name }))))) as any)
    try {
      const versi = JSON.parse(readFileSync(join(PAKET, ".opencode/paket.json"), "utf8")).versi
      tiruTag(["v0.2.0", `v${versi}`, "uji"])
      r = await jalan("perbarui_paket", { cek_saja: true })
      cek("perbarui_paket: sudah versi terbaru", r.includes(`Versi terpasang: ${versi}`) && r.includes("Sudah versi terbaru"), r)
      // Urutan versi angka: 9.10.0 lebih baru dari 9.9.1 (bukan urutan huruf), dan selalu lebih baru dari versi paket.
      tiruTag([`v${versi}`, "v9.10.0", "v9.9.1"])
      r = await jalan("perbarui_paket", { cek_saja: true })
      cek("perbarui_paket: ada pembaruan 9.10.0 (urutan versi angka)", r.includes("Versi terbaru: 9.10.0") && r.includes("Ada pembaruan"), r)
      globalThis.fetch = (async () => { throw new Error("offline") }) as any
      r = await jalan("perbarui_paket", { cek_saja: true })
      cek("perbarui_paket: tanpa internet → GAGAL yang jelas", r.startsWith("GAGAL") && r.includes("koneksi internet"), r)
    } finally {
      globalThis.fetch = fetchAsli
    }
  } finally {
    rmSync(akar, { recursive: true, force: true })
  }
}

console.log("\n== Jalur Windows")
cek("jalurAman: titik dua diganti", jalurAman("hasil/2 Modul/Matematika: Pecahan/LKPD.docx") === "hasil/2 Modul/Matematika- Pecahan/LKPD.docx")
cek("jalurAman: titik/spasi di ujung nama dibuang", jalurAman("guru/draf/Topik. /A.md") === "guru/draf/Topik/A.md")
cek("jalurAman: nama perangkat Windows", jalurAman("guru/draf/CON/a.md") === "guru/draf/_CON/a.md")
cek("relatif: backslash", relatif("C:\\Users\\Rina\\AsistenGuru", "guru\\draf\\a.md") === "guru/draf/a.md")
cek("relatif: absolut Windows (beda huruf besar)", relatif("C:\\Users\\Rina\\AsistenGuru", "c:\\users\\rina\\AsistenGuru\\guru\\draf\\a.md") === "guru/draf/a.md")
cek("Gagal tetap Error", new Gagal("x") instanceof Error)

console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
