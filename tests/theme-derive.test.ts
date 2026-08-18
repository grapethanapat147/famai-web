import { describe, it, expect } from "vitest";
import { isValidHex, deriveAccent } from "@/lib/theme/derive";

describe("isValidHex", () => {
  it("accepts #RRGGBB, rejects junk", () => {
    expect(isValidHex("#E60012")).toBe(true);
    expect(isValidHex("#e60012")).toBe(true);
    expect(isValidHex("E60012")).toBe(false);
    expect(isValidHex("#FFF")).toBe(false);
    expect(isValidHex("red")).toBe(false);
    expect(isValidHex("#E60012; }")).toBe(false);
  });
});

describe("deriveAccent (light)", () => {
  const d = deriveAccent("#E60012", "light");
  it("keeps the base accent unchanged", () => {
    expect(d.accent.toLowerCase()).toBe("#e60012");
  });
  it("hover is lighter, deep is darker (than base L)", () => {
    expect(d.hover.toLowerCase()).not.toBe("#e60012");
    expect(d.deep.toLowerCase()).not.toBe("#e60012");
  });
  it("wash is an hsla with low alpha", () => {
    expect(d.wash).toMatch(/^hsla\(/);
    expect(d.wash).toContain("0.06");
  });
});

describe("deriveAccent (dark) + fallback", () => {
  it("dark accent is brighter than light accent", () => {
    const light = deriveAccent("#8B0000", "light");
    const dark = deriveAccent("#8B0000", "dark");
    const lum = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    expect(lum(dark.accent)).toBeGreaterThan(lum(light.accent));
  });
  it("invalid hex falls back to Yamaha red", () => {
    expect(deriveAccent("nope", "light").accent.toLowerCase()).toBe("#e60012");
  });
});
