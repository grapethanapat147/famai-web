"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** หน้าต่างซ้อน (ฟอร์มสั้น เช่น เพิ่มลูกค้า / ใส่ PIN) — มือถือ bottom sheet · ≥sm กลางจอ · ปิดด้วยพื้นหลัง/Esc (docs/04 §8, §11.3)
 * a11y (FAM-1108): เปิดแล้วย้ายโฟกัสเข้า dialog · Tab วนภายใน (focus trap เบา) · ปิดแล้วคืนโฟกัสปุ่มเดิม */
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus();
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
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full max-h-[85dvh] overflow-y-auto rounded-t-[16px] bg-card p-5 shadow-[var(--sh-lg)] outline-none sm:m-4 sm:rounded-[16px] ${
          size === "lg" ? "sm:w-[640px]" : "sm:w-[440px]"
        }`}
      >
        {title && <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>}
        <div className={title ? "mt-3" : ""}>{children}</div>
      </div>
    </div>
  );
}
