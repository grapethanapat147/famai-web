import { describe, it, expect } from "vitest";
import { computeAgeDays, agingVariant, filterUnits, modelOptions, type StockUnit } from "@/lib/stock/units";

function u(partial: Partial<StockUnit>): StockUnit {
  return {
    id: "x",
    modelCode: "B6FU00",
    modelName: "FINN",
    colorCode: "010C",
    colorName: "ฟ้า",
    engineNo: "E34RE-057401",
    frameNo: "MLEUE364111399878",
    status: "available",
    receivedAt: "2026-08-01",
    ageDays: 0,
    branchCode: "FMG01",
    branchName: "Famai Motor Group",
    photoUrl: null,
    cost: 40800,
    retail: 46900,
    ...partial,
  };
}

describe("modelOptions", () => {
  it("dedupes by code and separates same-named models by code, sorted", () => {
    const opts = modelOptions([
      u({ modelCode: "B6FV00", modelName: "FINN" }),
      u({ modelCode: "B6FU00", modelName: "FINN" }),
      u({ modelCode: "B6FU00", modelName: "FINN" }), // ซ้ำ → รวม
      u({ modelCode: "DR9200", modelName: "XMAX 300" }),
    ]);
    expect(opts).toEqual([
      { code: "B6FU00", name: "FINN" },
      { code: "B6FV00", name: "FINN" },
      { code: "DR9200", name: "XMAX 300" },
    ]);
  });
});

describe("computeAgeDays", () => {
  it("counts days tz-safely from date-only strings", () => {
    expect(computeAgeDays("2026-08-01", "2026-08-11")).toBe(10);
    expect(computeAgeDays("2024-09-11", "2026-08-01")).toBe(689); // ตรงกับตัวเลขในเอกสาร (FMG01)
  });
  it("never negative / handles junk", () => {
    expect(computeAgeDays("2026-08-20", "2026-08-11")).toBe(0);
    expect(computeAgeDays("n/a", "2026-08-11")).toBe(0);
  });
});

describe("agingVariant", () => {
  it("green <= 1/3, orange <= threshold, red beyond (aging=90)", () => {
    expect(agingVariant(10, 90)).toBe("good");
    expect(agingVariant(40, 90)).toBe("warn");
    expect(agingVariant(95, 90)).toBe("bad");
  });
});

describe("filterUnits", () => {
  const units = [
    u({ id: "1", modelCode: "B6FU00", branchCode: "FMG01", status: "available", engineNo: "E34RE-057401" }),
    u({ id: "2", modelCode: "BTF200", branchCode: "FMM01", status: "sold", engineNo: "E3X8E-112097", modelName: "NMAX" }),
  ];
  const base = { branch: "all", model: "all", status: "all", search: "" };

  it("filters by branch/model/status", () => {
    expect(filterUnits(units, { ...base, branch: "FMM01" }).map((x) => x.id)).toEqual(["2"]);
    expect(filterUnits(units, { ...base, status: "available" }).map((x) => x.id)).toEqual(["1"]);
    expect(filterUnits(units, { ...base, model: "BTF200" }).map((x) => x.id)).toEqual(["2"]);
  });
  it("searches partial engine no and model", () => {
    expect(filterUnits(units, { ...base, search: "057401" }).map((x) => x.id)).toEqual(["1"]);
    expect(filterUnits(units, { ...base, search: "nmax" }).map((x) => x.id)).toEqual(["2"]);
  });
});
