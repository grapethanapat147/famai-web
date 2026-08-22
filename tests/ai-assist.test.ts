import { describe, it, expect } from "vitest";
import { assistSystemPrompt } from "@/lib/ai/prompts/assist";

describe("assistSystemPrompt", () => {
  it("enforces tool-only, no-fabrication, Thai answers", () => {
    const p = assistSystemPrompt(true);
    expect(p).toContain("ภาษาไทย");
    expect(p).toContain("เฉพาะ");
    expect(p).toContain("ห้ามแต่งหรือเดาตัวเลข");
    expect(p).toContain("RLS");
  });
  it("adds a no-money-permission instruction only when the user can't see money", () => {
    expect(assistSystemPrompt(false)).toContain("ไม่มีสิทธิ์เห็นข้อมูลเงิน");
    expect(assistSystemPrompt(true)).toContain("มีสิทธิ์เห็นข้อมูลเงิน");
    expect(assistSystemPrompt(true)).not.toContain("อย่าเดาตัวเลข");
  });
});
