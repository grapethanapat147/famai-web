import { describe, it, expect } from "vitest";
import { followUpPrompt, sanitizeFollowUp, FOLLOWUP_PURPOSES } from "@/lib/ai/prompts/followup";

describe("sanitizeFollowUp", () => {
  it("collapses whitespace and caps length", () => {
    const out = sanitizeFollowUp({ customerName: "  สมชาย   ใจดี ", vehicle: "NMAX", situation: "x".repeat(300) });
    expect(out.customerName).toBe("สมชาย ใจดี");
    expect(out.situation.length).toBe(200);
  });
});

describe("followUpPrompt", () => {
  it("includes the customer, vehicle, situation, and shop", () => {
    const { system, user } = followUpPrompt({
      customerName: "สมชาย",
      vehicle: "NMAX · แดง",
      situation: "ขอบคุณหลังส่งมอบรถ",
      shopName: "ร้านทดสอบ",
    });
    expect(user).toContain("สมชาย");
    expect(user).toContain("NMAX · แดง");
    expect(user).toContain("ขอบคุณหลังส่งมอบรถ");
    expect(system).toContain("ร้านทดสอบ");
  });
  it("enforces the no-fabrication + Thai + sign-off rules in the system prompt", () => {
    const { system } = followUpPrompt({ customerName: "ก", vehicle: "ข", situation: "ค" });
    expect(system).toContain("ห้ามแต่งข้อมูลที่ไม่ได้ให้มา");
    expect(system).toContain("ภาษาไทย");
    expect(system).toContain("ลงท้ายด้วยชื่อร้าน");
  });
  it("defaults the shop to Famai Motor Group", () => {
    expect(followUpPrompt({ customerName: "ก", vehicle: "ข", situation: "ค" }).system).toContain("Famai Motor Group");
  });
  it("exposes selectable purposes", () => {
    expect(FOLLOWUP_PURPOSES.length).toBeGreaterThanOrEqual(3);
    expect(FOLLOWUP_PURPOSES).toContain("ขอบคุณหลังส่งมอบรถ");
  });
});
