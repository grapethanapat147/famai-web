import { describe, it, expect } from "vitest";
import { computePayslip, monthRange, payrollTotals, canViewPayroll, type PayslipRow } from "@/lib/payroll/payroll";

describe("computePayslip", () => {
  it("base + OT + commission − SSN = net (worked example)", () => {
    const p = computePayslip({
      baseSalary: 15000,
      otMinutes: 600, // 10 ชม.
      commissionBase: 100000,
      otRate: 1.5,
      commissionPct: 8,
      ssnPct: 5,
      ssnCap: 750,
    });
    // hourly = 15000/240 = 62.5 · OT = 62.5×10×1.5 = 937.5 → 938
    expect(p.otAmount).toBe(938);
    expect(p.commission).toBe(8000); // 100000×8%
    expect(p.ssn).toBe(750); // min(750, 750)
    expect(p.gross).toBe(23938); // 15000+938+8000
    expect(p.net).toBe(23188); // 23938−750
  });

  it("SSN capped at ssnCap", () => {
    const p = computePayslip({ baseSalary: 30000, otMinutes: 0, commissionBase: 0, otRate: 1.5, commissionPct: 8, ssnPct: 5, ssnCap: 750 });
    expect(p.ssn).toBe(750); // 30000×5% = 1500 → capped 750
    expect(p.net).toBe(29250);
  });

  it("no OT / no commission", () => {
    const p = computePayslip({ baseSalary: 12000, otMinutes: 0, commissionBase: 0, otRate: 1.5, commissionPct: 8, ssnPct: 5, ssnCap: 750 });
    expect(p.otAmount).toBe(0);
    expect(p.commission).toBe(0);
    expect(p.ssn).toBe(600); // 12000×5%
    expect(p.net).toBe(11400);
  });
});

describe("monthRange", () => {
  it("computes first/last day incl. leap + 30-day months", () => {
    expect(monthRange("2026-08")).toEqual({ start: "2026-08-01", end: "2026-08-31" });
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(monthRange("2024-02")).toEqual({ start: "2024-02-01", end: "2024-02-29" }); // อธิกสุรทิน
    expect(monthRange("2026-04")).toEqual({ start: "2026-04-01", end: "2026-04-30" });
    expect(monthRange("bad")).toEqual({ start: "", end: "" });
  });
});

describe("payrollTotals", () => {
  it("sums each column across rows", () => {
    const rows: PayslipRow[] = [
      { employeeId: "1", name: "ก", position: "เซลล์", otMinutes: 0, commissionBase: 0, base: 15000, otAmount: 938, commission: 8000, gross: 23938, ssn: 750, net: 23188 },
      { employeeId: "2", name: "ข", position: "ช่าง", otMinutes: 0, commissionBase: 0, base: 12000, otAmount: 0, commission: 0, gross: 12000, ssn: 600, net: 11400 },
    ];
    const t = payrollTotals(rows);
    expect(t.base).toBe(27000);
    expect(t.commission).toBe(8000);
    expect(t.net).toBe(34588);
  });
});

describe("canViewPayroll", () => {
  it("gates to payroll roles", () => {
    expect(canViewPayroll(["hr"])).toBe(true);
    expect(canViewPayroll(["acct"])).toBe(true);
    expect(canViewPayroll(["sales"])).toBe(false);
    expect(canViewPayroll(["stock"])).toBe(false);
  });
});
