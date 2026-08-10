import type { ReactNode } from "react";
import { visibleMenu, type MenuItem } from "@/lib/nav/menu";
import { AppShell } from "@/components/shell/AppShell";

// TODO(FAM-1006): roleCodes มาจาก getCurrentUser() หลังทำ auth — ตอนนี้ demo เป็น admin (เห็นทุกเมนู)
const DEMO_ROLE_CODES = ["admin"];

// ลำดับความสำคัญของเมนูที่ขึ้นแถบล่างมือถือ (ที่เหลือไปอยู่ "อื่นๆ")
const BOTTOM_PRIORITY = ["dash", "stock", "deal", "parts", "hr", "report"];

export default function AppLayout({ children }: { children: ReactNode }) {
  const menu = visibleMenu(DEMO_ROLE_CODES);
  const items = menu.flatMap((g) => g.items);
  const canSell = items.some((i) => i.key === "sell");

  const byPriority = BOTTOM_PRIORITY.map((k) => items.find((i) => i.key === k)).filter(
    (x): x is MenuItem => Boolean(x),
  );
  const rest = items.filter(
    (i) => i.key !== "sell" && !BOTTOM_PRIORITY.includes(i.key),
  );
  const primary = [...byPriority, ...rest].slice(0, 4);

  return (
    <AppShell menu={menu} primary={primary} canSell={canSell}>
      {children}
    </AppShell>
  );
}
