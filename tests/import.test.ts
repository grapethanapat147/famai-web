import { describe, it, expect } from "vitest";
import { parseCsv, detectDelimiter } from "@/lib/import/csv";
import { extractUnits, basicErrors, duplicateEngines, type ImportUnit } from "@/lib/import/units";

describe("parseCsv", () => {
  it("strips BOM and parses comma rows", () => {
    expect(parseCsv("﻿a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    expect(parseCsv('name,note\n"บ. ยามาฮ่า, จก.","ก ""พิเศษ"""')).toEqual([
      ["name", "note"],
      ["บ. ยามาฮ่า, จก.", 'ก "พิเศษ"'],
    ]);
  });

  it("detects tab delimiter (Excel copy-paste) and drops blank lines", () => {
    expect(detectDelimiter("a\tb\n1\t2")).toBe("\t");
    expect(parseCsv("a\tb\n\n1\t2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

// หัวคอลัมน์จริงจากไฟล์ยามาฮ่า (ตัดให้สั้น)
const HEADER = "_file,DOC_BRANCH_CODE,รุ่นรถ,แบบรถ,รหัสผลิตภัณฑ์,รหัสสี,สี,หมายเลขเครื่อง,หมายเลขตัวถัง,ประเภทรถ,ต้นทุนต่อหน่วย,ภาษีของต้นทุนต่อหน่วย,วันที่ใบรับ,ชื่อเจ้าหนี้,เลขที่ใบกำกับภาษี,TAXID";
const ROW = "110967fg.xls,FMG01,FINN,B6FU00,B6FU00010C,500,ฟ้า,E34RE-057401,MLEUE364111399878,รถใหม่,40800,2856,2024-09-11,บ.ยามาฮ่า,1946710,105507000645";

describe("extractUnits", () => {
  it("maps Thai headers to fields", () => {
    const units = extractUnits(parseCsv(`${HEADER}\n${ROW}`));
    expect(units).toHaveLength(1);
    const u = units[0];
    expect(u.branchCode).toBe("FMG01");
    expect(u.variantCode).toBe("B6FU00");
    expect(u.colorCode).toBe("500");
    expect(u.engineNo).toBe("E34RE-057401");
    expect(u.frameNo).toBe("MLEUE364111399878");
    expect(u.cost).toBe(40800);
    expect(u.costVat).toBe(2856);
    expect(u.receivedAt).toBe("2024-09-11");
    expect(u.sku).toBe("B6FU00010C");
  });

  it("returns [] when no data rows", () => {
    expect(extractUnits(parseCsv(HEADER))).toEqual([]);
  });
});

function unit(over: Partial<ImportUnit>): ImportUnit {
  return {
    branchCode: "FMG01", variantCode: "B6FU00", modelName: "FINN", colorCode: "500", colorName: "ฟ้า",
    engineNo: "E1", frameNo: "F1", sku: "S1", unitKind: "รถใหม่", cost: 40800, costVat: 2856,
    receivedAt: "2024-09-11", supplier: "", supplierInvNo: "", supplierTaxId: "", srcFile: "",
    ...over,
  };
}

describe("validation", () => {
  it("basicErrors flags missing/invalid fields", () => {
    expect(basicErrors(unit({}))).toEqual([]);
    expect(basicErrors(unit({ variantCode: "", engineNo: "" }))).toEqual(["ไม่มีรหัสรุ่น (แบบรถ)", "ไม่มีเลขเครื่อง"]);
    expect(basicErrors(unit({ cost: 0 }))).toContain("ต้นทุนไม่ถูกต้อง");
  });

  it("duplicateEngines finds engines appearing more than once", () => {
    const dups = duplicateEngines([unit({ engineNo: "E1" }), unit({ engineNo: "E2" }), unit({ engineNo: "E1" })]);
    expect([...dups]).toEqual(["E1"]);
  });
});
