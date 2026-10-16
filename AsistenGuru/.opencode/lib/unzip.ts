// Pembaca ZIP minimal (metode stored dan deflate) untuk paket rilis dari GitHub, tanpa dependensi.

import { inflateRawSync } from "node:zlib"

/** Membaca semua berkas di ZIP lewat central directory. Folder (nama berakhiran "/") dilewati. */
export function bacaZip(zip: Uint8Array): Map<string, Uint8Array> {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  let eocd = -1
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 22 - 65535); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error("Berkas ZIP rusak atau tidak lengkap (akhir arsip tidak ditemukan).")
  const jumlah = v.getUint16(eocd + 10, true)
  let p = v.getUint32(eocd + 16, true)
  const dec = new TextDecoder()
  const out = new Map<string, Uint8Array>()
  for (let n = 0; n < jumlah; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("Berkas ZIP rusak (central directory tidak sah).")
    const metode = v.getUint16(p + 10, true)
    const ukuranZip = v.getUint32(p + 20, true)
    const panjangNama = v.getUint16(p + 28, true)
    const panjangEkstra = v.getUint16(p + 30, true)
    const panjangKomentar = v.getUint16(p + 32, true)
    const lokal = v.getUint32(p + 42, true)
    const nama = dec.decode(zip.subarray(p + 46, p + 46 + panjangNama))
    p += 46 + panjangNama + panjangEkstra + panjangKomentar
    if (nama.endsWith("/")) continue
    const awal = lokal + 30 + v.getUint16(lokal + 26, true) + v.getUint16(lokal + 28, true)
    const mentah = zip.subarray(awal, awal + ukuranZip)
    if (metode === 0) out.set(nama, mentah)
    else if (metode === 8) out.set(nama, new Uint8Array(inflateRawSync(mentah)))
    else throw new Error(`Metode kompresi ZIP ${metode} tidak didukung (${nama}).`)
  }
  return out
}
