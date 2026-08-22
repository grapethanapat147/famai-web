import { NextResponse, type NextRequest } from "next/server";
import { guardAi } from "@/lib/ai/guard";
import { aiClient } from "@/lib/ai/client";
import { AI_MODEL } from "@/lib/ai/config";
import { followUpPrompt, sanitizeFollowUp } from "@/lib/ai/prompts/followup";

export const dynamic = "force-dynamic";

/**
 * ร่างข้อความติดตามลูกค้าด้วย AI (E12 FAM-1066) — POST · ต้องล็อกอิน + AI_ENABLED
 * รับเฉพาะ context ที่ลูกค้าเห็นได้อยู่แล้ว (ชื่อ/รุ่น/จุดประสงค์ — ไม่มี money-field) → ไม่มีข้อมูลเงินรั่ว
 */
export async function POST(req: NextRequest) {
  const guard = await guardAi();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  const input = sanitizeFollowUp({
    customerName: String(body.customerName ?? ""),
    vehicle: String(body.vehicle ?? ""),
    situation: String(body.situation ?? ""),
  });
  if (!input.customerName && !input.situation) {
    return NextResponse.json({ error: "ต้องมีชื่อลูกค้าหรือจุดประสงค์อย่างน้อยหนึ่งอย่าง" }, { status: 400 });
  }

  const { system, user } = followUpPrompt(input);
  try {
    const res = await aiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 500,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b) => b.type === "text");
    const draft = block?.type === "text" ? block.text.trim() : "";
    return NextResponse.json({ draft });
  } catch {
    return NextResponse.json({ error: "ร่างข้อความไม่สำเร็จ (ตรวจคีย์/โควตา)" }, { status: 502 });
  }
}
