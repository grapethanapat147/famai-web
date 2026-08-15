import { describe, it, expect } from "vitest";
import { quotePrintColumns, monthlyFor, type PrintBuilt } from "@/lib/quote/print";

function built(over: Partial<PrintBuilt>): PrintBuilt {
  return {
    o: { price: 92000, down: 10000 },
    v: { name: "NMAX" },
    fin: { name: "กรุงศรี", ratePct: 1.35 },
    financed: 82000,
    terms: [
      { months: 12, monthly: 8000 },
      { months: 24, monthly: 4200 },
    ],
    ...over,
  };
}

describe("quotePrintColumns (FAM-1029)", () => {
  it("keeps only rows with a vehicle and a price", () => {
    const cols = quotePrintColumns([
      built({}),
      built({ v: undefined }),
      built({ o: { price: 0, down: 0 } }),
    ]);
    expect(cols).toHaveLength(1);
    expect(cols[0].name).toBe("NMAX");
  });

  it("labels cash vs finance", () => {
    const [finance] = quotePrintColumns([built({})]);
    expect(finance.financeLabel).toBe("กรุงศรี 1.35%");

    const [cash] = quotePrintColumns([built({ fin: undefined })]);
    expect(cash.financeLabel).toBe("เงินสด");
  });

  it("carries price/down/financed onto the column", () => {
    const [col] = quotePrintColumns([built({})]);
    expect(col.price).toBe(92000);
    expect(col.down).toBe(10000);
    expect(col.financed).toBe(82000);
  });

  it("monthlyFor returns the value for a term, null when missing", () => {
    const [col] = quotePrintColumns([built({})]);
    expect(monthlyFor(col, 12)).toBe(8000);
    expect(monthlyFor(col, 24)).toBe(4200);
    expect(monthlyFor(col, 36)).toBeNull();
  });

  it("monthlyFor is null for a cash column (no terms)", () => {
    const [col] = quotePrintColumns([built({ fin: undefined, terms: [] })]);
    expect(monthlyFor(col, 12)).toBeNull();
  });
});
