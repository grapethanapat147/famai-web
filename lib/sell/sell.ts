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

/**
 * ตรวจราคาก่อนบันทึกขาย (FAM-1107) — กันค่าติดลบ/ส่วนลดเกินราคาตั้ง ที่ทำ net/กำไร/ยอดจัดไฟแนนซ์เพี้ยน
 * (sell_unit RPC ใช้ greatest(0, …) จึงไม่ error เอง — ต้องกันที่ชั้นนี้)
 */
export function validateSellPricing(input: {
  listPrice: number;
  discount: number;
  downPayment: number | null;
}): { ok: true } | { ok: false; error: string } {
  if (!Number.isFinite(input.listPrice) || input.listPrice <= 0) {
    return { ok: false, error: "ราคาตั้งไม่ถูกต้อง" };
  }
  if (!Number.isFinite(input.discount) || input.discount < 0) {
    return { ok: false, error: "ส่วนลดต้องไม่ติดลบ" };
  }
  if (input.discount > input.listPrice) {
    return { ok: false, error: "ส่วนลดมากกว่าราคาตั้งไม่ได้" };
  }
  if (input.downPayment != null && (!Number.isFinite(input.downPayment) || input.downPayment < 0)) {
    return { ok: false, error: "เงินดาวน์ต้องไม่ติดลบ" };
  }
  return { ok: true };
}

/** ผู้มีสิทธิ์บันทึกการขาย — ตรงกับด่านสิทธิ์ใน sell_unit RPC (admin/manager/sales) */
const SELL_ROLES = ["admin", "manager", "sales"];

export function canSell(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return SELL_ROLES.some((r) => roles.has(r));
}
