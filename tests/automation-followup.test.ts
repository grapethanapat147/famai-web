import { describe, it, expect } from "vitest";
import { plannedFollowUps, followUpKey, type SaleRow } from "@/lib/automation/followup";
import { addDays } from "@/lib/automation/clock";

const sale = (over: Partial<SaleRow>): SaleRow => ({
  id: "s1",
  branchId: "b1",
  customerId: "c1",
  soldAt: "2026-06-01",
  ...over,
});

describe("addDays", () => {
  it("adds days across month boundaries", () => {
    expect(addDays("2026-06-01", 30)).toBe("2026-07-01");
    expect(addDays("2026-12-20", 30)).toBe("2027-01-19");
    expect(addDays("2026-08-21", 0)).toBe("2026-08-21");
  });
});

describe("plannedFollowUps", () => {
  const today = "2026-08-21"; // 81 วันหลัง 2026-06-01
  it("creates tasks for cadence offsets that are due, deduped by (sale,kind)", () => {
    // 7d(6-08) + 30d(7-01) ถึงกำหนดแล้ว · 90d(8-30) ยังไม่ถึง
    const existing = new Set([followUpKey("s1", "7d")]); // 7d มีแล้ว → ข้าม
    const out = plannedFollowUps([sale({})], existing, [7, 30, 90], today);
    expect(out.map((t) => t.kind)).toEqual(["30d"]);
    expect(out[0]).toMatchObject({ sale_id: "s1", branch_id: "b1", customer_id: "c1", due_at: "2026-07-01" });
  });
  it("skips offsets not yet due", () => {
    const out = plannedFollowUps([sale({ soldAt: "2026-08-20" })], new Set(), [7, 30], today);
    expect(out).toHaveLength(0); // 7d = 8-27 ยังไม่ถึง
  });
  it("handles multiple sales", () => {
    const out = plannedFollowUps([sale({ id: "s1" }), sale({ id: "s2" })], new Set(), [7], today);
    expect(out.map((t) => t.sale_id).sort()).toEqual(["s1", "s2"]);
  });
  it("maps 365/1095 days to kind 1y/3y", () => {
    const out = plannedFollowUps([sale({ soldAt: "2020-01-01" })], new Set(), [365, 1095], today);
    expect(out.map((t) => t.kind)).toEqual(["1y", "3y"]);
  });
});
