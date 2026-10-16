// Matematika bangun ruang yang dipakai bersama oleh server (validasi, jaring-jaring cetak, uji) dan oleh peraga 3D di
// peramban (disisipkan apa adanya ke HTML, tanpa kata kunci export). JavaScript biasa, tanpa import.
//
// Jaring-jaring disusun di bidang datar (x, y, z = 0). Tiap sisi punya induk dan engsel (garis yang dipakai bersama
// dengan induknya). Melipat = memutar sisi pada engselnya sebesar sudut lipat × (1 − buka), berantai dari induk ke anak.
// buka = 0 → bangun ruang utuh; buka = 1 → jaring-jaring datar.
// Membutuhkan SalahSpek dan angka() dari gambar.js (di HTML keduanya sudah ada; baris import dibuang saat disisipkan).

import { SalahSpek, angka } from "./gambar.js"

/** Data untuk murid SD: banyak sisi, rusuk, titik sudut (kerucut: 1 titik puncak, bukan titik sudut). */
export const BANGUN_RUANG = {
  kubus: { sisi: 6, rusuk: 12, titik: 8, ukuran: { s: [1, 20, 4] } },
  balok: { sisi: 6, rusuk: 12, titik: 8, ukuran: { p: [1, 20, 6], l: [1, 20, 4], t: [1, 20, 3] } },
  "prisma segitiga": { sisi: 5, rusuk: 9, titik: 6, ukuran: { a: [1, 20, 4], panjang: [1, 30, 6] } },
  "limas segiempat": { sisi: 5, rusuk: 8, titik: 5, ukuran: { s: [1, 20, 4], t: [1, 30, 4] } },
  "limas segitiga": { sisi: 4, rusuk: 6, titik: 4, ukuran: { a: [1, 20, 5] } },
  tabung: { sisi: 3, rusuk: 2, titik: 0, ukuran: { r: [1, 20, 2], t: [1, 30, 5] } },
  kerucut: { sisi: 2, rusuk: 1, titik: 0, puncak: 1, ukuran: { r: [1, 20, 2], t: [1, 30, 4] } },
  bola: { sisi: 1, rusuk: 0, titik: 0, ukuran: { r: [1, 20, 3] } },
}

/** Nama bangun ruang yang dikenali → kunci BANGUN_RUANG beserta ukurannya (sudah divalidasi). */
export function bangunRuang(b) {
  const nama = String(b?.bentuk ?? b?.bangun ?? "").toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim()
  const alias = { "limas segi empat": "limas segiempat", piramida: "limas segiempat", "prisma segi tiga": "prisma segitiga", "limas segi tiga": "limas segitiga", tetrahedron: "limas segitiga", silinder: "tabung" }
  const kunci = alias[nama] ?? nama
  const data = BANGUN_RUANG[kunci]
  if (!data) throw new SalahSpek(`Bangun ruang "${b?.bentuk ?? b?.bangun}" tidak dikenal. Pilih: ${Object.keys(BANGUN_RUANG).join(", ")}.`)
  const ukuran = {}
  for (const [k, [min, maks, bawaan]] of Object.entries(data.ukuran)) ukuran[k] = angka(b[k] ?? bawaan, `Ukuran ${k} ${kunci}`, min, maks, false)
  return { bentuk: kunci, ...ukuran, data }
}

const WARNA_SISI = ["#5B9BD5", "#ED7D31", "#70AD47", "#FFC000", "#9E7CC1", "#4BC4D1", "#E15759"]

/** Jaring-jaring sisi datar: [{titik:[[x,y]], induk, engsel:[[x,y],[x,y]], lipat, warna}] atau null (sisi lengkung). */
export function jaringDatar(b) {
  const L = (titik, induk, engsel, lipat) => ({ titik, induk, engsel, lipat })
  const S90 = Math.PI / 2
  let sisi
  if (b.bentuk === "kubus" || b.bentuk === "balok") {
    const p = b.bentuk === "kubus" ? b.s : b.p, l = b.bentuk === "kubus" ? b.s : b.l, t = b.bentuk === "kubus" ? b.s : b.t
    sisi = [
      L([[0, 0], [p, 0], [p, l], [0, l]], -1, null, 0), // alas
      L([[0, -t], [p, -t], [p, 0], [0, 0]], 0, [[0, 0], [p, 0]], S90), // depan
      L([[0, l], [p, l], [p, l + t], [0, l + t]], 0, [[0, l], [p, l]], S90), // belakang
      L([[-t, 0], [0, 0], [0, l], [-t, l]], 0, [[0, 0], [0, l]], S90), // kiri
      L([[p, 0], [p + t, 0], [p + t, l], [p, l]], 0, [[p, 0], [p, l]], S90), // kanan
      L([[0, l + t], [p, l + t], [p, 2 * l + t], [0, 2 * l + t]], 2, [[0, l + t], [p, l + t]], S90), // tutup
    ]
  } else if (b.bentuk === "prisma segitiga") {
    const a = b.a, P = b.panjang, h = (a * Math.sqrt(3)) / 2
    sisi = [
      L([[0, 0], [P, 0], [P, a], [0, a]], -1, null, 0),
      L([[0, -a], [P, -a], [P, 0], [0, 0]], 0, [[0, 0], [P, 0]], (2 * Math.PI) / 3),
      L([[0, a], [P, a], [P, 2 * a], [0, 2 * a]], 0, [[0, a], [P, a]], (2 * Math.PI) / 3),
      L([[0, 0], [0, a], [-h, a / 2]], 0, [[0, 0], [0, a]], S90),
      L([[P, 0], [P + h, a / 2], [P, a]], 0, [[P, 0], [P, a]], S90),
    ]
  } else if (b.bentuk === "limas segiempat") {
    const s = b.s, m = Math.hypot(b.t, s / 2), f = Math.PI - Math.atan2(b.t, s / 2)
    sisi = [
      L([[0, 0], [s, 0], [s, s], [0, s]], -1, null, 0),
      L([[0, 0], [s / 2, -m], [s, 0]], 0, [[0, 0], [s, 0]], f),
      L([[s, 0], [s + m, s / 2], [s, s]], 0, [[s, 0], [s, s]], f),
      L([[s, s], [s / 2, s + m], [0, s]], 0, [[s, s], [0, s]], f),
      L([[0, s], [-m, s / 2], [0, 0]], 0, [[0, s], [0, 0]], f),
    ]
  } else if (b.bentuk === "limas segitiga") {
    const a = b.a, h = (a * Math.sqrt(3)) / 2, f = Math.PI - Math.acos(1 / 3)
    const A = [0, 0], B = [a, 0], C = [a / 2, h]
    // Titik luar tiap segitiga sisi = pencerminan titik alas di seberang engsel.
    const cermin = (p, q, r) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], k = ((r[0] - p[0]) * dx + (r[1] - p[1]) * dy) / (dx * dx + dy * dy)
      return [2 * (p[0] + k * dx) - r[0], 2 * (p[1] + k * dy) - r[1]]
    }
    sisi = [
      L([A, B, C], -1, null, 0),
      L([A, cermin(A, B, C), B], 0, [A, B], f),
      L([B, cermin(B, C, A), C], 0, [B, C], f),
      L([C, cermin(C, A, B), A], 0, [C, A], f),
    ]
  } else return null
  sisi.forEach((s, i) => (s.warna = WARNA_SISI[i % WARNA_SISI.length]))
  return sisi
}

// ---- Transformasi kaku 3D: {R: 3×3 (baris), T: [x,y,z]} ----
const IDENTITAS = { R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], T: [0, 0, 0] }
const kali = (R, v) => R.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2])
const terap = (M, v) => { const w = kali(M.R, v); return [w[0] + M.T[0], w[1] + M.T[1], w[2] + M.T[2]] }
function rotasiSumbu(u, sudut) {
  const [x, y, z] = u, c = Math.cos(sudut), s = Math.sin(sudut), C = 1 - c
  return [
    [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
    [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
    [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
  ]
}
/** M ∘ (putar sebesar sudut pada sumbu u lewat titik a). */
function susun(M, a, u, sudut) {
  const Rr = rotasiSumbu(u, sudut)
  const Ra = kali(Rr, a)
  const lokal = { R: Rr, T: [a[0] - Ra[0], a[1] - Ra[1], a[2] - Ra[2]] }
  const R = M.R.map((baris) => [0, 1, 2].map((j) => baris[0] * lokal.R[0][j] + baris[1] * lokal.R[1][j] + baris[2] * lokal.R[2][j]))
  return { R, T: terap(M, lokal.T) }
}

/** Posisi 3D tiap sisi untuk tingkat buka 0..1 (0 = bangun utuh, 1 = jaring datar). */
export function lipatJaring(sisi, buka) {
  const M = []
  return sisi.map((s, i) => {
    if (s.induk < 0) M[i] = IDENTITAS
    else {
      const [a, b] = s.engsel
      const dx = b[0] - a[0], dy = b[1] - a[1], pj = Math.hypot(dx, dy)
      const u = [dx / pj, dy / pj, 0]
      // Sisi anak harus terangkat ke +z: arah putar mengikuti letak titik berat sisi terhadap engsel.
      const g = s.titik.reduce((t, p) => [t[0] + p[0] / s.titik.length, t[1] + p[1] / s.titik.length], [0, 0])
      const arah = Math.sign(u[0] * (g[1] - a[1]) - u[1] * (g[0] - a[0])) || 1
      M[i] = susun(M[s.induk], [a[0], a[1], 0], u, arah * s.lipat * (1 - buka))
    }
    return { titik: s.titik.map((p) => terap(M[i], [p[0], p[1], 0])), warna: s.warna }
  })
}

/** Titik sudut dan rusuk unik dari sisi-sisi 3D (dipakai saat bangun utuh untuk menandai dan menghitung). */
export function kerangka(sisi3) {
  const titik = []
  const cari = (p) => {
    let i = titik.findIndex((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 1e-6)
    if (i < 0) { titik.push(p); i = titik.length - 1 }
    return i
  }
  const rusuk = new Map()
  for (const s of sisi3) {
    const id = s.titik.map(cari)
    id.forEach((a, k) => {
      const b = id[(k + 1) % id.length]
      rusuk.set(a < b ? `${a}-${b}` : `${b}-${a}`, [Math.min(a, b), Math.max(a, b)])
    })
  }
  return { titik, rusuk: [...rusuk.values()] }
}

/** Permukaan lengkung tabung (rebah, menggelinding membuka) sebagai kisi titik [baris][kolom]. */
export function selimutTabung(r, t, buka, n = 48) {
  const R = buka >= 0.999 ? Infinity : r / (1 - buka)
  const keliling = 2 * Math.PI * r
  return [0, t].map((y) =>
    Array.from({ length: n + 1 }, (_, k) => {
      const xi = -keliling / 2 + (k / n) * keliling
      if (R === Infinity) return [Math.PI * r + xi, y, 0]
      const f = xi / R
      return [Math.PI * r + R * Math.sin(f), y, R * (1 - Math.cos(f))]
    }),
  )
}
/** Tutup tabung: pusat dan sudut putar (pada sumbu x lewat titik singgung) untuk tingkat buka. */
export function tutupTabung(r, t, buka) {
  return [
    { pusat: [Math.PI * r, -r, 0], engsel: [Math.PI * r, 0, 0], sudut: (-Math.PI / 2) * (1 - buka) },
    { pusat: [Math.PI * r, t + r, 0], engsel: [Math.PI * r, t, 0], sudut: (Math.PI / 2) * (1 - buka) },
  ]
}
/** Titik pada lingkaran tutup tabung setelah diputar. */
export function lingkaranTutup(tutup, r, n = 48) {
  const Rr = rotasiSumbu([1, 0, 0], tutup.sudut)
  return Array.from({ length: n }, (_, k) => {
    const a = (k / n) * 2 * Math.PI
    const p = [tutup.pusat[0] + r * Math.cos(a) - tutup.engsel[0], tutup.pusat[1] + r * Math.sin(a) - tutup.engsel[1], 0]
    const q = kali(Rr, p)
    return [q[0] + tutup.engsel[0], q[1] + tutup.engsel[1], q[2] + tutup.engsel[2]]
  })
}

/** Selimut kerucut (alas di tanah berpusat di 0, menyinggung selimut di (r,0,0)) sebagai kisi [jarak dari puncak][sudut]. */
export function selimutKerucut(r, t, buka, n = 48, m = 8) {
  const s = Math.hypot(r, t)
  const theta = (2 * Math.PI * r) / s
  const rho = r + (s - r) * buka
  const beta = Math.asin(Math.min(1, rho / s))
  const alfa = Math.atan2(t, -r) * (1 - buka) // arah P→puncak
  const P = [r, 0, 0]
  const A = [P[0] + s * Math.cos(alfa), 0, s * Math.sin(alfa)]
  // g = arah puncak→P; sumbu = g diputar −β di bidang xz; e1 = arah tegak lurus sumbu menuju P.
  const ga = Math.atan2(P[2] - A[2], P[0] - A[0])
  const sumbu = [Math.cos(ga - beta), 0, Math.sin(ga - beta)]
  const e1 = [Math.cos(ga - beta + Math.PI / 2), 0, Math.sin(ga - beta + Math.PI / 2)]
  const e2 = [0, 1, 0]
  return Array.from({ length: m + 1 }, (_, i) => {
    const u = (i / m) * s
    return Array.from({ length: n + 1 }, (_, k) => {
      const phi = -theta / 2 + (k / n) * theta
      const psi = (phi * s) / rho
      const c = Math.cos(beta), sb = Math.sin(beta)
      return [0, 1, 2].map((d) => A[d] + u * (c * sumbu[d] + sb * (Math.cos(psi) * e1[d] + Math.sin(psi) * e2[d])))
    })
  })
}

const f2 = (v) => +v.toFixed(2)

/** Jaring-jaring siap cetak (SVG) — sisi datar, tabung, atau kerucut. Bola tidak punya jaring-jaring. */
export function svgJaring(b) {
  const garis = 'stroke="#222" stroke-width="0.6" vector-effect="non-scaling-stroke"'
  let isi, kotak
  const datar = jaringDatar(b)
  if (datar) {
    isi = datar.map((s) => `<polygon points="${s.titik.map((p) => `${f2(p[0])},${f2(-p[1])}`).join(" ")}" fill="${s.warna}" fill-opacity="0.25" ${garis}/>`).join("")
    const xs = datar.flatMap((s) => s.titik.map((p) => p[0])), ys = datar.flatMap((s) => s.titik.map((p) => -p[1]))
    kotak = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  } else if (b.bentuk === "tabung") {
    const K = 2 * Math.PI * b.r
    isi = `<rect x="0" y="${-b.t}" width="${f2(K)}" height="${b.t}" fill="${WARNA_SISI[0]}" fill-opacity="0.25" ${garis}/><circle cx="${f2(K / 2)}" cy="${b.r}" r="${b.r}" fill="${WARNA_SISI[1]}" fill-opacity="0.25" ${garis}/><circle cx="${f2(K / 2)}" cy="${-b.t - b.r}" r="${b.r}" fill="${WARNA_SISI[1]}" fill-opacity="0.25" ${garis}/>`
    kotak = [0, -b.t - 2 * b.r, K, 2 * b.r]
  } else if (b.bentuk === "kerucut") {
    const s = Math.hypot(b.r, b.t), th = (2 * Math.PI * b.r) / s
    // Puncak di (0,0), busur menghadap ke bawah, alas menyinggung busur di tengah.
    const p = (a) => `${f2(s * Math.sin(a))},${f2(s * Math.cos(a))}`
    isi = `<path d="M0,0 L${p(-th / 2)} A${f2(s)},${f2(s)} 0 ${th > Math.PI ? 1 : 0} 0 ${p(th / 2)} Z" fill="${WARNA_SISI[0]}" fill-opacity="0.25" ${garis}/><circle cx="0" cy="${f2(s + b.r)}" r="${b.r}" fill="${WARNA_SISI[1]}" fill-opacity="0.25" ${garis}/>`
    const lebar = th >= Math.PI ? s : s * Math.sin(th / 2)
    kotak = [-Math.max(lebar, b.r), th >= Math.PI ? -s : 0, Math.max(lebar, b.r), s + 2 * b.r]
  } else return `<p class="ket">Bola tidak memiliki jaring-jaring.</p>`
  const m = 0.04 * Math.max(kotak[2] - kotak[0], kotak[3] - kotak[1])
  return `<svg viewBox="${f2(kotak[0] - m)} ${f2(kotak[1] - m)} ${f2(kotak[2] - kotak[0] + 2 * m)} ${f2(kotak[3] - kotak[1] + 2 * m)}" class="peraga jaring" data-jenis="jaring" data-bentuk="${b.bentuk}">${isi}</svg>`
}

/** Gambar isometrik susunan kubus satuan p × l × t (untuk cetak dan peramban tanpa WebGL). */
export function svgKubusSatuan(p, l, t) {
  const u = 10, cx = 0.866 * u, cy = 0.5 * u
  const proj = (x, y, z) => [(x - y) * cx, (x + y) * cy - z * u]
  const poli = (pts, w) => `<polygon points="${pts.map((q) => q.map(f2).join(",")).join(" ")}" fill="${w}" stroke="#1F3864" stroke-width="0.6"/>`
  const isi = []
  // Urutan gambar dari yang terjauh (x + y + z kecil) ke terdekat; yang terlihat hanya sisi atas dan dua sisi depan.
  const urut = []
  for (let z = 0; z < t; z++) for (let x = 0; x < p; x++) for (let y = 0; y < l; y++) urut.push([x, y, z])
  urut.sort((m, n) => m[0] + m[1] + m[2] - (n[0] + n[1] + n[2]))
  for (const [x, y, z] of urut) {
        const P = (a, b, c) => proj(x + a, y + b, z + c)
        isi.push(`<g data-kubus="1">${poli([P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)], "#BDD7EE")}${poli([P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)], "#9DC3E6")}${poli([P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)], "#6FA8DC")}</g>`)
      }
  const xs = [proj(p, 0, 0)[0], proj(0, l, 0)[0]], ys = [proj(0, 0, t)[1], proj(p, l, 0)[1]]
  return `<svg viewBox="${f2(xs[1] - 4)} ${f2(ys[0] - 4)} ${f2(xs[0] - xs[1] + 8)} ${f2(ys[1] - ys[0] + 8)}" class="peraga" data-jenis="kubus_satuan" data-jumlah="${p * l * t}">${isi.join("")}</svg>`
}
