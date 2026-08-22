"use client";

import { useState } from "react";

const SUGGESTIONS = ["สต๊อกคงเหลือกี่คัน", "รถค้างนานสุด 5 คัน", "เดือนนี้ขายกี่คัน มูลค่าเท่าไหร่"];

/** ผู้ช่วยวิเคราะห์ (E12 FAM-1067) — ถามภาษาไทย → เรียก /api/ai/assist (tool-use ตามสิทธิ์ผู้ใช้) */
export function AssistChat() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [asked, setAsked] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    setAnswer("");
    setAsked(text);
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "ถามไม่สำเร็จ");
        return;
      }
      setAnswer(data.answer ?? "");
      if (data.error) {
        setError(data.error);
      }
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">ผู้ช่วยวิเคราะห์</h1>
        <p className="mt-0.5 text-sm text-muted">ถามภาษาไทยเกี่ยวกับสต๊อก/ยอดขาย — ตอบจากข้อมูลจริงตามสิทธิ์และสาขาของคุณ</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQ(s);
              void ask(s);
            }}
            disabled={busy}
            className="rounded-full border border-hairline bg-card px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-ink/40 disabled:opacity-60"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="พิมพ์คำถาม เช่น รถค้างนานสุดคือคันไหน"
          className="flex-1 rounded-[10px] border border-hairline bg-card px-4 py-3 text-ink outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="shrink-0 rounded-[24px] bg-accent px-5 py-3 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? "กำลังคิด…" : "ถาม"}
        </button>
      </form>

      {(answer || error) && (
        <div className="flex flex-col gap-2 rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
          {asked && <p className="text-xs text-muted">ถาม: {asked}</p>}
          {answer && <p className="whitespace-pre-wrap text-ink">{answer}</p>}
          {error && <p className="text-sm text-accent">{error}</p>}
        </div>
      )}

      <p className="text-[11px] text-muted">AI อาจผิดพลาด — ตรวจสอบก่อนตัดสินใจ · เห็นเฉพาะข้อมูลตามสิทธิ์และสาขาของคุณ</p>
    </div>
  );
}
