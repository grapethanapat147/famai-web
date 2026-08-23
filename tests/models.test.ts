import { describe, it, expect } from "vitest";
import { parseColors } from "@/lib/models/parse";
import { latestPrice, buildModelRows, validateModelEdit, type ModelEditInput } from "@/lib/models/rows";

const editBase: ModelEditInput = { modelName: "NMAX", modelTh: "เอ็นแม็กซ์", category: "Automatic", cc: "155", year: "2569", cost: "78000", retail: "92000" };

describe("validateModelEdit", () => {
  it("accepts a full edit and nulls blank optional fields", () => {
    const r = validateModelEdit({ ...editBase, modelTh: "", cc: "", year: "", cost: "" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ modelName: "NMAX", modelTh: null, category: "Automatic", cc: null, year: null, cost: 0, retail: 92000 });
    }
  });
  it("requires a name", () => {
    const r = validateModelEdit({ ...editBase, modelName: "  " });
    expect(r.ok && r.value).toBeFalsy();
    if (!r.ok) expect(r.error).toBe("กรอกชื่อรุ่น");
  });
  it("rejects non-positive retail and bad numbers", () => {
    expect(validateModelEdit({ ...editBase, retail: "0" }).ok).toBe(false);
    expect(validateModelEdit({ ...editBase, cost: "-1" }).ok).toBe(false);
    expect(validateModelEdit({ ...editBase, cc: "abc" }).ok).toBe(false);
  });
});

describe("parseColors", () => {
  it("parses 'code:name' pairs across lines and commas", () => {
    expect(parseColors("010A:ดำ, 010B:แดง\n010C:ฟ้า")).toEqual([
      { code: "010A", name: "ดำ" },
      { code: "010B", name: "แดง" },
      { code: "010C", name: "ฟ้า" },
    ]);
  });

  it("derives a code from a name-only entry", () => {
    expect(parseColors("ดำ ด้าน")).toEqual([{ code: "ดำ-ด้าน", name: "ดำ ด้าน" }]);
  });

  it("drops blanks and duplicate codes (first wins)", () => {
    expect(parseColors(" , 010A:ดำ ,010A:ดำเงา, ")).toEqual([{ code: "010A", name: "ดำ" }]);
  });

  it("skips entries with an empty name even if a code is given", () => {
    expect(parseColors("010A:")).toEqual([]);
  });
});

describe("latestPrice", () => {
  it("returns the row with the newest effective_from", () => {
    const rows = [
      { effective_from: "2026-01-01", retail: 40000 },
      { effective_from: "2026-03-05", retail: 46900 },
      { effective_from: "2025-12-01", retail: 39000 },
    ];
    expect(latestPrice(rows)?.retail).toBe(46900);
  });

  it("returns null for an empty list", () => {
    expect(latestPrice([])).toBeNull();
  });
});

describe("buildModelRows", () => {
  const variants = [
    { id: "v2", code: "BTF200", model_name: "NMAX", model_th: "เอ็นแม็กซ์", category: "Automatic", cc: 155, model_year: 2569 },
    { id: "v1", code: "B6FU00", model_name: "FINN", model_th: "ฟินน์", category: "Moped", cc: 115, model_year: 2569 },
  ];
  const colors = [
    { variant_id: "v1", color_code: "B", color_name: "น้ำเงิน" },
    { variant_id: "v1", color_code: "A", color_name: "แดง" },
    { variant_id: "v2", color_code: "K", color_name: "ดำ" },
  ];
  const prices = [
    { variant_id: "v1", effective_from: "2026-01-01", cost: 38000, retail: 46000 },
    { variant_id: "v1", effective_from: "2026-03-05", cost: 40800, retail: 46900 },
  ];
  const photos = [
    { variant_id: "v2", path_card: "v2/hero.webp", sort: 1 },
    { variant_id: "v2", path_card: "v2/card.webp", sort: 0 },
  ];

  it("aggregates latest price, sorted colors, count and first photo — sorted by model name", () => {
    const rows = buildModelRows(variants, colors, prices, photos, new Map([["v2", 3]]));

    expect(rows.map((r) => r.code)).toEqual(["B6FU00", "BTF200"]); // FINN ก่อน NMAX

    const finn = rows[0];
    expect(finn.retail).toBe(46900); // ราคาใหม่สุด
    expect(finn.cost).toBe(40800);
    expect(finn.colors.map((c) => c.code)).toEqual(["A", "B"]); // เรียงตามรหัสสี
    expect(finn.stockCount).toBe(0);
    expect(finn.photoPath).toBeNull();

    const nmax = rows[1];
    expect(nmax.stockCount).toBe(3);
    expect(nmax.photoPath).toBe("v2/card.webp"); // sort น้อยสุด
    expect(nmax.retail).toBeNull(); // ไม่มีราคา
  });

  it("keeps cost null when stripped server-side (price.cost undefined)", () => {
    const stripped = [{ variant_id: "v1", effective_from: "2026-03-05", retail: 46900 }];
    const rows = buildModelRows(variants, colors, stripped);
    const finn = rows.find((r) => r.id === "v1")!;
    expect(finn.cost).toBeNull();
    expect(finn.retail).toBe(46900);
  });
});
