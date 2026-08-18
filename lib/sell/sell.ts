/** ตรรกะสิทธิ์/ผลลัพธ์การบันทึกการขาย (ฟังก์ชันบริสุทธิ์ ทดสอบได้) */

export type SellActionResult =
  | { ok: true; saleId: string; docNo: string | null }
  | { ok: false; error: string };

/** ผู้มีสิทธิ์บันทึกการขาย — ตรงกับด่านสิทธิ์ใน sell_unit RPC (admin/manager/sales) */
const SELL_ROLES = ["admin", "manager", "sales"];

export function canSell(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return SELL_ROLES.some((r) => roles.has(r));
}
