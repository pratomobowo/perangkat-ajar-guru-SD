import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, rename, stat } from "node:fs/promises"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { muatData } from "../lib/analisis.ts"
import { type Kalender, type Profil, Gagal, bacaJson, jalurAman, relatif, tulis } from "../lib/berkas.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { hariIni } from "../lib/kalender.ts"
import { adalahRekap, isiRekap } from "../lib/rekapsekolah.ts"
import { AWALAN_SUMBER, bacaDaftarSiswa } from "../lib/siswa.ts"

type Masukan = { berkas?: string; semester?: 1 | 2; sampai?: string; timpa?: boolean }

export default alat<Masukan>({
  nama: "isi_rekap_sekolah",
  deskripsi:
    "Mengisi berkas rekap nilai buatan sekolah/operator (Excel yang diisi guru untuk rapor lalu dimasukkan operator ke e-Rapor) secara otomatis, tanpa memperlihatkan nama ke asisten: identitas siswa (bila templat kosong), nilai per mapel dari buku nilai (UH/formatif = rata-rata nilai TP, UTS/STS/PTS = STS, UAS/SAS/PAS = SAS), dan sakit/izin/alfa dari daftar hadir semester ini sampai tanggal `sampai`. Kolom dikenali dari judulnya, hanya sel kosong yang diisi (kecuali `timpa`=true), dan format berkas sekolah dipertahankan. Hasil: salinan baru di hasil/4 Administrasi; ringkasan kolom yang masih harus diisi guru.",
  masukan: {
    type: "object",
    properties: {
      berkas: { type: "string", description: "Berkas rekap di guru/masukan/ atau hasil/4 Administrasi/; kosongkan untuk memakai templat rekap terakhir yang sudah dipindah ke folder terkunci (isi ulang)" },
      semester: { type: "integer", enum: [1, 2], description: "Bawaan: semester berjalan" },
      sampai: { type: "string", description: "Batas akhir rekap kehadiran YYYY-MM-DD (misalnya tanggal STS); bawaan hari ini" },
      timpa: { type: "boolean", description: "true = timpa sel yang sudah berisi (setelah guru setuju)" },
    },
    additionalProperties: false,
  },
  async jalankan(a, akar) {
    if (!a.berkas) {
      // Isi ulang: templat rekap terbaru yang sudah dipindah ke folder terkunci.
      const dir = join(akar, "hasil", FOLDER.administrasi)
      const calon: { f: string; t: number }[] = []
      if (existsSync(dir))
        for (const f of await readdir(dir))
          if ((f.startsWith(AWALAN_SUMBER) || f.startsWith("Templat Rekap - ")) && f.endsWith(".xlsx") && !/\(diisi\)/.test(f) && adalahRekap(new Uint8Array(await readFile(join(dir, f)))))
            calon.push({ f, t: (await stat(join(dir, f))).mtimeMs })
      if (!calon.length) throw new Gagal("Belum ada templat rekap nilai dari sekolah. Minta guru menaruh Excel rekap dari operator di folder guru\\masukan, lalu panggil lagi.")
      a.berkas = `hasil/${FOLDER.administrasi}/${calon.sort((x, y) => y.t - x.t)[0].f}`
    }
    let rel = relatif(akar, a.berkas)
    if (!rel.includes("/")) rel = `guru/masukan/${rel}`
    if (rel.split("/").includes("..") || !(rel.startsWith("guru/masukan/") || rel.startsWith(`hasil/${FOLDER.administrasi}/`)))
      throw new Gagal(`Berkas rekap harus berada di guru/masukan/ atau hasil/${FOLDER.administrasi}/.`)
    // Berkas yang sudah dipindah baca_masukan ke folder terkunci dicari otomatis.
    const nama0 = rel.split("/").pop()!
    for (const c of [rel, `hasil/${FOLDER.administrasi}/${AWALAN_SUMBER}${nama0}`, `hasil/${FOLDER.administrasi}/Templat Rekap - ${nama0}`])
      if (existsSync(join(akar, jalurAman(c)))) { rel = c; break }
    let p = join(akar, jalurAman(rel))
    if (!existsSync(p)) throw new Gagal(`Berkas ${rel} tidak ditemukan.`)
    if (!/\.xlsx$/i.test(p)) throw new Gagal("Rekap harus berupa Excel .xlsx (dari Google Sheets: File › Download › Microsoft Excel).")
    // Templat berisi data siswa: pindahkan dari folder masukan ke folder terkunci.
    if (rel.startsWith("guru/masukan/")) {
      let aman = `hasil/${FOLDER.administrasi}/Templat Rekap - ${nama0}`
      for (let i = 2; existsSync(join(akar, jalurAman(aman))); i++) aman = `hasil/${FOLDER.administrasi}/Templat Rekap - ${nama0.replace(/(\.\w+)$/, ` (${i})$1`)}`
      await mkdir(join(akar, "hasil", FOLDER.administrasi), { recursive: true })
      await rename(p, join(akar, jalurAman(aman)))
      rel = aman
      p = join(akar, jalurAman(rel))
    }

    const profil = await bacaJson<Profil>(akar, "guru/profil.json")
    const kal = await bacaJson<Kalender>(akar, "guru/kalender.json")
    const sampai = a.sampai ?? hariIni()
    const sem = kal.semester?.find((s) => (a.semester ? s.ke === a.semester : s.mulai <= sampai && sampai <= s.akhir)) ?? kal.semester?.[0]
    const semKe = sem?.ke ?? a.semester ?? 1
    const d = await muatData(akar)
    const bulan = (b: string) => b.match(/(\d{4})-(\d{2})/)?.slice(1, 3).join("-") ?? ""
    // Kehadiran hanya diisi bila SETIAP bulan dari awal semester s.d. `sampai` punya daftar hadir yang sudah diisi.
    // Daftar hadir kosong berarti "semua hadir", jadi berkas yang belum diisi sama sekali tidak boleh dihitung.
    const dalam = d.hadir.filter((h) => { const m = bulan(h.berkas); return !!m && (!sem || m >= sem.mulai.slice(0, 7)) && m <= sampai.slice(0, 7) })
    const terisiHadir = dalam.filter((h) => h.baris.some((r) => r.s + r.i + r.a > 0))
    const perluBulan: string[] = []
    if (sem) for (let t = new Date(`${sem.mulai.slice(0, 7)}-01T00:00:00Z`); t.toISOString().slice(0, 7) <= sampai.slice(0, 7); t.setUTCMonth(t.getUTCMonth() + 1)) perluBulan.push(t.toISOString().slice(0, 7))
    const kurangBulan = perluBulan.filter((m) => !terisiHadir.some((h) => bulan(h.berkas) === m))
    const hadir = kurangBulan.length ? [] : terisiHadir
    const nilai = d.nilai.filter((b) => b.semester === null || b.semester === semKe)
    const siswa = (await bacaDaftarSiswa(akar)) ?? []
    const h = isiRekap(new Uint8Array(await readFile(p)), { siswa, nilai, hadir }, { timpa: a.timpa, nolStrip: true })

    // Nama hasil tanpa awalan folder terkunci ("Sumber Daftar Siswa - ", "Templat Rekap - ").
    const namaAsli = (rel.split("/").pop() ?? nama0).replace(new RegExp(`^(${AWALAN_SUMBER}|Templat Rekap - )`), "").replace(/\.xlsx$/i, "")
    const dasar = `hasil/${FOLDER.administrasi}/${namaAsli} (diisi)`
    let keluar = `${dasar}.xlsx`
    for (let i = 2; existsSync(join(akar, jalurAman(keluar))); i++) keluar = `${dasar} ${i}.xlsx`
    keluar = await tulis(akar, keluar, h.data)
    const terisi = Object.entries(h.terisi)
    return [
      `Selesai: ${keluar} (templat asli tetap di ${rel}). ${h.baris} baris siswa; ${h.cocok} cocok dengan data asisten${h.tidakCocok ? `, ${h.tidakCocok} tidak cocok (nama/NISN berbeda dengan Daftar Siswa — guru mengisi baris itu sendiri)` : ""}.`,
      terisi.length ? `Terisi: ${terisi.map(([k, n]) => `${k} ${n} sel`).join("; ")}.` : "Belum ada sel yang bisa diisi: buku nilai/daftar hadir semester ini belum berisi nilai, atau mapel di rekap tidak ada di profil guru.",
      h.dilewati ? `${h.dilewati} sel sudah berisi sehingga tidak diubah (timpa=true bila guru ingin menggantinya).` : "",
      `Sumber: buku nilai semester ${semKe} (UH = rata-rata nilai TP, UTS = STS, UAS = SAS)${hadir.length ? ` dan daftar hadir ${perluBulan[0] ?? ""} s.d. ${sampai.slice(0, 7)}` : ""}.`,
      kurangBulan.length ? `Sakit/izin/alfa TIDAK diisi: daftar hadir bulan ${kurangBulan.join(", ")} belum ada atau belum diisi (daftar hadir kosong berarti semua hadir, jadi tidak boleh dipakai). Jangan membuat daftar hadir baru untuk bulan yang sudah lewat hanya agar kolom terisi; minta guru mengisi rekap kehadirannya dari catatan sendiri, atau mengisi daftar hadir bulan itu dulu.` : "",
      h.kosong.length ? `Masih diisi guru: ${h.kosong.join(", ")}.` : "",
      "Sampaikan ke guru: buka Excel hasilnya, cek angka, lengkapi kolom yang masih kosong, lalu serahkan ke operator. Jangan menyebut nama siswa.",
    ].filter(Boolean).join("\n")
  },
})
