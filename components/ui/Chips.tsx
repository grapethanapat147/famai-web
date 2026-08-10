"use client";

/** ชิปเลือก (แท็บ→ชิปบนมือถือ) — ตัวที่เลือกเป็นชิปทึบ ไม่ใช่ขีดใต้ (docs/04 §8) */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-ink text-card"
                : "border border-hairline bg-card text-ink-soft hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
