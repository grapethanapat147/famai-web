"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  actionLabel,
  actionVariant,
  ACTION_LABEL,
  AUDIT_TABLES,
  fieldChanges,
  filterAuditRows,
  tableLabel,
  type AuditRow,
} from "@/lib/audit/log";
import { formatThaiDate } from "@/lib/format";

const inputCls = "rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AuditView({ rows, limit }: { rows: AuditRow[]; limit: number }) {
  const [table, setTable] = useState("all");
  const [action, setAction] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const filtered = filterAuditRows(rows, { table, action, search, fromDate });

  const columns: Column<AuditRow>[] = [
    {
      key: "at",
      header: "เมื่อไหร่",
      primary: true,
      render: (r) => (
        <span className="text-ink">
          {formatThaiDate(r.at)} <span className="tabular text-muted">{timeOf(r.at)}</span>
        </span>
      ),
    },
    { key: "actor", header: "ใคร", render: (r) => <span className="text-ink-soft">{r.actorName}</span> },
    {
      key: "what",
      header: "ทำอะไร",
      render: (r) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusBadge variant={actionVariant(r.action)}>{actionLabel(r.action)}</StatusBadge>
          <span className="text-ink-soft">{tableLabel(r.tableName)}</span>
        </span>
      ),
    },
    {
      key: "fields",
      header: "ช่องที่เปลี่ยน",
      render: (r) => {
        const c = fieldChanges(r);
        if (c.length === 0) {
          return <span className="text-muted">—</span>;
        }
        const shown = c.slice(0, 3).map((x) => x.field).join(", ");
        return (
          <span className="text-xs text-muted">
            {shown}
            {c.length > 3 && ` +${c.length - 3}`}
          </span>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold text-ink">ประวัติการแก้ไข</h1>
        <p className="mt-0.5 text-sm text-muted">
          ระบบบันทึกทุกการเพิ่ม/แก้/ลบของ {AUDIT_TABLES.length} ตารางหลักไว้อัตโนมัติ · แสดง {limit.toLocaleString("th-TH")} รายการล่าสุด
        </p>
      </div>

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${filtered.length.toLocaleString("th-TH")} รายการ`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาประวัติ"
            placeholder="ค้นชื่อผู้แก้ / ตาราง / ช่อง"
            className={`${inputCls} sm:w-56`}
          />
          <select aria-label="กรองตามตาราง" value={table} onChange={(e) => setTable(e.target.value)} className={inputCls}>
            <option value="all">ทุกตาราง</option>
            {AUDIT_TABLES.map((t) => (
              <option key={t} value={t}>
                {tableLabel(t)}
              </option>
            ))}
          </select>
          <select aria-label="กรองตามการกระทำ" value={action} onChange={(e) => setAction(e.target.value)} className={inputCls}>
            <option value="all">ทุกการกระทำ</option>
            {Object.keys(ACTION_LABEL).map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm text-muted">
            ตั้งแต่
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={`${inputCls} w-[150px]`} />
          </label>
        </FilterBar>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="files"
          title={rows.length === 0 ? "ยังไม่มีประวัติ" : "ไม่พบตามตัวกรอง"}
          description={rows.length === 0 ? "ระบบจะบันทึกให้เองเมื่อมีการเพิ่ม/แก้/ลบข้อมูล" : "ลองล้างตัวกรองหรือขยายช่วงวันที่"}
        />
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(r) => String(r.id)} onRowClick={setSelected} />
      )}

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${actionLabel(selected.action)}${tableLabel(selected.tableName)}` : ""}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="rounded-[12px] bg-paper p-3 text-sm">
              <p className="text-ink">
                <b>{selected.actorName}</b> · {formatThaiDate(selected.at)} {timeOf(selected.at)}
              </p>
              <p className="mt-1 font-mono text-xs text-muted">
                {selected.tableName} · {selected.rowId}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">ช่องที่เปลี่ยน</p>
              {fieldChanges(selected).length === 0 ? (
                <p className="text-sm text-muted">ไม่มีรายละเอียดช่องที่เปลี่ยน</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                        <th className="py-2 font-medium">ช่อง</th>
                        <th className="py-2 pl-3 font-medium">เดิม</th>
                        <th className="py-2 pl-3 font-medium">ใหม่</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldChanges(selected).map((c) => (
                        <tr key={c.field} className="border-b border-hairline-2 last:border-0">
                          <td className="py-2 font-mono text-xs text-ink-soft">{c.field}</td>
                          <td className="py-2 pl-3 text-muted line-through decoration-hairline">{c.from}</td>
                          <td className="py-2 pl-3 font-medium text-ink">{c.to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
