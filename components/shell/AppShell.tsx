"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { MenuGroup, MenuItem } from "@/lib/nav/menu";
import { menuItem } from "@/lib/nav/menu";
import { toggleCustomerMode } from "@/lib/auth/actions";
import { CaptureButton } from "@/components/capture/CaptureButton";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

export function AppShell({
  menu,
  primary,
  canSell,
  user,
  canToggleMoney,
  customerMode,
  children,
}: {
  menu: MenuGroup[];
  primary: MenuItem[];
  canSell: boolean;
  user: { fullName: string; nickname: string | null };
  canToggleMoney: boolean;
  customerMode: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const title = menuItem(pathname.replace(/^\//, ""))?.title ?? "Famai";

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-[8px] focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-card focus:shadow-[var(--sh-md)]"
      >
        ข้ามไปเนื้อหาหลัก
      </a>
      <Sidebar menu={menu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          user={user}
          canToggleMoney={canToggleMoney}
          customerMode={customerMode}
          pages={menu.flatMap((g) => g.items).map((i) => ({ title: i.title, href: `/${i.key}` }))}
        />

        {customerMode && (
          <div className="flex items-center justify-between gap-3 border-b border-hairline bg-[var(--accent-wash)] px-4 py-2 text-sm text-accent-deep lg:px-6 print:hidden">
            <span className="inline-flex min-w-0 items-center gap-2">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 3l14 14" />
                <path d="M8.6 5.2A6.9 6.9 0 0 1 10 5c4 0 7 4.1 7 5a9 9 0 0 1-1.6 2.1M5.2 6.9C3.7 8 3 9.4 3 10c0 1 3 5 7 5a6.6 6.6 0 0 0 2.3-.4" />
              </svg>
              <span className="truncate">โหมดลูกค้า — ซ่อนต้นทุนและกำไรทุกหน้า</span>
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <CaptureButton />
              <form action={toggleCustomerMode}>
                <button type="submit" className="shrink-0 rounded-full border border-accent/40 px-2.5 py-0.5 text-xs font-medium">
                  ปิดโหมด
                </button>
              </form>
            </div>
          </div>
        )}

        <main id="main" tabIndex={-1} className="flex-1 overflow-x-hidden px-4 pb-28 pt-5 outline-none lg:px-6 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileNav menu={menu} primary={primary} canSell={canSell} />
    </div>
  );
}
