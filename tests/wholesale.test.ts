import { describe, expect, it } from "vitest";
import {
  canManageWholesaleCompanies,
  canSellWholesale,
  CREDIT_DAYS_MAX,
  filterWholesaleOrders,
  validateWholesaleCompany,
  validateWholesaleOrder,
  wholesaleTotals,
  type CompanyInput,
  type WholesaleOrderRow,
  type WholesaleUnit,
} from "@/lib/wholesale/wholesale";

function unit(over: Partial<WholesaleUnit>): WholesaleUnit {
  return {
    id: "u1",
    branchId: "b1",
    branchName: "ปทุมธานี",
    model: "NMAX 155",
    color: "แดง",
    engineNo: "E-001",
    frameNo: "F-001",
    cost: 50_000,
    retail: 62_000,
    ...over,
  };
}

const UNITS = [
  unit({ id: "u1" }),
  unit({ id: "u2", engineNo: "E-002", frameNo: "F-002", cost: 48_000 }),
  unit({ id: "u3", branchId: "b2", branchName: "รังสิต", engineNo: "E-003" }),
];

describe("สิทธิ์", () => {
  it("ขายส่งได้เท่ากับคนที่ขายปลีกได้ · จัดการร้านค้าแคบกว่า", () => {
    expect(canSellWholesale(["sales"])).toBe(true);
    expect(canSellWholesale(["tech"])).toBe(false);
    expect(canManageWholesaleCompanies(["manager"])).toBe(true);
    expect(canManageWholesaleCompanies(["sales"])).toBe(false); // เซลล์ขายได้ แต่เพิ่มร้านค้าเองไม่ได้
  });
});

describe("validateWholesaleOrder (fixlist ข้อ 12)", () => {
  it("บิลปกติผ่าน + คืนบริษัทของรถ", () => {
    const r = validateWholesaleOrder(
      { companyId: "c1", lines: [{ unitId: "u1", price: "55000" }, { unitId: "u2", price: "53000" }] },
      UNITS,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.branchId).toBe("b1");
      expect(r.value.lines).toEqual([
        { unitId: "u1", price: 55_000 },
        { unitId: "u2", price: 53_000 },
      ]);
    }
  });

  it.each([
    [{ companyId: "" }, [{ unitId: "u1", price: "5" }], "เลือกร้านค้าที่ขายส่งให้"],
    [{}, [], "เลือกคันรถอย่างน้อย 1 คัน"],
    [{}, [{ unitId: "u9", price: "5" }], "มีคันที่เลือกไม่อยู่ในสต๊อกพร้อมขายแล้ว — รีเฟรชหน้าแล้วลองใหม่"],
  ])("ปฏิเสธ %o %o", (patch, lines, error) => {
    const r = validateWholesaleOrder({ companyId: "c1", lines, ...patch }, UNITS);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(error);
    }
  });

  it("เลือกคันซ้ำในบิลเดียวไม่ได้ (บอกคันไหน)", () => {
    const r = validateWholesaleOrder(
      { companyId: "c1", lines: [{ unitId: "u1", price: "5" }, { unitId: "u1", price: "5" }] },
      UNITS,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("ซ้ำ");
      expect(r.error).toContain("E-001");
    }
  });

  it("ราคาต้องมากกว่า 0 และบอกว่าเป็นคันไหน", () => {
    for (const price of ["", "0", "-5", "abc"]) {
      const r = validateWholesaleOrder({ companyId: "c1", lines: [{ unitId: "u2", price }] }, UNITS);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error).toContain("E-002");
      }
    }
  });

  it("คนละบริษัทในบิลเดียวไม่ได้ — เลขบิลผูกกับบริษัท", () => {
    const r = validateWholesaleOrder(
      { companyId: "c1", lines: [{ unitId: "u1", price: "5" }, { unitId: "u3", price: "5" }] },
      UNITS,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("บริษัทเดียวกัน");
    }
  });
});

describe("wholesaleTotals", () => {
  it("รวมยอด/ต้นทุน/กำไร", () => {
    const t = wholesaleTotals([{ unitId: "u1", price: "55000" }, { unitId: "u2", price: "53000" }], UNITS);
    expect(t).toEqual({ units: 2, total: 108_000, cost: 98_000, gross: 10_000 });
  });

  it("ไม่มีสิทธิ์เห็นต้นทุน → กำไรเป็น null (ไม่ใช่ 0 ที่ดูเหมือนขายไม่ได้กำไร)", () => {
    const hidden = [unit({ id: "u1", cost: null })];
    expect(wholesaleTotals([{ unitId: "u1", price: "55000" }], hidden).gross).toBeNull();
  });

  it("ราคายังกรอกไม่ครบ ก็ยังรวมส่วนที่กรอกแล้วได้", () => {
    expect(wholesaleTotals([{ unitId: "u1", price: "" }, { unitId: "u2", price: "53000" }], UNITS).total).toBe(53_000);
  });
});

describe("validateWholesaleCompany", () => {
  const base: CompanyInput = { name: "ร้านมอไซค์รังสิต", taxId: "0105556789012", address: "", phone: "", contactName: "", creditDays: "30" };

  it("รับค่าปกติ + ตัดขีดออกจากเลขผู้เสียภาษี", () => {
    const r = validateWholesaleCompany({ ...base, taxId: "0-1055-56789-01-2" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.taxId).toBe("0105556789012");
      expect(r.value.creditDays).toBe(30);
      expect(r.value.address).toBeNull();
    }
  });

  it("ไม่กรอกเลขผู้เสียภาษีได้ (ยังไม่รู้) · เครดิตว่าง = เงินสด", () => {
    const r = validateWholesaleCompany({ ...base, taxId: "", creditDays: "" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.taxId).toBeNull();
      expect(r.value.creditDays).toBe(0);
    }
  });

  it.each([
    [{ name: "  " }, "กรอกชื่อร้านค้า"],
    [{ taxId: "12345" }, "เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก"],
    [{ creditDays: "-1" }, `เครดิตต้องอยู่ระหว่าง 0–${CREDIT_DAYS_MAX} วัน`],
    [{ creditDays: "365" }, `เครดิตต้องอยู่ระหว่าง 0–${CREDIT_DAYS_MAX} วัน`],
  ])("ปฏิเสธ %o", (patch, error) => {
    const r = validateWholesaleCompany({ ...base, ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(error);
    }
  });
});

describe("filterWholesaleOrders", () => {
  const rows: WholesaleOrderRow[] = [
    { id: "1", orderNo: "FMG-WHOLESALE-2569-00001", companyName: "ร้านรังสิต", soldAt: "2026-09-02", units: 3, total: 160_000, gross: 12_000, salespersonName: "สมชาย", voided: false },
    { id: "2", orderNo: "FMG-WHOLESALE-2569-00002", companyName: "ร้านลำลูกกา", soldAt: "2026-08-20", units: 1, total: 55_000, gross: 5_000, salespersonName: "มานี", voided: false },
  ];

  it("ค้นด้วยเลขบิล / ร้านค้า / พนักงาน", () => {
    expect(filterWholesaleOrders(rows, { search: "00002" }).map((r) => r.id)).toEqual(["2"]);
    expect(filterWholesaleOrders(rows, { search: "รังสิต" }).map((r) => r.id)).toEqual(["1"]);
    expect(filterWholesaleOrders(rows, { search: "มานี" }).map((r) => r.id)).toEqual(["2"]);
  });

  it("กรองตั้งแต่วันที่ · ไม่ใส่ตัวกรอง = ได้ทั้งหมด", () => {
    expect(filterWholesaleOrders(rows, { fromDate: "2026-09-01" }).map((r) => r.id)).toEqual(["1"]);
    expect(filterWholesaleOrders(rows)).toHaveLength(2);
  });
});
