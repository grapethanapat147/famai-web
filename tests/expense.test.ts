import { describe, it, expect } from "vitest";
import { filterExpenses, expenseTotals, canManageExpense, type ExpenseRow } from "@/lib/expense/expenses";

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
  it("sums total and missing-receipt amount/count", () => {
    const list = [
      ex({ amount: 1000, hasReceipt: true }),
      ex({ amount: 250, hasReceipt: false }),
      ex({ amount: 800, hasReceipt: false }),
    ];
    const t = expenseTotals(list);
    expect(t.total).toBe(2050);
    expect(t.count).toBe(3);
    expect(t.missingReceiptCount).toBe(2);
    expect(t.missingReceiptAmount).toBe(1050);
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
