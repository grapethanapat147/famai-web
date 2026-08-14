/**
 * แปลงตาราง CSV จากไฟล์ยามาฮ่า → หน่วยรถสำหรับนำเข้า (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * แม็ปหัวคอลัมน์ไทย → ฟิลด์ · ตรวจเบื้องต้น (ฝั่ง server ตรวจซ้ำ + resolve รหัส→id)
 */

export type ImportActionResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string };

export type ImportUnit = {
  branchCode: string;
  variantCode: string;
  modelName: string;
  colorCode: string;
  colorName: string;
  engineNo: string;
  frameNo: string;
  sku: string;
  unitKind: string;
  cost: number;
  costVat: number;
  receivedAt: string;
  supplier: string;
  supplierInvNo: string;
  supplierTaxId: string;
  srcFile: string;
};

/** ชื่อหัวคอลัมน์ที่ยอมรับ (ไทย/อังกฤษ) → ฟิลด์ */
const HEADER_MAP: Record<string, keyof ImportUnit> = {
  DOC_BRANCH_CODE: "branchCode",
  แบบรถ: "variantCode",
  รุ่นรถ: "modelName",
  รหัสสี: "colorCode",
  สี: "colorName",
  หมายเลขเครื่อง: "engineNo",
  หมายเลขตัวถัง: "frameNo",
  รหัสผลิตภัณฑ์: "sku",
  ประเภทรถ: "unitKind",
  ต้นทุนต่อหน่วย: "cost",
  ภาษีของต้นทุนต่อหน่วย: "costVat",
  วันที่ใบรับ: "receivedAt",
  ชื่อเจ้าหนี้: "supplier",
  เลขที่ใบกำกับภาษี: "supplierInvNo",
  TAXID: "supplierTaxId",
  _file: "srcFile",
};

function toNum(s: string | undefined): number {
  const n = Number((s ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** rows[0] = หัวตาราง · คืนหน่วยรถ + ดัชนีแถว (ไว้อ้างอิงตอนแจ้ง error) */
export function extractUnits(rows: readonly string[][]): ImportUnit[] {
  if (rows.length < 2) {
    return [];
  }
  const header = rows[0].map((h) => h.trim());
  const idx = new Map<keyof ImportUnit, number>();
  header.forEach((h, i) => {
    const field = HEADER_MAP[h];
    if (field && !idx.has(field)) {
      idx.set(field, i);
    }
  });

  const get = (row: readonly string[], field: keyof ImportUnit): string => {
    const i = idx.get(field);
    return i != null ? (row[i] ?? "").trim() : "";
  };

  return rows.slice(1).map((row) => ({
    branchCode: get(row, "branchCode"),
    variantCode: get(row, "variantCode"),
    modelName: get(row, "modelName"),
    colorCode: get(row, "colorCode"),
    colorName: get(row, "colorName"),
    engineNo: get(row, "engineNo"),
    frameNo: get(row, "frameNo"),
    sku: get(row, "sku"),
    unitKind: get(row, "unitKind") || "รถใหม่",
    cost: toNum(get(row, "cost")),
    costVat: toNum(get(row, "costVat")),
    receivedAt: get(row, "receivedAt"),
    supplier: get(row, "supplier"),
    supplierInvNo: get(row, "supplierInvNo"),
    supplierTaxId: get(row, "supplierTaxId"),
    srcFile: get(row, "srcFile"),
  }));
}

/** ตรวจเบื้องต้น (ยังไม่เทียบ DB) — คืนรายการปัญหาต่อหน่วย */
export function basicErrors(u: ImportUnit): string[] {
  const errs: string[] = [];
  if (!u.variantCode) {
    errs.push("ไม่มีรหัสรุ่น (แบบรถ)");
  }
  if (!u.engineNo) {
    errs.push("ไม่มีเลขเครื่อง");
  }
  if (!u.frameNo) {
    errs.push("ไม่มีเลขตัวถัง");
  }
  if (u.cost <= 0) {
    errs.push("ต้นทุนไม่ถูกต้อง");
  }
  return errs;
}

/** ผู้มีสิทธิ์นำเข้าข้อมูล — ตรงกับ roles ของเมนู imp */
const IMPORT_ROLES = ["admin", "manager", "stock"];
export function canManageImport(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return IMPORT_ROLES.some((r) => roles.has(r));
}

/** หาเลขเครื่องซ้ำภายในไฟล์ (Set ของ engineNo ที่ปรากฏ >1 ครั้ง) */
export function duplicateEngines(units: readonly ImportUnit[]): Set<string> {
  const seen = new Map<string, number>();
  for (const u of units) {
    if (u.engineNo) {
      seen.set(u.engineNo, (seen.get(u.engineNo) ?? 0) + 1);
    }
  }
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([e]) => e));
}
