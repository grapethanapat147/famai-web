"use client";

import { PayrollView } from "@/components/payroll/PayrollView";
import { computePayslip, type PayslipRow } from "@/lib/payroll/payroll";

/** พรีวิวหน้าเงินเดือนและ OT (payroll) — sample data · /payroll จริงคำนวณจาก DB (read-only) */

const CFG = { otRate: 1.5, commissionPct: 8, ssnPct: 5, ssnCap: 750 };

function row(employeeId: string, name: string, position: string, baseSalary: number, otMinutes: number, commissionBase: number): PayslipRow {
  return { employeeId, name, position, otMinutes, commissionBase, ...computePayslip({ baseSalary, otMinutes, commissionBase, ...CFG }) };
}

const ROWS: PayslipRow[] = [
  row("1", "สมชาย ใจดี", "เซลล์", 15000, 600, 300000),
  row("2", "มานี รักษ์ดี", "บัญชี", 18000, 0, 0),
  row("3", "ประเสริฐ มั่งมี", "ช่าง", 14000, 1200, 0),
  row("4", "วิภา สุขใจ", "เซลล์", 15000, 0, 120000),
  row("5", "วิชัย ช่างเก่ง", "ช่าง", 13000, 300, 0),
];

export default function DevPayrollPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="mb-6 print:hidden">
        <h1 className="font-display text-[28px] font-semibold text-ink">เงินเดือนและ OT (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — สลิปคำนวณสด (ฐาน + OT + คอม − ปกส.) · เปลี่ยนงวด · ส่งออก CSV / พิมพ์</p>
      </header>
      <PayrollView rows={ROWS} month="2026-08" canSeeMoney />
    </main>
  );
}
