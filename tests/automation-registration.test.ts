import { describe, it, expect } from "vitest";
import { overdueRegistrations, type RegRow } from "@/lib/automation/registration";
import { registrationOverdueDigest } from "@/lib/line/message";
import { nowParts } from "@/lib/automation/clock";

const row = (over: Partial<RegRow>): RegRow => ({
  customerName: "สมชาย",
  model: "NMAX",
  branchName: "สาขา A",
  stage: "รอทะเบียน",
  dueAt: "2026-08-01",
  plateReceived: false,
  ...over,
});

describe("overdueRegistrations", () => {
  const today = "2026-08-21";
  it("keeps only unplated + past-due, sorted most-overdue first", () => {
    const out = overdueRegistrations(
      [
        row({ customerName: "A", dueAt: "2026-08-19" }), // เกิน 2 วัน
        row({ customerName: "B", dueAt: "2026-07-22" }), // เกิน 30 วัน
        row({ customerName: "C", dueAt: "2026-08-25" }), // ยังไม่ถึงกำหนด
        row({ customerName: "D", dueAt: "2026-01-01", plateReceived: true }), // ได้ป้ายแล้ว
        row({ customerName: "E", dueAt: null }), // ไม่มีกำหนด
      ],
      today,
    );
    expect(out.map((r) => r.customerName)).toEqual(["B", "A"]);
    expect(out[0].daysOverdue).toBe(30);
    expect(out[1].daysOverdue).toBe(2);
  });
});

describe("registrationOverdueDigest", () => {
  it("returns null when nothing overdue", () => {
    expect(registrationOverdueDigest([], "21 ส.ค. 2026")).toBeNull();
  });
  it("summarizes with customer/model/branch/days/stage", () => {
    const overdue = overdueRegistrations([row({ customerName: "สมหญิง", dueAt: "2026-08-11" })], "2026-08-21");
    const msg = registrationOverdueDigest(overdue, "21 ส.ค. 2026")!;
    expect(msg).toContain("1 ราย");
    expect(msg).toContain("สมหญิง · NMAX · สาขา A · เกิน 10 วัน (รอทะเบียน)");
  });
});

describe("nowParts", () => {
  it("formats ISO today + Thai label", () => {
    const { today, label } = nowParts(new Date(2026, 7, 5)); // 2026-08-05
    expect(today).toBe("2026-08-05");
    expect(label).toBe("5 ส.ค. 2569");
  });
});
