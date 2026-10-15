// Penulis .xlsx (Excel) tanpa dependensi, untuk berkas siap pakai dan siap cetak:
// teks, angka, rumus, gaya, lebar kolom, sel gabung, bekukan panel, validasi isian, pewarnaan bersyarat,
// proteksi sel rumus (tanpa kata sandi), cetak lanskap selebar 1 halaman dengan judul kolom berulang, dan nomor halaman.

import { buatZip, xml } from "./zip.ts"

// Indeks gaya sel (urutan harus sama dengan <cellXfs> di STYLES)
export const G = {
  biasa: 0,
  judul: 1, // tebal 14
  kepala: 2, // judul kolom
  sel: 3, // teks berbingkai (terkunci)
  tengah: 4, // angka/rumus berbingkai (terkunci)
  catatan: 5, // miring abu-abu kecil
  isian: 6, // sel isian kuning (tidak terkunci)
  persen: 7, // 0% (terkunci)
  libur: 8, // abu-abu, tidak terkunci
  selInput: 9, // teks berbingkai, tidak terkunci (nama siswa)
  judulTengah: 10, // tebal 14 rata tengah
  subjudul: 11, // tebal 11 rata tengah
  tengahTebal: 12, // jumlah/rata-rata
  ttd: 13, // tanda tangan
  ttdNama: 14, // nama penanda tangan (tebal bergaris bawah)
  tengahInput: 15, // sel isian putih rata tengah, tidak terkunci
  kiriTebal: 16, // label tebal berbingkai
} as const

// Indeks format bersyarat (urutan sama dengan <dxfs>)
export const DXF = { kuning: 0, biru: 1, merah: 2, kurang: 3 } as const

export type Sel = null | string | number | { v?: string | number; f?: string; s?: number }
export type Validasi = { sqref: string; jenis: "list" | "decimal"; rumus1: string; rumus2?: string; judul: string; pesan: string }
export type Warna = { sqref: string; aturan: { op: "equal" | "lessThan"; nilai: string; dxf: number }[] }
export type Lembar = {
  nama: string
  baris: Sel[][]
  lebar?: number[]
  gabung?: string[]
  beku?: { baris: number; kolom: number }
  validasi?: Validasi[]
  warna?: Warna[]
  kunci?: boolean
  cetak?: { kertas?: "A4" | "F4"; judulBaris?: [number, number]; potret?: boolean }
  tinggi?: Record<number, number> // tinggi baris tertentu (1-based)
}

export function kolom(i: number): string {
  let s = ""
  i++
  while (i > 0) {
    const m = (i - 1) % 26
    s = String.fromCharCode(65 + m) + s
    i = Math.floor((i - 1) / 26)
  }
  return s
}

function selXml(sel: Sel, ref: string): string {
  if (sel === null || sel === undefined) return ""
  const o = typeof sel === "object" ? sel : { v: sel }
  const s = o.s ? ` s="${o.s}"` : ""
  if (o.f) return `<c r="${ref}"${s}><f>${xml(o.f.replace(/^=/, ""))}</f></c>`
  if (o.v === undefined || o.v === "") return o.s ? `<c r="${ref}"${s}/>` : ""
  if (typeof o.v === "number") return `<c r="${ref}"${s}><v>${o.v}</v></c>`
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xml(o.v)}</t></is></c>`
}

function lembarXml(l: Lembar): string {
  const pane = l.beku
    ? `<pane xSplit="${l.beku.kolom}" ySplit="${l.beku.baris}" topLeftCell="${kolom(l.beku.kolom)}${l.beku.baris + 1}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight"/>`
    : ""
  const views = `<sheetViews><sheetView workbookViewId="0" showGridLines="0" zoomScale="100">${pane}</sheetView></sheetViews>`
  const cols = l.lebar?.length ? `<cols>${l.lebar.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : ""
  const rows = l.baris
    .map((r, i) => {
      const ht = l.tinggi?.[i + 1] ? ` ht="${l.tinggi[i + 1]}" customHeight="1"` : ""
      return `<row r="${i + 1}"${ht}>${r.map((c, k) => selXml(c, `${kolom(k)}${i + 1}`)).join("")}</row>`
    })
    .join("")
  const proteksi = l.kunci
    ? '<sheetProtection sheet="1" objects="1" scenarios="1" formatCells="0" formatColumns="0" formatRows="0" sort="0" autoFilter="0"/>'
    : ""
  const merge = l.gabung?.length ? `<mergeCells count="${l.gabung.length}">${l.gabung.map((g) => `<mergeCell ref="${g}"/>`).join("")}</mergeCells>` : ""
  let prio = 1
  const warna = (l.warna ?? [])
    .map(
      (w) =>
        `<conditionalFormatting sqref="${w.sqref}">${w.aturan
          .map((a) => `<cfRule type="cellIs" dxfId="${a.dxf}" priority="${prio++}" operator="${a.op}"><formula>${xml(a.nilai)}</formula></cfRule>`)
          .join("")}</conditionalFormatting>`,
    )
    .join("")
  const val = l.validasi?.length
    ? `<dataValidations count="${l.validasi.length}">${l.validasi
        .map(
          (v) =>
            `<dataValidation type="${v.jenis}"${v.jenis === "decimal" ? ' operator="between"' : ""} allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="${xml(v.judul)}" error="${xml(v.pesan)}" promptTitle="${xml(v.judul)}" prompt="${xml(v.pesan)}" sqref="${v.sqref}"><formula1>${xml(v.rumus1)}</formula1>${v.rumus2 ? `<formula2>${xml(v.rumus2)}</formula2>` : ""}</dataValidation>`,
        )
        .join("")}</dataValidations>`
    : ""
  const kertas = l.cetak?.kertas === "F4" ? 14 : 9
  const orient = l.cetak?.potret ? "portrait" : "landscape"
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>${views}<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rows}</sheetData>${proteksi}${merge}${warna}${val}<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="${kertas}" orientation="${orient}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;C&amp;8Halaman &amp;P dari &amp;N</oddFooter></headerFooter></worksheet>`
}

const B = '<border><left style="thin"><color rgb="FF808080"/></left><right style="thin"><color rgb="FF808080"/></right><top style="thin"><color rgb="FF808080"/></top><bottom style="thin"><color rgb="FF808080"/></bottom><diagonal/></border>'
const BUKA = '<protection locked="0"/>'
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><i/><sz val="9"/><color rgb="FF595959"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font><font><b/><u/><sz val="10"/><name val="Arial"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E2F3"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF9E5"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${B}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="17">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1" applyProtection="1"><alignment horizontal="center" vertical="center"/>${BUKA}</xf>
<xf numFmtId="9" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1" applyProtection="1"><alignment horizontal="center" vertical="center"/>${BUKA}</xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1" applyProtection="1"><alignment vertical="center"/>${BUKA}</xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1" applyProtection="1"><alignment horizontal="center" vertical="center"/>${BUKA}</xf>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="4"><dxf><fill><patternFill patternType="solid"><bgColor rgb="FFFFE699"/></patternFill></fill></dxf><dxf><fill><patternFill patternType="solid"><bgColor rgb="FFBDD7EE"/></patternFill></fill></dxf><dxf><font><b/><color rgb="FF9C0006"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFF8CBAD"/></patternFill></fill></dxf><dxf><font><color rgb="FF9C0006"/></font><fill><patternFill patternType="solid"><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf></dxfs>
</styleSheet>`

export function buatXlsx(lembar: Lembar[]): Uint8Array {
  const nama = lembar.map((l) => l.nama.replace(/[\\/?*[\]:]/g, "").slice(0, 31))
  const judul = lembar
    .map((l, i) => (l.cetak?.judulBaris ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${xml(nama[i])}'!$${l.cetak.judulBaris[0]}:$${l.cetak.judulBaris[1]}</definedName>` : ""))
    .join("")
  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${lembar.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${nama.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${judul ? `<definedNames>${judul}</definedNames>` : ""}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${lembar.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${lembar.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": STYLES,
  }
  lembar.forEach((l, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = lembarXml(l)))
  return buatZip(files)
}
