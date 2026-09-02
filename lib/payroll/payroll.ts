/**
 * คำนวณสลิปเงินเดือน (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * สุทธิ = ฐานเงินเดือน + OT + คอมมิชชั่น − ประกันสังคม
 * (allowance / หักสาย / ภาษี = 0 ในเวอร์ชันนี้ → เพิ่มเมื่อมีกฎ)
 */

const DEFAULT_HOURS_PER_MONTH = 240; // 30 วัน × 8 ชม. (ประมาณการมาตรฐาน)

export type PayslipInput = {
  baseSalary: number;
  otMinutes: number;
  commissionBase: number; // ฐานคิดคอม (กำไรรวมของพนักงานในงวด)
  otRate: number;
  commissionPct: number;
  ssnPct: number;
  ssnCap: number;
  hoursPerMonth?: number;
};

export type Payslip = {
  base: number;
  otAmount: number;
  commission: number;
  gross: number;
  ssn: number;
  net: number;
};

export function computePayslip(i: PayslipInput): Payslip {
  const hoursPerMonth = i.hoursPerMonth ?? DEFAULT_HOURS_PER_MONTH;
  const hourlyRate = hoursPerMonth > 0 ? i.baseSalary / hoursPerMonth : 0;
  const otAmount = Math.round((i.otMinutes / 60) * hourlyRate * i.otRate);
  const commission = Math.round(i.commissionBase * (i.commissionPct / 100));
  const ssn = Math.round(Math.min(i.baseSalary * (i.ssnPct / 100), i.ssnCap));
  const base = Math.round(i.baseSalary);
  const gross = base + otAmount + commission;
  return { base, otAmount, commission, gross, ssn, net: gross - ssn };
}

/** "2026-08" → ช่วงวันแรก–วันสุดท้ายของเดือน (ใช้ Date.UTC เลี่ยง timezone) */
export function monthRange(month: string): { start: string; end: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) {
    return { start: "", end: "" };
  }
  const year = Number(m[1]);
  const mon = Number(m[2]);
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const mm = String(mon).padStart(2, "0");
  return { start: `${m[1]}-${mm}-01`, end: `${m[1]}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

export type PayslipRow = {
  employeeId: string;
  name: string;
  position: string;
  otMinutes: number;
  commissionBase: number;
} & Payslip;

export function payrollTotals(rows: readonly PayslipRow[]): { base: number; otAmount: number; commission: number; ssn: number; net: number } {
  return rows.reduce(
    (t, r) => ({
      base: t.base + r.base,
      otAmount: t.otAmount + r.otAmount,
      commission: t.commission + r.commission,
      ssn: t.ssn + r.ssn,
      net: t.net + r.net,
    }),
    { base: 0, otAmount: 0, commission: 0, ssn: 0, net: 0 },
  );
}

/** ผู้มีสิทธิ์ดูเงินเดือน — ตรงกับ roles ของเมนู payroll */
const PAYROLL_ROLES = ["admin", "manager", "hr", "acct"];

export function canViewPayroll(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return PAYROLL_ROLES.some((r) => roles.has(r));
}

/** สถานะงวดเงินเดือน (payroll_period.status) — ตรงกับค่าใน DB */
export type PeriodStatus = "ร่าง" | "ปิดงวดแล้ว" | "จ่ายแล้ว";

export const PERIOD_STATUSES: readonly PeriodStatus[] = ["ร่าง", "ปิดงวดแล้ว", "จ่ายแล้ว"];

export function isPeriodStatus(v: string): v is PeriodStatus {
  return (PERIOD_STATUSES as readonly string[]).includes(v);
}

/** งวดที่ปิดแล้ว = ยอดถูกแช่ ห้ามคำนวณใหม่ */
export function isPeriodLocked(status: PeriodStatus | null): boolean {
  return status === "ปิดงวดแล้ว" || status === "จ่ายแล้ว";
}

export function periodStatusVariant(status: PeriodStatus | null): "good" | "warn" | "info" {
  if (status === "จ่ายแล้ว") {
    return "good";
  }
  return status === "ปิดงวดแล้ว" ? "info" : "warn";
}

/** ผู้มีสิทธิ์ปิดงวด/ทำจ่าย — แคบกว่าคนที่ดูได้ (HR ดูได้แต่ไม่ควรล็อกยอดเอง) */
const PAYROLL_CLOSE_ROLES = ["admin", "manager"];
export function canClosePayroll(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return PAYROLL_CLOSE_ROLES.some((r) => roles.has(r));
}

export type PeriodAction = "close" | "pay" | "reopen";

/**
 * เปลี่ยนสถานะงวดที่ทำได้จริง
 * ร่าง → ปิดงวดแล้ว → จ่ายแล้ว · เปิดงวดใหม่ได้เฉพาะตอนที่ยังไม่จ่าย (จ่ายเงินไปแล้วย้อนไม่ได้)
 */
export function validatePeriodAction(
  current: PeriodStatus | null,
  action: PeriodAction,
): { ok: true; value: PeriodStatus } | { ok: false; error: string } {
  if (action === "close") {
    if (current === null || current === "ร่าง") {
      return { ok: true, value: "ปิดงวดแล้ว" };
    }
    return { ok: false, error: "งวดนี้ปิดไปแล้ว" };
  }
  if (action === "pay") {
    if (current === "ปิดงวดแล้ว") {
      return { ok: true, value: "จ่ายแล้ว" };
    }
    return { ok: false, error: current === "จ่ายแล้ว" ? "งวดนี้ทำจ่ายแล้ว" : "ต้องปิดงวดก่อนจึงทำจ่ายได้" };
  }
  if (current === "ปิดงวดแล้ว") {
    return { ok: true, value: "ร่าง" };
  }
  return { ok: false, error: current === "จ่ายแล้ว" ? "จ่ายเงินไปแล้ว เปิดงวดใหม่ไม่ได้" : "งวดนี้ยังไม่ได้ปิด" };
}
