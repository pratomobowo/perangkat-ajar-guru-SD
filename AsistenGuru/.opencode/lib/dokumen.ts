// Menyimpan dokumen: Markdown (draf yang bisa direvisi asisten) di guru/draf/, Word rapi di hasil/.
// Kop sekolah, ukuran kertas, huruf, dan tanda tangan diambil dari sekolah/kebijakan.json dan guru/profil.json.

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { type Kebijakan, type Profil, bacaJson, bacaTeks, tulis } from "./berkas.ts"
import { type JenisDokumen, type OpsiDokumen, bagianHilang, buatDocx } from "./docx.ts"
import { cariTemplate, gayaEfektif, kunciDokumen, uraiGaya } from "./gaya.ts"
import { NAMA_BULAN } from "./kalender.ts"

/** Subfolder hasil yang dilihat guru. */
export const FOLDER = {
  perencanaan: "1 Perencanaan",
  modul: "2 Modul dan LKPD",
  asesmen: "3 Asesmen",
  administrasi: "4 Administrasi",
  kokurikuler: "5 Kokurikuler",
  sekolah: "6 Dokumen Sekolah",
} as const

export function tanggalPanjang(d = new Date()): string {
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth() + 1]} ${d.getFullYear()}`
}

export function opsiDokumen(profil: Profil, kebijakan: Kebijakan, jenis: JenisDokumen = "dokumen_guru"): OpsiDokumen {
  return {
    jenis,
    kertas: kebijakan.kertas === "F4" ? "F4" : "A4",
    huruf: kebijakan.huruf ?? undefined,
    kop: { sekolah: kebijakan.nama_sekolah ?? profil.sekolah ?? null, alamat: kebijakan.alamat_sekolah ?? null },
    ttd: {
      kota: kebijakan.kota ?? null,
      tanggal: tanggalPanjang(),
      kepala: { nama: kebijakan.kepala_sekolah?.nama ?? null, nip: kebijakan.kepala_sekolah?.nip ?? null },
      guru: { nama: profil.nama_lengkap ?? null, nip: profil.nip ?? null, jabatan: `Guru Kelas ${profil.kelas}` },
    },
  }
}

/** Menebak jenis dokumen dari nama berkas: LKPD/Soal = lembar siswa, Kunci = kunci guru, lainnya dokumen guru. */
export function tebakJenis(nama: string): JenisDokumen {
  const n = nama.toLowerCase()
  if (n.includes("kunci")) return "kunci"
  if (/(^|\/)(lkpd|soal|lembar|media|kartu)[^/]*$/.test(n)) return "lembar_siswa"
  return "dokumen_guru"
}

/**
 * Simpan satu dokumen. `sub` relatif terhadap folder hasil, misalnya "1 Perencanaan/Matematika 2026-2027/2 ATP".
 * Menghasilkan guru/draf/<sub>.md dan hasil/<sub>.docx. Gaya guru/sekolah, Word contoh, dan kerangka untuk jenis
 * dokumen ini (lib/gaya.ts) diterapkan otomatis; `catatan` menjelaskannya untuk disampaikan ke guru.
 */
export async function simpanDokumen(akar: string, sub: string, md: string, opsi: OpsiDokumen, simpanMd = true) {
  if (simpanMd) await tulis(akar, `guru/draf/${sub}.md`, md)
  const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
  const kunci = kunciDokumen(sub)
  const contoh = await cariTemplate(akar, kunci, "docx", kebijakan)
  const { gaya, asal } = await gayaEfektif(akar, kunci, kebijakan, !!contoh)
  const catatan: string[] = []
  const o: OpsiDokumen = { ...opsi, gaya }
  if (asal.length) catatan.push(`Gaya: ${asal.join(" + ")}${uraiGaya(gaya).length ? ` (${uraiGaya(gaya).join(", ")})` : ""}.`)

  if (contoh) {
    o.dasar = new Uint8Array(await readFile(join(akar, contoh.rel)))
    catatan.push(`Memakai Word contoh ${contoh.asal}: ${contoh.rel}.`)
  }
  const kerangka = await cariTemplate(akar, kunci, "md", kebijakan)
  if (kerangka) {
    const hilang = bagianHilang(md, (await bacaTeks(akar, kerangka.rel)) ?? "")
    if (hilang.length) catatan.push(`Bagian di kerangka ${kerangka.rel} yang belum ada di draf: ${hilang.join("; ")}. Lengkapi draf lalu ekspor ulang.`)
  }

  let hasil: ReturnType<typeof buatDocx>
  try {
    hasil = buatDocx(md, o)
  } catch (e) {
    if (!o.dasar) throw e
    hasil = buatDocx(md, { ...o, dasar: undefined })
    catatan.push(`Word contoh tidak bisa dipakai (${(e as Error).message}); memakai format bawaan.`)
  }
  if (hasil.dasar?.kopDariHeader) catatan.push("Kop diambil dari header Word contoh.")
  const docx = await tulis(akar, `hasil/${sub}.docx`, hasil.data)
  return { docx, lanskap: hasil.lanskap, catatan }
}
