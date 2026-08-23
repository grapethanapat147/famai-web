import { describe, expect, it } from "vitest";
import { shortUA, supportContextLines, supportFileName, supportSlug } from "@/lib/support/context";

describe("supportSlug", () => {
  it("takes the first path segment, home for root", () => {
    expect(supportSlug("/registration")).toBe("registration");
    expect(supportSlug("/stock/123")).toBe("stock"); // first segment only
    expect(supportSlug("/")).toBe("home");
    expect(supportSlug("")).toBe("home");
  });
});

describe("supportFileName", () => {
  it("builds famai-<slug>-<YYYYMMDD-HHMM>.png", () => {
    expect(supportFileName("/dash", "2026-08-24T15:30:12.000Z")).toBe("famai-dash-20260824-1530.png");
  });
  it("falls back when the date is unparseable", () => {
    expect(supportFileName("/hr", "nope")).toBe("famai-hr-capture.png");
  });
});

describe("shortUA", () => {
  it("names the major browsers", () => {
    expect(shortUA("Mozilla/5.0 ... Chrome/120 Safari/537")).toBe("Chrome");
    expect(shortUA("Mozilla/5.0 ... Edg/120")).toBe("Edge");
    expect(shortUA("Mozilla/5.0 ... Firefox/121")).toBe("Firefox");
    expect(shortUA("Mozilla/5.0 ... Version/17 Safari/605")).toBe("Safari");
    expect(shortUA("weird-bot")).toBe("อื่นๆ");
  });
});

describe("supportContextLines", () => {
  const base = { path: "/deal", atISO: "2026-08-24T15:30:00.000Z", width: 390, height: 844, ua: "Chrome/120" };
  it("includes page/time/screen/browser", () => {
    const lines = supportContextLines(base);
    expect(lines).toContain("หน้า: /deal");
    expect(lines).toContain("จอ: 390×844");
    expect(lines).toContain("เบราว์เซอร์: Chrome");
  });
  it("prepends the note when given", () => {
    expect(supportContextLines({ ...base, note: "  กดแล้ว error  " })[0]).toBe("ปัญหา: กดแล้ว error");
    expect(supportContextLines({ ...base, note: "   " })[0]).toBe("หน้า: /deal");
  });
});
