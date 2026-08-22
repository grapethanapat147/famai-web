"use client";

import type { KeyboardEvent, ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  /** ใช้เป็นหัวการ์ดบนมือถือ (ไม่กำหนด = คอลัมน์แรก) */
  primary?: boolean;
  /** ซ่อนในมุมมองการ์ดมือถือ */
  hideOnMobile?: boolean;
};

function activate<T>(fn: ((row: T) => void) | undefined, row: T) {
  return fn
    ? {
        onClick: () => fn(row),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fn(row);
          }
        },
        role: "button",
        tabIndex: 0,
      }
    : {};
}

/**
 * ตารางที่กดได้ → เปิดแผงรายละเอียด (docs/04 §4, §8, §11.3)
 * เดสก์ท็อป = ตาราง (hairline อย่างเดียว ไม่มีพื้นหัวตาราง) · มือถือ = การ์ด (ห้ามเลื่อนซ้าย-ขวา)
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = "ไม่มีข้อมูล",
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    // string (หรือค่าเริ่มต้น) = ห่อการ์ด muted เดิม · ReactNode (เช่น <EmptyState/>) = render ตรง ๆ (มีการ์ดของตัวเอง)
    if (typeof empty === "string") {
      return (
        <div className="rounded-[12px] bg-card p-6 text-center text-sm text-muted shadow-[var(--sh-sm)]">
          {empty}
        </div>
      );
    }
    return <>{empty}</>;
  }

  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const restCols = columns.filter((c) => c !== primaryCol && !c.hideOnMobile);

  return (
    <>
      <div className="hidden overflow-hidden rounded-[12px] bg-card shadow-[var(--sh-sm)] sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-[11px] uppercase tracking-wider text-muted">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-2.5 font-medium ${c.align === "right" ? "text-right" : ""}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                {...activate(onRowClick, row)}
                className={`border-b border-hairline-2 last:border-0 ${
                  onRowClick
                    ? "cursor-pointer transition-colors hover:bg-paper-2 active:bg-[var(--hairline-2)] focus-visible:bg-paper-2 focus-visible:[outline:2px_solid_var(--accent)] focus-visible:[outline-offset:-2px]"
                    : ""
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 text-ink-soft ${c.align === "right" ? "text-right" : ""}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 sm:hidden">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            {...activate(onRowClick, row)}
            className={`rounded-[12px] bg-card p-3 shadow-[var(--sh-sm)] ${
              onRowClick ? "cursor-pointer transition-transform active:scale-[0.99]" : ""
            }`}
          >
            <div className="font-medium text-ink">{primaryCol.render(row)}</div>
            <dl className="mt-1.5 flex flex-col gap-0.5">
              {restCols.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-muted">{c.header}</dt>
                  <dd className="text-ink-soft">{c.render(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
