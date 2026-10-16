import { copyFile, mkdir, readFile, rm } from "node:fs/promises"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { alat } from "../lib/alat.ts"
import { type Kebijakan, Gagal, bacaJson, bacaTeks, relatif, tulis } from "../lib/berkas.ts"
import { analisisDocx } from "../lib/docx.ts"
import { aturanSekolah, cariTemplate, kunciDokumen } from "../lib/gaya.ts"

const NAMA_BAKU: Record<string, string> = {
  lkpd: "LKPD", rpm: "RPM", rpp: "RPP", "modul-ajar": "Modul Ajar", soal: "Soal", "kunci-lkpd": "Kunci LKPD",
  "kunci-dan-penskoran": "Kunci dan Penskoran", "kisi-kisi": "Kisi-kisi", kktp: "KKTP", "jurnal-mengajar": "Jurnal Mengajar",
  atp: "ATP", prota: "Prota", promes: "Promes", "minggu-efektif": "Minggu Efektif",
}

function capWaktu() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

export default alat<{ berkas?: string; dokumen?: string; kerangka?: boolean; hapus?: boolean }>({
  nama: "simpan_template_word",
  deskripsi:
    "Menjadikan berkas Word (.docx) sebagai template guru untuk satu jenis dokumen, misalnya Word hasil asisten yang sudah diedit guru di Word ('pakai yang ini sebagai contoh'), atau format Word milik guru/sekolah yang ditaruh di folder guru. Ekspor berikutnya untuk jenis dokumen itu memakai gaya, kop/header, footer, dan ukuran halaman dari Word ini; isinya tetap dari draf. Juga menyimpan kerangka bagian (guru/template/<Dokumen>.md) yang diikuti saat menulis draf. `hapus`=true mengembalikan jenis dokumen itu ke format bawaan.",
  masukan: {
    type: "object",
    properties: {
      berkas: { type: "string", description: "Jalur .docx di folder AsistenGuru, misalnya 'hasil/2 Modul dan LKPD/Matematika TP7 Pecahan/LKPD.docx'" },
      dokumen: { type: "string", description: "Jenis dokumen, misalnya 'LKPD' atau 'RPM'. Kosong = ditebak dari nama berkas" },
      kerangka: { type: "boolean", description: "Simpan juga kerangka bagian dari Word ini (bawaan true)" },
      hapus: { type: "boolean", description: "true = hapus template guru untuk jenis dokumen ini" },
    },
    additionalProperties: false,
  },
  async jalankan(args, akar) {
    const kebijakan = await bacaJson<Kebijakan>(akar, "sekolah/kebijakan.json")
    const rel = args.berkas ? relatif(akar, args.berkas) : ""
    const kunci = kunciDokumen(args.dokumen || rel || "")
    if (!args.dokumen && !rel) throw new Gagal("Sebutkan berkas Word-nya, atau jenis dokumen yang template-nya mau dihapus.")
    const nama = NAMA_BAKU[kunci] ?? (args.dokumen?.trim() || rel.split("/").pop()!.replace(/\.docx$/i, ""))
    const tujuan = (ext: string) => `guru/template/${nama}.${ext}`

    const cadangkan = async () => {
      const ada = (["docx", "md"] as const).map((e) => join(akar, "guru/template", `${nama}.${e}`)).filter(existsSync)
      if (!ada.length) return null
      const folder = `guru/template/.lama/${capWaktu()} ${nama}`
      await mkdir(join(akar, folder), { recursive: true })
      for (const p of ada) await copyFile(p, join(akar, folder, p.split(/[\\/]/).pop()!))
      return { folder, ada }
    }

    if (args.hapus) {
      const c = await cadangkan()
      if (!c) return `Belum ada template guru untuk ${nama}.`
      for (const p of c.ada) await rm(p)
      return `Template guru untuk ${nama} dihapus (cadangan di ${c.folder}). Ekspor berikutnya memakai format ${(await cariTemplate(akar, kunci, "docx", kebijakan)) ? "sekolah" : "bawaan"}.`
    }

    if (!/\.docx$/i.test(rel)) throw new Gagal("Template harus berkas Word .docx (bukan .doc atau PDF). Di Word: File → Save As → Word Document (.docx).")
    if (rel.startsWith("..") || /^[a-z]:/i.test(rel) || rel.startsWith("/")) throw new Gagal("Berkas harus berada di dalam folder AsistenGuru. Salin dulu ke folder guru/.")
    if (!existsSync(join(akar, rel))) throw new Gagal(`Berkas ${rel} tidak ditemukan.`)
    if (/(^|\/)~\$/.test(rel)) throw new Gagal("Itu berkas sementara Word. Tutup Word lalu pilih berkas aslinya.")

    const sekolah = aturanSekolah(kebijakan)
    const wajib = await cariTemplate(akar, kunci, "docx", kebijakan)
    if (wajib?.asal === "sekolah (wajib)")
      throw new Gagal(`Sekolah mewajibkan template ${wajib.rel} untuk ${nama}, jadi template guru tidak bisa dipakai. Jika perlu, usulkan perubahan ke sekolah.`)

    const data = new Uint8Array(await readFile(join(akar, rel)))
    let a
    try {
      a = analisisDocx(data)
    } catch (e) {
      throw new Gagal(`Berkas ${rel} tidak bisa dibaca sebagai Word (${(e as Error).message}).`)
    }
    const c = await cadangkan()
    if (rel !== tujuan("docx")) await tulis(akar, tujuan("docx"), data)
    let infoKerangka = ""
    if (args.kerangka !== false) {
      const lama = await bacaTeks(akar, tujuan("md"))
      await tulis(akar, tujuan("md"), `<!-- Kerangka ${nama}, diambil dari ${rel}. Boleh diubah: asisten mengikuti jenis dan urutan bagian serta kolom tabel ini; judul khusus topik disesuaikan. -->\n${a.kerangka}`)
      infoKerangka = `Kerangka ${a.jumlahBagian} bagian disimpan di ${tujuan("md")}${lama ? " (menggantikan kerangka lama)" : ""}.`
    }
    return [
      `Template ${nama} tersimpan: ${tujuan("docx")}.`,
      `Yang dipakai dari Word ini: kertas ${a.kertas}${a.lanskap ? " lanskap" : ""}, margin atas ${a.margin.atas} / bawah ${a.margin.bawah} / kiri ${a.margin.kiri} / kanan ${a.margin.kanan} cm${a.huruf ? `, huruf ${a.huruf}${a.ukuran ? ` ${a.ukuran} pt` : ""}` : ""}${a.kopDiHeader ? ", kop/logo di header" : ""}.`,
      infoKerangka,
      c ? `Template lama dicadangkan di ${c.folder}.` : "",
      `Setiap ekspor ${nama} berikutnya memakai format ini; pengaturan "semua dokumen" tidak berlaku untuk ${nama}, tetapi pengaturan khusus ${nama} (atur_gaya dengan dokumen "${nama}") tetap bisa menimpanya. Ekspor ulang dokumen ${nama} terakhir supaya guru bisa melihat hasilnya.`,
      sekolah.dikunci.length ? `Catatan: bagian ${sekolah.dikunci.join(", ")} tetap mengikuti sekolah.` : "",
    ]
      .filter(Boolean)
      .join("\n")
  },
})
