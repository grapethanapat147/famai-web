import type { ReactNode } from "react";

/** ป้ายสถานะ 5 แบบ — ข้อความ + จุดสี ไม่มีพื้นสี (docs/04 §1, §7) แยกด้วยตาเปล่าได้ */
export type StatusVariant = "good" | "warn" | "bad" | "info" | "off";

const STYLES: Record<StatusVariant, { dot: string; text: string }> = {
  good: { dot: "bg-pos", text: "text-pos" },
  warn: { dot: "bg-attn", text: "text-attn" },
  bad: { dot: "bg-accent", text: "text-accent" },
  info: { dot: "bg-ink-soft", text: "text-ink-soft" },
  off: { dot: "bg-muted", text: "text-muted" },
};

export function StatusBadge({
  variant,
  children,
}: {
  variant: StatusVariant;
  children: ReactNode;
}) {
  const s = STYLES[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${s.text}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} aria-hidden />
      {children}
    </span>
  );
}
