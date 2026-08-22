"use client";

import { useState } from "react";
import { FOLLOWUP_PURPOSES } from "@/lib/ai/prompts/followup";

const selectCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

/** ปุ่ม + แผงร่างข้อความติดตามลูกค้าด้วย AI (E12 FAM-1066) — เรียก /api/ai/draft-followup */
export function DraftFollowUp({
  customerName,
  vehicle,
  defaultSituation,
}: {
  customerName: string;
  vehicle: string;
  defaultSituation?: string;
}) {
  const [open, setOpen] = useState(false);
  const [situation, setSituation] = useState(defaultSituation || FOLLOWUP_PURPOSES[0]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/draft-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, vehicle, situation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "ร่างข้อความไม่สำเร็จ");
        return;
      }
      setDraft(data.draft ?? "");
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("คัดลอกไม่สำเร็จ");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent-deep transition-transform active:scale-[0.99]"
      >
        ✨ ร่างข้อความติดตาม (AI)
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-hairline bg-paper p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">✨ ร่างข้อความติดตาม (AI)</span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-ink">
          ปิด
        </button>
      </div>

      <select value={situation} onChange={(e) => setSituation(e.target.value)} className={selectCls}>
        {FOLLOWUP_PURPOSES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="rounded-[24px] bg-accent px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
      >
        {busy ? "กำลังร่าง…" : draft ? "ร่างใหม่" : "ร่างด้วย AI"}
      </button>

      {error && <p className="text-xs text-accent">{error}</p>}

      {draft && (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted">AI ช่วยร่าง — ตรวจก่อนส่งทุกครั้ง</p>
            <button
              type="button"
              onClick={copy}
              className="rounded-[8px] border border-hairline px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink"
            >
              {copied ? "คัดลอกแล้ว ✓" : "คัดลอก"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
