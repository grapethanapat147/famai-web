import type { ReactNode } from "react";
import { formatPercentChange } from "@/lib/format";

/** การ์ด KPI — ป้ายกำกับ · ตัวเลขใหญ่ (font-display, tabular) · เทียบช่วงก่อน · คำอธิบาย (docs/04 §11.3)
 *  tone="accent" = ตัวเลขที่ต้องเน้น (เช่น ยอดค้างจ่าย) — วงแหวนสีเน้น + ตัวเลขสีเน้น */
export function StatCard({
  label,
  value,
  hint,
  compare,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  compare?: { current: number; previous: number };
  tone?: "default" | "accent";
}) {
  const cmp = compare ? formatPercentChange(compare.current, compare.previous) : null;
  const cmpColor =
    cmp?.direction === "up"
      ? "text-pos"
      : cmp?.direction === "down"
        ? "text-accent"
        : "text-muted";
  const arrow = cmp?.direction === "up" ? "↑" : cmp?.direction === "down" ? "↓" : "";
  const accent = tone === "accent";

  return (
    <div className={`rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)] ${accent ? "ring-1 ring-accent/25" : ""}`}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div
        className={`mt-1 whitespace-nowrap font-display text-[clamp(1.375rem,6vw,2rem)] font-semibold leading-none tabular ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </div>
      {(hint || cmp) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {cmp && (
            <span className={`inline-flex items-center gap-0.5 ${cmpColor}`}>
              {arrow}
              {cmp.text}
            </span>
          )}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      )}
    </div>
  );
}
