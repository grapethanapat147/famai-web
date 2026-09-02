import { describe, expect, it } from "vitest";
import { amountBreakdown, docPartLabel, isDocPart, needsThreeDocs, splitFinanceSale } from "@/lib/acct/documents";

describe("splitFinanceSale (fixlist ข้อ 11)", () => {
  it("สองใบบวกกันได้ยอดเต็มพอดีทั้งฐานภาษีและ VAT", () => {
    const full = amountBreakdown(62_000, 7);
    const s = splitFinanceSale(62_000, 12_000, 7);
    expect(s.down.total + s.financed.total).toBeCloseTo(full.total, 2);
    expect(s.down.base + s.financed.base).toBeCloseTo(full.base, 2);
    expect(s.down.vat + s.financed.vat).toBeCloseTo(full.vat, 2);
  });

  it("ยอดที่ปัดเศษแล้วเพี้ยนง่าย ก็ยังบวกกันได้พอดี", () => {
    for (const [net, down] of [
      [58_333.33, 10_000],
      [99_999.99, 33_333.33],
      [45_100, 15_033.5],
    ]) {
      const full = amountBreakdown(net, 7);
      const s = splitFinanceSale(net, down, 7);
      expect(s.down.base + s.financed.base).toBeCloseTo(full.base, 2);
      expect(s.down.vat + s.financed.vat).toBeCloseTo(full.vat, 2);
      expect(s.down.total + s.financed.total).toBeCloseTo(full.total, 2);
    }
  });

  it("เงินดาวน์คือยอดที่ลูกค้าจ่ายจริง (VAT ในตัว)", () => {
    const s = splitFinanceSale(62_000, 12_000, 7);
    expect(s.down.total).toBe(12_000);
    expect(s.financed.total).toBe(50_000);
  });

  it("VAT = 0 ก็ยังแยกได้", () => {
    const s = splitFinanceSale(50_000, 20_000, 0);
    expect(s.down).toEqual({ base: 20_000, vat: 0, total: 20_000 });
    expect(s.financed).toEqual({ base: 30_000, vat: 0, total: 30_000 });
  });

  it("ดาวน์เกินยอดเต็ม/ติดลบ ถูกบีบให้อยู่ในช่วง — ยอดจัดไม่ติดลบ", () => {
    const over = splitFinanceSale(50_000, 80_000, 7);
    expect(over.down.total).toBe(50_000);
    expect(over.financed.total).toBe(0);
    const neg = splitFinanceSale(50_000, -5_000, 7);
    expect(neg.down.total).toBe(0);
    expect(neg.financed.total).toBe(50_000);
  });
});

describe("needsThreeDocs", () => {
  it("เฉพาะเงินผ่อนที่มีเงินดาวน์จริง", () => {
    expect(needsThreeDocs("finance", 12_000)).toBe(true);
    expect(needsThreeDocs("finance", 0)).toBe(false); // ดาวน์ 0 = ไม่มีใบเงินดาวน์ให้ออก
    expect(needsThreeDocs("finance", null)).toBe(false);
    expect(needsThreeDocs("cash", 12_000)).toBe(false);
  });
});

describe("DocPart", () => {
  it("รู้จักเฉพาะส่วนจริง · ค่าที่ไม่รู้จักถือเป็นยอดเต็ม (เอกสารเก่าไม่มีคอลัมน์นี้)", () => {
    expect(isDocPart("down")).toBe(true);
    expect(isDocPart("deposit")).toBe(false);
    expect(docPartLabel(null)).toBe("ยอดเต็ม");
    expect(docPartLabel("financed")).toBe("ยอดจัดไฟแนนซ์");
  });
});
