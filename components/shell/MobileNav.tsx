"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { MenuGroup, MenuItem } from "@/lib/nav/menu";
import { NavIcon } from "./NavIcon";

/** เปลือกมือถือ (≤lg): แถบล่าง 6 ช่อง (5 เมนู + "อื่นๆ") · ขายรถเป็นปุ่มปกติในแถบ ไม่ใช่ปุ่มลอยแล้ว (FAM-1149) */
export function MobileNav({
  menu,
  primary,
}: {
  menu: MenuGroup[];
  primary: MenuItem[];
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const cell = (active: boolean) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] ${
      active ? "text-accent" : "text-muted"
    }`;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-hairline bg-card/95 backdrop-blur lg:hidden print:hidden">
        {primary.map((item) => {
          const active = pathname === `/${item.key}`;
          return (
            <Link key={item.key} href={`/${item.key}`} className={cell(active)}>
              <NavIcon name={item.icon} />
              <span className="w-full truncate px-0.5 text-center">{item.title}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className={cell(false)}>
          <NavIcon name="more" />
          <span>อื่นๆ</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="ปิด"
            className="absolute inset-0 bg-ink/30"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-[16px] bg-paper-2 p-4 shadow-[var(--sh-lg)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-hairline" />
            <div className="flex flex-col gap-4">
              {menu.map((group) => (
                <div key={group.group}>
                  <div className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                    {group.group}
                  </div>
                  <ul className="grid grid-cols-2 gap-1.5">
                    {group.items.map((item) => {
                      const active = pathname === `/${item.key}`;
                      return (
                        <li key={item.key}>
                          <Link
                            href={`/${item.key}`}
                            onClick={() => setMoreOpen(false)}
                            className={`flex items-center gap-2 rounded-[10px] bg-card px-3 py-2.5 text-sm ${
                              active ? "text-accent" : "text-ink-soft"
                            }`}
                          >
                            <span className={active ? "text-accent" : "text-muted"}>
                              <NavIcon name={item.icon} />
                            </span>
                            <span className="truncate">{item.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
