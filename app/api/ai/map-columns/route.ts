import { NextResponse, type NextRequest } from "next/server";
import { guardAi } from "@/lib/ai/guard";
import { aiClient } from "@/lib/ai/client";
import { AI_MODEL } from "@/lib/ai/config";
import { columnMapPrompt } from "@/lib/ai/prompts/import-map";
import { parseColumnMap } from "@/lib/import/ai-map";

export const dynamic = "force-dynamic";

/**
 * ช่วยจับคู่คอลัมน์ไฟล์นำเข้าด้วย AI (E12 FAM-1068) — POST { headers, sampleRows }
 * ประมวลเฉพาะหัวตาราง+ตัวอย่างที่ผู้ใช้อัปโหลด (ไม่แตะ live data) → คืน mapping ที่ตรวจแล้วว่าหัวคอลัมน์มีจริง
 */
export async function POST(req: NextRequest) {
  const guard = await guardAi();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: { headers?: unknown; sampleRows?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }

  const headers = Array.isArray(body.headers) ? body.headers.map((h) => String(h)).slice(0, 60) : [];
  const sampleRows = Array.isArray(body.sampleRows)
    ? body.sampleRows.slice(0, 3).map((r) => (Array.isArray(r) ? r.map((c) => String(c)).slice(0, 60) : []))
    : [];
  if (headers.length === 0) {
    return NextResponse.json({ error: "ไม่มีหัวคอลัมน์ให้จับคู่" }, { status: 400 });
  }

  const { system, user } = columnMapPrompt(headers, sampleRows);
  try {
    const res = await aiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b) => b.type === "text");
    const raw = block?.type === "text" ? block.text : "";
    const mapping = parseColumnMap(raw, headers);
    return NextResponse.json({ mapping, mappedCount: Object.keys(mapping).length });
  } catch {
    return NextResponse.json({ error: "จับคู่คอลัมน์ไม่สำเร็จ (ตรวจคีย์/โควตา)" }, { status: 502 });
  }
}
