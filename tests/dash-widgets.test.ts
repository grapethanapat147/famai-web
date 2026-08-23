import { describe, expect, it } from "vitest";
import { ALL_WIDGET_KEYS, DEFAULT_WIDGETS, moveWidget, normalizeWidgets, toggleWidget } from "@/lib/dashboard/widgets";

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
    expect(r.map((w) => w.key)).toEqual(["oldest", "aging", "watch"]); // saved order, missing appended
    expect(r.find((w) => w.key === "oldest")!.visible).toBe(false);
    expect(r.find((w) => w.key === "watch")!.visible).toBe(true);
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
  it("swaps up/down and clamps at the ends", () => {
    expect(moveWidget(DEFAULT_WIDGETS, "aging", -1).map((w) => w.key)).toEqual(["aging", "watch", "oldest"]);
    expect(moveWidget(DEFAULT_WIDGETS, "watch", -1).map((w) => w.key)).toEqual(["watch", "aging", "oldest"]); // clamp top
    expect(moveWidget(DEFAULT_WIDGETS, "oldest", 1).map((w) => w.key)).toEqual(["watch", "aging", "oldest"]); // clamp bottom
  });
});

describe("toggleWidget", () => {
  it("flips visibility of one widget only", () => {
    const r = toggleWidget(DEFAULT_WIDGETS, "watch");
    expect(r.find((w) => w.key === "watch")!.visible).toBe(false);
    expect(r.find((w) => w.key === "aging")!.visible).toBe(true);
  });
});
