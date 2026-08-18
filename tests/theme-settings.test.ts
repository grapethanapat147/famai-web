import { describe, it, expect } from "vitest";
import { parseThemeConfig } from "@/lib/theme/config";

const DEFAULTS = { accent: "#E60012", fontPair: "noto-inter", customFont: "" };

describe("parseThemeConfig", () => {
  it("reads theme_accent when a valid hex", () => {
    expect(parseThemeConfig([{ key: "theme_accent", value: "#1B49D6" }])).toEqual({ ...DEFAULTS, accent: "#1B49D6" });
  });
  it("falls back to defaults when missing", () => {
    expect(parseThemeConfig([])).toEqual(DEFAULTS);
  });
  it("ignores an invalid accent value", () => {
    expect(parseThemeConfig([{ key: "theme_accent", value: "red; }" }])).toEqual(DEFAULTS);
    expect(parseThemeConfig([{ key: "theme_accent", value: 123 }])).toEqual(DEFAULTS);
  });
  it("reads a known font pair, ignores an unknown one", () => {
    expect(parseThemeConfig([{ key: "theme_font_pair", value: "trirong-anuphan" }]).fontPair).toBe("trirong-anuphan");
    expect(parseThemeConfig([{ key: "theme_font_pair", value: "bogus" }]).fontPair).toBe("noto-inter");
  });
  it("reads a valid custom-font path, rejects a malicious one", () => {
    expect(parseThemeConfig([{ key: "theme_custom_font", value: "custom/123.woff2" }]).customFont).toBe("custom/123.woff2");
    expect(parseThemeConfig([{ key: "theme_custom_font", value: "x'); }" }]).customFont).toBe("");
  });
});
