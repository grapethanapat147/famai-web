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

async function mockPeriod(formData: FormData) {
  const action = String(formData.get("action") ?? "");
  return { ok: true as const, message: action === "close" ? "ปิดงวดแล้ว — แช่ยอดสลิป 5 คน" : "บันทึกแล้ว" };
}

const PAYOUT = [
  { employeeId: "1", ssnNo: "1234567890123", bankCode: "004", bankAccount: "123-4-56789-0" },
  { employeeId: "2", ssnNo: null, bankCode: "014", bankAccount: "9876543210" }, // ขาดเลข ปกส.
  { employeeId: "3", ssnNo: "9876543210987", bankCode: null, bankAccount: null }, // ไม่มีบัญชี ต้องจ่ายมือ
  { employeeId: "4", ssnNo: "1112223334445", bankCode: "004", bankAccount: "555-1-23456-7" },
  { employeeId: "5", ssnNo: "5556667778889", bankCode: "025", bankAccount: "0012345678" },
];

export default function DevPayrollPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="mb-6 print:hidden">
        <h1 className="font-display text-[28px] font-semibold text-ink">เงินเดือนและ OT (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — สลิปคำนวณสด (ฐาน + OT + คอม − ปกส.) · เปลี่ยนงวด · ส่งออก CSV / พิมพ์</p>
      </header>
      <PayrollView
      payoutInfo={PAYOUT}
      periodStatus="ปิดงวดแล้ว"
      canClose
      periodAction={mockPeriod}
        rows={ROWS}
        month="2026-08"
        seller={{
          shopName: "Famai Motor Group",
          branchName: "พะเยา",
          address: "123 ถ.พหลโยธิน ต.เวียง อ.เมือง จ.พะเยา 56000",
          phone: "054-000-000",
          taxId: "0123456789012",
          sellerName: "เดโม ฝ่ายบุคคล",
        }}
        canSeeMoney
      />
    </main>
  );
}
