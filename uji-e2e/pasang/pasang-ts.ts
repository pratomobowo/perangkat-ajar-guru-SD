// Menjalankan aturan pasang/perbarui milik alat perbarui_paket (lib/paket.ts) dari berkas zip lokal.
// Pakai: bun pasang-ts.ts <zip> <folder tujuan>
import { readFileSync } from "node:fs"
import { isiPaket, paketTerpasang, terapkanPaket } from "../../AsistenGuru/.opencode/lib/paket.ts"
const [zip, tujuan] = process.argv.slice(2)
const lama = await paketTerpasang(tujuan)
const h = await terapkanPaket(tujuan, isiPaket(new Uint8Array(readFileSync(zip))), lama?.versi ?? null)
console.log(JSON.stringify(h))
