import { NextResponse, type NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { guardAi } from "@/lib/ai/guard";
import { aiClient } from "@/lib/ai/client";
import { AI_MODEL } from "@/lib/ai/config";
import { assistSystemPrompt } from "@/lib/ai/prompts/assist";
import { ASSIST_TOOLS, runAssistTool, type AssistCtx } from "@/lib/ai/tools";
import { canSeeMoney } from "@/lib/auth/money";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";
const MAX_TURNS = 5;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * ผู้ช่วยวิเคราะห์ (E12 FAM-1067) — POST { question } · ต้องล็อกอิน + AI_ENABLED
 * tool-use loop: AI เลือกเครื่องมือ → runAssistTool รันผ่านเซสชัน user (RLS + money-strip) → AI สรุปตอบ
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
  const question = String(body.question ?? "").trim().slice(0, 500);
  if (!question) {
    return NextResponse.json({ error: "กรุณาพิมพ์คำถาม" }, { status: 400 });
  }

  const ctx: AssistCtx = {
    canSeeMoney: await canSeeMoney(),
    agingDays: await getSetting("aging_days"),
    today: todayISO(),
  };

  const client = aiClient();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        system: assistSystemPrompt(ctx.canSeeMoney),
        tools: ASSIST_TOOLS,
        messages,
      });
      messages.push({ role: "assistant", content: res.content });

      if (res.stop_reason !== "tool_use") {
        const answer = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return NextResponse.json({ answer });
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type === "tool_use") {
          const result = await runAssistTool(block.name, block.input, ctx);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }
    return NextResponse.json({ answer: "", error: "ตอบไม่จบ ลองถามให้เจาะจงขึ้น" });
  } catch {
    return NextResponse.json({ error: "ผู้ช่วยตอบไม่สำเร็จ (ตรวจคีย์/โควตา)" }, { status: 502 });
  }
}
