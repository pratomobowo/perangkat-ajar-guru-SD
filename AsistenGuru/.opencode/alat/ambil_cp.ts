import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type Profil, Gagal, bacaJson, bacaTeks, frontmatter, slug, tulis } from "../lib/berkas.ts"
import { CP_URL, MAPEL_CP, cpMd, judulKapital, kodeCp, uraiCp } from "../lib/cp.ts"
import { teksPdfData } from "../lib/pustaka.ts"
import { ambil } from "../lib/riset.ts"

const CACHE = "guru/.cache/cp-046-H-KR-2025.pdf"

export default alat<{ mapel: string; fase?: string; perbarui?: boolean }>({
  nama: "ambil_cp",
  deskripsi:
    "Mengambil Capaian Pembelajaran (CP) resmi satu mapel dan fase dari PDF Keputusan Kepala BSKAP No. 046/H/KR/2025 (situs kurikulum.kemendikdasmen.go.id), lalu menyimpannya di guru/referensi/cp/<kode>-fase-<fase>.md dengan daftar elemen, sumber, dan halaman. Dipakai jika CP sekolah (sekolah/referensi/cp/) belum ada atau masih kosong. Status hasilnya OTOMATIS-RESMI: dokumen perencanaan tetap berlabel DRAF sampai operator/guru mencocokkan dan mengubah status menjadi TERVERIFIKASI. CP Pendidikan Agama tidak didukung.",
  masukan: {
    type: "object",
    properties: {
      mapel: { type: "string", description: "Nama atau kode mapel, misalnya 'matematika', 'IPAS', 'pendidikan pancasila'" },
      fase: { type: "string", enum: ["A", "B", "C", "a", "b", "c"], description: "Kosongkan untuk fase di profil guru" },
      perbarui: { type: "boolean", description: "true = ambil ulang walaupun berkas CP guru sudah ada" },
    },
    required: ["mapel"],
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const profil = await bacaJson<Profil>(akar, "guru/profil.json")
    const fase = (args.fase ?? profil.fase ?? "").toUpperCase()
    if (!/^[ABC]$/.test(fase)) throw new Gagal("Sebutkan fase A, B, atau C (atau lengkapi profil guru).")
    const kode = kodeCp(args.mapel)
    // Nama berkas mengikuti kode mapel di profil (dipakai susun_perencanaan), jika mapel itu ada di profil.
    const diProfil = (profil.mapel ?? []).find((m) => { try { return kodeCp(m.kode ?? m.nama) === kode } catch { return false } })
    const kodeBerkas = diProfil ? slug(diProfil.kode ?? diProfil.nama) : kode
    const sekolahRel = `sekolah/referensi/cp/${kodeBerkas}-fase-${fase.toLowerCase()}.md`
    const guruRel = `guru/referensi/cp/${kodeBerkas}-fase-${fase.toLowerCase()}.md`

    const sekolah = await bacaTeks(akar, sekolahRel)
    if (sekolah && frontmatter(sekolah).status && frontmatter(sekolah).status !== "BELUM-TERISI")
      return `CP dari sekolah sudah ada (${sekolahRel}, status ${frontmatter(sekolah).status}) dan selalu diutamakan. Tidak perlu mengambil otomatis.`
    if (!args.perbarui && existsSync(join(akar, guruRel)))
      return `CP sudah ada di ${guruRel}. Panggil dengan perbarui=true untuk mengambil ulang.`

    let data: Uint8Array
    if (existsSync(join(akar, CACHE))) data = new Uint8Array(await readFile(join(akar, CACHE)))
    else {
      const r = await ambil(CP_URL, 300000)
      if (r.jenis !== "pdf" || !r.data || new TextDecoder().decode(r.data.subarray(0, 5)) !== "%PDF-")
        throw new Gagal("Dokumen CP resmi tidak bisa diunduh dari kurikulum.kemendikdasmen.go.id. Periksa internet lalu coba lagi.")
      data = r.data
      await tulis(akar, CACHE, data)
    }
    // Ekstrak hanya sekitar halaman mapel itu; jika judulnya bergeser, ekstrak seluruh dokumen.
    const mulai = MAPEL_CP[kode].halaman
    let hasil
    try {
      hasil = uraiCp(await teksPdfData(data, "CP 046/H/KR/2025", Math.max(1, mulai - 5), mulai + 45), kode, fase, mulai)
    } catch (e) {
      if (!(e instanceof Gagal) || /tidak memuat/.test(e.message)) throw e
      hasil = uraiCp(await teksPdfData(data, "CP 046/H/KR/2025"), kode, fase)
    }
    const d = new Date()
    const tgl = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    const rel = await tulis(akar, guruRel, cpMd(hasil, tgl))
    return [
      `CP ${judulKapital(hasil.mapel)} Fase ${hasil.fase} tersimpan: ${rel} (halaman PDF ${hasil.halaman[0]}–${hasil.halaman[1]}).`,
      `Elemen: ${hasil.elemen.map((e) => e.nama).join("; ")}.`,
      ...hasil.catatan.map((c) => `Catatan: ${c}`),
      "Status OTOMATIS-RESMI: dokumen perencanaan berlabel DRAF sampai CP dicocokkan dengan dokumen resmi dan statusnya diubah menjadi TERVERIFIKASI. Sampaikan ini ke guru.",
    ].join("\n")
  },
})
