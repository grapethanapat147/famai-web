"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuGroup } from "@/lib/nav/menu";
import { NavIcon } from "./NavIcon";

/** Sidebar เดสก์ท็อป (≥lg) — เมนูที่เลือก = พื้นขาว + ขีดแดง 2px ซ้าย + ไอคอนแดง (docs/04 §1) */
export function Sidebar({ menu }: { menu: MenuGroup[] }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col overflow-y-auto border-r border-hairline bg-paper-2 lg:flex print:hidden">
      <div className="px-5 py-5">
        <span className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          Famai
        </span>
      </div>

      <nav className="flex flex-col gap-5 px-3 pb-6">
        {menu.map((group) => (
          <div key={group.group}>
            <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
              {group.group}
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const href = `/${item.key}`;
                const active = pathname === href;
                return (
                  <li key={item.key}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 rounded-[8px] border-l-2 py-2 pl-3 pr-2 text-sm transition-colors ${
                        active
                          ? "border-accent bg-card font-medium text-ink shadow-[var(--sh-sm)]"
                          : "border-transparent text-ink-soft hover:bg-card/60 hover:text-ink"
                      }`}
                    >
                      <span className={active ? "text-accent" : "text-muted"}>
                        <NavIcon name={item.icon} />
                      </span>
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
