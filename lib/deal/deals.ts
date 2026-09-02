/**
 * โครงข้อมูล + ตัวกรองดีล (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * ดีล = การขาย 1 รายการ + ลูกค้า/รถ + ทะเบียน (pipeline) + เคสสินเชื่อ (ข้อมูลประกอบ)
 */

import { REG_STAGES, type PayMethod, type RegStage } from "@/lib/deal/stage";

export type DealActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** ผู้มีสิทธิ์จัดการดีล (เลื่อนขั้นทะเบียน) — ตรงกับ roles ของเมนู deal */
const DEAL_ROLES = ["admin", "manager", "acct", "sales"];

export function canManageDeal(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return DEAL_ROLES.some((r) => roles.has(r));
}

/** ผู้มีสิทธิ์ยกเลิกดีล (ลูกค้าเท) — เข้มกว่าเลื่อนขั้น เพราะย้อนการขาย/คืนสต๊อก จำกัดหัวหน้า */
const VOID_ROLES = ["admin", "manager"];

export function canVoidDeal(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return VOID_ROLES.some((r) => roles.has(r));
}

/** ยกเลิกดีลได้เฉพาะก่อนส่งมอบ — ส่งมอบแล้วถือว่าจบ ย้อนผ่านหน้านี้ไม่ได้ */
export function isVoidableStage(stage: RegStage): boolean {
  return stage !== "ส่งมอบแล้ว";
}

/** ค่าดิบ/ค่าที่ผ่านการตรวจ ของฟอร์มแก้ข้อมูลลูกค้าในดีล (FAM-1093) */
export type DealCustomerInput = { name: string; phone: string; address: string; taxId: string; note: string };
export type DealCustomerValid = { name: string; phone: string | null; address: string | null; taxId: string | null; note: string | null };

/** ตรวจฟอร์มข้อมูลลูกค้า/ดีล — ชื่อบังคับ · เลขบัตร ปชช./ผู้เสียภาษี ถ้ากรอกต้องเป็นเลข 13 หลัก */
export function validateDealCustomer(input: DealCustomerInput): { ok: true; value: DealCustomerValid } | { ok: false; error: string } {
  const name = input.name.trim();
  if (name === "") {
    return { ok: false, error: "กรอกชื่อลูกค้า" };
  }
  const tax = input.taxId.trim();
  if (tax !== "" && !/^\d{13}$/.test(tax)) {
    return { ok: false, error: "เลขบัตรประชาชน/ผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก" };
  }
  const blank = (s: string): string | null => (s.trim() === "" ? null : s.trim());
  return { ok: true, value: { name, phone: blank(input.phone), address: blank(input.address), taxId: tax || null, note: blank(input.note) } };
}

/** สถานะเคสสินเชื่อ (ธ.) — ปฏิเสธ = ดีลตกราง */
export type FinanceInfo = {
  id: string;
  companyName: string;
  status: string; // ส่งเรื่อง | ยื่นเอกสาร | รอผล | ติดตามต่อ | อนุมัติแล้ว | ปฏิเสธ | ยกเลิก
  amount: number | null;
  rejectReason: string | null;
};

/** ข้อมูลต่อขั้น (FAM-1093 P2) — สถานะย่อย + หมายเหตุ + ใครอัปเดตล่าสุดเมื่อไหร่ */
export type DealStep = {
  stage: string;
  subStatus: string | null;
  note: string | null;
  updatedAt: string; // ISO
  updatedByName: string | null;
};

export type Deal = {
  saleId: string;
  regId: string | null;
  customerId: string; // "" = ลูกค้าทั่วไป/ไม่ผูกโปรไฟล์ (ไม่มีประวัติ)
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null; // สำหรับใบกำกับภาษี
  customerTaxId: string | null; // เลขบัตร ปชช./ผู้เสียภาษีผู้ซื้อ (อ่อนไหว — RLS คุม)
  vehicle: string;
  engineNo: string;
  frameNo: string; // เลขถัง — คีย์เชื่อมข้อมูลรถคันนี้
  regNote: string | null; // บันทึกงานทะเบียน/ดีล
  payMethod: PayMethod;
  netPrice: number;
  soldAt: string; // ISO
  stage: RegStage;
  plateNo: string | null;
  docNo: string | null; // เลขที่ใบกำกับภาษี (ออกตอนขายด้วย next_doc_no 'TAXINV')
  publicToken: string | null; // รหัสให้ลูกค้าเช็กสถานะเองที่ /status (FAM-1117)
  finance: FinanceInfo | null;
  steps: DealStep[]; // ข้อมูลต่อขั้น (สถานะย่อย/หมายเหตุ/เวลาอัปเดต)
};

/** แยกมูลค่าก่อนภาษี + VAT จากราคาสุทธิ (ราคารวม VAT อยู่แล้ว — spec §6.3) */
export function vatBreakdown(netPrice: number, vatPct: number): { valueBeforeVat: number; vat: number } {
  const valueBeforeVat = vatPct > 0 ? netPrice / (1 + vatPct / 100) : netPrice;
  return { valueBeforeVat, vat: netPrice - valueBeforeVat };
}

/** ดีลตกราง = เคสสินเชื่อถูกปฏิเสธ (ต้องแจ้ง/ยื่นใหม่) */
export function isOffTrack(deal: Deal): boolean {
  return deal.finance?.status === "ปฏิเสธ";
}

/** กรองด้วยขั้น + คำค้น (ลูกค้า/รถ/เลขเครื่อง/ทะเบียน) — จัดเรียงล่าสุดบนทำที่ page (R1) */
export function filterDeals(
  deals: readonly Deal[],
  opts: { stage?: RegStage | "all"; search?: string; onlyOpen?: boolean; onlyOffTrack?: boolean } = {},
): Deal[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  return deals.filter((d) => {
    if (opts.stage && opts.stage !== "all" && d.stage !== opts.stage) {
      return false;
    }
    if (opts.onlyOpen && d.stage === "ส่งมอบแล้ว") {
      return false;
    }
    if (opts.onlyOffTrack && !isOffTrack(d)) {
      return false;
    }
    if (q) {
      const hay = `${d.customerName} ${d.vehicle} ${d.engineNo} ${d.plateNo ?? ""}`.toLowerCase();
      if (!hay.includes(q)) {
        return false;
      }
    }
    return true;
  });
}

/** นับดีลตามขั้น (ครบทุกขั้น แม้ 0) */
export function stageCounts(deals: readonly Deal[]): Record<RegStage, number> {
  const counts = Object.fromEntries(REG_STAGES.map((s) => [s, 0])) as Record<RegStage, number>;
  for (const d of deals) {
    counts[d.stage] += 1;
  }
  return counts;
}

/** ดีลที่ยังไม่ส่งมอบ (ค้างในไปป์ไลน์) */
export function openDealCount(deals: readonly Deal[]): number {
  return deals.reduce((n, d) => n + (d.stage === "ส่งมอบแล้ว" ? 0 : 1), 0);
}

/** ดีลตกราง (ไฟแนนซ์ปฏิเสธ) ที่ต้องจัดการ */
export function offTrackCount(deals: readonly Deal[]): number {
  return deals.reduce((n, d) => n + (isOffTrack(d) ? 1 : 0), 0);
}

/** ดีลอื่นของลูกค้าคนเดียวกัน (ประวัติซื้อซ้ำ) เรียงใหม่สุดก่อน · [] ถ้าไม่มี customerId หรือไม่มีประวัติ */
export function customerDeals(deals: readonly Deal[], customerId: string, excludeSaleId?: string): Deal[] {
  if (!customerId) {
    return [];
  }
  return deals
    .filter((d) => d.customerId === customerId && d.saleId !== excludeSaleId)
    .sort((a, b) => (a.soldAt < b.soldAt ? 1 : a.soldAt > b.soldAt ? -1 : 0));
}

/** ประวัติบริการของลูกค้า (จาก service_job) */
export type ServiceHistory = {
  customerId: string;
  serviceType: string;
  checkedInAt: string; // ISO
  status: string;
  total: number;
};

/** งานบริการของลูกค้าคนเดียวกัน เรียงใหม่สุดก่อน · [] ถ้าไม่มี customerId */
export function customerServices(rows: readonly ServiceHistory[], customerId: string): ServiceHistory[] {
  if (!customerId) {
    return [];
  }
  return rows
    .filter((s) => s.customerId === customerId)
    .sort((a, b) => (a.checkedInAt < b.checkedInAt ? 1 : a.checkedInAt > b.checkedInAt ? -1 : 0));
}
