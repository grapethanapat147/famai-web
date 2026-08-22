"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import {
  ATT_META,
  ATT_ORDER,
  filterRows,
  statusCounts,
  type AttendRow,
  type AttStatus,
} from "@/lib/attend/attendance";

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

function timeOf(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function AttendView({ rows, date }: { rows: AttendRow[]; date: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AttStatus | "all">("all");

  const counts = statusCounts(rows);
  const shown = filterRows(rows, { search, status });

  const isFiltered = search.trim() !== "" || status !== "all";
  function resetFilters() {
    setSearch("");
    setStatus("all");
  }

  const columns: Column<AttendRow>[] = [
    {
      key: "name",
      header: "พนักงาน",
      primary: true,
      render: (r) => (
        <span>
          {r.name} <span className="text-muted">· {r.position}</span>
        </span>
      ),
    },
    { key: "status", header: "สถานะ", render: (r) => <StatusBadge variant={ATT_META[r.status].variant}>{ATT_META[r.status].label}</StatusBadge> },
    {
      key: "in",
      header: "เข้างาน",
      render: (r) => (
        <span className="tabular text-ink-soft">
          {timeOf(r.checkIn)}
          {r.status === "late" && r.lateMinutes ? <span className="text-accent"> (สาย {r.lateMinutes} นาที)</span> : null}
        </span>
      ),
    },
    { key: "ot", header: "OT", align: "right", render: (r) => <span className="tabular text-ink-soft">{r.otMinutes ? `${r.otMinutes} นาที` : "—"}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          วันที่
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && router.push(`?date=${e.target.value}`)}
            className={`${selectClass} w-[150px]`}
          />
          <span className="text-ink-soft">{formatThaiDate(date)}</span>
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {ATT_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus((cur) => (cur === s ? "all" : s))}
            className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm ${status === s ? "border-ink bg-card" : "border-hairline bg-card"}`}
          >
            <StatusBadge variant={ATT_META[s].variant}>{ATT_META[s].label}</StatusBadge>
            <span className="tabular font-semibold text-ink">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${shown.length} คน`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาชื่อ / ตำแหน่ง"
            placeholder="ค้นชื่อ / ตำแหน่ง"
            className={`${selectClass} w-full sm:w-56`}
          />
          <Chips
            value={status}
            onChange={setStatus}
            options={[{ value: "all" as const, label: "ทุกสถานะ" }, ...ATT_ORDER.map((s) => ({ value: s, label: ATT_META[s].label }))]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={shown}
        rowKey={(r) => r.employeeId}
        empty={
          rows.length > 0 ? (
            <EmptyState
              icon="users"
              title="ไม่พบพนักงานตามเงื่อนไข"
              description="ลองปรับคำค้นหรือสถานะการเข้างาน"
              action={isFiltered ? { label: "ล้างตัวกรอง", onClick: resetFilters } : undefined}
            />
          ) : (
            <EmptyState icon="users" title="ไม่มีพนักงาน" description="เพิ่มพนักงานในระบบก่อนบันทึกการเข้างาน" />
          )
        }
      />
    </div>
  );
}
