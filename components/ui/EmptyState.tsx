import Link from "next/link";
import { NavIcon } from "@/components/shell/NavIcon";

type EmptyAction = { label: string; href: string } | { label: string; onClick: () => void };

/**
 * Empty state ที่สื่อความหมาย — ไอคอน (ชื่อชุดเดียวกับเมนู) + หัวข้อ + คำอธิบาย + ปุ่มทำต่อ (ลิงก์/ปุ่ม)
 * ใช้กับตารางที่ยังไม่มีข้อมูล หรือกรองแล้วไม่พบ (ส่งเป็น prop `empty` ให้ DataTable)
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: EmptyAction;
}) {
  return (
    <div className="rounded-[12px] bg-card px-6 py-10 text-center shadow-[var(--sh-sm)]">
      {icon && (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 text-muted">
          <NavIcon name={icon} className="h-6 w-6" />
        </div>
      )}
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && (
        <div className="mt-4">
          {"href" in action ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.97]"
            >
              {action.label}
              <span className="text-accent" aria-hidden>
                →
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-2 rounded-[24px] border border-hairline px-4 py-2 text-sm font-medium text-ink-soft transition-transform active:scale-[0.97]"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
