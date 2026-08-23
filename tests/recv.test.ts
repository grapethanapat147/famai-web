import { describe, expect, it } from "vitest";
import { canReceiveStock, computeCostVat, deriveSku, validateRecvInput, type RecvInput } from "@/lib/recv/recv";

const base: RecvInput = {
  branchId: "b1",
  variantId: "v1",
  colorCode: "10",
  unitKind: "รถใหม่",
  engineNo: "E34RE-057401",
  frameNo: "MLHNC5310M5100001",
  receivedAt: "2026-08-23",
  retail: "46900",
  cost: "40800",
  costVat: "",
};

describe("canReceiveStock", () => {
  it("allows admin/manager/stock", () => {
    expect(canReceiveStock(["stock"])).toBe(true);
    expect(canReceiveStock(["manager"])).toBe(true);
    expect(canReceiveStock(["admin"])).toBe(true);
  });
  it("denies sales/tech/acct", () => {
    expect(canReceiveStock(["sales"])).toBe(false);
    expect(canReceiveStock(["tech", "acct"])).toBe(false);
    expect(canReceiveStock([])).toBe(false);
  });
});

describe("deriveSku", () => {
  it("concatenates variant code + color code", () => {
    expect(deriveSku("B6FU00", "10")).toBe("B6FU0010");
  });
});

describe("computeCostVat", () => {
  it("computes vat rounded to satang", () => {
    expect(computeCostVat(40800, 7)).toBe(2856);
    expect(computeCostVat(1000, 7)).toBe(70);
  });
  it("returns 0 for non-positive cost or vat", () => {
    expect(computeCostVat(0, 7)).toBe(0);
    expect(computeCostVat(1000, 0)).toBe(0);
  });
});

describe("validateRecvInput", () => {
  it("accepts a complete row and normalizes kind + retail number", () => {
    const r = validateRecvInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.unitKind).toBe("ใหม่");
      expect(r.value.retail).toBe(46900);
      expect(r.value.cost).toBe(40800);
    }
  });

  it("maps a มือสอง kind", () => {
    const r = validateRecvInput({ ...base, unitKind: "รถมือสอง" });
    expect(r.ok && r.value.unitKind).toBe("มือสอง");
  });

  it("treats blank retail/cost as null/0 (defer pricing)", () => {
    const r = validateRecvInput({ ...base, retail: "", cost: "", costVat: "" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.retail).toBeNull();
      expect(r.value.cost).toBe(0);
      expect(r.value.costVat).toBe(0);
    }
  });

  it.each([
    [{ branchId: "" }, "เลือกบริษัท"],
    [{ variantId: "" }, "เลือกรุ่นรถ"],
    [{ colorCode: "" }, "เลือกสี"],
    [{ engineNo: "  " }, "กรอกเลขเครื่อง"],
    [{ frameNo: "" }, "กรอกเลขตัวถัง"],
    [{ receivedAt: "23/08/2026" }, "วันที่รับไม่ถูกต้อง"],
    [{ retail: "-5" }, "ราคาขายไม่ถูกต้อง"],
    [{ cost: "-1" }, "ต้นทุนไม่ถูกต้อง"],
    [{ costVat: "abc" }, "VAT ต้นทุนไม่ถูกต้อง"],
  ])("rejects %o", (patch, msg) => {
    const r = validateRecvInput({ ...base, ...(patch as Partial<RecvInput>) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(msg);
    }
  });
});
