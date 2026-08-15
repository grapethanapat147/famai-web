import { describe, it, expect } from "vitest";
import { isLineKind, lineAmount, jobTotals } from "@/lib/service/lines";

describe("service line helpers (FAM-1027b)", () => {
  it("isLineKind validates labor/part only", () => {
    expect(isLineKind("labor")).toBe(true);
    expect(isLineKind("part")).toBe(true);
    expect(isLineKind("bogus")).toBe(false);
    expect(isLineKind("")).toBe(false);
  });

  it("lineAmount multiplies and rounds to 2dp", () => {
    expect(lineAmount(1, 300)).toBe(300);
    expect(lineAmount(3, 220)).toBe(660);
    expect(lineAmount(2, 12.345)).toBe(24.69);
  });

  it("jobTotals splits labor vs part and totals", () => {
    const t = jobTotals([
      { kind: "labor", amount: 300 },
      { kind: "part", amount: 220 },
      { kind: "part", amount: 380 },
    ]);
    expect(t.laborCost).toBe(300);
    expect(t.partsCost).toBe(600);
    expect(t.total).toBe(900);
  });

  it("jobTotals treats unknown kinds as labor and handles empty", () => {
    expect(jobTotals([])).toEqual({ laborCost: 0, partsCost: 0, total: 0 });
    expect(jobTotals([{ kind: "other", amount: 50 }]).laborCost).toBe(50);
  });

  it("jobTotals avoids float drift", () => {
    const t = jobTotals([
      { kind: "labor", amount: 0.1 },
      { kind: "labor", amount: 0.2 },
    ]);
    expect(t.laborCost).toBe(0.3);
    expect(t.total).toBe(0.3);
  });
});
