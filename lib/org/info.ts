/** ข้อมูลกิจการ/บริษัท ที่ขึ้นหัวเอกสาร (FAM-1078) — ตัวช่วยบริสุทธิ์ ทดสอบได้ */

export type OrgInfoActionResult = { ok: true } | { ok: false; error: string };

export type OrgCompany = {
  id: string;
  code: string;
  name: string;
  taxId: string;
  address: string;
  phone: string;
};

export type OrgBranch = OrgCompany;

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
