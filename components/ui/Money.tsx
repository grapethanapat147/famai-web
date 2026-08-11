import { formatBaht } from "@/lib/format";

/** เงินบาท — ติดลบสีแดง (docs/04 §7) · ไม่มีสิทธิ์ money หรือค่า null → '—' */
export function Money({
  value,
  canSee = true,
  withSymbol = true,
  className = "",
}: {
  value: number | null | undefined;
  canSee?: boolean;
  withSymbol?: boolean;
  className?: string;
}) {
  if (!canSee || value == null) {
    return <span className={`tabular text-muted ${className}`}>—</span>;
  }
  return (
    <span className={`tabular ${value < 0 ? "text-accent" : ""} ${className}`}>
      {formatBaht(value, { withSymbol })}
    </span>
  );
}
