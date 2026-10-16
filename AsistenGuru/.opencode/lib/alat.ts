// Bentuk definisi alat yang tidak bergantung pada versi API OpenCode.
// Plugin di .opencode/plugins/asisten-guru.ts mendaftarkannya ke OpenCode 2; uji pustaka bisa memanggil `jalankan` langsung.

/** JSON Schema masukan alat (selalu objek). */
export type Skema = {
  type: "object"
  properties: Record<string, Record<string, unknown>>
  required?: string[]
  additionalProperties: false
}

/** Hasil pencarian web dari OpenCode (`ctx.websearch`). */
export type HasilWeb = { url: string; title?: string; content?: string }

/** Layanan dari OpenCode yang diteruskan plugin ke alat. Uji bisa memberi tiruan. */
export type Konteks = { cariWeb?: (kueri: string) => Promise<HasilWeb[]> }

export type Alat<A = any> = {
  nama: string
  deskripsi: string
  masukan: Skema
  /** `akar` = folder AsistenGuru. Lempar `Gagal` untuk kesalahan yang perlu diperbaiki asisten atau guru. */
  jalankan(args: A, akar: string, konteks: Konteks): Promise<string>
}

export const alat = <A>(a: Alat<A>) => a
