import { describe, it, expect } from "vitest";
import { formatBaht, formatThaiDate, formatPercentChange } from "@/lib/format";

describe("formatBaht", () => {
  it("groups thousands and appends ฿", () => {
    expect(formatBaht(1354302)).toBe("1,354,302 ฿");
    expect(formatBaht(0)).toBe("0 ฿");
  });
  it("wraps negatives in parentheses", () => {
    expect(formatBaht(-1200)).toBe("(1,200) ฿");
  });
  it("can omit the symbol", () => {
    expect(formatBaht(46900, { withSymbol: false })).toBe("46,900");
  });
});

describe("formatThaiDate", () => {
  it("renders พ.ศ. and is timezone-safe for date-only strings", () => {
    expect(formatThaiDate("2024-09-11")).toBe("11 ก.ย. 2567");
    expect(formatThaiDate("2026-01-01T17:00:00Z")).toBe("1 ม.ค. 2569");
  });
  it("passes through non-dates", () => {
    expect(formatThaiDate("n/a")).toBe("n/a");
  });
});

describe("formatPercentChange", () => {
  it("reports direction and sign", () => {
    expect(formatPercentChange(120, 100)).toEqual({ text: "+20.0%", direction: "up" });
    expect(formatPercentChange(80, 100)).toEqual({ text: "-20.0%", direction: "down" });
    expect(formatPercentChange(100, 100)).toEqual({ text: "0.0%", direction: "flat" });
  });
  it("does not show 0%/∞ when previous has no data", () => {
    expect(formatPercentChange(50, 0)).toEqual({ text: "ช่วงก่อนไม่มีข้อมูล", direction: "none" });
  });
});
