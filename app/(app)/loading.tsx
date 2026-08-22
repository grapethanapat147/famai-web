/** โครงร่างระหว่างโหลดข้อมูลหน้าจอ (แสดงใน AppShell ตอนเปลี่ยนหน้า / server component ดึงข้อมูล) */
export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-5xl">
      <span className="sr-only">กำลังโหลด…</span>
      <div aria-hidden className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-[8px] bg-paper-2" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[12px] bg-card shadow-[var(--sh-sm)]" />
          ))}
        </div>
        <div className="h-64 rounded-[12px] bg-card shadow-[var(--sh-sm)]" />
      </div>
    </div>
  );
}
