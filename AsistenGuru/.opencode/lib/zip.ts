// Penulis ZIP minimal (metode "stored", tanpa kompresi) untuk membuat .docx dan .xlsx tanpa dependensi.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function buatZip(files: Record<string, string | Uint8Array>): Uint8Array {
  const enc = new TextEncoder()
  const lokal: Uint8Array[] = []
  const pusat: Uint8Array[] = []
  let offset = 0
  // Tanggal DOS tetap: 2026-01-01 00:00
  const dosTime = 0
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1

  for (const [nama, isi] of Object.entries(files)) {
    const namaB = enc.encode(nama)
    const data = typeof isi === "string" ? enc.encode(isi) : isi
    const crc = crc32(data)

    const h = new DataView(new ArrayBuffer(30))
    h.setUint32(0, 0x04034b50, true)
    h.setUint16(4, 20, true)
    h.setUint16(6, 0x0800, true) // UTF-8
    h.setUint16(8, 0, true)
    h.setUint16(10, dosTime, true)
    h.setUint16(12, dosDate, true)
    h.setUint32(14, crc, true)
    h.setUint32(18, data.length, true)
    h.setUint32(22, data.length, true)
    h.setUint16(26, namaB.length, true)
    h.setUint16(28, 0, true)
    lokal.push(new Uint8Array(h.buffer), namaB, data)

    const c = new DataView(new ArrayBuffer(46))
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(4, 20, true)
    c.setUint16(6, 20, true)
    c.setUint16(8, 0x0800, true)
    c.setUint16(10, 0, true)
    c.setUint16(12, dosTime, true)
    c.setUint16(14, dosDate, true)
    c.setUint32(16, crc, true)
    c.setUint32(20, data.length, true)
    c.setUint32(24, data.length, true)
    c.setUint16(28, namaB.length, true)
    c.setUint32(42, offset, true)
    pusat.push(new Uint8Array(c.buffer), namaB)

    offset += 30 + namaB.length + data.length
  }

  const ukuranPusat = pusat.reduce((s, b) => s + b.length, 0)
  const e = new DataView(new ArrayBuffer(22))
  e.setUint32(0, 0x06054b50, true)
  e.setUint16(8, Object.keys(files).length, true)
  e.setUint16(10, Object.keys(files).length, true)
  e.setUint32(12, ukuranPusat, true)
  e.setUint32(16, offset, true)

  const semua = [...lokal, ...pusat, new Uint8Array(e.buffer)]
  const out = new Uint8Array(semua.reduce((s, b) => s + b.length, 0))
  let p = 0
  for (const b of semua) {
    out.set(b, p)
    p += b.length
  }
  return out
}

export function xml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
