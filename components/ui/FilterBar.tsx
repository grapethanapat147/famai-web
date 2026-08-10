"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * แถบตัวกรอง — เดสก์ท็อปรวมทุกตัวไว้แถวเดียว · มือถือยุบเป็นปุ่ม "ตัวกรอง" เปิดแผ่นล่าง
 * พร้อมบรรทัดสรุปว่ากำลังดูอะไรอยู่ (docs/04 §8, spec §11.3)
 */
export function FilterBar({ summary, children }: { summary?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div>
      {/* เดสก์ท็อป: แถวเดียว */}
      <div className="hidden flex-wrap items-center gap-2 sm:flex">{children}</div>

      {/* มือถือ: ปุ่มเปิดแผ่น + สรุป */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        {summary ? (
          <span className="min-w-0 truncate text-sm text-muted">{summary}</span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[24px] border border-hairline bg-card px-3 py-1.5 text-sm text-ink-soft"
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
            <path d="M3 5h14M6 10h8M8.5 15h3" />
          </svg>
          ตัวกรอง
        </button>
      </div>

      {/* เดสก์ท็อป: บรรทัดสรุป */}
      {summary && <div className="mt-1 hidden text-xs text-muted sm:block">{summary}</div>}

      {/* มือถือ: แผ่นล่าง */}
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="ตัวกรอง">
          <button type="button" aria-label="ปิด" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-[16px] bg-paper-2 p-4 shadow-[var(--sh-lg)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-hairline" />
            <div className="flex flex-col gap-3">{children}</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-[24px] bg-ink py-2.5 text-sm font-medium text-card"
            >
              ดูผล
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
