import { describe, it, expect } from "vitest";
import { stockStats, agedUnits, type DashUnit } from "@/lib/dashboard/stats";

const units: DashUnit[] = [
  { branchCode: "FMG01", branchName: "FMG", status: "available", ageDays: 12, cost: 40000 },
  { branchCode: "FMG01", branchName: "FMG", status: "available", ageDays: 200, cost: 175000 },
  { branchCode: "FMM01", branchName: "FMM", status: "reserved", ageDays: 70, cost: 62000 },
  { branchCode: "FMM01", branchName: "FMM", status: "sold", ageDays: 5, cost: 55000 }, // ไม่นับ (ขายแล้ว)
];

describe("stockStats", () => {
  it("counts in-stock (excludes sold) and aged", () => {
    const s = stockStats(units, { agingDays: 90, buckets: [30, 60, 90], canSeeMoney: true });
    expect(s.inStockCount).toBe(3);
    expect(s.agedCount).toBe(1); // อายุ 200 > 90
  });

  it("sums money only when canSeeMoney; null otherwise", () => {
    const see = stockStats(units, { agingDays: 90, buckets: [30, 60, 90], canSeeMoney: true });
    expect(see.stockValue).toBe(40000 + 175000 + 62000);
    expect(see.agedValue).toBe(175000);

    const hidden = stockStats(units, { agingDays: 90, buckets: [30, 60, 90], canSeeMoney: false });
    expect(hidden.stockValue).toBeNull();
    expect(hidden.agedValue).toBeNull();
    expect(hidden.inStockCount).toBe(3); // นับได้ปกติ
  });

  it("buckets in-stock by age edges (last bucket flagged bad)", () => {
    const s = stockStats(units, { agingDays: 90, buckets: [30, 60, 90], canSeeMoney: true });
    // ≤30: [12] =1 · 31-60: 0 · 61-90: [70] =1 · เกิน90: [200] =1
    expect(s.buckets.map((b) => b.value)).toEqual([1, 0, 1, 1]);
    expect(s.buckets[s.buckets.length - 1].tone).toBe("bad");
  });

  it("byBranch counts in-stock per branch", () => {
    const s = stockStats(units, { agingDays: 90, buckets: [30, 60, 90], canSeeMoney: true });
    expect(s.byBranch).toEqual([
      { label: "FMG", value: 2 },
      { label: "FMM", value: 1 },
    ]);
  });
});

describe("agedUnits", () => {
  it("returns in-stock units over the threshold, oldest first, capped", () => {
    const list: DashUnit[] = [
      { branchCode: "A", branchName: "A", status: "available", ageDays: 120, model: "NMAX" },
      { branchCode: "A", branchName: "A", status: "available", ageDays: 40, model: "Aerox" }, // ไม่เกินเกณฑ์
      { branchCode: "B", branchName: "B", status: "reserved", ageDays: 300, model: "XMAX" },
      { branchCode: "B", branchName: "B", status: "sold", ageDays: 400, model: "Grand" }, // ขายแล้ว ไม่นับ
    ];
    const aged = agedUnits(list, 90, 5);
    expect(aged.map((u) => u.model)).toEqual(["XMAX", "NMAX"]);
  });

  it("respects the limit", () => {
    const many: DashUnit[] = Array.from({ length: 8 }, (_, i) => ({
      branchCode: "A",
      branchName: "A",
      status: "available",
      ageDays: 100 + i,
    }));
    expect(agedUnits(many, 90, 3)).toHaveLength(3);
    expect(agedUnits(many, 90, 3)[0].ageDays).toBe(107);
  });
});
