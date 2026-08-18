import { describe, it, expect } from "vitest";
import {
  FONT_PAIRS,
  DEFAULT_FONT_PAIR,
  findFontPair,
  isValidFontPath,
  fontFormat,
  customFontUrl,
} from "@/lib/theme/fonts";

describe("FONT_PAIRS", () => {
  it("has unique ids and a default that exists", () => {
    expect(FONT_PAIRS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(FONT_PAIRS.map((p) => p.id)).size).toBe(FONT_PAIRS.length);
    expect(findFontPair(DEFAULT_FONT_PAIR)).toBeTruthy();
  });
  it("default is the first pair (matches globals.css)", () => {
    expect(DEFAULT_FONT_PAIR).toBe("noto-inter");
  });
});

describe("isValidFontPath", () => {
  it("accepts clean font paths", () => {
    expect(isValidFontPath("custom/1700000000000.woff2")).toBe(true);
    expect(isValidFontPath("a.ttf")).toBe(true);
    expect(isValidFontPath("brand/Head-Bold.otf")).toBe(true);
  });
  it("rejects CSS-injection / traversal / wrong extension", () => {
    expect(isValidFontPath("")).toBe(false);
    expect(isValidFontPath("../secret.woff2")).toBe(false);
    expect(isValidFontPath("custom/x'); }.woff2")).toBe(false);
    expect(isValidFontPath("custom/x.woff2') format('woff2")).toBe(false);
    expect(isValidFontPath("evil.exe")).toBe(false);
    expect(isValidFontPath("http://evil.com/x.woff2")).toBe(false);
    expect(isValidFontPath("a b.woff2")).toBe(false);
  });
});

describe("fontFormat", () => {
  it("maps extension → @font-face format keyword", () => {
    expect(fontFormat("custom/x.woff2")).toBe("woff2");
    expect(fontFormat("custom/x.ttf")).toBe("truetype");
    expect(fontFormat("custom/x.otf")).toBe("opentype");
  });
});

describe("customFontUrl", () => {
  it("builds the public bucket url (trims trailing slash)", () => {
    expect(customFontUrl("https://proj.supabase.co", "custom/x.woff2")).toBe(
      "https://proj.supabase.co/storage/v1/object/public/brand-font/custom/x.woff2",
    );
    expect(customFontUrl("https://proj.supabase.co/", "custom/x.woff2")).toBe(
      "https://proj.supabase.co/storage/v1/object/public/brand-font/custom/x.woff2",
    );
  });
});
