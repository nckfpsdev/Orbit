import type { Business } from "./types";
import { EXPORT_FIELDS } from "./constants";
import { zipSync, strToU8 } from "fflate";
export function sanitizeCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /^[\s\u0000-\u001f]*[=+@-]/.test(s) ? `'${s}` : s;
}
export function csvExport(businesses: Business[], fields: string[]) {
  const safe = fields.filter((f) =>
    EXPORT_FIELDS.includes(f as (typeof EXPORT_FIELDS)[number]),
  );
  const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return (
    "\ufeff" +
    [
      safe.map(quote).join(";"),
      ...businesses.map((b) =>
        safe.map((f) => quote(sanitizeCell(b[f as keyof Business]))).join(";"),
      ),
    ].join("\r\n")
  );
}
const xml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
function column(i: number) {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
export function xlsxExport(
  businesses: Business[],
  fields: string[],
): Uint8Array {
  const safe = fields.filter((f) =>
    EXPORT_FIELDS.includes(f as (typeof EXPORT_FIELDS)[number]),
  );
  const values = [
    safe,
    ...businesses.map((b) =>
      safe.map((f) => sanitizeCell(b[f as keyof Business])),
    ),
  ];
  const sheet = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${values.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => `<c r="${column(j)}${i + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(String(v))}</t></is></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const files: Record<string, string> = {
    "[Content_Types].xml":
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels":
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml":
      '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Leads Orbit" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels":
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": sheet,
  };
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])),
    { level: 6 },
  );
}
