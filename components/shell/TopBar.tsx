/** แถบบน — มือถือโชว์แบรนด์, เดสก์ท็อปโชว์ชื่อหน้า + ชิปผู้ใช้ (auth จริงใน FAM-1005) */
export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-hairline bg-paper/80 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-display font-semibold text-ink lg:hidden">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          Famai
        </span>
        <span className="hidden truncate font-display text-lg font-semibold text-ink lg:block">
          {title}
        </span>
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-hairline bg-card px-2 py-1 text-sm text-ink-soft"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] text-card">
          ผู้
        </span>
        <span className="hidden sm:block">ผู้ใช้</span>
      </button>
    </header>
  );
}
