import { describe, it, expect } from "vitest";
import {
  filterExpenses,
  expenseTotals,
  canManageExpense,
  canApproveExpense,
  isExpenseApproved,
  type ExpenseRow,
} from "@/lib/expense/expenses";

function ex(over: Partial<ExpenseRow>): ExpenseRow {
  return {
    id: "e",
    categoryId: "c1",
    categoryName: "ค่าน้ำมัน",
    vendor: "ปตท.",
    amount: 1000,
    spentAt: "2026-08-05",
    hasReceipt: true,
    taxInvoiceNo: null,
    note: null,
    createdByName: "เอ",
    approvedAt: null,
    approvedByName: null,
    ...over,
  };
}

describe("filterExpenses", () => {
  const list = [
    ex({ id: "1", categoryId: "c1", categoryName: "ค่าน้ำมัน", vendor: "ปตท.", spentAt: "2026-08-01", hasReceipt: true }),
    ex({ id: "2", categoryId: "c2", categoryName: "ค่ากาแฟ", vendor: "Starbucks", spentAt: "2026-08-10", hasReceipt: false }),
  ];

  it("filters by category", () => {
    expect(filterExpenses(list, { categoryId: "c2" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterExpenses(list, { categoryId: "all" })).toHaveLength(2);
  });

  it("onlyMissingReceipt keeps รายการที่ใบเสร็จหาย", () => {
    expect(filterExpenses(list, { onlyMissingReceipt: true }).map((e) => e.id)).toEqual(["2"]);
  });

  it("filters by fromDate and search (vendor/category)", () => {
    expect(filterExpenses(list, { fromDate: "2026-08-05" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterExpenses(list, { search: "starbucks" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterExpenses(list, { search: "น้ำมัน" }).map((e) => e.id)).toEqual(["1"]);
  });
});

describe("expenseTotals", () => {
  it("sums total, missing-receipt, and pending-approval amount/count", () => {
    const list = [
      ex({ amount: 1000, hasReceipt: true, approvedAt: "2026-08-06T00:00:00Z" }),
      ex({ amount: 250, hasReceipt: false, approvedAt: null }),
      ex({ amount: 800, hasReceipt: false, approvedAt: null }),
    ];
    const t = expenseTotals(list);
    expect(t.total).toBe(2050);
    expect(t.count).toBe(3);
    expect(t.missingReceiptCount).toBe(2);
    expect(t.missingReceiptAmount).toBe(1050);
    // สองรายการที่ยังไม่อนุมัติ (250 + 800)
    expect(t.pendingCount).toBe(2);
    expect(t.pendingAmount).toBe(1050);
  });
});

describe("expense approval (FAM-1030)", () => {
  it("isExpenseApproved reflects approvedAt", () => {
    expect(isExpenseApproved(ex({ approvedAt: "2026-08-06T00:00:00Z" }))).toBe(true);
    expect(isExpenseApproved(ex({ approvedAt: null }))).toBe(false);
  });

  it("canApproveExpense requires the approve perm", () => {
    expect(canApproveExpense({ approve: true })).toBe(true);
    expect(canApproveExpense({ approve: false })).toBe(false);
  });
});

describe("canManageExpense", () => {
  it("gates to accounting roles", () => {
    expect(canManageExpense(["acct"])).toBe(true);
    expect(canManageExpense(["manager"])).toBe(true);
    expect(canManageExpense(["sales"])).toBe(false);
    expect(canManageExpense(["tech"])).toBe(false);
  });
});
