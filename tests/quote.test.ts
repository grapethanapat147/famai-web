import { describe, it, expect } from "vitest";
import {
  flatMonthly,
  financedAmount,
  optionTerms,
  parseRateTiers,
  hasRateTiers,
  rateForTerm,
  financeLabel,
} from "@/lib/quote/finance";
import { isExpired, filterQuotes, canManageQuote, savedOptionsToSlots, type QuoteListRow } from "@/lib/quote/quotes";

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

describe("tiered finance rates (FAM-1029 · rate_tiers)", () => {
  it("parseRateTiers keeps numeric term keys, drops junk, empty → null", () => {
    expect(parseRateTiers({ "12": 1.29, "36": 1.45 })).toEqual({ "12": 1.29, "36": 1.45 });
    expect(parseRateTiers({ "12": 1.29, foo: 2, "24": "x" })).toEqual({ "12": 1.29 });
    expect(parseRateTiers({})).toBeNull();
    expect(parseRateTiers(null)).toBeNull();
    expect(parseRateTiers([1, 2])).toBeNull();
    expect(parseRateTiers("nope")).toBeNull();
  });

  it("hasRateTiers detects a non-empty tier map", () => {
    expect(hasRateTiers({ "12": 1.2 })).toBe(true);
    expect(hasRateTiers({})).toBe(false);
    expect(hasRateTiers(null)).toBe(false);
    expect(hasRateTiers(undefined)).toBe(false);
  });

  it("rateForTerm uses the tier when present, else the flat base", () => {
    const tiers = { "12": 1.29, "36": 1.45 };
    expect(rateForTerm(12, 1.35, tiers)).toBe(1.29);
    expect(rateForTerm(36, 1.35, tiers)).toBe(1.45);
    expect(rateForTerm(24, 1.35, tiers)).toBe(1.35); // ไม่มี tier 24 → flat
    expect(rateForTerm(12, 1.35, null)).toBe(1.35); // ไม่มี tier เลย → flat
  });

  it("optionTerms applies tiered rates per term", () => {
    const tiers = { "12": 1.0, "24": 2.0 };
    const rows = optionTerms(100000, 20000, 1.5, [12, 24, 36], tiers);
    // financed 80,000
    // 12 งวด @1.0%: 80000×(1+0.12)=89600 ÷12 = 7466.67 → 7467
    expect(rows[0].monthly).toBe(7467);
    // 24 งวด @2.0%: 80000×(1+0.48)=118400 ÷24 = 4933.33 → 4933
    expect(rows[1].monthly).toBe(4933);
    // 36 งวด ไม่มี tier → flat 1.5%: 80000×(1+0.54)=123200 ÷36 = 3422.22 → 3422
    expect(rows[2].monthly).toBe(3422);
  });

  it("financeLabel shows per-term note when tiered, base rate otherwise", () => {
    expect(financeLabel("กรุงศรี", 1.35, { "12": 1.29 })).toBe("กรุงศรี · เรตตามงวด");
    expect(financeLabel("กรุงศรี", 1.35, null)).toBe("กรุงศรี 1.35%");
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

describe("savedOptionsToSlots (FAM-1029 view/edit)", () => {
  it("maps saved options into fixed 2 slots, sorted by slot", () => {
    const slots = savedOptionsToSlots([
      { slot: 2, variantId: "v2", price: 78000, financeId: "tisco", down: 8000 },
      { slot: 1, variantId: "v1", price: 92000, financeId: "krungsri", down: 10000 },
    ]);
    expect(slots).toHaveLength(2);
    expect(slots[0]).toEqual({ vehicleId: "v1", price: 92000, financeId: "krungsri", down: 10000 });
    expect(slots[1]).toEqual({ vehicleId: "v2", price: 78000, financeId: "tisco", down: 8000 });
  });

  it("pads empty slots when fewer options and nulls become empty strings", () => {
    const slots = savedOptionsToSlots([{ slot: 1, variantId: null, price: 46900, financeId: null, down: 0 }]);
    expect(slots[0]).toEqual({ vehicleId: "", price: 46900, financeId: "", down: 0 });
    expect(slots[1]).toEqual({ vehicleId: "", price: 0, financeId: "", down: 0 });
  });

  it("truncates extras beyond slotCount", () => {
    const slots = savedOptionsToSlots(
      [
        { slot: 1, variantId: "a", price: 1, financeId: null, down: 0 },
        { slot: 2, variantId: "b", price: 2, financeId: null, down: 0 },
        { slot: 3, variantId: "c", price: 3, financeId: null, down: 0 },
      ],
      2,
    );
    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.vehicleId)).toEqual(["a", "b"]);
  });
});
