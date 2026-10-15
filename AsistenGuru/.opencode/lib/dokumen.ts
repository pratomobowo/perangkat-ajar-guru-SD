// Menyimpan dokumen: Markdown (draf yang bisa direvisi asisten) di guru/draf/, Word rapi di hasil/.
// Kop sekolah, ukuran kertas, huruf, dan tanda tangan diambil dari sekolah/kebijakan.json dan guru/profil.json.

import { type Kebijakan, type Profil, tulis } from "./berkas.ts"
import { type JenisDokumen, type OpsiDokumen, buatDocx } from "./docx.ts"
import { NAMA_BULAN } from "./kalender.ts"

/** Subfolder hasil yang dilihat guru. */
export const FOLDER = {
  perencanaan: "1 Perencanaan",
  modul: "2 Modul dan LKPD",
  asesmen: "3 Asesmen",
  administrasi: "4 Administrasi",
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
  if (/(^|\/)(lkpd|soal|lembar)[^/]*$/.test(n)) return "lembar_siswa"
  return "dokumen_guru"
}

/**
 * Simpan satu dokumen. `sub` relatif terhadap folder hasil, misalnya "1 Perencanaan/Matematika 2026-2027/2 ATP".
 * Menghasilkan guru/draf/<sub>.md dan hasil/<sub>.docx.
 */
export async function simpanDokumen(akar: string, sub: string, md: string, opsi: OpsiDokumen, simpanMd = true) {
  if (simpanMd) await tulis(akar, `guru/draf/${sub}.md`, md)
  const { data, lanskap } = buatDocx(md, opsi)
  const docx = await tulis(akar, `hasil/${sub}.docx`, data)
  return { docx, lanskap }
}
