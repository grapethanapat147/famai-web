import { describe, it, expect } from "vitest";
import { isAiEnabled, withinDailyLimit, AI_DAILY_LIMIT } from "@/lib/ai/config";

describe("isAiEnabled", () => {
  it("requires both AI_ENABLED=true and a key", () => {
    expect(isAiEnabled({ AI_ENABLED: "true", ANTHROPIC_API_KEY: "sk-x" })).toBe(true);
    expect(isAiEnabled({ AI_ENABLED: "true" })).toBe(false); // ไม่มีคีย์
    expect(isAiEnabled({ ANTHROPIC_API_KEY: "sk-x" })).toBe(false); // flag ปิด
    expect(isAiEnabled({ AI_ENABLED: "false", ANTHROPIC_API_KEY: "sk-x" })).toBe(false);
    expect(isAiEnabled({})).toBe(false); // ปิดเป็นค่าเริ่มต้น
  });
});

describe("withinDailyLimit", () => {
  it("blocks at/over the limit", () => {
    expect(withinDailyLimit(0)).toBe(true);
    expect(withinDailyLimit(AI_DAILY_LIMIT - 1)).toBe(true);
    expect(withinDailyLimit(AI_DAILY_LIMIT)).toBe(false);
    expect(withinDailyLimit(5, 5)).toBe(false);
  });
});
