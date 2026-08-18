/** ตรรกะสิทธิ์/ผลลัพธ์การบันทึกการขาย (ฟังก์ชันบริสุทธิ์ ทดสอบได้) */

export type SellActionResult =
  | { ok: true; saleId: string; docNo: string | null }
  | { ok: false; error: string };

/** ค่าตั้งต้นของฟอร์มขาย — ใช้ตอนแปลงใบเสนอราคา→ขาย (prefill ผ่าน query params) */
export type SellInitial = {
  unitId?: string;
  customerName?: string;
  customerPhone?: string;
  payMethod?: "cash" | "finance";
  listPrice?: number;
  downPayment?: number;
  financeId?: string;
  months?: number;
};

/** ผู้มีสิทธิ์บันทึกการขาย — ตรงกับด่านสิทธิ์ใน sell_unit RPC (admin/manager/sales) */
const SELL_ROLES = ["admin", "manager", "sales"];

export function canSell(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return SELL_ROLES.some((r) => roles.has(r));
}
