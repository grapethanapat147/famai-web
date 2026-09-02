import { describe, expect, it } from "vitest";
import { cashToday, financeApproval, lowStockModels, salesMoney } from "@/lib/dashboard/money";

const TODAY = "2026-09-02";

describe("salesMoney (fixlist ข้อ 15)", () => {
  const sales = [
    { soldAt: "2026-09-02", netPrice: 62_000 },
    { soldAt: "2026-09-02T10:30:00Z", netPrice: 55_000 },
    { soldAt: "2026-09-01", netPrice: 71_000 },
    { soldAt: "2026-08-31", netPrice: 99_000 }, // เดือนก่อน — ไม่นับ
  ];

  it("แยกยอดวันนี้กับเดือนนี้ พร้อมจำนวนคัน", () => {
    expect(salesMoney(sales, TODAY)).toEqual({ today: 117_000, month: 188_000, countToday: 2, countMonth: 3 });
  });

  it("รับ timestamp เต็มได้ (ตัดเอาเฉพาะวันที่)", () => {
    expect(salesMoney([{ soldAt: "2026-09-02T23:59:00Z", netPrice: 10 }], TODAY).today).toBe(10);
  });

  it("ไม่มีการขาย = ศูนย์ทั้งหมด", () => {
    expect(salesMoney([], TODAY)).toEqual({ today: 0, month: 0, countToday: 0, countMonth: 0 });
  });
});

describe("cashToday", () => {
  it("รับเข้า − จ่ายออก = คงเหลือสุทธิ (เฉพาะของวันนี้)", () => {
    const r = cashToday(
      [{ date: TODAY, amount: 50_000 }, { date: "2026-09-01", amount: 9_000 }],
      [{ date: TODAY, amount: 12_500 }],
      TODAY,
    );
    expect(r).toEqual({ in: 50_000, out: 12_500, net: 37_500 });
  });

  it("จ่ายมากกว่ารับ = ติดลบ (ไม่ปัดเป็น 0)", () => {
    expect(cashToday([], [{ date: TODAY, amount: 800 }], TODAY).net).toBe(-800);
  });
});

describe("financeApproval", () => {
  it("อัตรา = อนุมัติ ÷ (อนุมัติ + ปฏิเสธ) — เคสรอผลไม่เข้าตัวหาร", () => {
    const r = financeApproval(["อนุมัติแล้ว", "อนุมัติแล้ว", "อนุมัติแล้ว", "ปฏิเสธ", "รอผล", "ส่งเรื่อง"]);
    expect(r).toEqual({ approved: 3, rejected: 1, pending: 2, ratePct: 75 });
  });

  it("ยังไม่มีเคสที่รู้ผล = null (โชว์ — ไม่ใช่ 0%)", () => {
    expect(financeApproval(["รอผล", "ส่งเรื่อง"]).ratePct).toBeNull();
    expect(financeApproval([]).ratePct).toBeNull();
  });
});

describe("lowStockModels", () => {
  const units = [
    { model: "NMAX" },
    { model: "Aerox" },
    { model: "Aerox" },
    { model: "Aerox" },
    { model: "XMAX 300" },
    { model: "XMAX 300" },
    { model: undefined },
  ];

  it("เอาเฉพาะรุ่นที่เหลือไม่เกินเกณฑ์ เรียงน้อยสุดก่อน", () => {
    expect(lowStockModels(units, 2)).toEqual([
      { model: "NMAX", qty: 1 },
      { model: "XMAX 300", qty: 2 },
    ]);
  });

  it("รุ่นที่ของเยอะไม่ติด · รถไม่มีรุ่นถูกข้าม", () => {
    expect(lowStockModels(units, 0)).toEqual([]);
    expect(lowStockModels([{ model: undefined }], 5)).toEqual([]);
  });

  it("จำกัดจำนวนที่โชว์ได้", () => {
    const many = ["A", "B", "C", "D", "E", "F"].map((model) => ({ model }));
    expect(lowStockModels(many, 1, 3)).toHaveLength(3);
  });
});
