import { describe, it, expect } from "vitest";
import { allowedPartsTabs, canAccessPartsTab, needsParts, needsFreebies } from "@/lib/parts/tabs";
import { isLowStock, lowStockCount, partsBadgeCount, filterParts, type PartRow } from "@/lib/parts/stock";

describe("parts tab gating (docs/04 §9h)", () => {
  it("admin sees all three tabs in fixed order", () => {
    expect(allowedPartsTabs(["admin"])).toEqual(["stock", "issue", "gifts"]);
  });

  it("acct sees only stock (view), never issue or gifts", () => {
    expect(allowedPartsTabs(["acct"])).toEqual(["stock"]);
    expect(canAccessPartsTab(["acct"], "issue")).toBe(false);
    expect(canAccessPartsTab(["acct"], "gifts")).toBe(false);
  });

  it("sales sees only gifts, never stock or issue", () => {
    expect(allowedPartsTabs(["sales"])).toEqual(["gifts"]);
    expect(canAccessPartsTab(["sales"], "issue")).toBe(false);
    expect(canAccessPartsTab(["sales"], "stock")).toBe(false);
  });

  it("tech sees stock + issue but not gifts", () => {
    expect(allowedPartsTabs(["tech"])).toEqual(["stock", "issue"]);
  });

  it("data loading follows tab access", () => {
    expect(needsParts(allowedPartsTabs(["sales"]))).toBe(false); // เซลล์ไม่ควรโหลด part
    expect(needsFreebies(allowedPartsTabs(["sales"]))).toBe(true);
    expect(needsParts(allowedPartsTabs(["acct"]))).toBe(true);
    expect(needsFreebies(allowedPartsTabs(["acct"]))).toBe(false);
  });

  it("a role with no parts access sees no tabs", () => {
    expect(allowedPartsTabs(["hr"])).toEqual([]);
  });
});

describe("low-stock logic", () => {
  it("flags qty at or below a positive min_qty", () => {
    expect(isLowStock({ qtyOnHand: 2, minQty: 5 })).toBe(true);
    expect(isLowStock({ qtyOnHand: 5, minQty: 5 })).toBe(true);
    expect(isLowStock({ qtyOnHand: 6, minQty: 5 })).toBe(false);
  });

  it("min_qty 0 means no threshold (never low, even at 0 on hand)", () => {
    expect(isLowStock({ qtyOnHand: 0, minQty: 0 })).toBe(false);
  });

  it("badge count sums low parts and low freebies (§9h rule 3)", () => {
    const parts = [
      { qtyOnHand: 1, minQty: 3 }, // low
      { qtyOnHand: 9, minQty: 3 },
    ];
    const freebies = [
      { qtyOnHand: 0, minQty: 2 }, // low
      { qtyOnHand: 2, minQty: 2 }, // low
    ];
    expect(lowStockCount(parts)).toBe(1);
    expect(partsBadgeCount(parts, freebies)).toBe(3);
  });
});

describe("filterParts", () => {
  const parts: PartRow[] = [
    { id: "1", code: "P-OIL", name: "น้ำมันเครื่อง", qtyOnHand: 2, minQty: 5, price: 220 },
    { id: "2", code: "P-BRK", name: "ผ้าเบรก", qtyOnHand: 40, minQty: 10, price: 380 },
  ];

  it("matches code or name (case-insensitive)", () => {
    expect(filterParts(parts, { search: "oil" }).map((p) => p.id)).toEqual(["1"]);
    expect(filterParts(parts, { search: "เบรก" }).map((p) => p.id)).toEqual(["2"]);
  });

  it("onlyLow keeps parts at/under min", () => {
    expect(filterParts(parts, { onlyLow: true }).map((p) => p.id)).toEqual(["1"]);
  });
});
