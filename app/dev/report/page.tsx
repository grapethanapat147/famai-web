"use client";

import { ReportView, type ArReportRow, type ExpenseReportRow, type SaleReportRow } from "@/components/report/ReportView";

/** พรีวิวหน้ารายงาน (report) — sample data · /report จริงต่อ DB ผ่าน RLS (read-only) */

const SALES: SaleReportRow[] = [
  { soldAt: "2026-08-11", model: "NMAX", branch: "Famai Motor Group", salesperson: "สมชาย", net: 92000, gross: 14000 },
  { soldAt: "2026-08-09", model: "NMAX", branch: "Famai Motor", salesperson: "มานี", net: 90000, gross: 12000 },
  { soldAt: "2026-08-05", model: "FINN", branch: "Famai Motor Group", salesperson: "สมชาย", net: 46900, gross: 6100 },
  { soldAt: "2026-08-02", model: "XMAX 300", branch: "Famai Chonburi", salesperson: "วิภา", net: 189000, gross: 15000 },
  { soldAt: "2026-07-28", model: "Aerox", branch: "Famai Motor Group", salesperson: "สมชาย", net: 78000, gross: 9000 },
  { soldAt: "2026-07-15", model: "FINN", branch: "Famai Motor", salesperson: "มานี", net: 46900, gross: 5800 },
];

const EXPENSES: ExpenseReportRow[] = [
  { spentAt: "2026-08-11", category: "ค่าน้ำมัน", amount: 1200 },
  { spentAt: "2026-08-10", category: "ค่ารับรอง", amount: 320 },
  { spentAt: "2026-08-05", category: "ค่าสาธารณูปโภค", amount: 8600 },
  { spentAt: "2026-07-30", category: "ค่าน้ำมัน", amount: 950 },
  { spentAt: "2026-07-20", category: "ค่าซ่อมบำรุง", amount: 2500 },
];

const RECEIVABLES: ArReportRow[] = [
  { kind: "finance", balance: 84000, settled: false },
  { kind: "finance", balance: 170000, settled: false },
  { kind: "customer", balance: 26900, settled: false },
  { kind: "customer", balance: 0, settled: true },
];

export default function DevReportPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6">
      <header className="mb-6 print:hidden">
        <h1 className="font-display text-[28px] font-semibold text-ink">รายงาน (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — สลับรายงาน · จัดกลุ่ม · ช่วงวันที่ · ส่งออก CSV / พิมพ์</p>
      </header>
      <ReportView sales={SALES} expenses={EXPENSES} receivables={RECEIVABLES} canSeeMoney today="2026-08-12" />
    </main>
  );
}
