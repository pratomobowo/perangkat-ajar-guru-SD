import { existsSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { isiDariTemplat, penandaDasar, templatExcel } from "../lib/formatexcel.ts"
import { type Kebijakan, type Profil, Gagal, bacaJson, jalurAman, tulis } from "../lib/berkas.ts"
import { FOLDER } from "../lib/dokumen.ts"
import { pastikanDaftarSiswa } from "../lib/siswa.ts"
import { KESEPAKATAN_BAWAAN, type UrutanDuduk, paketWaliKelasXlsx, susunanWaliKelas } from "../lib/walikelas.ts"

type Masukan = { urutan_duduk?: UrutanDuduk; kolom_meja?: number; per_meja?: 1 | 2; jabatan?: string[]; kesepakatan?: string[] }

export default alat<Masukan>({
  nama: "buat_administrasi_wali_kelas",
  deskripsi:
    "Membuat Excel administrasi wali kelas dengan nama siswa terisi otomatis dari Daftar Siswa (asisten tidak melihat nama): struktur organisasi kelas (nama dipilih guru dari daftar), jadwal piket (dibagi rata per hari sekolah, laki-laki dan perempuan bercampur), denah tempat duduk, dan kesepakatan kelas. Semua bisa diubah guru di Excel. `urutan_duduk`: absen (bawaan) / acak / selang_jk (laki-laki dan perempuan berselang). `kesepakatan`: kalimat kesepakatan kelas dari guru (bawaan: 10 kalimat positif). `jabatan`: daftar jabatan pengganti bawaan.",
  masukan: {
    type: "object",
    properties: {
      urutan_duduk: { type: "string", enum: ["absen", "acak", "selang_jk"] },
      kolom_meja: { type: "integer", minimum: 1, maximum: 6, description: "Jumlah meja ke samping per baris (bawaan 4)" },
      per_meja: { type: "integer", enum: [1, 2], description: "Siswa per meja (bawaan 2)" },
      jabatan: { type: "array", items: { type: "string" } },
      kesepakatan: { type: "array", items: { type: "string" } },
    },
    additionalProperties: false,
  },
  async jalankan(a, akar) {
    const profil = await bacaJson<Profil>(akar, "guru/profil.json", "Profil guru belum ada. Jalankan skill guru-setup dulu (/mulai).")
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const d = await pastikanDaftarSiswa(akar)
    if (!d?.siswa.length)
      throw new Gagal("Daftar Siswa belum ada, padahal semua lembar ini berisi nama. Sampaikan ke guru: taruh ekspor Dapodik, format nilai e-Rapor, atau daftar hadir lama yang berisi nama di folder guru\\masukan, lalu bilang \"sudah\". Jangan meminta guru mengetik nama di chat.")
    const dasar = `hasil/${FOLDER.administrasi}/Administrasi Wali Kelas ${profil.rombel ?? profil.kelas} ${(profil.tahun_ajaran ?? "").replace("/", "-")}`.trim()
    let rel = `${dasar}.xlsx`
    for (let i = 2; existsSync(join(akar, jalurAman(rel))); i++) rel = `${dasar} (${i}).xlsx`
    // Format sekolah/guru didahulukan: tabel berkolom NAMA diisi, dan penanda {{nama_n}}, {{duduk_n}}, {{piket_senin}},
    // {{kesepakatan_n}} untuk denah/struktur/piket berformat bebas.
    const t = await templatExcel(akar, "Administrasi Wali Kelas")
    if (t) {
      const su = susunanWaliKelas(profil, d.siswa, { urutanDuduk: a.urutan_duduk })
      const penanda: Record<string, string> = { ...penandaDasar(profil, kebijakan), ...su.penanda }
      ;(a.kesepakatan?.length ? a.kesepakatan : KESEPAKATAN_BAWAAN).forEach((k, i) => (penanda[`kesepakatan_${i + 1}`] = k))
      const r = await isiDariTemplat(akar, t, { siswa: d.siswa, penanda })
      rel = await tulis(akar, rel, r.data)
      return [`Selesai: ${rel} (${d.siswa.length} siswa).`, r.pesan, `Penanda tersedia: {{nama_1}}…, {{duduk_1}}… (urut ${a.urutan_duduk ?? "absen"}), ${su.hari.map((h) => `{{piket_${h.toLowerCase()}}}`).join(", ")}, {{kesepakatan_1}}….`, "Jangan menyebut nama siswa."].join("\n")
    }
    const h = paketWaliKelasXlsx(profil, kebijakan, d.siswa, { urutanDuduk: a.urutan_duduk, kolomMeja: a.kolom_meja, perMeja: a.per_meja, jabatan: a.jabatan, kesepakatan: a.kesepakatan })
    rel = await tulis(akar, rel, h.data)
    return [
      `Selesai: ${rel} (${h.jumlah} siswa${d.baru ? `; Daftar Siswa baru dibuat dari ${d.baru}` : ""}).`,
      `Isi: Struktur Organisasi (${h.jabatan} jabatan + wali kelas; nama dipilih guru lewat tanda panah di sel), Jadwal Piket (${h.hari.map((x, i) => `${x} ${h.piket[i]}`).join(", ")} siswa), Denah Tempat Duduk (${h.meja} meja: ${h.barisMeja} baris × ${h.kolomMeja}, ${h.perMeja} per meja, urut ${a.urutan_duduk ?? "absen"}), Kesepakatan Kelas.`,
      "Sampaikan ke guru: semua nama dan kalimat bisa diubah langsung di Excel, lalu cetak tiap lembar. Jangan menyebut nama siswa.",
    ].join("\n")
  },
})
