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

/** สถานะเคสสินเชื่อ (ธ.) — ปฏิเสธ = ดีลตกราง */
export type FinanceInfo = {
  companyName: string;
  status: string; // ส่งเรื่อง | ยื่นเอกสาร | รอผล | ติดตามต่อ | อนุมัติแล้ว | ปฏิเสธ | ยกเลิก
  amount: number | null;
  rejectReason: string | null;
};

export type Deal = {
  saleId: string;
  regId: string | null;
  customerName: string;
  vehicle: string;
  engineNo: string;
  payMethod: PayMethod;
  netPrice: number;
  soldAt: string; // ISO
  stage: RegStage;
  plateNo: string | null;
  finance: FinanceInfo | null;
};

/** ดีลตกราง = เคสสินเชื่อถูกปฏิเสธ (ต้องแจ้ง/ยื่นใหม่) */
export function isOffTrack(deal: Deal): boolean {
  return deal.finance?.status === "ปฏิเสธ";
}

/** กรองด้วยขั้น + คำค้น (ลูกค้า/รถ/เลขเครื่อง/ทะเบียน) — จัดเรียงล่าสุดบนทำที่ page (R1) */
export function filterDeals(
  deals: readonly Deal[],
  opts: { stage?: RegStage | "all"; search?: string; onlyOpen?: boolean } = {},
): Deal[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  return deals.filter((d) => {
    if (opts.stage && opts.stage !== "all" && d.stage !== opts.stage) {
      return false;
    }
    if (opts.onlyOpen && d.stage === "ส่งมอบแล้ว") {
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
