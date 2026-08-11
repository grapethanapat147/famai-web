"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/** แผงรายละเอียด — มือถือเลื่อนจากล่าง (bottom sheet) · ≥sm เลื่อนจากขวา · ปิดด้วยปุ่ม/พื้นหลัง/Esc + ล็อก scroll (docs/04 §8, §11.3) */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="ปิด" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[16px] bg-paper-2 shadow-[var(--sh-lg)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-[16px]">
        <div className="sticky top-0 flex items-center justify-between border-b border-hairline bg-paper-2 px-4 py-3">
          <span className="font-display font-semibold text-ink">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-card"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
