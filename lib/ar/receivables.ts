/**
 * โครงข้อมูล + ตรรกะเงินค้างรับ (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * balance เป็น generated column ใน DB (amount_due − amount_paid)
 */

export type ArActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type PaymentMethod = "เงินสด" | "โอน" | "เช็ค";
export const PAYMENT_METHODS: readonly PaymentMethod[] = ["เงินสด", "โอน", "เช็ค"];

export type Receivable = {
  id: string;
  kind: string; // finance | customer | อื่นๆ
  payerName: string; // บริษัทไฟแนนซ์ หรือ ลูกค้า
  vehicle: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  dueAt: string | null;
  settledAt: string | null;
};

const KIND_LABEL: Record<string, string> = { finance: "ไฟแนนซ์", customer: "ลูกค้า" };

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}

/** ชำระครบแล้ว (ยอดคงเหลือ ≤ 0 หรือมีวันปิดยอด) */
export function isSettled(r: Pick<Receivable, "balance" | "settledAt">): boolean {
  return r.balance <= 0 || r.settledAt != null;
}

/** เกินกำหนดและยังค้าง */
export function isOverdue(r: Pick<Receivable, "balance" | "dueAt" | "settledAt">, today: string): boolean {
  if (isSettled(r) || !r.dueAt) {
    return false;
  }
  return r.dueAt.slice(0, 10) < today.slice(0, 10);
}

/** ปัดยอดรับไม่ให้เกินยอดค้าง (กันรับเกิน) */
export function clampPayment(amount: number, balance: number): number {
  if (amount <= 0) {
    return 0;
  }
  return Math.min(amount, balance);
}

export function filterReceivables(
  list: readonly Receivable[],
  opts: { kind?: string; search?: string; onlyOpen?: boolean; onlyOverdue?: boolean; today?: string } = {},
): Receivable[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  const today = opts.today ?? "";
  return list.filter((r) => {
    if (opts.kind && opts.kind !== "all" && r.kind !== opts.kind) {
      return false;
    }
    if (opts.onlyOpen && isSettled(r)) {
      return false;
    }
    if (opts.onlyOverdue && !isOverdue(r, today)) {
      return false;
    }
    if (q && !`${r.payerName} ${r.vehicle}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

/** ยอดรวมสำหรับหัวหน้า: ค้างทั้งหมด · เกินกำหนด · จำนวนรายการที่ยังค้าง */
export function arTotals(
  list: readonly Receivable[],
  today: string,
): { outstanding: number; overdue: number; openCount: number; overdueCount: number } {
  let outstanding = 0;
  let overdue = 0;
  let openCount = 0;
  let overdueCount = 0;
  for (const r of list) {
    if (isSettled(r)) {
      continue;
    }
    outstanding += r.balance;
    openCount += 1;
    if (isOverdue(r, today)) {
      overdue += r.balance;
      overdueCount += 1;
    }
  }
  return { outstanding, overdue, openCount, overdueCount };
}

/** ผู้มีสิทธิ์จัดการเงินค้างรับ (ลงรับเงิน) — ตรงกับ roles ของเมนู ar */
const AR_ROLES = ["admin", "manager", "acct"];

export function canManageAr(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return AR_ROLES.some((r) => roles.has(r));
}
