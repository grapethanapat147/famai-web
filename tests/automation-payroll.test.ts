import { describe, it, expect } from "vitest";
import { isMonthClosed, shouldRemindPayroll } from "@/lib/automation/payroll";
import { daysUntilMonthEnd, yearMonth } from "@/lib/automation/clock";
import { payrollReminderMessage } from "@/lib/line/message";

describe("daysUntilMonthEnd / yearMonth", () => {
  it("counts days to end of month", () => {
    expect(daysUntilMonthEnd(new Date(2026, 7, 31))).toBe(0); // 31 ส.ค.
    expect(daysUntilMonthEnd(new Date(2026, 7, 29))).toBe(2);
    expect(daysUntilMonthEnd(new Date(2026, 1, 27))).toBe(1); // ก.พ. 2026 มี 28 วัน
  });
  it("formats YYYY-MM", () => {
    expect(yearMonth(new Date(2026, 7, 5))).toBe("2026-08");
  });
});

describe("isMonthClosed", () => {
  const periods = [
    { periodEnd: "2026-08-31", status: "ปิดงวดแล้ว" },
    { periodEnd: "2026-07-31", status: "จ่ายแล้ว" },
    { periodEnd: "2026-09-30", status: "ร่าง" },
  ];
  it("true when a period this month is closed/paid", () => {
    expect(isMonthClosed(periods, "2026-08")).toBe(true);
    expect(isMonthClosed(periods, "2026-07")).toBe(true);
  });
  it("false when this month has only draft / no period", () => {
    expect(isMonthClosed(periods, "2026-09")).toBe(false); // ร่าง
    expect(isMonthClosed(periods, "2026-10")).toBe(false); // ไม่มี
  });
});

describe("shouldRemindPayroll", () => {
  it("reminds only inside the window and when not closed", () => {
    expect(shouldRemindPayroll(2, false)).toBe(true); // ใกล้สิ้นเดือน ยังไม่ปิด
    expect(shouldRemindPayroll(2, true)).toBe(false); // ปิดแล้ว
    expect(shouldRemindPayroll(10, false)).toBe(false); // ยังไม่ถึง window
    expect(shouldRemindPayroll(0, false)).toBe(true); // วันสุดท้าย
  });
});

describe("payrollReminderMessage", () => {
  it("phrases remaining days", () => {
    expect(payrollReminderMessage(2, "29 ส.ค. 2026")).toContain("เหลืออีก 2 วัน");
    expect(payrollReminderMessage(0, "31 ส.ค. 2026")).toContain("วันนี้สิ้นเดือน");
  });
});
