import { describe, it, expect } from "vitest";
import {
  isSettled,
  isOverdue,
  clampPayment,
  filterReceivables,
  arTotals,
  kindLabel,
  canManageAr,
  type Receivable,
} from "@/lib/ar/receivables";

function ar(over: Partial<Receivable>): Receivable {
  return {
    id: "r",
    kind: "finance",
    payerName: "กรุงศรี",
    vehicle: "NMAX",
    amountDue: 84000,
    amountPaid: 0,
    balance: 84000,
    dueAt: "2026-08-20",
    settledAt: null,
    ...over,
  };
}

describe("receivable status", () => {
  it("isSettled when balance <= 0 or settledAt set", () => {
    expect(isSettled({ balance: 0, settledAt: null })).toBe(true);
    expect(isSettled({ balance: 100, settledAt: "2026-08-10" })).toBe(true);
    expect(isSettled({ balance: 100, settledAt: null })).toBe(false);
  });

  it("isOverdue only for open receivables past due", () => {
    expect(isOverdue({ balance: 84000, dueAt: "2026-08-10", settledAt: null }, "2026-08-12")).toBe(true);
    expect(isOverdue({ balance: 84000, dueAt: "2026-08-20", settledAt: null }, "2026-08-12")).toBe(false);
    expect(isOverdue({ balance: 0, dueAt: "2026-08-10", settledAt: null }, "2026-08-12")).toBe(false); // ชำระครบ
    expect(isOverdue({ balance: 84000, dueAt: null, settledAt: null }, "2026-08-12")).toBe(false);
  });

  it("kindLabel maps known kinds", () => {
    expect(kindLabel("finance")).toBe("ไฟแนนซ์");
    expect(kindLabel("customer")).toBe("ลูกค้า");
    expect(kindLabel("อื่นๆ")).toBe("อื่นๆ");
  });
});

describe("clampPayment", () => {
  it("never exceeds balance and never goes negative", () => {
    expect(clampPayment(100000, 84000)).toBe(84000);
    expect(clampPayment(20000, 84000)).toBe(20000);
    expect(clampPayment(-5, 84000)).toBe(0);
  });
});

describe("filterReceivables + arTotals", () => {
  const list = [
    ar({ id: "1", kind: "finance", payerName: "กรุงศรี", balance: 84000, dueAt: "2026-08-01", settledAt: null }), // overdue
    ar({ id: "2", kind: "customer", payerName: "สมชาย", vehicle: "FINN", balance: 5000, dueAt: "2026-08-30", settledAt: null }), // open
    ar({ id: "3", kind: "customer", payerName: "มานี", balance: 0, amountPaid: 46900, settledAt: "2026-08-05" }), // settled
  ];

  it("onlyOpen drops settled; onlyOverdue keeps past-due open", () => {
    expect(filterReceivables(list, { onlyOpen: true }).map((r) => r.id)).toEqual(["1", "2"]);
    expect(filterReceivables(list, { onlyOverdue: true, today: "2026-08-12" }).map((r) => r.id)).toEqual(["1"]);
  });

  it("filters by kind and search", () => {
    expect(filterReceivables(list, { kind: "customer" }).map((r) => r.id)).toEqual(["2", "3"]);
    expect(filterReceivables(list, { search: "กรุงศรี" }).map((r) => r.id)).toEqual(["1"]);
  });

  it("arTotals sums outstanding/overdue over open only", () => {
    const t = arTotals(list, "2026-08-12");
    expect(t.outstanding).toBe(89000); // 84000 + 5000 (ตัด settled)
    expect(t.overdue).toBe(84000);
    expect(t.openCount).toBe(2);
  });
});

describe("canManageAr", () => {
  it("gates to accounting roles", () => {
    expect(canManageAr(["acct"])).toBe(true);
    expect(canManageAr(["manager"])).toBe(true);
    expect(canManageAr(["sales"])).toBe(false);
    expect(canManageAr(["tech"])).toBe(false);
  });
});
