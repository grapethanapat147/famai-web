"use client";

/** เพิ่มค่าเป็นขั้น (กันติดลบ) — ใช้กับปุ่มบวกเลขเร็ว (FAM-1099) */
export function stepValue(current: number, delta: number): number {
  return Math.max(0, (current || 0) + delta);
}

const DEFAULT_STEPS = [1000, 5000, 10000];

/**
 * ช่องกรอกเงิน + ปุ่มบวกเลขเร็ว (FAM-1099) — ใช้ซ้ำได้ · ค่าเป็น number (0 = ว่าง)
 * กดปุ่ม +5,000/+10,000 เพื่อบวกทีละก้อน · ปุ่มล้างคืนค่า 0
 */
export function MoneyStepInput({
  value,
  onChange,
  steps = DEFAULT_STEPS,
  placeholder,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  steps?: number[];
  placeholder?: string;
  ariaLabel?: string;
}) {
  const inputCls =
    "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";
  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={inputCls}
      />
      <div className="flex flex-wrap gap-1">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(stepValue(value, s))}
            className="rounded-[16px] border border-hairline px-2.5 py-1 text-xs text-ink-soft transition-transform active:scale-95 hover:text-ink"
          >
            +{s.toLocaleString("en-US")}
          </button>
        ))}
        {value > 0 && (
          <button type="button" onClick={() => onChange(0)} className="rounded-[16px] px-2.5 py-1 text-xs text-muted transition-colors hover:text-accent">
            ล้าง
          </button>
        )}
      </div>
    </div>
  );
}
