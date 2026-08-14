/**
 * Parser CSV/TSV แบบบริสุทธิ์ (ไม่พึ่ง dependency) — รองรับ BOM, ฟิลด์ในเครื่องหมายคำพูด, \r\n
 * ไฟล์ยามาฮ่า export เป็น CSV (แปลงจาก .xls ด้วย Excel "Save As CSV")
 */

/** เดาตัวคั่น: แท็บถ้ามีในบรรทัดแรก (คัดลอกจาก Excel) ไม่งั้นคอมมา */
export function detectDelimiter(text: string): "," | "\t" {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  return firstLine.includes("\t") ? "\t" : ",";
}

/** แปลงข้อความ CSV/TSV → ตาราง string[][] (ตัด BOM, เว้นบรรทัดว่างท้ายไฟล์) */
export function parseCsv(text: string, delimiter?: "," | "\t"): string[][] {
  const delim = delimiter ?? detectDelimiter(text);
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else {
      field += c;
    }
  }
  // ฟิลด์/แถวสุดท้าย (ถ้าไฟล์ไม่จบด้วยขึ้นบรรทัด)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}
