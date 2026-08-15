/**
 * โครงข้อมูล + ตัวกรองใบเสนอราคา (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 */

export type QuoteActionResult =
  | { ok: true; id?: string; docNo?: string }
  | { ok: false; error: string };

/** แถวในรายการใบเสนอราคา */
export type QuoteListRow = {
  id: string;
  docNo: string;
  customerName: string;
  quoteDate: string; // ISO date
  validUntil: string | null;
  optionCount: number;
  createdByName: string | null;
};

/** ช่องกรอกของ builder (รถ 1 คัน) — terms คำนวณสดจากราคา/ดาวน์/เรต */
export type QuoteOptionInput = { vehicleId: string; price: number; financeId: string; down: number };

/** option ที่บันทึกไว้ (จาก quotation_option) */
export type SavedQuoteOption = { slot: number; variantId: string | null; price: number; financeId: string | null; down: number };

/** ใบเสนอราคาที่บันทึกแล้ว = แถวรายการ + เบอร์ + รายการรถ (ใช้เปิดดู/แก้) */
export type SavedQuote = QuoteListRow & { customerPhone: string; options: SavedQuoteOption[] };

const EMPTY_SLOT: QuoteOptionInput = { vehicleId: "", price: 0, financeId: "", down: 0 };

/**
 * แปลง options ที่บันทึกไว้ → ช่องกรอกของ builder (คงจำนวน slot = slotCount, เติมช่องว่างให้ครบ)
 * เรียงตาม slot · ตัดส่วนเกิน slotCount ทิ้ง
 */
export function savedOptionsToSlots(options: readonly SavedQuoteOption[], slotCount = 2): QuoteOptionInput[] {
  const slots: QuoteOptionInput[] = Array.from({ length: slotCount }, () => ({ ...EMPTY_SLOT }));
  [...options]
    .sort((a, b) => a.slot - b.slot)
    .slice(0, slotCount)
    .forEach((o, i) => {
      slots[i] = { vehicleId: o.variantId ?? "", price: o.price, financeId: o.financeId ?? "", down: o.down };
    });
  return slots;
}

/** เกินวันหมดอายุแล้วหรือยัง (เทียบวันที่ ISO) */
export function isExpired(validUntil: string | null, today: string): boolean {
  if (!validUntil) {
    return false;
  }
  return validUntil.slice(0, 10) < today.slice(0, 10);
}

/** กรองด้วยคำค้น (เลขเอกสาร/ชื่อลูกค้า) */
export function filterQuotes(rows: readonly QuoteListRow[], search = ""): QuoteListRow[] {
  const q = search.trim().toLowerCase();
  if (!q) {
    return [...rows];
  }
  return rows.filter((r) => `${r.docNo} ${r.customerName}`.toLowerCase().includes(q));
}

/** ผู้มีสิทธิ์ออกใบเสนอราคา — ตรงกับ roles ของเมนู quote */
const QUOTE_ROLES = ["admin", "manager", "sales"];

export function canManageQuote(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return QUOTE_ROLES.some((r) => roles.has(r));
}
