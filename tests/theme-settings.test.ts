import { describe, it, expect } from "vitest";
import { parseThemeConfig } from "@/lib/theme/config";

describe("parseThemeConfig", () => {
  it("reads theme_accent when a valid hex", () => {
    expect(parseThemeConfig([{ key: "theme_accent", value: "#1B49D6" }])).toEqual({ accent: "#1B49D6" });
  });
  it("falls back to Yamaha red when missing", () => {
    expect(parseThemeConfig([])).toEqual({ accent: "#E60012" });
  });
  it("ignores an invalid accent value", () => {
    expect(parseThemeConfig([{ key: "theme_accent", value: "red; }" }])).toEqual({ accent: "#E60012" });
    expect(parseThemeConfig([{ key: "theme_accent", value: 123 }])).toEqual({ accent: "#E60012" });
  });
});
