import { describe, it, expect } from "vitest";
import { resolveSettings, SETTING_DEFAULTS } from "@/lib/settings/resolve";

describe("resolveSettings", () => {
  it("returns seeded defaults when no rows", () => {
    expect(resolveSettings([])).toEqual(SETTING_DEFAULTS);
  });

  it("overrides with DB rows (jsonb already parsed by PostgREST)", () => {
    const s = resolveSettings([
      { key: "vat_pct", value: 10 },
      { key: "aging_buckets", value: [15, 45] },
      { key: "freebie_is_cost", value: false },
      { key: "work_start", value: "09:00" },
    ]);
    expect(s.vat_pct).toBe(10);
    expect(s.aging_buckets).toEqual([15, 45]);
    expect(s.freebie_is_cost).toBe(false);
    expect(s.work_start).toBe("09:00");
    // คีย์ที่ไม่ถูกแก้ ต้องคงค่า default
    expect(s.commission_pct).toBe(SETTING_DEFAULTS.commission_pct);
  });

  it("ignores unknown keys and null values (keeps defaults)", () => {
    const s = resolveSettings([
      { key: "unknown_key", value: 999 },
      { key: "vat_pct", value: null },
    ]);
    expect(s.vat_pct).toBe(SETTING_DEFAULTS.vat_pct);
    expect((s as Record<string, unknown>).unknown_key).toBeUndefined();
  });
});
