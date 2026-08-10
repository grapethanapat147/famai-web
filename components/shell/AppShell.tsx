"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { MenuGroup, MenuItem } from "@/lib/nav/menu";
import { menuItem } from "@/lib/nav/menu";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

export function AppShell({
  menu,
  primary,
  canSell,
  children,
}: {
  menu: MenuGroup[];
  primary: MenuItem[];
  canSell: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const title = menuItem(pathname.replace(/^\//, ""))?.title ?? "Famai";

  return (
    <div className="flex min-h-dvh">
      <Sidebar menu={menu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} />
        <main className="flex-1 overflow-x-hidden px-4 pb-28 pt-5 lg:px-6 lg:pb-8">{children}</main>
      </div>
      <MobileNav menu={menu} primary={primary} canSell={canSell} />
    </div>
  );
}
