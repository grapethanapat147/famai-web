import { describe, expect, it } from "vitest";
import { buildSignedMap, SELFIE_BUCKET, SELFIE_MAX, selfieObjectPath } from "@/lib/hr/selfie";

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

describe("buildSignedMap", () => {
  it("maps path → signed URL, skipping errors/blanks", () => {
    const m = buildSignedMap([
      { path: "a/1.webp", signedUrl: "https://x/1?token=1" },
      { path: "b/2.webp", signedUrl: null }, // error → skipped
      { path: null, signedUrl: "https://x/3" }, // no path → skipped
      { path: "c/3.webp", signedUrl: "https://x/3?token=3" },
    ]);
    expect(m.get("a/1.webp")).toBe("https://x/1?token=1");
    expect(m.get("c/3.webp")).toBe("https://x/3?token=3");
    expect(m.has("b/2.webp")).toBe(false);
    expect(m.size).toBe(2);
  });
});
