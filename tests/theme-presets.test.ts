import { describe, it, expect } from "vitest";
import { THEME_PRESETS, findPresetByAccent } from "@/lib/theme/presets";
import { isValidHex, DEFAULT_ACCENT } from "@/lib/theme/derive";

describe("THEME_PRESETS", () => {
  it("has 6 presets, each a valid hex with unique id", () => {
    expect(THEME_PRESETS).toHaveLength(6);
    THEME_PRESETS.forEach((p) => expect(isValidHex(p.accent)).toBe(true));
    expect(new Set(THEME_PRESETS.map((p) => p.id)).size).toBe(6);
  });
  it("includes the Yamaha-red default as a preset", () => {
    expect(THEME_PRESETS.some((p) => p.accent === DEFAULT_ACCENT)).toBe(true);
  });
});

describe("findPresetByAccent", () => {
  it("matches a preset (case-insensitive)", () => {
    expect(findPresetByAccent(DEFAULT_ACCENT)?.id).toBe("yamaha");
    expect(findPresetByAccent(DEFAULT_ACCENT.toLowerCase())?.id).toBe("yamaha");
  });
  it("returns null for a custom accent", () => {
    expect(findPresetByAccent("#123456")).toBeNull();
  });
});
