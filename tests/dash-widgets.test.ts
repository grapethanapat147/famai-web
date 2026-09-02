import { describe, expect, it } from "vitest";
import { ALL_WIDGET_KEYS, DEFAULT_WIDGETS, moveWidget, normalizeWidgets, toggleWidget, WIDGET_LABEL } from "@/lib/dashboard/widgets";

describe("normalizeWidgets", () => {
  it("falls back to defaults on garbage", () => {
    expect(normalizeWidgets(null).map((w) => w.key)).toEqual([...ALL_WIDGET_KEYS]);
    expect(normalizeWidgets("nope").map((w) => w.key)).toEqual([...ALL_WIDGET_KEYS]);
  });
  it("keeps saved order + visibility, drops unknown, appends missing", () => {
    const saved = [
      { key: "oldest", visible: false },
      { key: "bogus", visible: true },
      { key: "aging", visible: true },
    ];
    const r = normalizeWidgets(saved);
    // ที่บันทึกไว้มาก่อนตามลำดับเดิม → ที่เหลือต่อท้ายตามลำดับมาตรฐาน (ไม่ผูกกับจำนวนการ์ด)
    const rest = ALL_WIDGET_KEYS.filter((k) => k !== "oldest" && k !== "aging");
    expect(r.map((w) => w.key)).toEqual(["oldest", "aging", ...rest]);
    expect(r.find((w) => w.key === "oldest")!.visible).toBe(false);
    expect(r.every((w) => w.key === "oldest" || w.visible)).toBe(true);
  });
  it("dedupes repeated keys (first wins)", () => {
    const r = normalizeWidgets([
      { key: "watch", visible: true },
      { key: "watch", visible: false },
    ]);
    expect(r.filter((w) => w.key === "watch")).toHaveLength(1);
    expect(r.find((w) => w.key === "watch")!.visible).toBe(true);
  });
});

describe("moveWidget", () => {
  const keys = [...ALL_WIDGET_KEYS];
  const first = keys[0];
  const second = keys[1];
  const last = keys[keys.length - 1];

  it("สลับขึ้นลงได้", () => {
    const swapped = [second, first, ...keys.slice(2)];
    expect(moveWidget(DEFAULT_WIDGETS, second, -1).map((w) => w.key)).toEqual(swapped);
    expect(moveWidget(DEFAULT_WIDGETS, first, 1).map((w) => w.key)).toEqual(swapped);
  });

  it("อยู่หัว/ท้ายแล้วขยับต่อไม่ได้ (คงลำดับเดิม)", () => {
    expect(moveWidget(DEFAULT_WIDGETS, first, -1).map((w) => w.key)).toEqual(keys);
    expect(moveWidget(DEFAULT_WIDGETS, last, 1).map((w) => w.key)).toEqual(keys);
  });
});

describe("toggleWidget", () => {
  it("flips visibility of one widget only", () => {
    const r = toggleWidget(DEFAULT_WIDGETS, "watch");
    expect(r.find((w) => w.key === "watch")!.visible).toBe(false);
    expect(r.filter((w) => w.key !== "watch").every((w) => w.visible)).toBe(true);
  });
});

describe("รายการการ์ด", () => {
  it("ทุกคีย์มีป้ายชื่อ (กันเพิ่มการ์ดแล้วลืมตั้งชื่อ)", () => {
    for (const k of ALL_WIDGET_KEYS) {
      expect(WIDGET_LABEL[k], `ขาดป้ายชื่อของ ${k}`).toBeTruthy();
    }
  });

  it("การ์ดเงิน/ไฟแนนซ์/ของใกล้หมด อยู่ในรายการ (fixlist ข้อ 15)", () => {
    expect(ALL_WIDGET_KEYS).toContain("money");
    expect(ALL_WIDGET_KEYS).toContain("finance");
    expect(ALL_WIDGET_KEYS).toContain("lowstock");
  });
});
