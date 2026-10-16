// Pendamping PPG (Pendidikan Profesi Guru) bagi Guru Tertentu: pemeriksaan perangkat Ujian Kinerja terhadap ruang
// lingkup penilaian UKPPPG, dan checklist berkas sesuai Petunjuk Teknis UKPPPG bagi Guru Tertentu Tahun 2026
// (Direktorat PPG, Kemendikdasmen). Juknis: perangkat disiapkan khusus untuk ujian dan berasal dari pengembangan sendiri,
// peserta menandatangani pakta integritas — asisten mendampingi, guru yang mengembangkan.

import { bagianHilang } from "./docx.ts"
import { KERANGKA_BSKAP } from "./dokumen.ts"

export const SUMBER_JUKNIS = "Petunjuk Teknis UKPPPG bagi Guru Tertentu Tahun 2026, Direktorat Pendidikan Profesi Guru, Kemendikdasmen"

/** Ruang lingkup penilaian Ujian Kinerja (Juknis hlm. 9) dan penanda yang dicari di rencana pembelajaran. */
export const ASPEK_UKIN: { kode: string; nama: string; cari: RegExp[]; saran: string }[] = [
  { kode: "a", nama: "Ketepatan alur dan tahapan pembelajaran", cari: [/\b(awal|pembuka|pendahuluan)\b/i, /\b(inti|memahami|mengaplikasi)\b/i, /\b(penutup|merefleksi)\b/i], saran: "tuliskan tahap awal, inti (memahami–mengaplikasi), dan penutup/merefleksi dengan menitnya" },
  { kode: "b", nama: "Kesesuaian pembelajaran dengan rencana", cari: [/tujuan (pembelajaran|belajar)/i, /(menyampaikan|menjelaskan|mengomunikasikan|menuliskan|menyebutkan).{0,30}(tujuan|\bTP\b)/i], saran: "di tahap awal, guru menyampaikan tujuan pembelajaran kepada murid; kegiatan inti merujuk TP yang sama" },
  { kode: "c", nama: "Penguasaan bahan ajar yang disampaikan secara jelas", cari: [/\b(materi|konsep|penjelasan|bahan ajar|contoh)\b/i], saran: "tuliskan konsep kunci, contoh, dan cara guru menjelaskannya (bukan hanya judul materi); cantumkan sumber" },
  { kode: "d", nama: "Kualitas interaksi dengan siswa", cari: [/(tanya jawab|diskusi|bertanya|pertanyaan pemantik|berkelompok|kelompok|berpasangan|presentasi)/i], saran: "rencanakan pertanyaan pemantik, diskusi kelompok/berpasangan, dan kesempatan murid bertanya atau menyampaikan pendapat" },
  { kode: "e", nama: "Penggunaan media atau alat bantu pembelajaran yang tepat", cari: [/(media|alat peraga|peraga|kartu|gambar|benda konkret|video|proyektor|papan|lkpd)/i], saran: "sebut media/alat peraga yang dipakai di langkah mana dan untuk apa" },
  { kode: "f", nama: "Perlakuan yang tepat kepada siswa yang menunjukkan perilaku yang semestinya", cari: [/(kesepakatan|menyepakati|aturan (kelas|kelompok|main)|apresiasi|pujian|memuji|penguatan positif|tanda perhatian|ice breaking|tepuk|mengelola kelas|pengelolaan kelas|menegur|teguran|mengarahkan kembali|kurang fokus|perilaku)/i], saran: "tuliskan kesepakatan kelas di awal, cara memberi apresiasi/penguatan positif, dan cara mengarahkan kembali murid yang kurang fokus" },
  { kode: "g", nama: "Evaluasi dan umpan balik di akhir pembelajaran", cari: [/(umpan balik|evaluasi|asesmen|penilaian|kuis|refleksi)/i], saran: "di akhir pembelajaran: asesmen singkat (kuis/exit ticket), umpan balik ke murid, dan refleksi bersama" },
]

/** Bagian langkah pembelajaran (kalau ada) — tempat aspek dicari; selain itu seluruh dokumen. */
function bagianLangkah(md: string): string {
  const m = md.match(/^##\s+(Langkah Pembelajaran|Kegiatan Pembelajaran|Pengalaman Belajar)[\s\S]*?(?=^##\s|$(?![\s\S]))/im)
  return m ? m[0] : md
}

/** Total menit yang direncanakan: dari judul pertemuan "(2 × 35 menit)" atau jumlah "(N menit)" tiap tahap. */
export function menitRencana(md: string): { total: number | null; cara: string } {
  const langkah = bagianLangkah(md)
  const kali = [...langkah.matchAll(/(\d+)\s*[x×]\s*(\d+)\s*menit/gi)].map((m) => Number(m[1]) * Number(m[2]))
  const tahap = [...langkah.matchAll(/\((?:±|sekitar\s*)?(\d+)\s*menit\)/gi)].map((m) => Number(m[1]))
  if (tahap.length >= 2) return { total: tahap.reduce((a, b) => a + b, 0), cara: `jumlah ${tahap.length} tahap berwaktu` }
  if (kali.length) return { total: kali.reduce((a, b) => a + b, 0), cara: "judul pertemuan" }
  return { total: null, cara: "tidak ditemukan" }
}

export function periksaPerangkat(md: string, menitPerJp = 35) {
  const langkah = bagianLangkah(md)
  const aspek = ASPEK_UKIN.map((a) => {
    // Alur (a) harus memuat ketiga tahap; aspek lain cukup satu penanda.
    const kena = a.cari.filter((re) => re.test(langkah)).length
    const ok = a.kode === "a" ? kena === a.cari.length : kena > 0
    const bukti = ok ? (langkah.split("\n").find((b) => a.cari.some((re) => re.test(b)))?.replace(/^[-*\d.\s]+/, "").trim().slice(0, 110) ?? "") : ""
    return { ...a, ok, bukti }
  })
  const durasi = menitRencana(md)
  const target = 2 * menitPerJp
  const hilang = bagianHilang(md, KERANGKA_BSKAP).filter((b) => !/^(sumber|mitra pembelajaran|pemanfaatan digital)$/i.test(b))
  return { aspek, durasi, target, hilang, adaInstrumen: /(rubrik|kriteria|instrumen|kunci|memenuhi)/i.test(md), adaSumber: /^##\s+sumber/im.test(md) }
}

export function laporanPeriksa(md: string, menitPerJp = 35): string {
  const p = periksaPerangkat(md, menitPerJp)
  const out = [`Pemeriksaan perangkat Ujian Kinerja (ruang lingkup penilaian, ${SUMBER_JUKNIS} hlm. 9):`]
  for (const a of p.aspek) out.push(`${a.ok ? "✔" : "✖"} (${a.kode}) ${a.nama}${a.ok ? (a.bukti ? ` — terlihat: "${a.bukti}"` : "") : ` — BELUM TERLIHAT di langkah pembelajaran: ${a.saran}`}`)
  out.push(p.durasi.total === null
    ? `✖ Durasi: menit per tahap belum tertulis (Ujian Kinerja = 2 JP = ${p.target} menit). Tulis menit tiap tahap, misalnya "Awal (10 menit)".`
    : `${p.durasi.total === p.target ? "✔" : "✖"} Durasi: ${p.durasi.total} menit (${p.durasi.cara}); Ujian Kinerja direkam selama 2 JP = ${p.target} menit${p.durasi.total === p.target ? "" : " — sesuaikan"}.`)
  out.push(`${p.adaInstrumen ? "✔" : "✖"} Instrumen asesmen (kriteria/rubrik/kunci)${p.adaInstrumen ? "" : " belum ada — perangkat Ujian Kinerja mencakup instrumen (juknis hlm. 10)"}`)
  out.push(`${p.hilang.length ? "◐" : "✔"} Kelengkapan bagian rencana${p.hilang.length ? `: belum ada ${p.hilang.join("; ")}` : ""}`)
  out.push(`${p.adaSumber ? "✔" : "◐"} Sumber materi${p.adaSumber ? "" : " belum dicantumkan"}`)
  const kurang = p.aspek.filter((a) => !a.ok).length + (p.durasi.total !== p.target ? 1 : 0) + (p.adaInstrumen ? 0 : 1)
  out.push("", kurang ? `Ada ${kurang} hal yang perlu diperkuat. Bahas satu per satu bersama guru dan minta guru menuliskannya dengan kata-katanya sendiri (perangkat wajib hasil pengembangan sendiri).` : "Semua aspek sudah tampak di rencana. Lanjutkan ke skenario rekaman video.")
  out.push("Catatan: ini pemeriksaan kelengkapan berdasarkan kata kunci untuk latihan, bukan instrumen penilaian resmi penguji.")
  return out.join("\n")
}

/** Checklist Ujian Kinerja dan Ujian Tertulis (Markdown untuk ekspor Word), dengan nama berkas sesuai juknis. */
export function checklistPpg(o: { nama: string; nim?: string | null; mapel?: string | null; kelas?: number | string | null; tahap?: string | null }): string {
  const n = o.nama.trim(), nim = (o.nim ?? "").trim() || "[PERLU GURU: NIM PPG]"
  return `# CHECKLIST UKPPPG BAGI GURU TERTENTU

Nama peserta: ${n} · NIM PPG: ${nim}${o.mapel ? ` · Mapel/kelas praktik: ${o.mapel}${o.kelas ? ` kelas ${o.kelas}` : ""}` : ""}${o.tahap ? ` · ${o.tahap}` : ""}

Jadwal dan tautan resmi selalu dicek di laman/WA resmi UKPPPG (https://ukpppg.bppp.kemendikdasmen.go.id/). Dasar: ${SUMBER_JUKNIS}.

## A. Ujian Kinerja — Perangkat Pembelajaran (juknis hlm. 9–10, 15)
- [ ] Perangkat disiapkan **khusus untuk ujian** dan **hasil pengembangan sendiri** (bukan salinan milik orang lain).
- [ ] Isi: rancangan pembelajaran/modul ajar untuk 2 JP, instrumen asesmen, dan alat bantu/peraga yang dipakai.
- [ ] Rencana memuat tujuh aspek yang dinilai: alur dan tahapan; kesesuaian dengan rencana; penguasaan bahan ajar; interaksi dengan siswa; media/alat bantu; perlakuan terhadap perilaku siswa; evaluasi dan umpan balik di akhir.
- [ ] Nama berkas: **Perangkat Pembelajaran _${n}_${nim}**
- [ ] Diunggah di aplikasi Ujian Kinerja: https://ukin-ukpppg.bppp.kemendikdasmen.go.id/

## B. Ujian Kinerja — Video Praktik Pembelajaran (juknis hlm. 15–16)
- [ ] Direkam **khusus** untuk ujian, mengikuti perangkat yang diunggah (bukan video PPL atau tugas kuliah lain).
- [ ] Praktik mengajar **2 JP**, format **MP4**.
- [ ] Gambar fokus, suara jelas, pencahayaan cukup, video stabil; **seluruh aktivitas pembelajaran** terekam.
- [ ] Pengantar ≤ 1 menit: nama, asal LPTK, NIM, identitas sekolah; **KTP asli ditunjukkan ke kamera**.
- [ ] Tanpa aksesoris tambahan: tanpa musik latar, tanpa video profil sekolah.
- [ ] Berpakaian sopan dan rapi, bersepatu tertutup (juknis hlm. 11).
- [ ] Berkas 1 — rekaman utuh 2 JP tanpa editing: **Video utuh_${n}_${nim}**
- [ ] Berkas 2 — hasil edit ± 30 menit berisi bagian-bagian penting sesuai perangkat: **Videoedit_${n}_${nim}**
- [ ] Diunggah ke **drive masing-masing** peserta; pastikan tautan **bisa dibuka penguji** (coba buka dari akun lain).
- [ ] Tautan dimasukkan ke aplikasi Ujian Kinerja: https://ukin-ukpppg.bppp.kemendikdasmen.go.id/
- [ ] Pakta integritas Ujian Kinerja ditandatangani; di awal video memperkenalkan diri dengan identitas (juknis hlm. 11).

## C. Ujian Tertulis Berbasis Komputer (juknis hlm. 8, 11–14)
- [ ] Tes objektif (120 menit): **PCK** 35 soal pilihan ganda sederhana dan kompleks (penguasaan materi dan strategi pembelajaran) dan **SJT** 30 soal pilihan ganda berbobot 1–5 (pengambilan keputusan dalam konteks pembelajaran).
- [ ] Tes subjektif (30 menit, setelah tes objektif): 1 studi kasus **uraian reflektif** — masalah yang pernah dihadapi, upaya mengatasinya, hasil upaya, dan pengalaman berharga untuk meningkatkan diri.
- [ ] Laptop: CPU 2 core, RAM 4 GB, resolusi 1024×720, Windows 8 / macOS Big Sur 11 ke atas, webcam, baterai baik.
- [ ] HP dengan aplikasi Zoom (nama Zoom = nama lengkap), kamera dan audio berfungsi.
- [ ] Internet stabil, kuota minimal 10 GB.
- [ ] Ruangan tenang dan terang; meja ± 2 meter dari kamera HP; di meja hanya laptop, air minum dalam wadah bening, obat pribadi (bila perlu), kertas kosong, dan satu alat tulis.
- [ ] Aplikasi Exambppp terpasang (exam.bppp.kemendikdasmen.go.id/win atau /mac); bergabung di grup WA dari laman pendaftaran; ikut tes perangkat dan simulasi; pakta integritas; pakaian sopan (bukan jeans/kaus/ketat).
- [ ] Saat ujian: wajah 100% tampak di laptop, HP Zoom posisi lanskap (hening untuk telepon, Zoom tidak dibisukan), tidak meninggalkan kursi, tidak mendokumentasikan soal, mengerjakan sendiri.
`
}
