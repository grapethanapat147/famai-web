/** โครงร่างแดชบอร์ด (หน้าหนัก — ดึงสรุปหลายชุด) แทนหน้าจอค้างระหว่างโหลด */
export default function DashLoading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto flex max-w-6xl flex-col gap-6">
      <span className="sr-only">กำลังโหลดแดชบอร์ด…</span>
      <div aria-hidden className="animate-pulse">
        <div className="mb-6 h-8 w-56 rounded-[8px] bg-paper-2" />
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="h-44 rounded-[16px] bg-card shadow-[var(--sh-sm)] lg:col-span-2" />
          <div className="h-44 rounded-[16px] bg-card shadow-[var(--sh-sm)]" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[12px] bg-card shadow-[var(--sh-sm)]" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="h-48 rounded-[12px] bg-card shadow-[var(--sh-sm)]" />
          <div className="h-48 rounded-[12px] bg-card shadow-[var(--sh-sm)]" />
        </div>
      </div>
    </div>
  );
}
