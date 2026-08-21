import { describe, it, expect } from "vitest";
import { siteBaseUrl } from "@/lib/site";

describe("siteBaseUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL and trims trailing slash", () => {
    expect(siteBaseUrl({ NEXT_PUBLIC_SITE_URL: "https://famai.co.th/" })).toBe("https://famai.co.th");
  });
  it("falls back to the Vercel production url with https", () => {
    expect(siteBaseUrl({ VERCEL_PROJECT_PRODUCTION_URL: "famai.vercel.app" })).toBe("https://famai.vercel.app");
  });
  it("prefers explicit over vercel", () => {
    expect(siteBaseUrl({ NEXT_PUBLIC_SITE_URL: "https://a.com", VERCEL_URL: "b.vercel.app" })).toBe("https://a.com");
  });
  it("falls back to localhost when nothing is set", () => {
    expect(siteBaseUrl({})).toBe("http://localhost:3000");
  });
});
