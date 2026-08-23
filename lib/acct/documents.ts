/** เอกสารบัญชี — ใบเสร็จรับเงิน / ใบกำกับภาษี (ฟังก์ชันบริสุทธิ์ ทดสอบได้) */

export type AcctActionResult = { ok: true; docNo?: string } | { ok: false; error: string };

export type DocType = "RECEIPT" | "TAXINV";

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  RECEIPT: "ใบเสร็จรับเงิน",
  TAXINV: "ใบกำกับภาษี",
};

export function docTypeLabel(t: string): string {
  return t in DOC_TYPE_LABEL ? DOC_TYPE_LABEL[t as DocType] : t;
}

/** หัวเอกสาร/ผู้ซื้อ ที่แช่ไว้ตอนออก (snapshot) — เอกสารต้องไม่เปลี่ยนตามข้อมูลปัจจุบัน */
export type PartySnapshot = {
  name: string;
  address: string | null;
  taxId: string | null;
  phone: string | null;
};

/** แถวเอกสารในลิสต์หน้าบัญชี */
export type DocRow = {
  id: string;
  docType: string;
  docNo: string;
  date: string; // ISO
  customerName: string;
  total: number;
  voided: boolean;
};

/** การขายที่ออกใบเสร็จได้ (โชว์ในตัวเลือก "ออกใบเสร็จ") */
export type IssuableSale = {
  saleId: string;
  customerName: string;
  vehicle: string;
  netPrice: number;
  soldAt: string; // ISO
  hasReceipt: boolean; // ออกใบเสร็จไปแล้วหรือยัง
};

/** เอกสารเต็มใบ (ลิสต์ + พิมพ์) — snapshot ผู้ขาย/ผู้ซื้อ + รถ (ดึงจาก sale ตอนโหลด) */
export type DocDetail = {
  id: string;
  docType: string;
  docNo: string;
  date: string; // ISO
  seller: PartySnapshot;
  buyer: PartySnapshot;
  base: number;
  vat: number;
  total: number;
  vehicle: string;
  engineNo: string;
  frameNo: string;
  voided: boolean;
};

/** ผู้มีสิทธิ์งานบัญชี (ออก/ดูเอกสาร) — ตรงกับเมนู acct */
const ACCT_ROLES = ["admin", "manager", "acct"];
export function canManageAccount(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return ACCT_ROLES.some((r) => roles.has(r));
}

/**
 * แยกมูลค่าก่อน VAT + VAT จากยอดรวม (ยอดรวม VAT อยู่แล้ว) — ปัดเป็นสตางค์
 * base = total / (1 + vat%) · vat = total − base
 */
export function amountBreakdown(total: number, vatPct: number): { base: number; vat: number; total: number } {
  if (vatPct <= 0) {
    return { base: total, vat: 0, total };
  }
  const base = Math.round((total / (1 + vatPct / 100)) * 100) / 100;
  return { base, vat: Math.round((total - base) * 100) / 100, total };
}
