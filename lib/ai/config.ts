/** ค่าคงที่ + ตรรกะล้วนของชั้น AI (E12 · เทสได้) */

/** โมเดลเริ่มต้น — Claude Opus 5 (เปลี่ยนได้ถ้าต้องการงานถูก/เร็วกว่า) */
export const AI_MODEL = "claude-opus-5";
export const AI_MAX_TOKENS = 1024;

/** เพดานเรียกต่อผู้ใช้ต่อวัน (ต่อ store จริงใน follow-up — Phase 0.5) */
export const AI_DAILY_LIMIT = 100;

/** เปิดใช้ AI เมื่อ flag เปิด **และ** มีคีย์ · ปิดไว้เป็นค่าเริ่มต้น (epic: "endpoint ปิดไว้ พร้อมเปิด") */
export function isAiEnabled(env: { AI_ENABLED?: string; ANTHROPIC_API_KEY?: string }): boolean {
  return env.AI_ENABLED === "true" && Boolean(env.ANTHROPIC_API_KEY);
}

/** ยังไม่ถึงเพดานเรียกต่อวัน */
export function withinDailyLimit(usedToday: number, limit = AI_DAILY_LIMIT): boolean {
  return usedToday < limit;
}
