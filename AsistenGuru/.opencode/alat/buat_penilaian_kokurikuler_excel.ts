import { existsSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { Gagal, bacaJson, daftar, jalurAman, muatDasar, slug, tulis } from "../lib/berkas.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { pastikanDaftarSiswa } from "../lib/siswa.ts"

const pesanNama = (h: { namaTerisi: number }, d: { baru?: string } | null) =>
  h.namaTerisi
    ? `Nama ${h.namaTerisi} siswa terisi otomatis dari Daftar Siswa${d?.baru ? ` (baru dibuat dari ${d.baru})` : ""}. Jangan menyebut atau meminta nama siswa di chat.`
    : "Daftar Siswa belum ada, jadi kolom nama kosong. Sampaikan ke guru: taruh ekspor Dapodik, format nilai e-Rapor, atau daftar hadir lama yang sudah berisi nama di folder guru\\masukan — nama akan terisi otomatis di semua Excel berikutnya. Jangan meminta guru mengetik nama di chat."

import { type Kokurikuler, penilaianKokurikulerXlsx } from "../lib/kokurikuler.ts"

export default alat<{ tema: string }>({
  nama: "buat_penilaian_kokurikuler_excel",
  deskripsi:
    "Membuat Excel penilaian satu kegiatan kokurikuler dari guru/data/kokurikuler-<tema>.json: kolom hasil asesmen per dimensi/subdimensi profil lulusan (pilihan SB/B/C/K, Mahir/Cakap/Berkembang, atau Terbiasa/Belum Terbiasa), catatan pendidik, lalu otomatis dimensi yang menguat, yang perlu penguatan, dan draf deskripsi rapor kokurikuler. Nama murid diketik guru sendiri di Excel. Tidak menimpa berkas lama.",
  masukan: {
    type: "object",
    properties: { tema: { type: "string", description: "Tema kegiatan (sesuai data kokurikuler yang sudah ditulis)" } },
    required: ["tema"],
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const { profil, kebijakan } = await muatDasar(akar)
    const ada = (await daftar(akar, "guru/data")).filter((f) => /^kokurikuler-.*\.json$/.test(f))
    const cari = slug(args.tema)
    // Nama berkas dibandingkan dalam bentuk slug supaya "kokurikuler-Sekolahku Bersih.json" tetap dikenali.
    const inti = (x: string) => slug(x.replace(/^kokurikuler-/, "").replace(/\.json$/, ""))
    const f = ada.find((x) => inti(x) === cari) ?? ada.find((x) => inti(x).includes(cari))
    if (!f)
      throw new Gagal(`Data kokurikuler "${args.tema}" belum ada di guru/data/. ${ada.length ? `Yang ada: ${ada.join(", ")}.` : ""} Tulis dulu sesuai skill kokurikuler (references/format-data.md).`)
    const k = await bacaJson<Kokurikuler>(akar, `guru/data/${f}`)
    const d = await pastikanDaftarSiswa(akar)
    const h = penilaianKokurikulerXlsx(profil, kebijakan, k, d?.siswa)
    const dasar = `hasil/${FOLDER.kokurikuler}/Penilaian Kokurikuler ${k.tema} Kelas ${k.kelas ?? profil.kelas}`
    let rel = `${dasar}.xlsx`
    for (let i = 2; existsSync(join(akar, jalurAman(rel))); i++) rel = `${dasar} (${i}).xlsx`
    rel = await tulis(akar, rel, h.data)
    return [
      `Selesai: ${rel} — ${h.dimensi} kolom dimensi, ${h.siswa} baris murid.`,
      pesanNama(h, d),
      h.perkiraanSiswa ? "Jumlah siswa belum diketahui, jadi dibuat 30 baris." : "",
      "Sampaikan ke guru: pilih hasil asesmen tiap dimensi; dimensi menguat, perlu penguatan, dan draf deskripsi rapor terisi otomatis untuk disalin ke kolom Kokurikuler di rapor.",
    ]
      .filter(Boolean)
      .join("\n")
  },
})
