import { describe, it, expect } from "vitest";
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
import { filterDeals, stageCounts, openDealCount, isOffTrack, canManageDeal, canVoidDeal, isVoidableStage, type Deal } from "@/lib/deal/deals";

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
    customerName: "สมชาย",
    vehicle: "NMAX",
    engineNo: "E1",
    payMethod: "finance",
    netPrice: 90000,
    soldAt: "2026-08-01T00:00:00Z",
    stage: "ขายแล้ว",
    plateNo: null,
    finance: null,
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
