/**
 * ตรรกะสต๊อกอะไหล่/ของแถม — ฟังก์ชันบริสุทธิ์ (ทดสอบได้)
 * ต้นทุนถูกตัดฝั่งเซิร์ฟเวอร์ก่อนถึงตรงนี้ (cost อาจเป็น undefined/null)
 */

export type PartsActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type PartRow = {
  id: string;
  code: string;
  name: string;
  qtyOnHand: number;
  minQty: number;
  price: number;
  cost?: number | null; // อาจถูกตัดออก (money-strip)
};

export type FreebieRow = {
  id: string;
  name: string;
  qtyOnHand: number;
  minQty: number;
  cost?: number | null; // อาจถูกตัดออก (money-strip)
};

/** ต่ำกว่าจุดสั่งซื้อ — min_qty ต้อง > 0 ถึงนับ (min 0 = ไม่ตั้งเกณฑ์) */
export function isLowStock(item: { qtyOnHand: number; minQty: number }): boolean {
  return item.minQty > 0 && item.qtyOnHand <= item.minQty;
}

/** จำนวนรายการที่ต่ำกว่าจุดสั่งซื้อ */
export function lowStockCount(items: ReadonlyArray<{ qtyOnHand: number; minQty: number }>): number {
  return items.reduce((n, it) => n + (isLowStock(it) ? 1 : 0), 0);
}

/** ตัวนับแดงบนเมนู = อะไหล่ต่ำ + ของแถมต่ำ (docs/04 §9h กฎ 3) */
export function partsBadgeCount(
  parts: ReadonlyArray<{ qtyOnHand: number; minQty: number }>,
  freebies: ReadonlyArray<{ qtyOnHand: number; minQty: number }>,
): number {
  return lowStockCount(parts) + lowStockCount(freebies);
}

/** ผู้จัดการคลังอะไหล่ (รับเข้า/เพิ่ม/แก้ข้อมูลหลัก) — admin/manager/stock (tech/acct ดูอย่างเดียว) */
const PARTS_MANAGE_ROLES = ["admin", "manager", "stock"];
export function canManageParts(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return PARTS_MANAGE_ROLES.some((r) => roles.has(r));
}

/** กรองอะไหล่ด้วยคำค้น (รหัส/ชื่อ) + เฉพาะที่ต่ำ */
export function filterParts(
  parts: readonly PartRow[],
  opts: { search?: string; onlyLow?: boolean } = {},
): PartRow[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  return parts.filter((p) => {
    if (opts.onlyLow && !isLowStock(p)) {
      return false;
    }
    if (q && !p.code.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}
