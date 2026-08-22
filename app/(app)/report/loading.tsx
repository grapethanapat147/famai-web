/** โครงร่างรายงาน (หน้าหนัก — รวมยอดหลายมิติ) แทนหน้าจอค้างระหว่างโหลด */
export default function ReportLoading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-4xl">
      <span className="sr-only">กำลังโหลดรายงาน…</span>
      <div aria-hidden className="animate-pulse">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="h-8 w-40 rounded-[8px] bg-paper-2" />
          <div className="h-9 w-28 rounded-[24px] bg-card shadow-[var(--sh-sm)]" />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[12px] bg-card shadow-[var(--sh-sm)]" />
          ))}
        </div>
        <div className="h-72 rounded-[12px] bg-card shadow-[var(--sh-sm)]" />
      </div>
    </div>
  );
}
