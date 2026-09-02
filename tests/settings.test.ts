import { describe, it, expect } from "vitest";
import { resolveSettings, SETTING_DEFAULTS } from "@/lib/settings/resolve";
import { SETTING_FIELDS } from "@/lib/settings/fields";

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

describe("ค่าตั้งใหม่ของ FAM-1115 (fixlist ข้อ 01–03)", () => {
  it("มี ar_due_days / service_first_days ค่าเริ่มต้นตรงกับที่ seed ใน migration 30", () => {
    expect(SETTING_DEFAULTS.ar_due_days).toBe(30);
    expect(SETTING_DEFAULTS.service_first_days).toBe(30);
  });

  it("ค่าจาก DB ทับ default ได้เหมือนคีย์อื่น", () => {
    const s = resolveSettings([
      { key: "ar_due_days", value: 45 },
      { key: "service_first_days", value: 14 },
    ]);
    expect(s.ar_due_days).toBe(45);
    expect(s.service_first_days).toBe(14);
  });

  it("ทุกคีย์ที่โชว์ในหน้าตั้งค่าต้องมีค่าเริ่มต้น (กันเพิ่มช่องแล้วลืม default)", () => {
    for (const f of SETTING_FIELDS) {
      expect(SETTING_DEFAULTS[f.key], `ขาดค่าเริ่มต้นของ ${f.key}`).toBeDefined();
    }
  });
});
