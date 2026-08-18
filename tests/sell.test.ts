import { describe, it, expect } from "vitest";
import { computeDeal, type DealInput } from "@/lib/sell/deal";
import { canSell } from "@/lib/sell/sell";

const base: DealInput = {
  listPrice: 46900,
  discount: 0,
  cost: 40800,
  freebieCost: 0,
  freebieIsCost: true,
  vatPct: 7,
  payMethod: "cash",
  downPayment: 0,
  months: 0,
  monthlyRatePct: 0,
};

describe("computeDeal — cash / profit / VAT", () => {
  it("net = list − discount; profit = net − cost − freebie", () => {
    const d = computeDeal({ ...base, discount: 900, freebieCost: 500 });
    expect(d.netPrice).toBe(46000);
    expect(d.grossProfit).toBe(46000 - 40800 - 500); // 4700
  });

  it("VAT แยกจากราคารวมภาษี (§6.3)", () => {
    const d = computeDeal({ ...base });
    expect(Math.round(d.valueBeforeVat)).toBe(43832); // 46900 / 1.07
    expect(Math.round(d.vat)).toBe(3068);
  });

  it("ไม่มีสิทธิ์ money (cost=null) → กำไรเป็น null", () => {
    const d = computeDeal({ ...base, cost: null });
    expect(d.grossProfit).toBeNull();
    expect(d.marginPct).toBeNull();
    expect(d.netPrice).toBe(46900); // ราคาสุทธิยังคิดได้
  });

  it("freebieIsCost=false → ไม่หักของแถมจากกำไร", () => {
    const d = computeDeal({ ...base, freebieCost: 500, freebieIsCost: false });
    expect(d.grossProfit).toBe(46900 - 40800); // 6100
  });
});

describe("computeDeal — finance (§6.4)", () => {
  it("ตัวอย่างสเปก: ยอดจัด 41,900 · 1.35% · 12 งวด → รวม 48,688 · ค่างวด 4,057", () => {
    const d = computeDeal({
      ...base,
      listPrice: 41900,
      payMethod: "finance",
      downPayment: 0,
      months: 12,
      monthlyRatePct: 1.35,
    });
    expect(d.financed).toBe(41900);
    expect(Math.round(d.totalPayable!)).toBe(48688);
    expect(Math.round(d.monthlyPayment!)).toBe(4057);
  });

  it("เงินดาวน์ลดยอดจัด", () => {
    const d = computeDeal({ ...base, payMethod: "finance", downPayment: 10000, months: 12, monthlyRatePct: 1.35 });
    expect(d.financed).toBe(46900 - 10000);
  });
});

describe("canSell (FAM-1023 · ตรงกับด่านสิทธิ์ใน sell_unit RPC)", () => {
  it("อนุญาต admin/manager/sales · ปฏิเสธที่เหลือ", () => {
    expect(canSell(["sales"])).toBe(true);
    expect(canSell(["manager"])).toBe(true);
    expect(canSell(["admin"])).toBe(true);
    expect(canSell(["acct"])).toBe(false);
    expect(canSell(["tech"])).toBe(false);
    expect(canSell([])).toBe(false);
  });
});
