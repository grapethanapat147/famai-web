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
