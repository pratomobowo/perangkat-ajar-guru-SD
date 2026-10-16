import { existsSync } from "node:fs"
import { readdir, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type Kebijakan, Gagal, bacaJson, bacaTeks, tulis } from "../lib/berkas.ts"
import { type BerkasGaya, BAGIAN_GAYA, aturanSekolah, bacaBerkasGaya, gabung, kunciDokumen, rapikanGaya, uraiGaya } from "../lib/gaya.ts"

const RIWAYAT = "guru/.riwayat-gaya"
const SIMPAN_RIWAYAT = 20

function tanggal() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return { hari: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, cap: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${String(d.getMilliseconds()).padStart(3, "0")}` }
}

async function catatRiwayat(akar: string, baris: string) {
  const lama = (await bacaTeks(akar, "guru/riwayat-perubahan.md")) ?? "# Riwayat Perubahan\n"
  await tulis(akar, "guru/riwayat-perubahan.md", `${lama.replace(/\n*$/, "\n")}${tanggal().hari} | gaya | ${baris}\n`)
}

async function daftarTemplate(akar: string, folder: string) {
  const p = join(akar, folder)
  if (!existsSync(p)) return []
  return (await readdir(p)).filter((f) => /\.(md|docx)$/i.test(f) && !f.startsWith("~$") && !f.startsWith("."))
}

export default alat<{ dokumen?: string; ubah?: Record<string, unknown>; hapus?: string[]; kembalikan?: boolean }>({
  nama: "atur_gaya",
  deskripsi:
    "Melihat atau mengubah gaya tampilan Word milik guru, untuk semua dokumen atau satu jenis dokumen (LKPD, RPM, Soal, Kunci LKPD, Jurnal Mengajar, ATP, ...). Disimpan di guru/gaya-dokumen.json dan dipakai otomatis oleh setiap ekspor berikutnya. Tanpa ubah/hapus/kembalikan: tampilkan pengaturan yang berlaku dan template yang ada. `ubah` berisi bagian yang diubah saja: huruf, ukuran (pt), spasi, rata (kiri/kanan-kiri), kertas (A4/F4), orientasi, margin {atas,bawah,kiri,kanan dalam cm}, kop {tampil, baris_tambahan[]}, judul {ukuran, rata, kapital}, tabel {warna_kepala, ukuran}, ttd {tampil, kepala_sekolah}, nomor_halaman {tampil, format}. `hapus` mengembalikan bagian tertentu ke bawaan. `kembalikan`=true membatalkan perubahan gaya terakhir.",
  masukan: {
    type: "object",
    properties: {
      dokumen: { type: "string", description: "'semua' (bawaan) atau nama jenis dokumen, misalnya 'LKPD', 'RPM', 'Soal'" },
      ubah: { type: "object", description: "Bagian gaya yang diubah, misalnya {\"huruf\":\"Times New Roman\",\"ukuran\":12,\"margin\":{\"kiri\":3}}" },
      hapus: { type: "array", items: { type: "string" }, description: "Nama bagian yang dikembalikan ke bawaan, misalnya [\"margin\"]; [\"semua\"] = hapus semua pengaturan untuk dokumen ini" },
      kembalikan: { type: "boolean", description: "true = batalkan perubahan gaya terakhir" },
    },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const sekolah = aturanSekolah(kebijakan)
    const lingkup = !args.dokumen || /^(semua|semua dokumen|all)$/i.test(args.dokumen.trim()) ? "semua" : kunciDokumen(args.dokumen)
    const label = lingkup === "semua" ? "semua dokumen" : lingkup

    if (args.kembalikan) {
      const p = join(akar, RIWAYAT)
      const ada = existsSync(p) ? (await readdir(p)).filter((f) => f.endsWith(".json")).sort() : []
      if (!ada.length) throw new Gagal("Belum ada perubahan gaya yang bisa dibatalkan.")
      const terakhir = ada[ada.length - 1]
      await tulis(akar, "guru/gaya-dokumen.json", await readFile(join(p, terakhir), "utf8"))
      await rm(join(p, terakhir))
      await catatRiwayat(akar, "semua | perubahan gaya terakhir dibatalkan")
      return "Perubahan gaya terakhir dibatalkan. Ekspor ulang dokumen supaya tampilannya kembali."
    }

    const berkas: BerkasGaya = await bacaBerkasGaya(akar)
    const ambil = () => (lingkup === "semua" ? (berkas.semua ?? {}) : (berkas.per_dokumen?.[lingkup] ?? {}))
    const simpan = async (baru: any, uraian: string) => {
      // Simpan versi sebelumnya supaya bisa dibatalkan.
      const sebelum = (await bacaTeks(akar, "guru/gaya-dokumen.json")) ?? "{}"
      await tulis(akar, `${RIWAYAT}/${tanggal().cap}.json`, sebelum)
      const p = join(akar, RIWAYAT)
      const semua = (await readdir(p)).filter((f) => f.endsWith(".json")).sort()
      for (const f of semua.slice(0, Math.max(0, semua.length - SIMPAN_RIWAYAT))) await rm(join(p, f))
      if (lingkup === "semua") berkas.semua = baru
      else berkas.per_dokumen = { ...(berkas.per_dokumen ?? {}), [lingkup]: baru }
      if (berkas.per_dokumen && !Object.keys(berkas.per_dokumen[lingkup] ?? {}).length) delete berkas.per_dokumen[lingkup]
      await tulis(akar, "guru/gaya-dokumen.json", JSON.stringify(berkas, null, 2) + "\n")
      await catatRiwayat(akar, `${label} | ${uraian}`)
    }

    if (args.hapus?.length) {
      const sekarang: any = { ...ambil() }
      if (args.hapus.includes("semua")) for (const k of Object.keys(sekarang)) delete sekarang[k]
      else for (const k of args.hapus) {
        if (!BAGIAN_GAYA.includes(k as any)) throw new Gagal(`"${k}" bukan pengaturan yang dikenal.`)
        delete sekarang[k]
      }
      await simpan(sekarang, `dikembalikan ke bawaan: ${args.hapus.join(", ")}`)
      if (!args.ubah) return `Pengaturan ${args.hapus.join(", ")} untuk ${label} dikembalikan ke bawaan. Ekspor ulang dokumen untuk melihat hasilnya.`
    }

    if (args.ubah && Object.keys(args.ubah).length) {
      const ubah = rapikanGaya(args.ubah)
      const terkunci = Object.keys(ubah).filter((k) => sekolah.dikunci.includes(k))
      if (terkunci.length)
        throw new Gagal(`Bagian ${terkunci.join(", ")} sudah ditetapkan sekolah dan tidak bisa diubah guru. Jika perlu, usulkan ke sekolah (skill umpan-balik-guru).`)
      await simpan(gabung(ambil(), ubah), uraiGaya(ubah).join(", ") || Object.keys(ubah).join(", "))
      return [
        `Tersimpan untuk ${label}: ${uraiGaya(ubah).join(", ")}.`,
        "Berlaku untuk setiap ekspor berikutnya. Ekspor ulang dokumen terakhir supaya guru bisa melihat hasilnya.",
        "Jika keliru, perubahan bisa dibatalkan (atur_gaya dengan kembalikan=true).",
      ].join("\n")
    }

    // Lihat pengaturan.
    const tg = await daftarTemplate(akar, "guru/template")
    const ts = await daftarTemplate(akar, "sekolah/template")
    const baris = ["Gaya dokumen yang berlaku:"]
    if (Object.keys(sekolah.gaya).length) baris.push(`- Sekolah: ${uraiGaya(sekolah.gaya).join(", ") || "(ada)"}`)
    if (sekolah.dikunci.length) baris.push(`- Dikunci sekolah (tidak bisa diubah guru): ${sekolah.dikunci.join(", ")}`)
    baris.push(`- Semua dokumen (guru): ${uraiGaya(berkas.semua ?? {}).join(", ") || "bawaan"}`)
    for (const [k, g] of Object.entries(berkas.per_dokumen ?? {})) baris.push(`- ${k} (guru): ${uraiGaya(g).join(", ")}`)
    baris.push(`- Template guru: ${tg.length ? tg.join(", ") : "belum ada"}`)
    baris.push(`- Template sekolah${sekolah.templateWajib ? " (wajib)" : ""}: ${ts.length ? ts.join(", ") : "belum ada"}`)
    return baris.join("\n")
  },
})
