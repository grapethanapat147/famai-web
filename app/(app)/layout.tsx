import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { visibleMenu, type MenuItem } from "@/lib/nav/menu";
import { AppShell } from "@/components/shell/AppShell";

// ลำดับความสำคัญของเมนูที่ขึ้นแถบล่างมือถือ (ที่เหลือไปอยู่ "อื่นๆ")
const BOTTOM_PRIORITY = ["dash", "stock", "deal", "parts", "hr", "report"];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const menu = visibleMenu(user.roleCodes);
  const items = menu.flatMap((g) => g.items);
  const canSell = items.some((i) => i.key === "sell");

  const byPriority = BOTTOM_PRIORITY.map((k) => items.find((i) => i.key === k)).filter(
    (x): x is MenuItem => Boolean(x),
  );
  const rest = items.filter((i) => i.key !== "sell" && !BOTTOM_PRIORITY.includes(i.key));
  const primary = [...byPriority, ...rest].slice(0, 4);

  return (
    <AppShell
      menu={menu}
      primary={primary}
      canSell={canSell}
      user={{ fullName: user.fullName, nickname: user.nickname }}
    >
      {children}
    </AppShell>
  );
}
