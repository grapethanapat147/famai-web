import { describe, it, expect } from "vitest";
import { captureFilename, captureStamp } from "@/lib/capture/filename";

const AT = new Date(2026, 7, 19, 9, 5); // 2026-08-19 09:05 (local)

describe("captureStamp", () => {
  it("formats yyyymmdd-hhmm with zero-padding", () => {
    expect(captureStamp(AT)).toBe("20260819-0905");
  });
});

describe("captureFilename", () => {
  it("keeps Thai label and appends timestamp + .png", () => {
    expect(captureFilename("ใบเทียบราคา", AT)).toBe("ใบเทียบราคา-20260819-0905.png");
  });
  it("strips filesystem-unsafe characters", () => {
    expect(captureFilename('a/b:c*?"<>|d', AT)).toBe("abcd-20260819-0905.png");
  });
  it("collapses whitespace and trims", () => {
    expect(captureFilename("  ใบ   เทียบ ", AT)).toBe("ใบ เทียบ-20260819-0905.png");
  });
  it("falls back to รูป when label empties out", () => {
    expect(captureFilename("///", AT)).toBe("รูป-20260819-0905.png");
    expect(captureFilename("   ", AT)).toBe("รูป-20260819-0905.png");
  });
});
