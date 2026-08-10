import { logout } from "@/lib/auth/actions";

/** แถบบน — มือถือโชว์แบรนด์, เดสก์ท็อปโชว์ชื่อหน้า + ชิปผู้ใช้ + ปุ่มออกจากระบบ */
export function TopBar({
  title,
  user,
}: {
  title: string;
  user: { fullName: string; nickname: string | null };
}) {
  const label = user.nickname || user.fullName;

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

      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-card px-2 py-1 text-sm text-ink-soft">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] text-card">
            {label.slice(0, 1)}
          </span>
          <span className="hidden max-w-[120px] truncate sm:block">{label}</span>
        </span>
        <form action={logout}>
          <button
            type="submit"
            aria-label="ออกจากระบบ"
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-card hover:text-ink"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 4H7a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h5" />
              <path d="M10 10h7M14 7l3 3-3 3" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
