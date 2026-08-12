"use client";

import { ExpenseView, type ExpenseCategoryOption } from "@/components/expense/ExpenseView";
import type { ExpenseActionResult, ExpenseRow } from "@/lib/expense/expenses";

/** พรีวิวหน้าค่าใช้จ่าย (expense) — sample data · /expense จริงต่อ DB ผ่าน RLS */

const CATEGORIES: ExpenseCategoryOption[] = [
  { id: "c1", name: "ค่าน้ำมัน" },
  { id: "c2", name: "ค่ารับรอง" },
  { id: "c3", name: "ค่าสาธารณูปโภค" },
  { id: "c4", name: "ค่าซ่อมบำรุง" },
];

const EXPENSES: ExpenseRow[] = [
  { id: "1", categoryId: "c1", categoryName: "ค่าน้ำมัน", vendor: "ปตท. สาขาบางนา", amount: 1200, spentAt: "2026-08-11", hasReceipt: true, taxInvoiceNo: "INV-8842", note: null, createdByName: "เอ" },
  { id: "2", categoryId: "c2", categoryName: "ค่ารับรอง", vendor: "Starbucks", amount: 320, spentAt: "2026-08-10", hasReceipt: false, taxInvoiceNo: null, note: "เลี้ยงลูกค้า", createdByName: "บี" },
  { id: "3", categoryId: "c3", categoryName: "ค่าสาธารณูปโภค", vendor: "การไฟฟ้า", amount: 8600, spentAt: "2026-08-05", hasReceipt: true, taxInvoiceNo: "EA-2569-08", note: null, createdByName: "เอ" },
  { id: "4", categoryId: "c4", categoryName: "ค่าซ่อมบำรุง", vendor: "ร้านช่างแอร์", amount: 2500, spentAt: "2026-08-03", hasReceipt: false, taxInvoiceNo: null, note: "ซ่อมแอร์โชว์รูม", createdByName: "บี" },
];

async function mockRecord(formData: FormData): Promise<ExpenseActionResult> {
  const amt = Number(formData.get("amount"));
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, error: "จำนวนเงินไม่ถูกต้อง" };
  }
  return { ok: true };
}

export default function DevExpensePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ค่าใช้จ่าย (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — กด &ldquo;บันทึกค่าใช้จ่าย&rdquo; · ใบเสร็จหาย = เตือนเหลือง</p>
      </header>
      <ExpenseView
        expenses={EXPENSES}
        categories={CATEGORIES}
        canManage
        canSeeMoney
        today="2026-08-12"
        action={mockRecord}
      />
    </main>
  );
}
