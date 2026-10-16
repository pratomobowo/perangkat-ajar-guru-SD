import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type Profil, Gagal, bacaJson, jalurAman, relatif, tulis } from "../lib/berkas.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { DAFTAR_SISWA, amankanSumber, bacaDaftarSiswa, bacaSumber, pastikanDaftarSiswa, ringkas, saringRombel, selisih, simpanDaftarSiswa } from "../lib/siswa.ts"

export default alat<{ berkas?: string; rombel?: string; ganti?: boolean }>({
  nama: "daftar_siswa",
  deskripsi:
    "Mengelola Daftar Siswa — sumber nama untuk daftar hadir, buku nilai, dan penilaian kokurikuler — TANPA memperlihatkan nama ke asisten (hasil hanya jumlah). Tanpa argumen: ringkasan daftar saat ini. Dengan `berkas`: mengambil daftar siswa dari berkas guru (ekspor Dapodik, format nilai e-Rapor, daftar hadir lama yang berisi nama; .xlsx/.csv) di guru/masukan atau hasil/4 Administrasi, menyaring rombel kelas guru, menyimpannya, dan memindahkan berkas sumber ke folder yang terkunci dari asisten. `ganti`=true mengganti Daftar Siswa yang sudah ada.",
  masukan: {
    type: "object",
    properties: {
      berkas: { type: "string", description: "Berkas sumber di guru/masukan/ atau hasil/4 Administrasi/" },
      rombel: { type: "string", description: 'Rombel guru bila berkas berisi banyak rombel, misalnya "4A"' },
      ganti: { type: "boolean", description: "true = ganti Daftar Siswa yang sudah ada (setelah guru setuju)" },
    },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    if (!args.berkas) {
      const d = await pastikanDaftarSiswa(akar)
      if (!d)
        return "Daftar Siswa belum ada. Sampaikan ke guru: taruh ekspor daftar peserta didik dari Dapodik, format nilai dari e-Rapor, atau daftar hadir lama yang sudah berisi nama di folder guru\\masukan, lalu bilang \"sudah\". Nama akan terisi otomatis di semua Excel. Jangan meminta guru mengetik nama di chat."
      return `Daftar Siswa: ${ringkas(d.siswa)}${d.baru ? ` (baru dibuat otomatis dari ${d.baru})` : ""}. Berkas: ${DAFTAR_SISWA} — terkunci dari asisten; guru bisa menambah/menghapus siswa langsung di Excel.`
    }
    let rel = relatif(akar, args.berkas)
    if (!rel.includes("/")) rel = `guru/masukan/${rel}`
    if (rel.split("/").includes("..") || !(rel.startsWith("guru/masukan/") || rel.startsWith(`hasil/${FOLDER.administrasi}/`)))
      throw new Gagal(`Berkas sumber harus berada di guru/masukan/ atau hasil/${FOLDER.administrasi}/.`)
    const p = join(akar, jalurAman(rel))
    if (!existsSync(p)) throw new Gagal(`Berkas ${rel} tidak ditemukan.`)
    const d = await bacaSumber(p)
    if (!d?.siswa.length) throw new Gagal(`${rel} tidak terlihat seperti daftar siswa (perlu kolom "Nama Siswa"/"Nama Peserta Didik", atau "Nama" dengan NISN/NIS). Berkas Excel (.xlsx) atau CSV.`)
    const profil = await bacaJson<Profil>(akar, "guru/profil.json")
    // Berkas di folder masukan dipindah dulu ke folder terkunci, apa pun hasilnya.
    const aman = rel.startsWith("guru/masukan/") ? await amankanSumber(akar, p) : rel
    const pindah = aman !== rel ? ` Berkas sumber dipindah ke ${aman} (terkunci dari asisten).` : ""
    let siswa
    try {
      siswa = saringRombel(d, profil, args.rombel)
    } catch (e) {
      if (e instanceof Gagal) throw new Gagal(`${e.message.replace("panggil daftar_siswa lagi", `panggil daftar_siswa lagi dengan berkas="${aman}"`)}${pindah}`)
      throw e
    }
    if (args.rombel && !profil.rombel && existsSync(join(akar, "guru/profil.json"))) {
      const prof = JSON.parse((await readFile(join(akar, "guru/profil.json"), "utf8")).replace(/^﻿/, ""))
      prof.rombel = args.rombel
      await tulis(akar, "guru/profil.json", JSON.stringify(prof, null, 2) + "\n")
    }
    const lama = await bacaDaftarSiswa(akar)
    if (lama && !args.ganti) {
      const s = selisih(lama, siswa)
      if (!s.tambah && !s.hilang) return `Daftar Siswa sudah sama dengan berkas ini (${ringkas(lama)}); tidak ada yang diubah.${pindah}`
      return `Daftar Siswa sudah ada (${ringkas(lama)}). Berkas ini berisi ${ringkas(siswa)}: ${s.tambah} siswa baru, ${s.hilang} tidak ada lagi. Tanyakan guru apakah daftar diganti; bila ya, panggil daftar_siswa dengan berkas="${aman}" dan ganti=true.${pindah}`
    }
    await simpanDaftarSiswa(akar, siswa, aman.split("/").pop()!)
    return `Daftar Siswa ${lama ? "diganti" : "dibuat"}: ${ringkas(siswa)}.${pindah} Daftar hadir, buku nilai, dan penilaian kokurikuler berikutnya terisi nama otomatis. Sampaikan jumlahnya saja ke guru dan minta guru mengecek ${DAFTAR_SISWA} di Excel.`
  },
})
