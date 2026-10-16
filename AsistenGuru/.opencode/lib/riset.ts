// Riset web terkendali: hanya sumber dari domain tepercaya yang diteruskan ke asisten.

import type { Kebijakan } from "./berkas.ts"

/** Bawaan jika sekolah belum mengatur `riset.domain_tepercaya` di sekolah/kebijakan.json. */
export const DOMAIN_BAWAAN = [
  "kemendikdasmen.go.id",
  "kemdikbud.go.id",
  "kemenag.go.id",
  "belajar.id",
  "static.sc.cloudapp.web.id",
  "bps.go.id",
  "bmkg.go.id",
  "id.wikipedia.org",
]

export function aturanRiset(kebijakan: Kebijakan) {
  const r = kebijakan.riset ?? {}
  const domain = r.domain_tepercaya?.length ? r.domain_tepercaya : DOMAIN_BAWAAN
  return { web: r.web !== false, domain: domain.map((d) => d.toLowerCase().replace(/^\*?\.?/, "")), dariSekolah: !!r.domain_tepercaya?.length }
}

export function domainDari(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }
}

export function tepercaya(url: string, domain: string[]): boolean {
  const h = domainDari(url)
  return !!h && domain.some((d) => h === d || h.endsWith(`.${d}`))
}

const ENTITAS: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }

/** Teks bacaan dari HTML: buang skrip, gaya, navigasi, dan kepala/kaki halaman. */
export function teksHtml(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|header|footer|form|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENTITAS[e.toLowerCase()] ?? m),
    )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    // Sisa atribut dari tag yang tidak terbuang rapi (misalnya atribut berisi "=>" di situs Svelte/React).
    .split("\n")
    .filter((b) => (b.match(/[\w-]+="[^"]*"/g) ?? []).length < 2 && !/\w+\([^)]*\)"\s/.test(b))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Potongan teks yang paling banyak memuat kata kunci (jendela per paragraf). */
export function bagianRelevan(teks: string, kueri: string, maks = 3500): string {
  const kk = kueri.toLowerCase().split(/[^a-z0-9]+/).filter((k) => k.length > 3)
  const par = teks.split(/\n\n+/).filter((p) => p.trim().length > 40)
  if (!par.length) return teks.slice(0, maks)
  const skor = par.map((p) => kk.reduce((n, k) => n + p.toLowerCase().split(k).length - 1, 0))
  let terbaik = 0
  skor.forEach((s, i) => (s > skor[terbaik] ? (terbaik = i) : 0))
  let out = ""
  for (let i = Math.max(0, terbaik - 1); i < par.length && out.length < maks; i++) out += par[i] + "\n\n"
  return out.slice(0, maks).trim()
}

export async function ambil(url: string, ms = 20000): Promise<{ jenis: "html" | "pdf" | "lain"; teks?: string; data?: Uint8Array }> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 asisten-guru" }, signal: ctl.signal, redirect: "follow" })
    if (!res.ok) return { jenis: "lain" }
    const ct = res.headers.get("content-type") ?? ""
    if (ct.includes("pdf") || /\.pdf($|\?)/i.test(url)) return { jenis: "pdf", data: new Uint8Array(await res.arrayBuffer()) }
    if (ct.includes("html") || ct.includes("text")) return { jenis: "html", teks: teksHtml(await res.text()) }
    return { jenis: "lain" }
  } catch {
    return { jenis: "lain" }
  } finally {
    clearTimeout(t)
  }
}
