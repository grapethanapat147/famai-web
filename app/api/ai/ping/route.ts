import { NextResponse } from "next/server";
import { guardAi } from "@/lib/ai/guard";
import { aiClient } from "@/lib/ai/client";
import { AI_MODEL } from "@/lib/ai/config";

export const dynamic = "force-dynamic";

/**
 * ตัวอย่างเดินสาย AI (E12 Phase 0) — ปิดไว้เป็นค่าเริ่มต้น (AI_ENABLED=false)
 * เปิดเมื่อ: ตั้ง ANTHROPIC_API_KEY + AI_ENABLED=true → ยิงคำขอเล็ก ๆ ยืนยันว่าต่อ Claude ได้
 * ต้องล็อกอิน (guardAi) — ยังไม่ล็อกอิน = 401 · ปิดอยู่ = 503
 */
export async function POST() {
  const guard = await guardAi();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    const res = await aiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 16,
      messages: [{ role: "user", content: "ตอบกลับคำเดียวว่า pong" }],
    });
    const text = res.content.find((b) => b.type === "text");
    return NextResponse.json({ ok: true, model: AI_MODEL, reply: text?.type === "text" ? text.text : "" });
  } catch {
    return NextResponse.json({ error: "เรียก AI ไม่สำเร็จ (ตรวจคีย์/โควตา)" }, { status: 502 });
  }
}
