import { existsSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type ATP, Gagal, bacaJson, cariMapel, jalurAman, muatDasar, slug, tulis } from "../lib/berkas.ts"
import { type KKTP, nilaiXlsx } from "../lib/administrasi.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { pastikanDaftarSiswa } from "../lib/siswa.ts"

const pesanNama = (h: { namaTerisi: number }, d: { baru?: string } | null) =>
  h.namaTerisi
    ? `Nama ${h.namaTerisi} siswa terisi otomatis dari Daftar Siswa${d?.baru ? ` (baru dibuat dari ${d.baru})` : ""}. Jangan menyebut atau meminta nama siswa di chat.`
    : "Daftar Siswa belum ada, jadi kolom nama kosong. Sampaikan ke guru: taruh ekspor Dapodik, format nilai e-Rapor, atau daftar hadir lama yang sudah berisi nama di folder guru\\masukan — nama akan terisi otomatis di semua Excel berikutnya. Jangan meminta guru mengetik nama di chat."


export default alat<{ mapel: string; semester: number }>({
  nama: "buat_nilai_excel",
  deskripsi:
    "Membuat berkas Excel buku nilai satu mapel per semester: kolom per TP (dari data ATP), STS, SAS, rumus rata-rata formatif, nilai rapor berbobot, serta TP tertinggi/terendah untuk deskripsi rapor. Nama siswa dikosongkan untuk diketik guru. Butuh data ATP (guru/data/atp-<mapel>.json). Tidak pernah menimpa berkas yang sudah ada.",
  masukan: {
    type: "object",
    properties: {
      mapel: { type: "string", description: "Nama atau kode mapel" },
      semester: { type: "integer", minimum: 1, maximum: 2 },
    },
    required: ["mapel", "semester"],
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const semester = Number(args.semester)
    if (semester !== 1 && semester !== 2) throw new Gagal("Semester harus 1 atau 2.")
    const { profil, kebijakan } = await muatDasar(akar)
    const mapel = cariMapel(profil, args.mapel)
    const kode = slug(mapel.kode ?? mapel.nama)
    const atp = await bacaJson<ATP>(
      akar,
      `guru/data/atp-${kode}.json`,
      `Data ATP ${mapel.nama} belum ada, jadi kolom TP belum bisa dibuat. Buat perencanaan dulu (skill perencanaan-tahunan).`,
    )
    const kktp = await bacaJson<KKTP>(akar, `guru/data/kktp-${kode}.json`)
    const d = await pastikanDaftarSiswa(akar)
    const h = nilaiXlsx(profil, kebijakan, atp, mapel.nama, semester, Object.keys(kktp).length ? kktp : null, d?.siswa)
    const dasar = `hasil/${FOLDER.administrasi}/Buku Nilai ${mapel.nama} Kelas ${profil.kelas} Semester ${semester} ${profil.tahun_ajaran.replace("/", "-")}`
    let rel = `${dasar}.xlsx`
    for (let i = 2; existsSync(join(akar, jalurAman(rel))); i++) rel = `${dasar} (${i}).xlsx`
    rel = await tulis(akar, rel, h.data)
    return [
      `Selesai: ${rel} — ${h.tp} kolom TP, ${h.siswa} baris siswa.`,
      h.bobotSekolah ? "" : "Bobot nilai rapor memakai bawaan 50/25/25 (formatif/STS/SAS) karena sekolah belum menetapkan; sampaikan sebagai [PERLU GURU].",
      pesanNama(h, d),
      h.perkiraanSiswa ? "Jumlah siswa belum diketahui, jadi dibuat 30 baris." : "",
      h.kktpTp ? `Batas tuntas ${h.kktpTp} dari ${h.tp} TP diambil dari KKTP; kolom TP Belum Tuntas menandai TP yang perlu remedial tiap murid.` : `KKTP belum ada untuk TP semester ini (guru/data/kktp-${kode}.json); batas tuntas memakai kebijakan sekolah bila ada. Tawarkan membuat KKTP (skill asesmen).`,
    ]
      .filter(Boolean)
      .join("\n")
  },
})
