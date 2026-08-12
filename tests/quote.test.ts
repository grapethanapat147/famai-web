import { describe, it, expect } from "vitest";
import { flatMonthly, financedAmount, optionTerms } from "@/lib/quote/finance";
import { isExpired, filterQuotes, canManageQuote, type QuoteListRow } from "@/lib/quote/quotes";

describe("quote finance (flat monthly)", () => {
  it("financedAmount clamps at zero", () => {
    expect(financedAmount(100000, 20000)).toBe(80000);
    expect(financedAmount(50000, 60000)).toBe(0);
  });

  it("flatMonthly = financed × (1 + rate×months) ÷ months", () => {
    // 100,000 จัด, 1%/เดือน, 12 งวด → 112,000 ÷ 12 = 9333.33
    expect(flatMonthly(100000, 1, 12)).toBeCloseTo(9333.33, 2);
    // ดอกเบี้ย 0 → คืนต้นเฉลี่ย
    expect(flatMonthly(120000, 0, 24)).toBe(5000);
  });

  it("flatMonthly guards non-positive months", () => {
    expect(flatMonthly(100000, 1, 0)).toBe(0);
  });

  it("optionTerms builds a rounded row per term off the financed amount", () => {
    const rows = optionTerms(100000, 20000, 1.5, [12, 24]);
    expect(rows.map((r) => r.months)).toEqual([12, 24]);
    // financed 80,000 · 12 งวด: 80000×(1+0.18)=94400 ÷12 = 7866.67 → 7867
    expect(rows[0].monthly).toBe(7867);
    // 24 งวด: 80000×(1+0.36)=108800 ÷24 = 4533.33 → 4533
    expect(rows[1].monthly).toBe(4533);
  });
});

describe("quote list helpers", () => {
  const rows: QuoteListRow[] = [
    { id: "1", docNo: "QT-001", customerName: "สมชาย", quoteDate: "2026-08-01", validUntil: "2026-08-15", optionCount: 2, createdByName: "เอ" },
    { id: "2", docNo: "QT-002", customerName: "มานี", quoteDate: "2026-08-10", validUntil: null, optionCount: 1, createdByName: "บี" },
  ];

  it("isExpired compares validity against today", () => {
    expect(isExpired("2026-08-15", "2026-08-20")).toBe(true);
    expect(isExpired("2026-08-15", "2026-08-12")).toBe(false);
    expect(isExpired(null, "2026-08-20")).toBe(false);
  });

  it("filterQuotes matches doc no or customer", () => {
    expect(filterQuotes(rows, "มานี").map((r) => r.id)).toEqual(["2"]);
    expect(filterQuotes(rows, "qt-001").map((r) => r.id)).toEqual(["1"]);
    expect(filterQuotes(rows, "")).toHaveLength(2);
  });

  it("canManageQuote gates to sales roles", () => {
    expect(canManageQuote(["sales"])).toBe(true);
    expect(canManageQuote(["manager"])).toBe(true);
    expect(canManageQuote(["tech"])).toBe(false);
    expect(canManageQuote(["stock"])).toBe(false);
  });
});
