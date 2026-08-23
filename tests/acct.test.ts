import { describe, expect, it } from "vitest";
import { amountBreakdown, bahtText, canManageAccount, docTypeLabel, parseDocItem, validateDocEdit, type DocEditInput } from "@/lib/acct/documents";

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

describe("bahtText", () => {
  it("reads whole baht", () => {
    expect(bahtText(0)).toBe("ศูนย์บาทถ้วน");
    expect(bahtText(107500)).toBe("หนึ่งแสนเจ็ดพันห้าร้อยบาทถ้วน");
    expect(bahtText(46900)).toBe("สี่หมื่นหกพันเก้าร้อยบาทถ้วน");
    expect(bahtText(1000000)).toBe("หนึ่งล้านบาทถ้วน");
  });
  it("handles เอ็ด / ยี่สิบ / สิบ", () => {
    expect(bahtText(11)).toBe("สิบเอ็ดบาทถ้วน");
    expect(bahtText(21)).toBe("ยี่สิบเอ็ดบาทถ้วน");
    expect(bahtText(101)).toBe("หนึ่งร้อยเอ็ดบาทถ้วน");
    expect(bahtText(1000001)).toBe("หนึ่งล้านเอ็ดบาทถ้วน");
  });
  it("reads satang", () => {
    expect(bahtText(100.5)).toBe("หนึ่งร้อยบาทห้าสิบสตางค์");
    expect(bahtText(1234.25)).toBe("หนึ่งพันสองร้อยสามสิบสี่บาทยี่สิบห้าสตางค์");
  });
  it("returns empty for invalid amounts", () => {
    expect(bahtText(-1)).toBe("");
    expect(bahtText(Number.NaN)).toBe("");
  });
});

describe("parseDocItem", () => {
  it("reads a stored item snapshot", () => {
    expect(parseDocItem({ name: "x", item: { vehicle: "NMAX · ดำ", frameNo: "F1", engineNo: "E1" } })).toEqual({
      vehicle: "NMAX · ดำ",
      frameNo: "F1",
      engineNo: "E1",
    });
  });
  it("returns null when no item (legacy docs)", () => {
    expect(parseDocItem({ name: "x" })).toBeNull();
    expect(parseDocItem(null)).toBeNull();
  });
});

describe("validateDocEdit", () => {
  const base: DocEditInput = {
    sellerName: "บริษัท ฟ้าใหม่มอเตอร์ จำกัด",
    sellerAddress: "ปทุมธานี",
    sellerTaxId: "0135548009531",
    sellerPhone: "086-332-8509",
    buyerName: "นายวีระ โปร่งนุช",
    buyerAddress: "",
    buyerTaxId: "",
    buyerPhone: "",
    vehicle: "NMAX · ดำ",
    frameNo: "MH3SG576111027060",
    engineNo: "G3V5E-0865055",
    base: "100467.29",
    vat: "7032.71",
    docDate: "2026-08-23",
  };

  it("accepts a complete edit and computes total = base + vat, blanks → null", () => {
    const r = validateDocEdit(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.total).toBe(107500);
      expect(r.value.buyer.address).toBeNull();
      expect(r.value.item.vehicle).toBe("NMAX · ดำ");
    }
  });

  it.each([
    [{ sellerName: " " }, "กรอกชื่อผู้ขาย"],
    [{ buyerName: "" }, "กรอกชื่อผู้ซื้อ"],
    [{ base: "-1" }, "มูลค่าก่อนภาษีไม่ถูกต้อง"],
    [{ vat: "abc" }, "ภาษีมูลค่าเพิ่มไม่ถูกต้อง"],
    [{ docDate: "23/08/2026" }, "วันที่ไม่ถูกต้อง"],
  ])("rejects %o", (patch, msg) => {
    const r = validateDocEdit({ ...base, ...(patch as Partial<DocEditInput>) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(msg);
    }
  });
});
