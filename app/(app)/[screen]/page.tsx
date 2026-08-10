import { notFound } from "next/navigation";
import { ALL_MENU_KEYS, menuItem } from "@/lib/nav/menu";

// pre-render 20 หน้าจากเมนูจริง
export function generateStaticParams() {
  return ALL_MENU_KEYS.map((screen) => ({ screen }));
}

/**
 * Placeholder ของทุกหน้าจอในเมนู — หน้าจริงจะพอร์ตจาก index.html v1.15 ในทิคเก็ตของหน้านั้น
 * (route จริง เช่น app/(app)/stock/page.tsx จะมาแทนที่ placeholder นี้เมื่อสร้าง)
 */
export default async function ScreenPlaceholder({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  const item = menuItem(screen);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">{item.title}</h1>
      <p className="mt-1 text-ink-soft">{item.subtitle}</p>
      <div className="mt-6 rounded-[12px] bg-card p-6 text-sm text-muted shadow-[var(--sh-sm)]">
        หน้านี้อยู่ระหว่างพัฒนา — จะพอร์ตจากต้นแบบ <code className="font-mono text-ink-soft">index.html</code>{" "}
        v1.15 ในทิคเก็ตของหน้านี้
      </div>
    </div>
  );
}
