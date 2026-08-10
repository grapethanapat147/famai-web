import type { StatusVariant } from "@/components/ui/StatusBadge";

const BAR: Record<StatusVariant | "ink", string> = {
  ink: "bg-ink",
  good: "bg-pos",
  info: "bg-info",
  warn: "bg-attn",
  bad: "bg-accent",
  off: "bg-muted",
};

/** กราฟแท่งแนวนอนเบา ๆ (div, ไม่พึ่ง lib — docs/04 §10) แท่งหมึกเป็นหลัก, แดงเฉพาะที่เกินเกณฑ์ */
export function HBarChart({ items }: { items: { label: string; value: number; tone?: StatusVariant }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-ink-soft">{it.label}</span>
          <div className="h-2.5 flex-1 rounded-full bg-[var(--hairline-2)]">
            <div
              className={`h-full rounded-full ${BAR[it.tone ?? "ink"]}`}
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right tabular text-ink">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
