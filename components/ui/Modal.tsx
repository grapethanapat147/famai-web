"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

/** หน้าต่างซ้อน (ฟอร์มสั้น เช่น เพิ่มลูกค้า / ใส่ PIN) — มือถือ bottom sheet · ≥sm กลางจอ · ปิดด้วยพื้นหลัง/Esc (docs/04 §8, §11.3) */
export function Modal({
  open,
  onClose,
  title,
  size = "default",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: "default" | "lg";
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" aria-label="ปิด" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div
        className={`relative w-full max-h-[85dvh] overflow-y-auto rounded-t-[16px] bg-card p-5 shadow-[var(--sh-lg)] sm:m-4 sm:rounded-[16px] ${
          size === "lg" ? "sm:w-[640px]" : "sm:w-[440px]"
        }`}
      >
        {title && <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>}
        <div className={title ? "mt-3" : ""}>{children}</div>
      </div>
    </div>
  );
}
