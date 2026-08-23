import { describe, expect, it } from "vitest";
import { SELFIE_BUCKET, SELFIE_MAX, selfieObjectPath } from "@/lib/hr/selfie";

describe("selfieObjectPath", () => {
  it("groups by employee + date-stamp as webp", () => {
    expect(selfieObjectPath("emp-1", "2026-08-23", 1724400000000)).toBe("emp-1/2026-08-23-1724400000000.webp");
  });
  it("distinct stamps → distinct paths (no collision same day)", () => {
    expect(selfieObjectPath("e", "2026-08-23", 1)).not.toBe(selfieObjectPath("e", "2026-08-23", 2));
  });
});

describe("selfie constants", () => {
  it("uses the private bucket + a sane max size", () => {
    expect(SELFIE_BUCKET).toBe("attendance-selfie");
    expect(SELFIE_MAX).toBeGreaterThan(0);
  });
});
