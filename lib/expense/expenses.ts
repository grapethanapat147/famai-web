/**
 * โครงข้อมูล + ตรรกะค่าใช้จ่าย (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * has_receipt=false = "ใบเสร็จหาย" (ธงเตือน) · vendor = "ซื้อกับใคร" (R1 relabel)
 */

export type ExpenseActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type ExpenseRow = {
  id: string;
  categoryId: string;
  categoryName: string;
  vendor: string;
  amount: number;
  spentAt: string; // ISO date
  hasReceipt: boolean;
  taxInvoiceNo: string | null;
  note: string | null;
  createdByName: string | null;
  approvedAt: string | null; // null = รออนุมัติ
  approvedByName: string | null;
};

/** อนุมัติแล้วหรือยัง */
export function isExpenseApproved(row: Pick<ExpenseRow, "approvedAt">): boolean {
  return row.approvedAt !== null;
}

export function filterExpenses(
  list: readonly ExpenseRow[],
  opts: { categoryId?: string; search?: string; fromDate?: string; onlyMissingReceipt?: boolean } = {},
): ExpenseRow[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  const from = (opts.fromDate ?? "").trim();
  return list.filter((e) => {
    if (opts.categoryId && opts.categoryId !== "all" && e.categoryId !== opts.categoryId) {
      return false;
    }
    if (opts.onlyMissingReceipt && e.hasReceipt) {
      return false;
    }
    if (from && e.spentAt.slice(0, 10) < from) {
      return false;
    }
    if (q && !`${e.vendor} ${e.categoryName} ${e.note ?? ""}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

/** ยอดรวมสำหรับหัวหน้า: รวมทั้งหมด · จำนวนรายการ · ยอด/จำนวนที่ใบเสร็จหาย · ยอด/จำนวนที่รออนุมัติ */
export function expenseTotals(list: readonly ExpenseRow[]): {
  total: number;
  count: number;
  missingReceiptCount: number;
  missingReceiptAmount: number;
  pendingCount: number;
  pendingAmount: number;
} {
  let total = 0;
  let missingReceiptCount = 0;
  let missingReceiptAmount = 0;
  let pendingCount = 0;
  let pendingAmount = 0;
  for (const e of list) {
    total += e.amount;
    if (!e.hasReceipt) {
      missingReceiptCount += 1;
      missingReceiptAmount += e.amount;
    }
    if (!isExpenseApproved(e)) {
      pendingCount += 1;
      pendingAmount += e.amount;
    }
  }
  return { total, count: list.length, missingReceiptCount, missingReceiptAmount, pendingCount, pendingAmount };
}

/** ผู้มีสิทธิ์บันทึกค่าใช้จ่าย — ตรงกับ roles ของเมนู expense */
const EXPENSE_ROLES = ["admin", "manager", "acct"];

export function canManageExpense(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return EXPENSE_ROLES.some((r) => roles.has(r));
}

/** ผู้มีสิทธิ์อนุมัติค่าใช้จ่าย = perm 'approve' (R1: การเงินกดอนุมัติ) — ไม่ใช่แค่ role */
export function canApproveExpense(perms: { approve: boolean }): boolean {
  return perms.approve === true;
}
