import { describe, expect, it } from "vitest";
import { amountBreakdown, canManageAccount, docTypeLabel } from "@/lib/acct/documents";

describe("canManageAccount", () => {
  it("allows admin/manager/acct, denies others", () => {
    expect(canManageAccount(["acct"])).toBe(true);
    expect(canManageAccount(["manager"])).toBe(true);
    expect(canManageAccount(["admin"])).toBe(true);
    expect(canManageAccount(["sales"])).toBe(false);
    expect(canManageAccount([])).toBe(false);
  });
});

describe("docTypeLabel", () => {
  it("maps known doc types", () => {
    expect(docTypeLabel("RECEIPT")).toBe("ใบเสร็จรับเงิน");
    expect(docTypeLabel("TAXINV")).toBe("ใบกำกับภาษี");
    expect(docTypeLabel("OTHER")).toBe("OTHER");
  });
});

describe("amountBreakdown", () => {
  it("splits a VAT-inclusive total into base + vat", () => {
    const r = amountBreakdown(107500, 7);
    expect(r.total).toBe(107500);
    expect(r.base).toBeCloseTo(100467.29, 2);
    expect(r.vat).toBeCloseTo(7032.71, 2);
    expect(Math.round(r.base + r.vat)).toBe(107500);
  });
  it("no vat → base equals total", () => {
    expect(amountBreakdown(1000, 0)).toEqual({ base: 1000, vat: 0, total: 1000 });
  });
});
