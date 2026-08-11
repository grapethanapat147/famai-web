import { describe, it, expect } from "vitest";
import { stripMoneyFields, stripMoneyRow } from "@/lib/auth/strip-money";

type Unit = { id: string; model: string; cost: number; cost_vat: number; retail: number | null };

function sample(): Unit[] {
  return [
    { id: "1", model: "FINN", cost: 40800, cost_vat: 2856, retail: 46900 },
    { id: "2", model: "NMAX", cost: 78000, cost_vat: 5460, retail: null },
  ];
}

describe("stripMoneyFields", () => {
  it("returns rows unchanged when canSee = true", () => {
    const rows = sample();
    expect(stripMoneyFields(rows, true, ["cost", "cost_vat"])).toEqual(rows);
  });

  it("removes money fields entirely (not just nulled) so they never serialize", () => {
    const out = stripMoneyFields(sample(), false, ["cost", "cost_vat"]);
    for (const r of out) {
      expect("cost" in r).toBe(false);
      expect("cost_vat" in r).toBe(false);
      expect(r.retail !== undefined).toBe(true); // ราคาขายยังอยู่
    }
    const json = JSON.stringify(out);
    expect(json).not.toContain("cost");
    expect(json).not.toContain("40800");
  });

  it("does not mutate the source rows", () => {
    const rows = sample();
    stripMoneyFields(rows, false, ["cost"]);
    expect(rows[0].cost).toBe(40800);
  });

  it("stripMoneyRow strips a single row but keeps other fields", () => {
    const r = stripMoneyRow(sample()[0], false, ["cost", "cost_vat"]);
    expect("cost" in r).toBe(false);
    expect(r.model).toBe("FINN");
  });
});
