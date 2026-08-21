import { describe, it, expect } from "vitest";
import { isAuthorizedCron } from "@/lib/automation/cron-auth";
import { agedStockDigest } from "@/lib/line/message";
import type { DashUnit } from "@/lib/dashboard/stats";

describe("isAuthorizedCron", () => {
  it("accepts the matching Bearer header", () => {
    expect(isAuthorizedCron("Bearer s3cr3t", "s3cr3t")).toBe(true);
  });
  it("rejects wrong / missing / unconfigured", () => {
    expect(isAuthorizedCron("Bearer nope", "s3cr3t")).toBe(false);
    expect(isAuthorizedCron("s3cr3t", "s3cr3t")).toBe(false); // ต้องมี Bearer
    expect(isAuthorizedCron(null, "s3cr3t")).toBe(false);
    expect(isAuthorizedCron("Bearer s3cr3t", undefined)).toBe(false); // ไม่ตั้ง secret = ปฏิเสธ
    expect(isAuthorizedCron("Bearer s3cr3t", "")).toBe(false);
  });
});

const unit = (over: Partial<DashUnit>): DashUnit => ({
  branchCode: "A",
  branchName: "สาขา A",
  status: "available",
  ageDays: 100,
  ...over,
});

describe("agedStockDigest", () => {
  it("returns null when nothing is aged", () => {
    expect(agedStockDigest([], 90, "19 ส.ค. 2026")).toBeNull();
  });
  it("summarizes count + lists items", () => {
    const msg = agedStockDigest([unit({ model: "NMAX", ageDays: 120 }), unit({ model: "XMAX", ageDays: 200 })], 90, "19 ส.ค. 2026");
    expect(msg).toContain("2 คัน");
    expect(msg).toContain("NMAX · สาขา A · 120 วัน");
    expect(msg).toContain("XMAX");
  });
  it("caps the list at 10 and notes the remainder", () => {
    const many = Array.from({ length: 14 }, (_, i) => unit({ model: `M${i}`, ageDays: 100 + i }));
    const msg = agedStockDigest(many, 90, "d")!;
    expect(msg).toContain("14 คัน");
    expect(msg).toContain("…และอีก 4 คัน");
  });
});
