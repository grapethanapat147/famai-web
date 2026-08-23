import { describe, it, expect } from "vitest";
import { validateDealCustomer } from "@/lib/deal/deals";

describe("validateDealCustomer", () => {
  it("accepts a full customer and nulls blanks", () => {
    const r = validateDealCustomer({ name: "สมชาย ใจดี", phone: "", address: "", taxId: "", note: "" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ name: "สมชาย ใจดี", phone: null, address: null, taxId: null, note: null });
    }
  });
  it("requires a name", () => {
    const r = validateDealCustomer({ name: "  ", phone: "", address: "", taxId: "", note: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("กรอกชื่อลูกค้า");
  });
  it("requires a 13-digit national/tax id when provided", () => {
    expect(validateDealCustomer({ name: "x", phone: "", address: "", taxId: "123", note: "" }).ok).toBe(false);
    expect(validateDealCustomer({ name: "x", phone: "", address: "", taxId: "1560100000001", note: "" }).ok).toBe(true);
  });
});
import {
  dealTrack,
  stageIndex,
  regNext,
  isDelivered,
  isRegStage,
  stageVariant,
  stageTimestampField,
  REG_STAGES,
} from "@/lib/deal/stage";
import { filterDeals, stageCounts, openDealCount, offTrackCount, customerDeals, customerServices, isOffTrack, canManageDeal, canVoidDeal, isVoidableStage, vatBreakdown, type Deal, type ServiceHistory } from "@/lib/deal/deals";

describe("vatBreakdown", () => {
  it("splits a VAT-inclusive net price into base + vat (7%)", () => {
    const { valueBeforeVat, vat } = vatBreakdown(107, 7);
    expect(valueBeforeVat).toBeCloseTo(100, 6);
    expect(vat).toBeCloseTo(7, 6);
    expect(valueBeforeVat + vat).toBeCloseTo(107, 6);
  });
  it("returns the whole amount as base when vat is 0", () => {
    expect(vatBreakdown(500, 0)).toEqual({ valueBeforeVat: 500, vat: 0 });
  });
});

describe("deal track (§9g: cash 4 steps, finance 6 steps)", () => {
  it("cash track drops the finance steps", () => {
    expect(dealTrack("cash")).toEqual(["ขายแล้ว", "รอทะเบียน", "ป้ายขาว", "ส่งมอบแล้ว"]);
    expect(dealTrack("finance")).toHaveLength(6);
  });

  it("regNext walks the correct track per pay method", () => {
    expect(regNext("ขายแล้ว", "cash")).toBe("รอทะเบียน"); // ข้ามไฟแนนซ์
    expect(regNext("ขายแล้ว", "finance")).toBe("ส่งไฟแนนซ์");
    expect(regNext("อนุมัติ", "finance")).toBe("รอทะเบียน");
  });

  it("terminal and off-track index", () => {
    expect(regNext("ส่งมอบแล้ว", "finance")).toBeNull();
    expect(isDelivered("ส่งมอบแล้ว")).toBe(true);
    expect(stageIndex("ส่งไฟแนนซ์", "cash")).toBe(-1); // เงินสดไม่มีขั้นนี้
    expect(stageIndex("รอทะเบียน", "cash")).toBe(1);
  });

  it("validates raw stage strings + maps timestamp fields", () => {
    expect(isRegStage("ป้ายขาว")).toBe(true);
    expect(isRegStage("bogus")).toBe(false);
    expect(stageTimestampField("ส่งมอบแล้ว")).toBe("delivered_at");
    expect(stageTimestampField("ขายแล้ว")).toBeNull();
  });

  it("every stage has a badge variant", () => {
    expect(REG_STAGES.every((s) => typeof stageVariant(s) === "string")).toBe(true);
  });
});

function deal(over: Partial<Deal>): Deal {
  return {
    saleId: "s",
    regId: "r",
    customerId: "c",
    customerName: "สมชาย",
    customerPhone: null,
    customerAddress: null,
    customerTaxId: null,
    vehicle: "NMAX",
    engineNo: "E1",
    frameNo: "F1",
    regNote: null,
    payMethod: "finance",
    netPrice: 90000,
    soldAt: "2026-08-01T00:00:00Z",
    stage: "ขายแล้ว",
    plateNo: null,
    docNo: null,
    finance: null,
    steps: [],
    ...over,
  };
}

describe("deal derivations", () => {
  it("isOffTrack when finance rejected", () => {
    expect(isOffTrack(deal({ finance: { id: "f1", companyName: "กรุงศรี", status: "ปฏิเสธ", amount: 80000, rejectReason: "เครดิตไม่ผ่าน" } }))).toBe(true);
    expect(isOffTrack(deal({ finance: { id: "f1", companyName: "กรุงศรี", status: "รอผล", amount: 80000, rejectReason: null } }))).toBe(false);
    expect(isOffTrack(deal({ finance: null }))).toBe(false);
  });

  it("filters by stage, search, and onlyOpen", () => {
    const deals = [
      deal({ saleId: "1", stage: "รอทะเบียน", customerName: "มานี" }),
      deal({ saleId: "2", stage: "ส่งมอบแล้ว", vehicle: "Aerox" }),
    ];
    expect(filterDeals(deals, { stage: "รอทะเบียน" }).map((d) => d.saleId)).toEqual(["1"]);
    expect(filterDeals(deals, { search: "aerox" }).map((d) => d.saleId)).toEqual(["2"]);
    expect(filterDeals(deals, { onlyOpen: true }).map((d) => d.saleId)).toEqual(["1"]);
  });

  it("counts by stage and open deals", () => {
    const deals = [deal({ stage: "ขายแล้ว" }), deal({ stage: "ขายแล้ว" }), deal({ stage: "ส่งมอบแล้ว" })];
    expect(stageCounts(deals)["ขายแล้ว"]).toBe(2);
    expect(openDealCount(deals)).toBe(2);
  });

  it("counts and filters off-track (finance rejected) deals", () => {
    const rejected = { id: "f", companyName: "ก", status: "ปฏิเสธ", amount: 1, rejectReason: "x" };
    const deals = [
      deal({ saleId: "1", finance: rejected }),
      deal({ saleId: "2", finance: { id: "f", companyName: "ก", status: "รอผล", amount: 1, rejectReason: null } }),
      deal({ saleId: "3", finance: null }),
    ];
    expect(offTrackCount(deals)).toBe(1);
    expect(filterDeals(deals, { onlyOffTrack: true }).map((d) => d.saleId)).toEqual(["1"]);
  });

  it("customerDeals: same customer, excludes current, newest first, empty for blank id", () => {
    const deals = [
      deal({ saleId: "1", customerId: "cA", soldAt: "2026-08-01" }),
      deal({ saleId: "2", customerId: "cA", soldAt: "2024-01-01" }),
      deal({ saleId: "3", customerId: "cB", soldAt: "2026-01-01" }),
    ];
    expect(customerDeals(deals, "cA", "1").map((d) => d.saleId)).toEqual(["2"]);
    expect(customerDeals(deals, "cA").map((d) => d.saleId)).toEqual(["1", "2"]); // ใหม่สุดก่อน
    expect(customerDeals(deals, "")).toEqual([]);
  });

  it("customerServices: same customer, newest first, empty for blank id", () => {
    const svc = (customerId: string, checkedInAt: string, serviceType: string): ServiceHistory => ({
      customerId,
      checkedInAt,
      serviceType,
      status: "ส่งมอบแล้ว",
      total: 500,
    });
    const rows = [svc("cA", "2024-01-01", "เช็กระยะ"), svc("cA", "2026-06-01", "ซ่อม"), svc("cB", "2026-01-01", "เคลม")];
    expect(customerServices(rows, "cA").map((s) => s.serviceType)).toEqual(["ซ่อม", "เช็กระยะ"]);
    expect(customerServices(rows, "")).toEqual([]);
  });
});

describe("canManageDeal", () => {
  it("true for deal roles, false otherwise", () => {
    expect(canManageDeal(["sales"])).toBe(true);
    expect(canManageDeal(["acct"])).toBe(true);
    expect(canManageDeal(["tech"])).toBe(false);
    expect(canManageDeal(["stock"])).toBe(false);
  });
});

describe("canVoidDeal (ลูกค้าเท — เข้มกว่า manage)", () => {
  it("only admin/manager may void; sales/acct may not", () => {
    expect(canVoidDeal(["admin"])).toBe(true);
    expect(canVoidDeal(["manager"])).toBe(true);
    expect(canVoidDeal(["sales"])).toBe(false);
    expect(canVoidDeal(["acct"])).toBe(false);
    expect(canVoidDeal([])).toBe(false);
  });
});

describe("isVoidableStage", () => {
  it("blocks void once delivered, allows before", () => {
    expect(isVoidableStage("ขายแล้ว")).toBe(true);
    expect(isVoidableStage("ส่งไฟแนนซ์")).toBe(true);
    expect(isVoidableStage("รอทะเบียน")).toBe(true);
    expect(isVoidableStage("ส่งมอบแล้ว")).toBe(false);
  });
});
