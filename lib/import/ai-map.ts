/** ตัวช่วยจับคู่คอลัมน์ด้วย AI (E12 FAM-1068 · pure เพื่อเทสได้) */
import type { ImportUnit } from "@/lib/import/units";

/** ฟิลด์ที่ให้ AI จับคู่ + หัวคอลัมน์ canonical (ต้องตรงกับ HEADER_MAP ใน units.ts) + คำอธิบาย */
export const AI_IMPORT_FIELDS: ReadonlyArray<{ field: keyof ImportUnit; canonical: string; label: string }> = [
  { field: "variantCode", canonical: "แบบรถ", label: "รหัสรุ่น/แบบรถ" },
  { field: "modelName", canonical: "รุ่นรถ", label: "ชื่อรุ่น" },
  { field: "colorCode", canonical: "รหัสสี", label: "รหัสสี" },
  { field: "colorName", canonical: "สี", label: "ชื่อสี" },
  { field: "engineNo", canonical: "หมายเลขเครื่อง", label: "เลขเครื่อง" },
  { field: "frameNo", canonical: "หมายเลขตัวถัง", label: "เลขตัวถัง/เฟรม" },
  { field: "cost", canonical: "ต้นทุนต่อหน่วย", label: "ต้นทุนต่อคัน" },
  { field: "branchCode", canonical: "DOC_BRANCH_CODE", label: "รหัสสาขา" },
  { field: "receivedAt", canonical: "วันที่ใบรับ", label: "วันที่รับเข้า" },
  { field: "sku", canonical: "รหัสผลิตภัณฑ์", label: "รหัสผลิตภัณฑ์/SKU" },
];

const FIELD_SET = new Set<string>(AI_IMPORT_FIELDS.map((f) => f.field));

/**
 * ล้างผลจาก AI: JSON.parse (ตัด code fence) → เก็บเฉพาะ key ที่เป็นฟิลด์จริง และ value ที่เป็นหัวคอลัมน์ที่มีจริง
 * กัน AI แต่งชื่อคอลัมน์ที่ไม่มี
 */
export function parseColumnMap(raw: string, headers: readonly string[]): Record<string, string> {
  const headerSet = new Set(headers.map((h) => h.trim()));
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    return {};
  }
  if (!obj || typeof obj !== "object") {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [field, src] of Object.entries(obj as Record<string, unknown>)) {
    if (FIELD_SET.has(field) && typeof src === "string" && headerSet.has(src.trim())) {
      out[field] = src.trim();
    }
  }
  return out;
}

/** aiMap: { field: sourceHeader } → เขียนหัวตารางใหม่เป็น canonical เพื่อให้ extractUnits ทำงานต่อ */
export function remapHeaders(rows: readonly string[][], aiMap: Record<string, string>): string[][] {
  if (rows.length === 0) {
    return [];
  }
  const sourceToCanonical = new Map<string, string>();
  for (const { field, canonical } of AI_IMPORT_FIELDS) {
    const src = aiMap[field];
    if (src) {
      sourceToCanonical.set(src.trim(), canonical);
    }
  }
  const newHeader = rows[0].map((h) => sourceToCanonical.get(h.trim()) ?? h);
  return [newHeader, ...rows.slice(1).map((r) => [...r])];
}
