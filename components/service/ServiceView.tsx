"use client";

import { useState, type ReactNode } from "react";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import { SERVICE_STATUSES, nextStatuses, statusVariant, type ServiceStatus } from "@/lib/service/status";
import { filterJobs, statusCounts, type ServiceActionResult, type ServiceJob } from "@/lib/service/jobs";

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export function ServiceView({
  jobs,
  canManage,
  action,
}: {
  jobs: ServiceJob[];
  canManage: boolean;
  action: (formData: FormData) => Promise<ServiceActionResult>;
}) {
  const [status, setStatus] = useState<ServiceStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [selected, setSelected] = useState<ServiceJob | null>(null);

  const counts = statusCounts(jobs);
  const rows = filterJobs(jobs, { status, search, fromDate });

  const columns: Column<ServiceJob>[] = [
    {
      key: "job",
      header: "เลขงาน / ลูกค้า",
      primary: true,
      render: (j) => (
        <span>
          <span className="font-mono text-xs text-muted">{j.jobNo}</span> · {j.customerName}
        </span>
      ),
    },
    { key: "vehicle", header: "รถ", render: (j) => <span>{j.vehicle}</span> },
    { key: "type", header: "ประเภท", render: (j) => <span className="text-ink-soft">{j.serviceType}</span> },
    {
      key: "status",
      header: "สถานะ",
      render: (j) => <StatusBadge variant={statusVariant(j.status)}>{j.status}</StatusBadge>,
    },
    { key: "date", header: "วันที่รับ", render: (j) => <span className="text-ink-soft">{formatThaiDate(j.checkedInAt)}</span> },
    { key: "total", header: "ยอดชำระ", align: "right", render: (j) => <Money value={j.total} /> },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* สรุปตามสถานะ (docs/04: สถานะเป็นตัวบอก) */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SERVICE_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus((cur) => (cur === s ? "all" : s))}
            className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm ${
              status === s ? "border-ink bg-card" : "border-hairline bg-card"
            }`}
          >
            <StatusBadge variant={statusVariant(s)}>{s}</StatusBadge>
            <span className="tabular font-semibold text-ink">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} ใบงาน`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นเลขงาน / ลูกค้า / รถ"
            className={`${selectClass} w-full sm:w-56`}
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            ตั้งแต่วันที่
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={selectClass} />
          </label>
          <Chips
            value={status}
            onChange={setStatus}
            options={[{ value: "all" as const, label: "ทุกสถานะ" }, ...SERVICE_STATUSES.map((s) => ({ value: s, label: s }))]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(j) => j.id}
        onRowClick={setSelected}
        empty="ไม่พบใบงาน (หรือยังไม่ได้ล็อกอิน)"
      />

      <JobDrawer
        job={selected}
        canManage={canManage}
        action={action}
        onClose={() => setSelected(null)}
        onAdvanced={() => setSelected(null)}
      />
    </div>
  );
}

function JobDrawer({
  job,
  canManage,
  action,
  onClose,
  onAdvanced,
}: {
  job: ServiceJob | null;
  canManage: boolean;
  action: (formData: FormData) => Promise<ServiceActionResult>;
  onClose: () => void;
  onAdvanced: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function advance(to: ServiceStatus) {
    if (!job || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("job_id", job.id);
    fd.set("from", job.status);
    fd.set("to", to);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      onAdvanced();
    } else {
      setError(res.error);
    }
  }

  const nexts = job ? nextStatuses(job.status) : [];

  return (
    <Drawer open={job !== null} onClose={onClose} title={job ? `${job.jobNo} · ${job.customerName}` : ""}>
      {job && (
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge variant={statusVariant(job.status)}>{job.status}</StatusBadge>
            <span className="text-muted">{formatThaiDate(job.checkedInAt)}</span>
          </div>

          <dl className="flex flex-col gap-2">
            <Row label="รถ">{job.vehicle}</Row>
            <Row label="เลขเครื่อง"><span className="font-mono">{job.engineNo || "—"}</span></Row>
            <Row label="เลขไมล์">{job.odometerKm != null ? `${job.odometerKm.toLocaleString("en-US")} กม.` : "—"}</Row>
            <Row label="ประเภทงาน">{job.serviceType}</Row>
            <Row label="ช่างผู้รับผิดชอบ">{job.technicianName || "—"}</Row>
            {job.symptom && <Row label="อาการ/รายละเอียด">{job.symptom}</Row>}
          </dl>

          {job.lines.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-ink">รายการ</p>
              <ul className="flex flex-col gap-1">
                {job.lines.map((ln) => (
                  <li key={ln.id} className="flex items-center justify-between gap-3 border-b border-hairline-2 pb-1 last:border-0">
                    <span className="min-w-0 truncate text-ink-soft">
                      <span className="text-muted">{ln.kind === "labor" ? "ค่าแรง" : "อะไหล่"}</span> · {ln.description}
                      {ln.qty > 1 ? ` ×${ln.qty}` : ""}
                    </span>
                    <Money value={ln.amount} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-[12px] bg-paper p-3">
            <Row label="ค่าแรง"><Money value={job.laborCost} /></Row>
            <Row label="ค่าอะไหล่"><Money value={job.partsCost} /></Row>
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-hairline pt-2">
              <span className="font-semibold text-ink">ยอดชำระ</span>
              <span className="font-semibold text-ink"><Money value={job.total} /></span>
            </div>
          </div>

          {error && <StatusBadge variant="bad">{error}</StatusBadge>}

          {canManage && nexts.length > 0 && (
            <div className="flex flex-col gap-2">
              {nexts.map((to) => (
                <button
                  key={to}
                  type="button"
                  disabled={busy}
                  onClick={() => advance(to)}
                  className="rounded-[24px] bg-accent py-3 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
                >
                  {busy ? "กำลังบันทึก…" : `ไป: ${to} →`}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
