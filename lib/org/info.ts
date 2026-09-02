/** ข้อมูลกิจการ/บริษัท ที่ขึ้นหัวเอกสาร (FAM-1078) — ตัวช่วยบริสุทธิ์ ทดสอบได้ */

export type OrgInfoActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type OrgCompany = {
  id: string;
  code: string;
  name: string;
  taxId: string;
  address: string;
  phone: string;
};

/**
 * บริษัท (สาขา) เพิ่มการตั้งค่าลงเวลา — บังคับเซลฟี่
 * พิกัดย้ายไปตั้งที่หน้าสาขา (branch_site) แล้ว (FAM-1114) ที่นี่เก็บแค่จำนวนจุดไว้แสดงสรุป
 */
export type OrgBranch = OrgCompany & {
  siteCount: number;
  requireSelfie: boolean;
};

/** ค่าจาก checkbox ในฟอร์ม (มีเมื่อติ๊ก) → boolean */
export function parseCheckbox(raw: FormDataEntryValue | null): boolean {
  return raw === "on" || raw === "true";
}

/** เลขภาษี: ว่าง = null (ยังไม่กรอก) · ถ้ากรอกต้องเป็นตัวเลข 13 หลัก (นิติบุคคลไทย) */
export function parseTaxId(raw: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const v = raw.trim();
  if (v === "") {
    return { ok: true, value: null };
  }
  if (!/^\d{13}$/.test(v)) {
    return { ok: false, error: "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก" };
  }
  return { ok: true, value: v };
}

/** ตัดช่องว่าง · ว่าง = null (เก็บลง DB เป็น null ไม่ใช่สตริงว่าง) */
export function nullIfBlank(raw: string): string | null {
  const v = raw.trim();
  return v === "" ? null : v;
}
