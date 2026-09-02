import { describe, expect, it } from "vitest";
import {
  canChangeLeadStage,
  isLeadStage,
  LEAD_STAGES,
  LEAD_TRACK,
  leadStageIndex,
  leadStageVariant,
  nextLeadStages,
  validateLeadStageChange,
} from "@/lib/deal/lead-stage";

describe("ลำดับขั้นลูกค้า", () => {
  it("ทางเดินหลักเรียงตามงานจริง · ไม่ซื้อ เป็นทางออกนอกลำดับ", () => {
    expect(LEAD_TRACK).toEqual(["เข้ามาดูรถ", "สนใจ", "ทำสัญญา", "ปิดการขาย"]);
    expect(LEAD_STAGES).toContain("ไม่ซื้อ");
    expect(leadStageIndex("ทำสัญญา")).toBe(2);
  });

  it("รู้จักเฉพาะขั้นจริง", () => {
    expect(isLeadStage("สนใจ")).toBe(true);
    expect(isLeadStage("กำลังคิด")).toBe(false);
  });

  it("สีป้ายบอกสถานะได้ครบทุกขั้น", () => {
    expect(LEAD_STAGES.every((s) => typeof leadStageVariant(s) === "string")).toBe(true);
    expect(leadStageVariant("ปิดการขาย")).toBe("good");
    expect(leadStageVariant("ไม่ซื้อ")).toBe("off");
  });
});

describe("nextLeadStages", () => {
  it("เดินหน้าได้ ถอยหลังได้ และปิดเคสได้เสมอ", () => {
    const from = nextLeadStages("สนใจ");
    expect(from).toContain("ทำสัญญา");
    expect(from).toContain("เข้ามาดูรถ");
    expect(from).toContain("ไม่ซื้อ");
  });

  it("ไม่มีทางกด ปิดการขาย เอง (ต้องมาจากการบันทึกขายเท่านั้น)", () => {
    for (const s of LEAD_STAGES) {
      expect(nextLeadStages(s)).not.toContain("ปิดการขาย");
    }
  });

  it("ปิดการขายแล้วเปลี่ยนต่อไม่ได้ · ไม่ซื้อ กลับเข้าทางเดินได้", () => {
    expect(nextLeadStages("ปิดการขาย")).toEqual([]);
    expect(nextLeadStages("ไม่ซื้อ")).toEqual(["เข้ามาดูรถ", "สนใจ", "ทำสัญญา"]);
  });
});

describe("validateLeadStageChange", () => {
  const base = { customerId: "c1", from: "สนใจ" as const };

  it("รับคำขอปกติ", () => {
    const r = validateLeadStageChange({ ...base, to: "ทำสัญญา" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ customerId: "c1", from: "สนใจ", to: "ทำสัญญา" });
    }
  });

  it.each([
    [{ customerId: "" }, { to: "ทำสัญญา" }, "ไม่พบลูกค้า"],
    [{}, { to: "กำลังคิด" }, "ขั้นไม่ถูกต้อง"],
    [{}, { to: "สนใจ" }, "อยู่ขั้นนี้อยู่แล้ว"],
    [{}, { to: "ปิดการขาย" }, "ขั้นปิดการขายตั้งเองไม่ได้ — จะตั้งให้อัตโนมัติตอนบันทึกการขาย"],
    [{ from: "ปิดการขาย" as const }, { to: "สนใจ" }, "ลูกค้ารายนี้ปิดการขายแล้ว เปลี่ยนขั้นไม่ได้"],
  ])("ปฏิเสธ %o %o", (patch, to, error) => {
    const r = validateLeadStageChange({ ...base, ...patch, ...to });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(error);
    }
  });
});

describe("canChangeLeadStage", () => {
  it("เฉพาะคนที่ขายได้", () => {
    expect(canChangeLeadStage(["sales"])).toBe(true);
    expect(canChangeLeadStage(["admin"])).toBe(true);
    expect(canChangeLeadStage(["tech"])).toBe(false);
    expect(canChangeLeadStage(["acct"])).toBe(false);
  });
});
