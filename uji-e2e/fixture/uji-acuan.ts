// Uji data acuan resmi: JP per minggu (Permendikdasmen 13/2025) dan libur nasional (SKB 3 Menteri 2026, 2027).
// Pakai: cd uji-e2e/fixture && bun uji-acuan.ts
import { liburTahunAjaran } from "../../AsistenGuru/.opencode/lib/libur.ts"
import { acuanJp } from "../../AsistenGuru/.opencode/lib/struktur.ts"
let gagal = 0
const cek = (n: string, b: boolean, i = "") => { console.log(`${b ? "✔" : "✖"} ${n}${!b && i ? `\n    ${i}` : ""}`); if (!b) gagal++ }
const jp = (k: number, m: string[]) => acuanJp(k, m).baris.map((b) => b.intraMinggu)
cek("kelas 1: Pancasila 4, B. Indonesia 7, Matematika 4, Seni 3 (intrakurikuler)", JSON.stringify(jp(1, ["Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", "Seni Rupa"])) === "[4,7,4,3]")
cek("kelas 2: B. Indonesia 8, Matematika 5", JSON.stringify(jp(2, ["bahasa indonesia", "mtk"])) === "[8,5]")
cek("kelas 4: IPAS 5, B. Inggris 2; kelas 1 tidak ada IPAS", JSON.stringify(jp(4, ["IPAS", "Bahasa Inggris"])) === "[5,2]" && jp(1, ["IPAS"])[0] === null)
cek("kelas 6: 32 minggu (Matematika 160/32 = 5)", acuanJp(6, ["Matematika"]).minggu === 32 && jp(6, ["Matematika"])[0] === 5)
cek("total dengan kokurikuler kelas 1 Pancasila = 5", acuanJp(1, ["Pancasila"]).baris[0].totalMinggu === 5)
const l = liburTahunAjaran("2026/2027")
const ada = (t: string, n: RegExp) => l.kegiatan.some((k) => k.mulai === t && n.test(k.nama))
cek("2026/2027: semester 1 berisi HUT RI, Maulid Nabi (25 Agustus 2026), cuti Natal 24 Des, Natal", ada("2026-08-17", /Kemerdekaan/) && ada("2026-08-25", /Maulid/) && ada("2026-12-24", /Natal/) && ada("2026-12-25", /Natal/))
cek("2026/2027: semester 2 berisi Isra Mikraj 5 Jan, Nyepi 8 Mar, Idulfitri 10–11 Mar + cuti 9, 12, 15 Mar, Iduladha 17 Mei, Waisak 20 Mei", ada("2027-01-05", /Isra/) && ada("2027-03-08", /Nyepi/) && l.kegiatan.some((k) => k.mulai === "2027-03-10" && k.akhir === "2027-03-11") && ["2027-03-09", "2027-03-12", "2027-03-15"].every((t) => ada(t, /Idulfitri/)) && ada("2027-05-17", /Iduladha/) && ada("2027-05-20", /Waisak/))
cek("2026/2027: tidak memuat libur di luar Juli 2026–Juni 2027", l.kegiatan.every((k) => k.mulai >= "2026-07-01" && k.mulai <= "2027-06-30") && !ada("2027-08-17", /./))
cek("sumber kedua SKB disebut", l.sumber.length === 2 && l.sumber[1].includes("1205"))
cek("tahun ajaran tanpa data → dilaporkan", liburTahunAjaran("2027/2028").tidakAda.includes(2028))
console.log(gagal ? `\n${gagal} pemeriksaan GAGAL` : "\nSemua pemeriksaan lulus")
process.exit(gagal ? 1 : 0)
