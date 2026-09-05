import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isCustomerMode } from "@/lib/auth/money";
import { visibleMenu, type MenuItem } from "@/lib/nav/menu";
import { AppShell } from "@/components/shell/AppShell";

// ลำดับความสำคัญของเมนูที่ขึ้นแถบล่างมือถือ (ที่เหลือไปอยู่ "อื่นๆ")
const BOTTOM_PRIORITY = ["dash", "stock", "deal", "sell", "parts", "hr", "report"];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const menu = visibleMenu(user.roleCodes);
  const items = menu.flatMap((g) => g.items);
  const byPriority = BOTTOM_PRIORITY.map((k) => items.find((i) => i.key === k)).filter(
    (x): x is MenuItem => Boolean(x),
  );
  const rest = items.filter((i) => !BOTTOM_PRIORITY.includes(i.key));
  // 5 ปุ่ม + "อื่นๆ" = 6 ช่องเท่ากันบนแถบล่าง — ขายรถเป็นปุ่มปกติ ไม่ใช่ปุ่มลอยทับเนื้อหาแล้ว
  const primary = [...byPriority, ...rest].slice(0, 5);

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
