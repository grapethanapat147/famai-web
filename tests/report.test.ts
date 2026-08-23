import { describe, it, expect } from "vitest";
import { inRange, groupAggregate, groupMembers, sumColumn, totalCount, monthKeyBE } from "@/lib/report/aggregate";
import { toCsv } from "@/lib/report/csv";

describe("inRange", () => {
  it("respects open-ended bounds", () => {
    expect(inRange("2026-08-05", "2026-08-01", "2026-08-31")).toBe(true);
    expect(inRange("2026-08-05", "2026-08-10", "")).toBe(false);
    expect(inRange("2026-08-05", "", "2026-08-01")).toBe(false);
    expect(inRange("2026-08-05T09:00:00Z", "2026-08-05", "2026-08-05")).toBe(true);
  });
});

describe("groupAggregate", () => {
  const sales = [
    { model: "NMAX", net: 92000, gross: 14000 },
    { model: "NMAX", net: 90000, gross: 12000 },
    { model: "FINN", net: 46900, gross: 6100 },
  ];

  it("groups + sums multiple columns, sorted by first sum desc", () => {
    const rows = groupAggregate(sales, (s) => s.model, [(s) => s.net, (s) => s.gross]);
    expect(rows.map((r) => r.key)).toEqual(["NMAX", "FINN"]); // 182000 > 46900
    expect(rows[0]).toEqual({ key: "NMAX", count: 2, sums: [182000, 26000] });
    expect(rows[1]).toEqual({ key: "FINN", count: 1, sums: [46900, 6100] });
  });

  it("sumColumn and totalCount aggregate across groups", () => {
    const rows = groupAggregate(sales, (s) => s.model, [(s) => s.net]);
    expect(sumColumn(rows, 0)).toBe(228900);
    expect(totalCount(rows)).toBe(3);
  });

  it("blank key falls back to em-dash", () => {
    const rows = groupAggregate([{ k: "" }], (r) => r.k, [() => 1]);
    expect(rows[0].key).toBe("—");
  });
});

describe("groupMembers (drill-down)", () => {
  const sales = [
    { model: "NMAX", net: 92000 },
    { model: "NMAX", net: 90000 },
    { model: "FINN", net: 46900 },
  ];

  it("returns the raw members of a group", () => {
    expect(groupMembers(sales, (s) => s.model, "NMAX")).toEqual([
      { model: "NMAX", net: 92000 },
      { model: "NMAX", net: 90000 },
    ]);
    expect(groupMembers(sales, (s) => s.model, "FINN")).toHaveLength(1);
  });

  it("member count matches each aggregate row count (invariant)", () => {
    const keyOf = (s: { model: string }) => s.model;
    const rows = groupAggregate(sales, keyOf, [() => 1]);
    for (const r of rows) {
      expect(groupMembers(sales, keyOf, r.key)).toHaveLength(r.count);
    }
  });

  it("matches the em-dash bucket for blank keys (same normalize as groupAggregate)", () => {
    const items = [{ k: "" }, { k: "a" }];
    expect(groupMembers(items, (r) => r.k, "—")).toEqual([{ k: "" }]);
  });
});

describe("monthKeyBE", () => {
  it("converts to Buddhist-era year-month", () => {
    expect(monthKeyBE("2026-08-11")).toBe("2569-08");
    expect(monthKeyBE("bad")).toBe("—");
  });
});

describe("toCsv", () => {
  it("escapes commas, quotes, and newlines", () => {
    const csv = toCsv([
      ["รุ่น", "ยอด"],
      ["NMAX, แดง", 92000],
      ['ชื่อ"พิเศษ', 100],
    ]);
    expect(csv).toBe('รุ่น,ยอด\n"NMAX, แดง",92000\n"ชื่อ""พิเศษ",100');
  });
});
