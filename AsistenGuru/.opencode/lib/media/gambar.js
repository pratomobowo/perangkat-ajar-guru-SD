// Gambar peraga (SVG) yang dipakai bersama oleh server (lib/media.ts) dan oleh HTML interaktif di peramban
// (berkas ini disisipkan apa adanya ke HTML, tanpa kata kunci export). Karena itu: JavaScript biasa, tanpa import,
// tanpa tipe TypeScript. Kesalahan spesifikasi dilempar sebagai SalahSpek (server mengubahnya menjadi GAGAL).

export class SalahSpek extends Error {}

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
export const WARNA = ["#4F81BD", "#F79646", "#9BBB59", "#8064A2", "#4BACC6", "#C0504D"]
const ARSIR = "#7EA6E0"
const GARIS = "#222"

export function angka(v, nama, min, maks, bulat = true) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < min || n > maks || (bulat && !Number.isInteger(n))) throw new SalahSpek(`${nama} harus ${bulat ? "bilangan bulat" : "angka"} ${min}–${maks} (didapat: ${v}).`)
  return n
}

/** Lingkaran/batang/persegi pecahan: `pembilang` bagian dari `penyebut` diarsir. */
export function svgPecahan(s) {
  const b = angka(s.penyebut, "Penyebut", 1, 24)
  // `arsir` (daftar nomor bagian, mulai 0) dipakai peraga interaktif; bawaan: `pembilang` bagian pertama.
  const set = Array.isArray(s.arsir) ? new Set(s.arsir.map(Number)) : null
  const a = set ? set.size : angka(s.pembilang ?? 0, "Pembilang", 0, b)
  const di = (i) => (set ? set.has(i) : i < a)
  const bentuk = s.bentuk ?? "lingkaran"
  const label = s.label === false ? "" : `<text x="50" y="${bentuk === "batang" ? 46 : 118}" text-anchor="middle" font-size="12" font-weight="bold">${a}/${b}</text>`
  if (bentuk === "lingkaran") {
    const r = 45
    const bagian = []
    if (b === 1) bagian.push(`<circle cx="50" cy="50" r="${r}" fill="${di(0) ? ARSIR : "#fff"}" stroke="${GARIS}" stroke-width="1.5" data-arsir="${di(0) ? 1 : 0}" data-i="0"/>`)
    else
      for (let i = 0; i < b; i++) {
        const t0 = (i / b) * 2 * Math.PI - Math.PI / 2
        const t1 = ((i + 1) / b) * 2 * Math.PI - Math.PI / 2
        const p = (t) => `${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`
        bagian.push(`<path d="M50 50 L${p(t0)} A${r} ${r} 0 ${t1 - t0 > Math.PI ? 1 : 0} 1 ${p(t1)} Z" fill="${di(i) ? ARSIR : "#fff"}" stroke="${GARIS}" stroke-width="1.5" data-arsir="${di(i) ? 1 : 0}" data-i="${i}"/>`)
      }
    return `<svg viewBox="0 0 100 ${label ? 124 : 100}" class="peraga" data-jenis="pecahan">${bagian.join("")}${label}</svg>`
  }
  if (bentuk === "batang") {
    const w = 96 / b
    const sel = Array.from({ length: b }, (_, i) => `<rect x="${(2 + i * w).toFixed(2)}" y="2" width="${w.toFixed(2)}" height="28" fill="${di(i) ? ARSIR : "#fff"}" stroke="${GARIS}" stroke-width="1.2" data-arsir="${di(i) ? 1 : 0}" data-i="${i}"/>`)
    return `<svg viewBox="0 0 100 ${label ? 50 : 32}" class="peraga" data-jenis="pecahan">${sel.join("")}${label}</svg>`
  }
  if (bentuk === "persegi") {
    // Kotak dibagi baris × kolom (faktor terdekat akar penyebut).
    let baris = Math.floor(Math.sqrt(b))
    while (b % baris) baris--
    const kolom = b / baris
    const w = 90 / kolom
    const h = 90 / baris
    const sel = []
    for (let i = 0; i < b; i++) {
      const x = 5 + (i % kolom) * w
      const y = 5 + Math.floor(i / kolom) * h
      sel.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${di(i) ? ARSIR : "#fff"}" stroke="${GARIS}" stroke-width="1.2" data-arsir="${di(i) ? 1 : 0}" data-i="${i}"/>`)
    }
    return `<svg viewBox="0 0 100 ${label ? 124 : 100}" class="peraga" data-jenis="pecahan">${sel.join("")}${label}</svg>`
  }
  throw new SalahSpek(`Bentuk pecahan "${bentuk}" tidak dikenal (lingkaran, batang, persegi).`)
}

/** Garis bilangan dari `mulai` sampai `akhir`, tanda setiap `lompat`; opsional `tandai` (titik) dan `loncatan` [[dari,ke],...]. */
export function svgGarisBilangan(s) {
  const m = angka(s.mulai ?? 0, "Mulai", -1000, 100000)
  const e = angka(s.akhir, "Akhir", m + 1, 100000)
  const l = angka(s.lompat ?? 1, "Lompat", 1, 100000)
  const n = Math.floor((e - m) / l)
  if (n > 40) throw new SalahSpek("Garis bilangan paling banyak 40 tanda; perbesar 'lompat' atau persempit rentang.")
  const x = (v) => 20 + ((v - m) / (e - m)) * 560
  const tanda = Array.from({ length: n + 1 }, (_, i) => m + i * l)
  const isi = [`<line x1="10" y1="60" x2="590" y2="60" stroke="${GARIS}" stroke-width="2" marker-end="url(#panah)" marker-start="url(#panah)"/>`]
  for (const v of tanda) isi.push(`<line x1="${x(v)}" y1="52" x2="${x(v)}" y2="68" stroke="${GARIS}" stroke-width="1.5"/><text x="${x(v)}" y="86" text-anchor="middle" font-size="13">${v}</text>`)
  const dalam = (v, n) => angka(v, n, m, e, false)
  for (const v of (s.tandai ?? [])) isi.push(`<circle cx="${x(dalam(v, "Titik"))}" cy="60" r="6" fill="${WARNA[1]}" data-titik="${v}"/>`)
  for (const [a, b] of (s.loncatan ?? [])) {
    const x1 = x(dalam(a, "Awal loncatan")), x2 = x(dalam(b, "Akhir loncatan"))
    isi.push(`<path d="M${x1} 52 Q${(x1 + x2) / 2} ${52 - Math.min(40, Math.abs(x2 - x1) / 2)} ${x2} 52" fill="none" stroke="${WARNA[0]}" stroke-width="2" marker-end="url(#panahB)" data-loncat="${a}-${b}"/>`)
  }
  return `<svg viewBox="0 0 600 100" class="peraga lebar" data-jenis="garis_bilangan"><defs><marker id="panah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="${GARIS}"/></marker><marker id="panahB" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="${WARNA[0]}"/></marker></defs>${isi.join("")}</svg>`
}

/** Jam analog. `jam` 0–23 dan `menit` 0–59; jarum jam bergerak sesuai menit. */
export function svgJam(s) {
  const j = angka(s.jam, "Jam", 0, 23)
  const mnt = angka(s.menit ?? 0, "Menit", 0, 59)
  const sudutM = (mnt / 60) * 360
  const sudutJ = (((j % 12) + mnt / 60) / 12) * 360
  const titik = (deg, r) => [50 + r * Math.sin((deg * Math.PI) / 180), 50 - r * Math.cos((deg * Math.PI) / 180)].map((v) => v.toFixed(2))
  const isi = [`<circle cx="50" cy="50" r="46" fill="#fff" stroke="${GARIS}" stroke-width="2"/>`]
  for (let i = 0; i < 60; i++) {
    const [x1, y1] = titik(i * 6, i % 5 ? 43 : 40)
    const [x2, y2] = titik(i * 6, 46)
    isi.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${GARIS}" stroke-width="${i % 5 ? 0.6 : 1.5}"/>`)
  }
  for (let h = 1; h <= 12; h++) {
    const [x, y] = titik(h * 30, 33)
    isi.push(`<text x="${x}" y="${(Number(y) + 3.5).toFixed(2)}" text-anchor="middle" font-size="10" font-weight="bold">${h}</text>`)
  }
  const [hx, hy] = titik(sudutJ, 22)
  const [mx, my] = titik(sudutM, 36)
  isi.push(`<line x1="50" y1="50" x2="${hx}" y2="${hy}" stroke="${GARIS}" stroke-width="3.5" stroke-linecap="round" data-jarum="jam" data-sudut="${sudutJ.toFixed(1)}"/>`)
  isi.push(`<line x1="50" y1="50" x2="${mx}" y2="${my}" stroke="${WARNA[5]}" stroke-width="2" stroke-linecap="round" data-jarum="menit" data-sudut="${sudutM.toFixed(1)}"/>`)
  isi.push(`<circle cx="50" cy="50" r="2.5" fill="${GARIS}"/>`)
  const label = s.label === false ? "" : `<text x="50" y="112" text-anchor="middle" font-size="11">${String(j).padStart(2, "0")}.${String(mnt).padStart(2, "0")}</text>`
  return `<svg viewBox="0 0 100 ${label ? 118 : 100}" class="peraga" data-jenis="jam">${isi.join("")}${label}</svg>`
}

const POLIGON = {
  segitiga: [[50, 8], [92, 88], [8, 88]],
  "segitiga siku-siku": [[12, 10], [12, 88], [90, 88]],
  persegi: [[12, 12], [88, 12], [88, 88], [12, 88]],
  "persegi panjang": [[5, 25], [95, 25], [95, 75], [5, 75]],
  "jajar genjang": [[25, 25], [95, 25], [75, 75], [5, 75]],
  trapesium: [[30, 20], [70, 20], [95, 80], [5, 80]],
  "belah ketupat": [[50, 5], [90, 50], [50, 95], [10, 50]],
  "layang-layang": [[50, 5], [80, 35], [50, 95], [20, 35]],
}
function poligonBeraturan(n) {
  return Array.from({ length: n }, (_, i) => [50 + 44 * Math.sin((i / n) * 2 * Math.PI), 52 - 44 * Math.cos((i / n) * 2 * Math.PI)])
}

/** Bangun datar dengan nama; opsional `label` (default nama bangun). */
export function svgBangunDatar(s) {
  const nama = String(s.bangun ?? "").toLowerCase().replace(/_/g, " ").trim()
  const warna = WARNA[angka(s.warna ?? 0, "Warna", 0, WARNA.length - 1)]
  let bentuk
  if (nama === "lingkaran") bentuk = `<circle cx="50" cy="50" r="42" fill="${warna}" fill-opacity="0.35" stroke="${GARIS}" stroke-width="2"/>`
  else {
    const titik = POLIGON[nama] ?? (nama === "segi lima" ? poligonBeraturan(5) : nama === "segi enam" ? poligonBeraturan(6) : nama === "segi delapan" ? poligonBeraturan(8) : null)
    if (!titik) throw new SalahSpek(`Bangun "${s.bangun}" tidak dikenal (${[...Object.keys(POLIGON), "lingkaran", "segi lima", "segi enam", "segi delapan"].join(", ")}).`)
    bentuk = `<polygon points="${titik.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(" ")}" fill="${warna}" fill-opacity="0.35" stroke="${GARIS}" stroke-width="2" data-sisi="${titik.length}"/>`
  }
  const label = s.label === false ? "" : `<text x="50" y="114" text-anchor="middle" font-size="11">${esc(s.label ?? nama)}</text>`
  return `<svg viewBox="0 0 100 ${label ? 120 : 100}" class="peraga" data-jenis="bangun">${bentuk}${label}</svg>`
}

/** Blok Dienes: ratusan (10×10), puluhan (batang 10), satuan (kotak 1). */
export function svgDienes(s) {
  // Bisa juga diberi jumlah blok langsung (ratusan/puluhan/satuan, masing-masing ≤ 19) untuk peraga menukar/memecah.
  const blok = s.ratusan != null || s.puluhan != null || s.satuan != null
  const r = blok ? angka(s.ratusan ?? 0, "Ratusan", 0, 9) : Math.floor(angka(s.bilangan, "Bilangan", 1, 999) / 100)
  const p = blok ? angka(s.puluhan ?? 0, "Puluhan", 0, 19) : Math.floor((s.bilangan % 100) / 10)
  const sa = blok ? angka(s.satuan ?? 0, "Satuan", 0, 19) : s.bilangan % 10
  const n = r * 100 + p * 10 + sa
  const u = 5
  const isi = []
  let x = 4
  for (let i = 0; i < r; i++) {
    for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) isi.push(`<rect x="${x + b * u}" y="${10 + a * u}" width="${u}" height="${u}" fill="#F4B183" stroke="#7F4A1F" stroke-width="0.4"/>`)
    isi.push(`<rect x="${x}" y="10" width="${10 * u}" height="${10 * u}" fill="none" stroke="#7F4A1F" stroke-width="1.2" data-blok="ratusan"/>`)
    x += 10 * u + 6
  }
  for (let i = 0; i < p; i++) {
    for (let a = 0; a < 10; a++) isi.push(`<rect x="${x}" y="${10 + a * u}" width="${u}" height="${u}" fill="#9DC3E6" stroke="#1F4E79" stroke-width="0.4"/>`)
    isi.push(`<rect x="${x}" y="10" width="${u}" height="${10 * u}" fill="none" stroke="#1F4E79" stroke-width="1" data-blok="puluhan"/>`)
    x += u + 4
  }
  x += 2
  for (let i = 0; i < sa; i++) {
    isi.push(`<rect x="${x + (i % 4) * (u + 2)}" y="${10 + 10 * u - (Math.floor(i / 4) + 1) * (u + 2)}" width="${u}" height="${u}" fill="#A9D18E" stroke="#375623" stroke-width="0.8" data-blok="satuan"/>`)
  }
  x += 4 * (u + 2) + 4
  const label = s.label === false ? "" : `<text x="${x / 2}" y="${10 * u + 26}" text-anchor="middle" font-size="9">${r} ratusan, ${p} puluhan, ${sa} satuan = ${n}</text>`
  return `<svg viewBox="0 0 ${Math.max(x, 60)} ${10 * u + 30}" class="peraga lebar" data-jenis="dienes" data-bilangan="${n}">${isi.join("")}${label}</svg>`
}

/** Tabel perkalian `dari`..`sampai` (persegi), baris dan kolom judul berwarna. */
export function htmlTabelPerkalian(s) {
  const a = angka(s.dari ?? 1, "Dari", 1, 20)
  const b = angka(s.sampai ?? 10, "Sampai", a, 20)
  const kosong = !!s.kosong // true = hasil dikosongkan untuk diisi murid
  const nil = Array.from({ length: b - a + 1 }, (_, i) => a + i)
  const kepala = `<tr><th>×</th>${nil.map((v) => `<th>${v}</th>`).join("")}</tr>`
  const baris = nil.map((r) => `<tr><th>${r}</th>${nil.map((c) => `<td>${kosong ? "" : r * c}</td>`).join("")}</tr>`).join("")
  return `<table class="perkalian">${kepala}${baris}</table>`
}

/** Satu "gambar" peraga dari spesifikasinya. */
export function gambar(g) {
  switch (g?.jenis) {
    case "pecahan": return svgPecahan(g)
    case "garis_bilangan": return svgGarisBilangan(g)
    case "jam": return svgJam(g)
    case "bangun": return svgBangunDatar(g)
    case "dienes": return svgDienes(g)
    case "tabel_perkalian": return htmlTabelPerkalian(g)
    default: throw new SalahSpek(`Jenis gambar "${g?.jenis}" tidak dikenal. Pilih: pecahan, garis_bilangan, jam, bangun, dienes, tabel_perkalian.`)
  }
}
/** Satu "gambar" peraga dari spesifikasinya. */
export function gambar(g) {
  switch (g?.jenis) {
    case "pecahan": return svgPecahan(g)
    case "garis_bilangan": return svgGarisBilangan(g)
    case "jam": return svgJam(g)
    case "bangun": return svgBangunDatar(g)
    case "dienes": return svgDienes(g)
    case "tabel_perkalian": return htmlTabelPerkalian(g)
    default: throw new SalahSpek(`Jenis gambar "${g?.jenis}" tidak dikenal. Pilih: pecahan, garis_bilangan, jam, bangun, dienes, tabel_perkalian.`)
  }
}
