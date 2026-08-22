import { describe, it, expect } from "vitest";
import { parseColumnMap, remapHeaders } from "@/lib/import/ai-map";
import { columnMapPrompt } from "@/lib/ai/prompts/import-map";
import { extractUnits } from "@/lib/import/units";

describe("parseColumnMap", () => {
  const headers = ["Model", "Colour", "Engine No.", "Cost"];
  it("keeps valid field→existing-header pairs, strips code fences", () => {
    const raw = '```json\n{"variantCode":"Model","colorName":"Colour","engineNo":"Engine No.","cost":"Cost"}\n```';
    expect(parseColumnMap(raw, headers)).toEqual({
      variantCode: "Model",
      colorName: "Colour",
      engineNo: "Engine No.",
      cost: "Cost",
    });
  });
  it("drops unknown fields and hallucinated headers", () => {
    const raw = '{"variantCode":"Model","bogusField":"Model","engineNo":"NoSuchColumn"}';
    expect(parseColumnMap(raw, headers)).toEqual({ variantCode: "Model" });
  });
  it("returns {} on invalid JSON", () => {
    expect(parseColumnMap("not json", headers)).toEqual({});
  });
});

describe("remapHeaders", () => {
  it("renames source headers to canonical so extractUnits picks them up", () => {
    const rows = [
      ["Model", "Colour", "Engine No."],
      ["B6FU00", "ฟ้า", "E34RE-057401"],
    ];
    const aiMap = { variantCode: "Model", colorName: "Colour", engineNo: "Engine No." };
    const remapped = remapHeaders(rows, aiMap);
    expect(remapped[0]).toEqual(["แบบรถ", "สี", "หมายเลขเครื่อง"]);
    const units = extractUnits(remapped);
    expect(units[0].variantCode).toBe("B6FU00");
    expect(units[0].colorName).toBe("ฟ้า");
    expect(units[0].engineNo).toBe("E34RE-057401");
  });
  it("leaves unmapped headers untouched", () => {
    const rows = [["Model", "Extra"], ["x", "y"]];
    expect(remapHeaders(rows, { variantCode: "Model" })[0]).toEqual(["แบบรถ", "Extra"]);
  });
});

describe("columnMapPrompt", () => {
  it("includes headers, samples, target fields, and a JSON-only instruction", () => {
    const { system, user } = columnMapPrompt(["Model", "Cost"], [["B6FU00", "40800"]]);
    expect(system).toContain("variantCode");
    expect(system).toContain("JSON");
    expect(user).toContain("Model");
    expect(user).toContain("B6FU00");
  });
});
