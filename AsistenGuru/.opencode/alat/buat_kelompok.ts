import { existsSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type Kebijakan, type Profil, Gagal, bacaJson, jalurAman, tulis } from "../lib/berkas.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { tanggalIso } from "../lib/ingatan.ts"
import { muatData } from "../lib/analisis.ts"
import { pastikanDaftarSiswa } from "../lib/siswa.ts"
import { type Anggota, type CaraKelompok, bagiKelompok, kelompokXlsx, pengacak } from "../lib/walikelas.ts"

type Masukan = { judul?: string; jumlah_kelompok?: number; anggota_per_kelompok?: number; cara?: CaraKelompok; mapel?: string; kecuali?: number[] }
const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim()

export default alat<Masukan>({
  nama: "buat_kelompok",
  deskripsi:
    "Membagi siswa ke kelompok belajar dan membuat Excel siap cetak dengan nama terisi otomatis dari Daftar Siswa (asisten tidak melihat nama). `cara`: campur_jk (bawaan; acak dengan laki-laki/perempuan seimbang), acak, atau campur_nilai (tiap kelompok berisi siswa yang kuat dan yang perlu dibantu, dari buku nilai `mapel` yang sudah diisi; nilai tidak dicetak). Isi `jumlah_kelompok` atau `anggota_per_kelompok`. `kecuali` = nomor absen yang tidak hadir.",
  masukan: {
    type: "object",
    properties: {
      judul: { type: "string", description: 'Kegiatan, misalnya "Matematika - Pecahan Senilai"' },
      jumlah_kelompok: { type: "integer", minimum: 1, maximum: 20 },
      anggota_per_kelompok: { type: "integer", minimum: 2, maximum: 15 },
      cara: { type: "string", enum: ["campur_jk", "acak", "campur_nilai"] },
      mapel: { type: "string", description: "Wajib untuk campur_nilai" },
      kecuali: { type: "array", items: { type: "integer" }, description: "Nomor absen yang tidak ikut" },
    },
    additionalProperties: false,
  },
  async jalankan(a, akar) {
    const profil = await bacaJson<Profil>(akar, "guru/profil.json", "Profil guru belum ada. Jalankan skill guru-setup dulu (/mulai).")
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const d = await pastikanDaftarSiswa(akar)
    if (!d?.siswa.length)
      throw new Gagal("Daftar Siswa belum ada. Sampaikan ke guru: taruh ekspor Dapodik, format nilai e-Rapor, atau daftar hadir lama yang berisi nama di folder guru\\masukan, lalu bilang \"sudah\".")
    const keluar = new Set(a.kecuali ?? [])
    let anggota: Anggota[] = d.siswa.map((s, i) => ({ no: i + 1, nama: s.nama, jk: s.jk })).filter((x) => !keluar.has(x.no))
    const cara: CaraKelompok = a.cara ?? "campur_jk"
    let catatanNilai = ""
    if (cara === "campur_nilai") {
      if (!a.mapel) throw new Gagal("campur_nilai butuh `mapel` (buku nilai mana yang dipakai).")
      const buku = (await muatData(akar)).nilai.filter((b) => norm(b.mapel).includes(norm(a.mapel!)) || norm(a.mapel!).includes(norm(b.mapel)))
      if (!buku.length) throw new Gagal(`Buku nilai ${a.mapel} belum ada atau belum diisi. Pakai cara campur_jk/acak, atau isi buku nilai dulu.`)
      const nilai = new Map<string, number[]>()
      for (const b of buku) for (const r of b.baris) {
        const v = [...r.tp, r.sts, r.sas].filter((x): x is number => typeof x === "number")
        if (v.length) nilai.set(norm(r.nama), [...(nilai.get(norm(r.nama)) ?? []), ...v])
      }
      anggota = anggota.map((x) => { const v = nilai.get(norm(x.nama)); return { ...x, nilai: v?.length ? v.reduce((p, q) => p + q, 0) / v.length : null } })
      const ada = anggota.filter((x) => typeof x.nilai === "number").length
      if (!ada) throw new Gagal(`Buku nilai ${a.mapel} belum berisi nilai. Pakai cara campur_jk/acak.`)
      catatanNilai = ` Nilai dari ${buku.length} buku nilai ${a.mapel}; ${ada} dari ${anggota.length} siswa punya nilai${ada < anggota.length ? " (sisanya dibagi ke kelompok terkecil)" : ""}.`
    }
    const k = a.jumlah_kelompok ?? Math.max(1, Math.round(anggota.length / (a.anggota_per_kelompok ?? 4)))
    const g = bagiKelompok(anggota, k, cara, pengacak())
    const judul = (a.judul ?? "Kerja Kelompok").trim()
    const dasar = `hasil/${FOLDER.administrasi}/Kelompok ${judul} ${tanggalIso()}`
    let rel = `${dasar}.xlsx`
    for (let i = 2; existsSync(join(akar, jalurAman(rel))); i++) rel = `${dasar} (${i}).xlsx`
    rel = await tulis(akar, rel, kelompokXlsx(profil, kebijakan, g, judul, cara))
    const rangkum = g.map((x, i) => {
      const l = x.filter((y) => y.jk === "L").length, p = x.filter((y) => y.jk === "P").length
      const v = x.map((y) => y.nilai).filter((y): y is number => typeof y === "number")
      return `K${i + 1}: ${x.length} siswa${l + p ? ` (L ${l}, P ${p})` : ""}${cara === "campur_nilai" && v.length ? `, rata-rata ${Math.round(v.reduce((s, y) => s + y, 0) / v.length)}` : ""}`
    })
    return [
      `Selesai: ${rel}. ${g.length} kelompok dari ${anggota.length} siswa${keluar.size ? ` (${keluar.size} tidak ikut)` : ""}.${catatanNilai}`,
      rangkum.join("; "),
      "Sampaikan jumlah kelompok dan anggotanya saja (tanpa nama, tanpa nilai). Guru bisa memindah nama langsung di Excel. Minta ulang bila ingin hasil acak yang lain.",
    ].join("\n")
  },
})
