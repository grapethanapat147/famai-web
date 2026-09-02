"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import { formatDistanceM } from "@/lib/hr/geo";
import {
  ATT_META,
  ATT_ORDER,
  filterRows,
  statusCounts,
  type AttendRow,
  type AttStatus,
} from "@/lib/attend/attendance";
import type { HrActionResult } from "@/lib/hr/leave";

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

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

/** ISO → "HH:MM" เขตเวลาไทย (เลขอารบิก) สำหรับ prefill ช่อง input · ว่าง = "" */
function hhmmBangkok(iso: string | null): string {
  if (!iso) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function AttendView({
  rows,
  date,
  canEdit = false,
  editAction,
}: {
  rows: AttendRow[];
  date: string;
  canEdit?: boolean;
  editAction?: (formData: FormData) => Promise<HrActionResult>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AttStatus | "all">("all");
  const [selfieRow, setSelfieRow] = useState<AttendRow | null>(null);
  const [editRow, setEditRow] = useState<AttendRow | null>(null);

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
          {r.distanceM != null ? (
            <span className="text-muted">
              {" · 📍"}
              {r.siteName ? `${r.siteName} ` : ""}
              {formatDistanceM(r.distanceM)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "selfie",
      header: "เซลฟี่",
      render: (r) =>
        r.selfieUrl ? (
          <button
            type="button"
            onClick={() => setSelfieRow(r)}
            aria-label={`ดูเซลฟี่ ${r.name}`}
            className="overflow-hidden rounded-full ring-1 ring-hairline transition-transform active:scale-95 hover:ring-ink"
          >
            <Image src={r.selfieUrl} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-cover" />
          </button>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    { key: "ot", header: "OT", align: "right", render: (r) => <span className="tabular text-ink-soft">{r.otMinutes ? `${r.otMinutes} นาที` : "—"}</span> },
    ...(canEdit && editAction
      ? [
          {
            key: "edit",
            header: "",
            align: "right" as const,
            render: (r: AttendRow) => (
              <button
                type="button"
                onClick={() => setEditRow(r)}
                className="rounded-[20px] border border-hairline px-3.5 py-2 text-xs text-ink-soft transition-transform active:scale-[0.97] hover:text-ink"
              >
                แก้เวลา
              </button>
            ),
          } as Column<AttendRow>,
        ]
      : []),
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

      {selfieRow && <SelfieModal row={selfieRow} onClose={() => setSelfieRow(null)} />}
      {editRow && editAction && (
        <EditAttendanceModal key={editRow.employeeId} row={editRow} date={date} action={editAction} onClose={() => setEditRow(null)} />
      )}
    </div>
  );
}

function EditAttendanceModal({
  row,
  date,
  action,
  onClose,
}: {
  row: AttendRow;
  date: string;
  action: (formData: FormData) => Promise<HrActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(hhmmBangkok(row.checkIn));
  const [checkOut, setCheckOut] = useState(hhmmBangkok(row.checkOut));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls = "rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

  async function submit() {
    if (busy || checkIn === "") {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("employee_id", row.employeeId);
    fd.set("work_date", date);
    fd.set("check_in", checkIn);
    fd.set("check_out", checkOut);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open onClose={onClose} title={`แก้เวลา — ${row.name}`}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">{formatThaiDate(date)} · {row.position}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            เวลาเข้า
            <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            เวลาออก (ถ้ามี)
            <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputCls} />
          </label>
        </div>
        <p className="text-xs text-muted">ระบบคำนวณ “สาย” และชั่วโมงงานใหม่จากเวลาที่กรอก · เว้นเวลาออกว่าง = ยังไม่ออกงาน</p>
        {error && <StatusBadge variant="bad">{error}</StatusBadge>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || checkIn === ""}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกเวลา"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SelfieModal({ row, onClose }: { row: AttendRow; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={`เซลฟี่ลงเวลา — ${row.name}`}>
      <div className="flex flex-col items-center gap-3">
        {row.selfieUrl && (
          <Image src={row.selfieUrl} alt={`เซลฟี่ ${row.name}`} width={360} height={360} unoptimized className="w-full max-w-[360px] rounded-[12px] object-cover" />
        )}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span>
            เข้างาน <b className="text-ink">{timeOf(row.checkIn)}</b>
          </span>
          {row.distanceM != null && (
            <span>
              ห่างจาก <b className="text-ink">{row.siteName ?? "จุดร้าน"}</b> {formatDistanceM(row.distanceM)}
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
