import { describe, it, expect } from "vitest";
import { parseTaxId, nullIfBlank, parseCheckbox } from "@/lib/org/info";

describe("parseTaxId", () => {
  it("treats blank as null (not yet filled)", () => {
    expect(parseTaxId("")).toEqual({ ok: true, value: null });
    expect(parseTaxId("   ")).toEqual({ ok: true, value: null });
  });
  it("accepts exactly 13 digits", () => {
    expect(parseTaxId(" 0123456789012 ")).toEqual({ ok: true, value: "0123456789012" });
  });
  it("rejects non-13-digit input", () => {
    expect(parseTaxId("123").ok).toBe(false);
    expect(parseTaxId("01234567890123").ok).toBe(false);
    expect(parseTaxId("abcdefghijklm").ok).toBe(false);
  });
});

describe("nullIfBlank", () => {
  it("returns null for blank, trimmed value otherwise", () => {
    expect(nullIfBlank("")).toBeNull();
    expect(nullIfBlank("  ")).toBeNull();
    expect(nullIfBlank("  123 ถ.พหลโยธิน ")).toBe("123 ถ.พหลโยธิน");
  });
});

describe("parseCheckbox", () => {
  it("true only for a checked checkbox value", () => {
    expect(parseCheckbox("on")).toBe(true);
    expect(parseCheckbox("true")).toBe(true);
    expect(parseCheckbox(null)).toBe(false);
    expect(parseCheckbox("")).toBe(false);
    expect(parseCheckbox("off")).toBe(false);
  });
});
