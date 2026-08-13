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
