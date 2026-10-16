// Bentuk definisi alat yang tidak bergantung pada versi API OpenCode.
// Plugin di .opencode/plugins/asisten-guru.ts mendaftarkannya ke OpenCode 2; uji pustaka bisa memanggil `jalankan` langsung.

/** JSON Schema masukan alat (selalu objek). */
export type Skema = {
  type: "object"
  properties: Record<string, Record<string, unknown>>
  required?: string[]
  additionalProperties: false
}

export type Alat<A = any> = {
  nama: string
  deskripsi: string
  masukan: Skema
  /** `akar` = folder AsistenGuru. Lempar `Gagal` untuk kesalahan yang perlu diperbaiki asisten atau guru. */
  jalankan(args: A, akar: string): Promise<string>
}

export const alat = <A>(a: Alat<A>) => a
