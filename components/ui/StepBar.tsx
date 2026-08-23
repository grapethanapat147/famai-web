/**
 * แถบเลขขั้น (docs/04 §9f) — เส้นตรง เลข 1..n เลื่อนตามความคืบหน้า
 * เป็นตัว "บอกสถานะ" ไม่ใช่ปุ่ม (§9g กฎ 4) · ขั้นปัจจุบันที่ตกราง = วงแดงกลวง
 */
export function StepBar({
  track,
  currentIndex,
  offTrack = false,
  onStepClick,
  activeIndex,
}: {
  track: readonly string[];
  currentIndex: number;
  offTrack?: boolean;
  onStepClick?: (index: number) => void;
  activeIndex?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-start">
        {track.map((label, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const circle = current
            ? offTrack
              ? "border-accent bg-card text-accent"
              : "border-accent bg-accent text-card"
            : done
              ? "border-ink bg-ink text-card"
              : "border-hairline bg-card text-muted";
          const lineDone = i <= currentIndex && !(current && offTrack);
          const inner = (
            <>
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : done || current ? "bg-ink" : "bg-hairline"}`} />
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular ${circle} ${
                    activeIndex === i ? "ring-2 ring-accent ring-offset-1 ring-offset-card" : ""
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`h-0.5 flex-1 ${i === track.length - 1 ? "invisible" : lineDone && i < currentIndex ? "bg-ink" : "bg-hairline"}`}
                />
              </div>
              <span
                className={`mt-1 px-1 text-center text-[11px] leading-tight ${
                  current ? (offTrack ? "text-accent" : "font-medium text-ink") : done ? "text-ink-soft" : "text-muted"
                }`}
              >
                {label}
              </span>
            </>
          );
          return (
            <li key={label} className="flex min-w-[68px] flex-1 flex-col items-center">
              {onStepClick ? (
                <button type="button" onClick={() => onStepClick(i)} className="flex w-full flex-col items-center rounded-[8px] py-1 hover:bg-paper-2" aria-label={`ขั้น ${label}`}>
                  {inner}
                </button>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
