import { logout, toggleCustomerMode } from "@/lib/auth/actions";
import { ThemeControls } from "@/components/theme/ThemeControls";
import { SupportCapture } from "@/components/support/SupportCapture";
import { SearchLauncher } from "@/components/search/SearchLauncher";

/** แถบบน — ชื่อหน้า/แบรนด์ + ค้นหา + สลับโหมดลูกค้า (ถ้ามีสิทธิ์ money) + ชิปผู้ใช้ + ออกจากระบบ */
export function TopBar({
  title,
  user,
  canToggleMoney,
  customerMode,
  pages,
}: {
  title: string;
  user: { fullName: string; nickname: string | null };
  canToggleMoney: boolean;
  customerMode: boolean;
  pages: { title: string; href: string }[];
}) {
  const label = user.nickname || user.fullName;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-hairline bg-paper/80 px-4 py-3 backdrop-blur lg:px-6 print:hidden">
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
        <SearchLauncher pages={pages} />
        <SupportCapture />
        <ThemeControls />
        {canToggleMoney && (
          <form action={toggleCustomerMode}>
            <button
              type="submit"
              title="โหมดลูกค้า (ซ่อนต้นทุน/กำไร)"
              aria-label={customerMode ? "ปิดโหมดลูกค้า" : "เปิดโหมดลูกค้า"}
              aria-pressed={customerMode}
              className={`grid h-8 w-8 place-items-center rounded-full ${
                customerMode ? "text-accent" : "text-muted hover:bg-card hover:text-ink"
              }`}
            >
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {customerMode ? (
                  <>
                    <path d="M3 3l14 14" />
                    <path d="M8.6 5.2A6.9 6.9 0 0 1 10 5c4 0 7 4.1 7 5a9 9 0 0 1-1.6 2.1M5.2 6.9C3.7 8 3 9.4 3 10c0 1 3 5 7 5a6.6 6.6 0 0 0 2.3-.4" />
                  </>
                ) : (
                  <>
                    <path d="M3 10c0-1 3-5 7-5s7 4 7 5-3 5-7 5-7-4-7-5z" />
                    <circle cx="10" cy="10" r="2.2" />
                  </>
                )}
              </svg>
            </button>
          </form>
        )}

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
