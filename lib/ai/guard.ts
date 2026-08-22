import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { isAiEnabled } from "@/lib/ai/config";

/**
 * ด่านตรวจก่อนเรียก AI (E12) — ต้องล็อกอิน + ฟีเจอร์เปิด
 * คืน user (id/roleCodes) ให้ route เอาไปดึงข้อมูลผ่านชั้น user จริง (RLS + money-strip)
 * TODO(Phase 0.5): rate-limit ต่อผู้ใช้ต่อวันจาก store จริง (DB/KV) + log การเรียก
 */
export type AiGuard =
  | { ok: true; user: { id: string; fullName: string; roleCodes: string[] } }
  | { ok: false; status: number; error: string };

export async function guardAi(): Promise<AiGuard> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, status: 401, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!isAiEnabled({ AI_ENABLED: process.env.AI_ENABLED, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY })) {
    return { ok: false, status: 503, error: "ฟีเจอร์ AI ยังปิดอยู่ (ตั้ง AI_ENABLED=true + ANTHROPIC_API_KEY)" };
  }
  return { ok: true, user: { id: user.id, fullName: user.fullName, roleCodes: user.roleCodes } };
}
