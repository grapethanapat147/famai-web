import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isCustomerMode } from "@/lib/auth/money";
import { bottomBarItems, visibleMenu } from "@/lib/nav/menu";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const menu = visibleMenu(user.roleCodes);
  const items = menu.flatMap((g) => g.items);
  const primary = bottomBarItems(items);

  const customerMode = await isCustomerMode();

  return (
    <AppShell
      menu={menu}
      primary={primary}
      user={{ fullName: user.fullName, nickname: user.nickname }}
      canToggleMoney={user.perms.money}
      customerMode={customerMode}
    >
      {children}
    </AppShell>
  );
}
