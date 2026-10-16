// Media ajar interaktif: SATU berkas HTML yang berjalan tanpa internet di smart TV/papan sentuh, laptop + proyektor,
// atau HP — kuis, kartu kilat, pasangkan/memori, urutkan, roda putar, bingo, ular tangga digital, peraga 2D (pecahan,
// jam, garis bilangan, Dienes, tabel perkalian), dan peraga 3D (bangun ruang dengan jaring-jaring, volume kubus satuan).
// Asisten hanya menulis spesifikasi (jenis dan nilai); gambar dan logika dibuat di sini dan di lib/media/*.js secara
// deterministik supaya selalu benar. Berkas yang sama bisa dicetak (tampilan cetak memakai versi statis tiap bagian).

import { readFileSync } from "node:fs"
import { Gagal } from "./berkas.ts"
import * as G from "./media/gambar.js"
import * as Ru from "./media/ruang.js"

const { esc, angka: angkaJs } = G
type Spek = Record<string, any>

/** Jalankan fungsi lib/media/*.js dan ubah SalahSpek menjadi Gagal (pesan yang diteruskan ke asisten). */
function aman<T>(f: () => T): T {
  try {
    return f()
  } catch (e) {
    if (e instanceof G.SalahSpek) throw new Gagal(e.message)
    throw e
  }
}
const angka = (v: unknown, nama: string, min: number, maks: number, bulat = true): number => aman(() => angkaJs(v, nama, min, maks, bulat))
export const gambar = (g: Spek): string => aman(() => G.gambar(g))

const teks = (v: unknown, nama: string, maks = 400): string => {
  const s = String(v ?? "").trim()
  if (!s) throw new Gagal(`${nama} kosong.`)
  if (s.length > maks) throw new Gagal(`${nama} terlalu panjang (maks. ${maks} karakter).`)
  return s
}
/** Isi kartu/pilihan: teks biasa atau {teks?, gambar?, keterangan?}. Gambar diperiksa sekarang supaya galat muncul di server. */
function isian(v: unknown, nama: string): Spek {
  if (typeof v === "string" || typeof v === "number") return { teks: teks(v, nama, 200) }
  const o = (v ?? {}) as Spek
  if (o.teks == null && !o.gambar) throw new Gagal(`${nama} butuh \`teks\` atau \`gambar\`.`)
  if (o.gambar) gambar(o.gambar)
  return { ...(o.teks != null ? { teks: teks(o.teks, nama, 200) } : {}), ...(o.gambar ? { gambar: o.gambar } : {}), ...(o.keterangan ? { keterangan: teks(o.keterangan, `${nama} (keterangan)`, 120) } : {}) }
}
const daftar = (v: unknown, nama: string, min: number, maks: number): any[] => {
  if (!Array.isArray(v) || v.length < min) throw new Gagal(`${nama} butuh paling sedikit ${min} isian.`)
  if (v.length > maks) throw new Gagal(`${nama} paling banyak ${maks} isian (didapat ${v.length}).`)
  return v
}

/** Pengacak tetap (hasil sama untuk benih yang sama) supaya berkas bisa dibuat ulang persis. */
function acak<T>(xs: T[], benih: number): T[] {
  const a = [...xs]
  let s = benih || 1
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const HURUF = "ABCDEF"
const pecahanTeks = /^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/
const jamTeks = /^\s*(\d{1,2})[.:](\d{2})\s*$/

/** Memeriksa dan merapikan satu bagian. Hasilnya dipakai untuk tampilan cetak dan disisipkan ke HTML interaktif. */
function rapikan(b: Spek, i: number): Spek {
  const dasar = { jenis: b.jenis, ...(b.judul ? { judul: teks(b.judul, "Judul bagian", 120) } : {}), ...(b.petunjuk ? { petunjuk: teks(b.petunjuk, "Petunjuk", 400) } : {}) }
  switch (b.jenis) {
    case "kartu": {
      const kartu = daftar(b.kartu, "Bagian kartu", 1, 60).map((k: Spek, n: number) => {
        const d = isian(k, `Kartu ${n + 1}`)
        return k?.balik ? { ...d, balik: isian(k.balik, `Kartu ${n + 1} (balik)`) } : d
      })
      return { ...dasar, kolom: angka(b.kolom ?? 3, "Kolom kartu", 1, 6), tinggi_cm: angka(b.tinggi_cm ?? 5, "Tinggi kartu (cm)", 2, 15, false), kartu }
    }
    case "domino":
      return { ...dasar, domino: daftar(b.domino, "Bagian domino", 1, 40).map((d: any, n: number) => [isian(d?.[0], `Domino ${n + 1} kiri`), isian(d?.[1], `Domino ${n + 1} kanan`)]) }
    case "bingo": {
      const n = angka(b.ukuran ?? 5, "Ukuran bingo", 3, 6)
      const perlu = n * n - (n % 2 ? 1 : 0)
      const isi = daftar(b.isi, "Isian bingo", 1, 80).map((v: any, k: number) =>
        v && typeof v === "object" ? { soal: teks(v.soal, `Bingo ${k + 1} (soal)`, 120), jawaban: teks(v.jawaban, `Bingo ${k + 1} (jawaban)`, 40) } : { jawaban: teks(v, `Bingo ${k + 1}`, 40) },
      )
      if (isi.length < perlu) throw new Gagal(`Bingo ${n}×${n} butuh ${perlu} isian (didapat ${isi.length}).`)
      const j = isi.map((v) => v.jawaban)
      const kembar = j.filter((v, k) => j.indexOf(v) !== k)
      if (kembar.length) throw new Gagal(`Isian bingo harus berbeda semua; yang kembar: ${[...new Set(kembar)].join(", ")}.`)
      return { ...dasar, ukuran: n, isi, jumlah_papan: angka(b.jumlah_papan ?? 1, "Jumlah papan", 1, 40), benih: i }
    }
    case "ular_tangga": {
      const pasang = (xs: any, tangga: boolean) =>
        (xs ?? []).map((p: any) => {
          const [a, z] = [Number(p?.[0]), Number(p?.[1])]
          if (!(Number.isInteger(a) && Number.isInteger(z) && a >= 2 && a <= 99 && z >= 1 && z <= 100)) throw new Gagal("Ular/tangga harus di petak 1–100 (ujung awal 2–99).")
          if (tangga ? z <= a : z >= a) throw new Gagal(tangga ? `Tangga ${a}→${z} harus naik.` : `Ular ${a}→${z} harus turun.`)
          return [a, z]
        })
      const tangga = pasang(b.tangga, true), ular = pasang(b.ular, false)
      const awal = [...tangga, ...ular].map((p) => p[0])
      const dobel = awal.filter((v, k) => awal.indexOf(v) !== k)
      if (dobel.length) throw new Gagal(`Petak ${dobel.join(", ")} dipakai lebih dari satu ular/tangga.`)
      const soal: Spek = {}
      for (const [k, v] of Object.entries(b.soal ?? {})) {
        const no = angka(k, "Nomor petak soal", 1, 100)
        const o = v && typeof v === "object" ? (v as Spek) : { soal: v }
        soal[no] = { soal: teks(o.soal, `Soal petak ${no}`, 200), ...(o.jawaban != null ? { jawaban: teks(o.jawaban, `Jawaban petak ${no}`, 120) } : {}) }
      }
      return { ...dasar, tangga, ular, soal, tim: angka(b.tim ?? 2, "Jumlah tim", 2, 4) }
    }
    case "kuis": {
      const soal = daftar(b.soal, "Kuis", 1, 40).map((q: Spek, n: number) => {
        const no = `Soal kuis ${n + 1}`
        const tanya = teks(q?.tanya, `${no} (tanya)`, 400)
        if (q.gambar) gambar(q.gambar)
        const bahas = q.bahas ? teks(q.bahas, `${no} (pembahasan)`, 500) : undefined
        if (Array.isArray(q.pilihan)) {
          const pilihan = daftar(q.pilihan, `${no} (pilihan)`, 2, 6).map((p: unknown, k: number) => teks(p, `${no} pilihan ${HURUF[k]}`, 150))
          if (new Set(pilihan.map((p) => p.toLowerCase())).size !== pilihan.length) throw new Gagal(`${no}: ada pilihan yang sama.`)
          const j = String(q.jawaban ?? "").trim()
          const benar = /^[A-F]$/i.test(j) && HURUF.indexOf(j.toUpperCase()) < pilihan.length ? HURUF.indexOf(j.toUpperCase()) : pilihan.findIndex((p) => p.toLowerCase() === j.toLowerCase())
          if (benar < 0) throw new Gagal(`${no}: jawaban "${q.jawaban}" tidak cocok dengan pilihan. Tulis hurufnya (A–${HURUF[pilihan.length - 1]}) atau teks pilihan yang persis.`)
          return { tanya, ...(q.gambar ? { gambar: q.gambar } : {}), pilihan, benar, ...(bahas ? { bahas } : {}) }
        }
        const jawaban = (Array.isArray(q.jawaban) ? q.jawaban : [q.jawaban]).map((v: unknown) => teks(v, `${no} (jawaban)`, 80))
        return { tanya, ...(q.gambar ? { gambar: q.gambar } : {}), jawaban, ...(bahas ? { bahas } : {}) }
      })
      return { ...dasar, soal, acak: b.acak !== false }
    }
    case "pasangkan": {
      const mode = b.mode ?? "hubungkan"
      if (!["hubungkan", "memori"].includes(mode)) throw new Gagal(`Mode pasangkan "${mode}" tidak dikenal (hubungkan, memori).`)
      const pasangan = daftar(b.pasangan, "Pasangkan", 2, mode === "memori" ? 10 : 12).map((p: any, n: number) => [isian(p?.[0], `Pasangan ${n + 1} kiri`), isian(p?.[1], `Pasangan ${n + 1} kanan`)])
      return { ...dasar, mode, pasangan, benih: i }
    }
    case "urutkan":
      return { ...dasar, item: daftar(b.item, "Urutkan", 3, 10).map((v: unknown, n: number) => isian(v, `Urutan ${n + 1}`)), benih: i }
    case "roda":
      if (b.absen != null) return { ...dasar, absen: angka(b.absen, "Jumlah murid (nomor absen)", 2, 45) }
      return { ...dasar, isi: daftar(b.isi, "Roda", 2, 30).map((v: unknown, n: number) => teks(v, `Roda ${n + 1}`, 60)) }
    case "peraga": {
      const alat = String(b.alat ?? "")
      const tantangan = (b.tantangan ?? []) as unknown[]
      if (!Array.isArray(tantangan) || tantangan.length > 12) throw new Gagal("Tantangan peraga berupa daftar, paling banyak 12.")
      switch (alat) {
        case "pecahan": {
          const bentuk = b.bentuk ?? "lingkaran"
          const penyebut = angka(b.penyebut ?? 4, "Penyebut", 1, 12)
          gambar({ jenis: "pecahan", bentuk, penyebut, pembilang: 0 })
          const t = tantangan.map((v) => {
            const m = String(v).match(pecahanTeks)
            if (!m || Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[1]) > Number(m[2])) throw new Gagal(`Tantangan pecahan "${v}" harus berbentuk a/b dengan b 1–12 dan a ≤ b.`)
            return `${Number(m[1])}/${Number(m[2])}`
          })
          return { ...dasar, alat, bentuk, penyebut, ubah_penyebut: b.ubah_penyebut !== false, tantangan: t }
        }
        case "jam": {
          const jam = angka(b.jam ?? 7, "Jam", 0, 23), menit = angka(b.menit ?? 0, "Menit", 0, 59)
          const langkah = angka(b.langkah ?? 5, "Langkah menit", 1, 30)
          const t = tantangan.map((v) => {
            const m = String(v).match(jamTeks)
            if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new Gagal(`Tantangan jam "${v}" harus berbentuk JJ.MM (misalnya 07.30).`)
            return `${m[1].padStart(2, "0")}.${m[2]}`
          })
          return { ...dasar, alat, jam, menit, langkah, tantangan: t }
        }
        case "garis_bilangan": {
          const g = { jenis: "garis_bilangan", mulai: b.mulai ?? 0, akhir: b.akhir, lompat: b.lompat ?? 1, tandai: b.tandai ?? [], loncatan: b.loncatan ?? [] }
          gambar(g)
          return { ...dasar, alat, ...g }
        }
        case "dienes":
          return { ...dasar, alat, bilangan: angka(b.bilangan ?? 0, "Bilangan awal", 0, 999), tantangan: tantangan.map((v) => angka(v, "Tantangan Dienes", 1, 999)) }
        case "tabel_perkalian": {
          const dari = angka(b.dari ?? 1, "Dari", 1, 12), sampai = angka(b.sampai ?? 10, "Sampai", dari, 12)
          return { ...dasar, alat, dari, sampai }
        }
        default:
          throw new Gagal(`Alat peraga "${alat}" tidak dikenal. Pilih: pecahan, jam, garis_bilangan, dienes, tabel_perkalian.`)
      }
    }
    case "ruang": {
      const isi = Array.isArray(b.bangun) ? b.bangun : [b.bangun ?? b]
      if (!isi.length || isi.length > 8) throw new Gagal("Bagian ruang berisi 1–8 bangun ruang.")
      const bangun = isi.map((x: Spek) => aman(() => Ru.bangunRuang(typeof x === "string" ? { bentuk: x } : x)))
      return { ...dasar, bangun: bangun.map(({ data, ...u }: Spek) => u) }
    }
    case "volume": {
      const p = angka(b.p ?? 4, "Panjang (p)", 1, 8), l = angka(b.l ?? 3, "Lebar (l)", 1, 8), t = angka(b.t ?? 2, "Tinggi (t)", 1, 8)
      return { ...dasar, p, l, t, tebak: b.tebak !== false }
    }
    case "gambar": {
      const g = daftar(b.gambar, "Bagian gambar", 1, 30)
      g.forEach((x: Spek) => gambar(x))
      return { ...dasar, kolom: angka(b.kolom ?? 3, "Kolom gambar", 1, 6), gambar: g }
    }
    case "teks":
      return { ...dasar, isi: String(b.isi ?? "") }
    case "halaman_baru":
      return { jenis: "halaman_baru" }
    default:
      throw new Gagal(`Bagian "${b.jenis}" tidak dikenal. Pilih: kuis, kartu, pasangkan, urutkan, roda, bingo, ular_tangga, peraga, ruang, volume, domino, gambar, teks, halaman_baru.`)
  }
}

// ---------------- Tampilan cetak (statis) ----------------

function isiKartu(k: Spek): string {
  return `${k.teks != null ? `<div class="teks">${esc(k.teks)}</div>` : ""}${k.gambar ? `<div class="gbr">${gambar(k.gambar)}</div>` : ""}${k.keterangan ? `<div class="ket">${esc(k.keterangan)}</div>` : ""}`
}

function papanUlarTangga(b: Spek): string {
  const sisi = 10
  const sel = (no: number) => {
    const r = Math.floor((no - 1) / sisi)
    const c = r % 2 === 0 ? (no - 1) % sisi : sisi - 1 - ((no - 1) % sisi)
    return { x: c * 50 + 25, y: (sisi - 1 - r) * 50 + 25 }
  }
  const kotak: string[] = []
  for (let no = 1; no <= 100; no++) {
    const { x, y } = sel(no)
    const s = b.soal[no]
    kotak.push(`<rect x="${x - 25}" y="${y - 25}" width="50" height="50" fill="${s ? "#FCE4D6" : (Math.floor((no - 1) / 10) + no) % 2 ? "#FFF2CC" : "#E2EFDA"}" stroke="#999" stroke-width="0.5" data-petak="${no}"/><text x="${x - 21}" y="${y - 14}" font-size="9" font-weight="bold">${no}</text>${s ? `<text x="${x}" y="${y + 8}" text-anchor="middle" font-size="${s.soal.length > 10 ? 6 : 8}">${esc(s.soal.length > 18 ? "? Soal" : s.soal)}</text>` : ""}`)
  }
  const tangga = b.tangga.map(([a, z]: number[]) => {
    const p = sel(a), q = sel(z)
    const dx = q.x - p.x, dy = q.y - p.y, pj = Math.hypot(dx, dy) || 1
    const nx = (-dy / pj) * 6, ny = (dx / pj) * 6
    const anak = Math.max(2, Math.floor(pj / 18))
    const rung = Array.from({ length: anak - 1 }, (_, k) => {
      const t = (k + 1) / anak, cx = p.x + dx * t, cy = p.y + dy * t
      return `<line x1="${(cx - nx).toFixed(1)}" y1="${(cy - ny).toFixed(1)}" x2="${(cx + nx).toFixed(1)}" y2="${(cy + ny).toFixed(1)}" stroke="#7F6000" stroke-width="2"/>`
    }).join("")
    return `<g data-tangga="${a}-${z}"><line x1="${(p.x - nx).toFixed(1)}" y1="${(p.y - ny).toFixed(1)}" x2="${(q.x - nx).toFixed(1)}" y2="${(q.y - ny).toFixed(1)}" stroke="#7F6000" stroke-width="3"/><line x1="${(p.x + nx).toFixed(1)}" y1="${(p.y + ny).toFixed(1)}" x2="${(q.x + nx).toFixed(1)}" y2="${(q.y + ny).toFixed(1)}" stroke="#7F6000" stroke-width="3"/>${rung}</g>`
  })
  const ular = b.ular.map(([a, z]: number[]) => {
    const p = sel(a), q = sel(z)
    return `<path d="M${p.x} ${p.y} C${p.x + 40} ${(p.y + q.y) / 2 - 30} ${q.x - 40} ${(p.y + q.y) / 2 + 30} ${q.x} ${q.y}" fill="none" stroke="#C00000" stroke-width="5" stroke-linecap="round" opacity="0.85" data-ular="${a}-${z}"/><circle cx="${p.x}" cy="${p.y}" r="6" fill="#C00000"/>`
  })
  return `<svg viewBox="0 0 500 500" class="ular-tangga">${kotak.join("")}${tangga.join("")}${ular.join("")}</svg>`
}

const kapital = (s: string) => s[0].toUpperCase() + s.slice(1)

function cetakBagian(b: Spek): string {
  switch (b.jenis) {
    case "kartu": {
      const grid = (isi: string) => `<div class="kartu-grid" style="grid-template-columns:repeat(${b.kolom},1fr)">${isi}</div>`
      const muka = grid(b.kartu.map((k: Spek) => `<div class="kartu" style="height:${b.tinggi_cm}cm">${isiKartu(k)}</div>`).join(""))
      if (!b.kartu.some((k: Spek) => k.balik)) return muka
      // Sisi balik dicerminkan per baris supaya pas bila dicetak bolak-balik (balik pada tepi panjang).
      const baris: (Spek | null)[][] = []
      for (let k = 0; k < b.kartu.length; k += b.kolom) baris.push(b.kartu.slice(k, k + b.kolom))
      const balik = baris
        .map((r) => [...Array.from({ length: b.kolom - r.length }, () => null), ...[...r].reverse()].map((k) => `<div class="kartu${k ? "" : " kosong"}" style="height:${b.tinggi_cm}cm">${k?.balik ? isiKartu(k.balik) : ""}</div>`).join(""))
        .join("")
      return `${muka}<div class="halaman-baru"></div><p class="kecil">Sisi belakang (untuk cetak bolak-balik)</p>${grid(balik)}`
    }
    case "domino":
      return `<div class="domino-grid">${b.domino.map((d: Spek[]) => `<div class="domino"><div class="sisi">${isiKartu(d[0])}</div><div class="sisi">${isiKartu(d[1])}</div></div>`).join("")}</div>`
    case "bingo": {
      const n = b.ukuran, perlu = n * n - (n % 2 ? 1 : 0)
      const papan = Array.from({ length: b.jumlah_papan }, (_, k) => {
        const sel = acak(b.isi.map((v: Spek) => v.jawaban as string), 7919 * (k + 1) + b.benih).slice(0, perlu)
        if (n % 2) sel.splice(Math.floor((n * n) / 2), 0, "★ BEBAS")
        return `<div><p class="kecil">Papan ${k + 1}</p><table class="bingo">${Array.from({ length: n }, (_, r) => `<tr>${sel.slice(r * n, r * n + n).map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table></div>`
      })
      return `<div class="bingo-grid">${papan.join("")}</div>`
    }
    case "ular_tangga":
      return papanUlarTangga(b)
    case "kuis":
      return `<ol class="kuis-cetak">${b.soal.map((q: Spek) => `<li><div>${esc(q.tanya)}</div>${q.gambar ? `<div class="gbr">${gambar(q.gambar)}</div>` : ""}${q.pilihan ? `<ol class="pilihan" type="A">${q.pilihan.map((p: string) => `<li>${esc(p)}</li>`).join("")}</ol>` : `<div class="isian">Jawab: ..............................</div>`}</li>`).join("")}</ol>`
    case "pasangkan": {
      const kanan = acak(b.pasangan.map((p: Spek[]) => p[1]), 101 + b.benih)
      return `<table class="pasangkan-cetak">${b.pasangan.map((p: Spek[], k: number) => `<tr><td>${isiKartu(p[0])}</td><td class="titik">●</td><td class="jarak"></td><td class="titik">●</td><td>${isiKartu(kanan[k])}</td></tr>`).join("")}</table>`
    }
    case "urutkan":
      return `<div class="urutkan-cetak">${acak(b.item, 211 + b.benih).map((v: Spek) => `<div class="kartu-urut"><span class="kotak-no"></span>${isiKartu(v)}</div>`).join("")}</div>`
    case "roda":
      return b.absen ? `<p>Roda nomor absen 1–${b.absen}.</p>` : `<ul class="roda-cetak">${b.isi.map((v: string) => `<li>${esc(v)}</li>`).join("")}</ul>`
    case "peraga": {
      let g = ""
      if (b.alat === "pecahan") g = gambar({ jenis: "pecahan", bentuk: b.bentuk, penyebut: b.penyebut, pembilang: 0 })
      else if (b.alat === "jam") g = gambar({ jenis: "jam", jam: b.jam, menit: b.menit })
      else if (b.alat === "garis_bilangan") g = gambar(b)
      else if (b.alat === "dienes") g = b.bilangan ? gambar({ jenis: "dienes", bilangan: b.bilangan }) : ""
      else if (b.alat === "tabel_perkalian") g = gambar({ jenis: "tabel_perkalian", dari: b.dari, sampai: b.sampai, kosong: true })
      const tugas = (v: unknown) => (b.alat === "pecahan" ? `Arsir ${v}` : b.alat === "jam" ? `Gambar jarum jam pukul ${v}` : `Tunjukkan bilangan ${v}`)
      const t = b.tantangan?.length ? `<ol class="tantangan-cetak">${b.tantangan.map((v: unknown) => `<li>${esc(tugas(v))}</li>`).join("")}</ol>` : ""
      return `<div class="peraga-cetak">${g}</div>${t}`
    }
    case "ruang":
      return b.bangun
        .map((x: Spek) => {
          const d = (Ru.BANGUN_RUANG as Spek)[x.bentuk]
          return `<div class="ruang-cetak"><h3>${esc(kapital(x.bentuk))}</h3><p class="kecil">Sisi: ${d.sisi} · Rusuk: ${d.rusuk} · ${d.puncak ? `Titik puncak: ${d.puncak}` : `Titik sudut: ${d.titik}`}</p>${aman(() => Ru.svgJaring(x))}</div>`
        })
        .join("")
    case "volume":
      return `<div class="peraga-cetak">${Ru.svgKubusSatuan(b.p, b.l, b.t)}</div><p>Berapa banyak kubus satuan? ...........</p>`
    case "gambar":
      return `<div class="gambar-grid" style="grid-template-columns:repeat(${b.kolom},1fr)">${b.gambar.map((g: Spek) => `<div class="sel">${gambar(g)}${g.keterangan ? `<div class="ket">${esc(g.keterangan)}</div>` : ""}</div>`).join("")}</div>`
    case "teks":
      return String(b.isi).split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")
    default:
      return ""
  }
}

// ---------------- Rakit HTML ----------------

const BERKAS = (n: string) => readFileSync(new URL(n, new URL("./media/", import.meta.url)), "utf8")
const tanpaExport = (s: string) => s.replace(/^import .*$/gm, "").replace(/^export /gm, "")
const INTERAKTIF = new Set(["kartu", "bingo", "ular_tangga", "kuis", "pasangkan", "urutkan", "roda", "peraga", "ruang", "volume"])

export type SpekMedia = { judul: string; petunjuk?: string; orientasi?: "potret" | "lanskap"; bagian: Spek[] }

/** Spesifikasi yang sudah diperiksa dan dirapikan (dipakai juga oleh uji). */
export function rapikanSpek(spek: SpekMedia): SpekMedia {
  if (!spek?.judul) throw new Gagal("Media butuh `judul`.")
  if (!Array.isArray(spek.bagian) || !spek.bagian.length) throw new Gagal("Media butuh `bagian` (misalnya kuis, kartu, pasangkan, peraga, ruang).")
  if (spek.bagian.length > 30) throw new Gagal("Media paling banyak 30 bagian; pecah menjadi beberapa berkas.")
  return {
    judul: teks(spek.judul, "Judul media", 120),
    ...(spek.petunjuk ? { petunjuk: teks(spek.petunjuk, "Petunjuk media", 400) } : {}),
    orientasi: spek.orientasi === "lanskap" ? "lanskap" : "potret",
    bagian: spek.bagian.map((b, i) => rapikan(b ?? {}, i)),
  }
}

/** Satu berkas HTML interaktif (dan bisa dicetak) untuk media. */
export function mediaHtml(spek: SpekMedia, o: { sekolah?: string | null; kertas?: "A4" | "F4"; huruf?: string } = {}): string {
  const r = rapikanSpek(spek)
  const lanskap = r.orientasi === "lanskap"
  const halaman = o.kertas === "F4" ? (lanskap ? "330mm 210mm" : "210mm 330mm") : lanskap ? "A4 landscape" : "A4"
  const huruf = esc(o.huruf ?? "Arial")
  const pakai3d = r.bagian.some((b) => b.jenis === "ruang" || b.jenis === "volume")
  const layar = r.bagian
    .map((b, i) =>
      b.jenis === "halaman_baru"
        ? `<div class="halaman-baru"></div>`
        : `<section class="layar" data-i="${i}" data-jenis="${b.jenis}"${INTERAKTIF.has(b.jenis) ? ' data-interaktif="1"' : ""}>${b.judul ? `<h2>${esc(b.judul)}</h2>` : ""}${b.petunjuk ? `<p class="petunjuk">${esc(b.petunjuk)}</p>` : ""}<div class="cetak">${cetakBagian(b)}</div><div class="main"></div></section>`,
    )
    .join("\n")
  // JSON di dalam <script>: cegah "</script>" dan pemisah baris yang mematahkan JavaScript.
  const data = JSON.stringify(r).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(r.judul)}</title>
<style>
@page { size: ${halaman}; margin: 12mm; }
:root { --huruf: ${huruf}, Arial, sans-serif; }
${BERKAS("gaya.css")}
</style></head>
<body>
<header class="atas">
${o.sekolah ? `<div class="kop">${esc(String(o.sekolah).toUpperCase())}</div>` : ""}
<h1>${esc(r.judul)}</h1>
${r.petunjuk ? `<p class="petunjuk">${esc(r.petunjuk)}</p>` : ""}
</header>
<main id="panggung">
${layar}
</main>
<script type="application/json" id="spek-media">${data}</script>
<script>
${tanpaExport(BERKAS("gambar.js"))}
${tanpaExport(BERKAS("ruang.js"))}
${BERKAS("runtime.js")}
</script>
${pakai3d ? `<script>${BERKAS("../../vendor/three/three-sd.min.js")}</script>\n<script>\n${BERKAS("tiga.js")}\n</script>` : ""}
</body></html>`
}
