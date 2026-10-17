// Format Excel sekolah/guru untuk setiap Excel bawaan. Urutan: templat sekolah wajib > templat guru > templat sekolah >
// format bawaan. Templat disimpan sebagai sekolah/template/<Jenis>.xlsx atau guru/template/<Jenis>.xlsx (boleh khusus
// mapel, misalnya "Buku Nilai Matematika.xlsx").

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { type Kebijakan, type Profil, bacaJson } from "./berkas.ts"
import { tanggalPanjang } from "./dokumen.ts"
import { cariTemplate, kunciDokumen } from "./gaya.ts"
import { type DataTemplat, isiTemplat } from "./templatexcel.ts"

export const JENIS_EXCEL = ["Daftar Hadir", "Buku Nilai", "Penilaian Kokurikuler", "Analisis Butir Soal", "Administrasi Wali Kelas", "Kelompok", "Rekap Nilai"] as const
export type JenisExcel = (typeof JENIS_EXCEL)[number]

/** Templat Excel untuk jenis ini (yang khusus, misalnya "Buku Nilai Matematika", didahulukan). */
export async function templatExcel(akar: string, jenis: JenisExcel, khusus?: string | null) {
  const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
  for (const nama of [khusus ? `${jenis} ${khusus}` : null, jenis].filter((x): x is string => !!x)) {
    const t = await cariTemplate(akar, kunciDokumen(nama), "xlsx", kebijakan)
    if (t) return t
  }
  return null
}

/** Penanda umum yang bisa dipakai di templat mana pun: {{sekolah}}, {{kelas}}, {{nama_guru}}, {{tanggal}}, … */
export function penandaDasar(profil: Profil, kebijakan: Kebijakan): Record<string, string> {
  const p: Record<string, string | null | undefined> = {
    sekolah: kebijakan.nama_sekolah ?? profil.sekolah, alamat_sekolah: kebijakan.alamat_sekolah, kota: kebijakan.kota,
    kelas: String(profil.kelas ?? ""), rombel: profil.rombel ?? String(profil.kelas ?? ""), fase: profil.fase,
    tahun_ajaran: profil.tahun_ajaran, nama_guru: profil.nama_lengkap, nip: profil.nip,
    kepala_sekolah: kebijakan.kepala_sekolah?.nama, nip_kepala_sekolah: kebijakan.kepala_sekolah?.nip, tanggal: tanggalPanjang(),
  }
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== null && v !== undefined && v !== "")) as Record<string, string>
}

/** Mengisi templat lalu mengembalikan berkas dan kalimat ringkas untuk asisten (tanpa nama siswa). */
export async function isiDariTemplat(akar: string, t: { rel: string; asal: string }, data: DataTemplat) {
  const h = isiTemplat(new Uint8Array(await readFile(join(akar, t.rel))), data)
  const terisi = Object.entries(h.terisi)
  const pesan = [
    `Mengikuti format ${t.asal} (${t.rel}), bukan format bawaan.`,
    h.lembarTabel ? `${h.cocok} baris siswa terisi${h.tidakCocok ? `, ${h.tidakCocok} tidak cocok` : ""}${terisi.length ? ` (${terisi.map(([k, n]) => `${k} ${n} sel`).join("; ")})` : ""}.` : "",
    h.penanda ? `${h.penanda} penanda {{...}} terisi.` : "",
    h.kosong.length ? `Kolom yang diisi guru: ${h.kosong.join(", ")}.` : "",
    "Rumus dan tampilan format itu tidak diubah. Bila guru ingin kembali ke format bawaan: simpan_template_excel dengan hapus=true.",
  ].filter(Boolean).join(" ")
  return { data: h.data, pesan, hasil: h }
}
