"use client";

import { useRef, useState, type ReactNode } from "react";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBaht, formatThaiDate } from "@/lib/format";
import { SERVICE_STATUSES, nextStatuses, statusVariant, type ServiceStatus } from "@/lib/service/status";
import { SERVICE_TYPES, filterJobs, statusCounts, type ServiceActionResult, type ServiceJob, type ServiceLine } from "@/lib/service/jobs";
import { jobTotals, lineAmount, type LineKind } from "@/lib/service/lines";

export type ServiceCreateOptions = {
  customers: { id: string; name: string }[];
  units: { id: string; label: string; engineNo: string; frameNo: string }[];
  technicians: { id: string; name: string }[];
};

export type ServicePartOption = { id: string; name: string; price: number; qtyOnHand: number };
export type ServiceLineOptions = { parts: ServicePartOption[] };

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export function ServiceView({
  jobs,
  canManage,
  action,
  createOptions,
  createAction,
  lineOptions,
  lineAction,
  removeLineAction,
}: {
  jobs: ServiceJob[];
  canManage: boolean;
  action: (formData: FormData) => Promise<ServiceActionResult>;
  createOptions?: ServiceCreateOptions;
  createAction?: (formData: FormData) => Promise<ServiceActionResult>;
  lineOptions?: ServiceLineOptions;
  lineAction?: (formData: FormData) => Promise<ServiceActionResult>;
  removeLineAction?: (formData: FormData) => Promise<ServiceActionResult>;
}) {
  const [status, setStatus] = useState<ServiceStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [selected, setSelected] = useState<ServiceJob | null>(null);
  const [creating, setCreating] = useState(false);

  const counts = statusCounts(jobs);
  const rows = filterJobs(jobs, { status, search, fromDate });

  const isFiltered = status !== "all" || search.trim() !== "" || fromDate !== "";
  function resetFilters() {
    setStatus("all");
    setSearch("");
    setFromDate("");
  }

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
      {canManage && createAction && createOptions && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.99]"
          >
            + เปิดใบงานซ่อม
          </button>
        </div>
      )}

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
        empty={
          jobs.length > 0 ? (
            <EmptyState
              icon="wrench"
              title="ไม่พบใบงานตามเงื่อนไข"
              description="ลองปรับตัวกรอง คำค้น หรือช่วงวันที่"
              action={isFiltered ? { label: "ล้างตัวกรอง", onClick: resetFilters } : undefined}
            />
          ) : (
            <EmptyState
              icon="wrench"
              title="ยังไม่มีใบงานซ่อม"
              description="เปิดใบงานเมื่อมีรถเข้าซ่อม เพื่อบันทึกอาการและเช็กระยะ"
            />
          )
        }
      />

      <JobDrawer
        job={selected}
        canManage={canManage}
        action={action}
        lineOptions={lineOptions}
        lineAction={lineAction}
        removeLineAction={removeLineAction}
        onClose={() => setSelected(null)}
        onAdvanced={() => setSelected(null)}
      />

      {canManage && createAction && createOptions && (
        <CreateJobModal open={creating} options={createOptions} action={createAction} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}

function CreateJobModal({
  open,
  options,
  action,
  onClose,
}: {
  open: boolean;
  options: ServiceCreateOptions;
  action: (formData: FormData) => Promise<ServiceActionResult>;
  onClose: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [engineNo, setEngineNo] = useState("");
  const [frameNo, setFrameNo] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [odometer, setOdometer] = useState("");
  const [symptom, setSymptom] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = unitId !== "" || engineNo.trim() !== "";

  function selectUnit(id: string) {
    setUnitId(id);
    const u = options.units.find((x) => x.id === id);
    if (u) {
      setEngineNo(u.engineNo);
      setFrameNo(u.frameNo);
    }
  }

  function reset() {
    setCustomerId("");
    setUnitId("");
    setEngineNo("");
    setFrameNo("");
    setServiceType(SERVICE_TYPES[0]);
    setOdometer("");
    setSymptom("");
    setTechnicianId("");
    setError(null);
  }

  async function submit() {
    if (!canSubmit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("customer_id", customerId);
    fd.set("unit_id", unitId);
    fd.set("engine_no", engineNo);
    fd.set("frame_no", frameNo);
    fd.set("service_type", serviceType);
    fd.set("odometer_km", odometer);
    fd.set("symptom", symptom);
    fd.set("technician_id", technicianId);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      reset();
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="เปิดใบงานซ่อม">
      <div className="flex flex-col gap-3">
        <Field label="ลูกค้า (ถ้ามี)">
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
            <option value="">— ลูกค้าทั่วไป / วอล์กอิน —</option>
            {options.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="รถในร้าน (ถ้ามี — เลือกแล้วเติมเลขเครื่องให้)">
          <select value={unitId} onChange={(e) => selectUnit(e.target.value)} className={inputCls}>
            <option value="">— รถนอก (กรอกเลขเครื่องด้านล่าง) —</option>
            {options.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="เลขเครื่อง *">
            <input value={engineNo} onChange={(e) => setEngineNo(e.target.value)} className={inputCls} />
          </Field>
          <Field label="เลขตัวถัง">
            <input value={frameNo} onChange={(e) => setFrameNo(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ประเภทงาน">
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={inputCls}>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="เลขไมล์ (กม.)">
            <input value={odometer} onChange={(e) => setOdometer(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
        </div>

        <Field label="ช่างผู้รับผิดชอบ (ถ้ามี)">
          <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className={inputCls}>
            <option value="">— ยังไม่กำหนด —</option>
            {options.technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="อาการ / รายละเอียด">
          <input value={symptom} onChange={(e) => setSymptom(e.target.value)} className={inputCls} />
        </Field>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังเปิดงาน…" : "เปิดใบงาน"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function JobDrawer({
  job,
  canManage,
  action,
  lineOptions,
  lineAction,
  removeLineAction,
  onClose,
  onAdvanced,
}: {
  job: ServiceJob | null;
  canManage: boolean;
  action: (formData: FormData) => Promise<ServiceActionResult>;
  lineOptions?: ServiceLineOptions;
  lineAction?: (formData: FormData) => Promise<ServiceActionResult>;
  removeLineAction?: (formData: FormData) => Promise<ServiceActionResult>;
  onClose: () => void;
  onAdvanced: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // แก้รายการ (FAM-1027b): เก็บรายการเป็น state ในดรอเวอร์ + อัปเดตทันที (optimistic)
  const [jobKey, setJobKey] = useState<string | null>(null);
  const [lines, setLines] = useState<ServiceLine[]>([]);
  const [addKind, setAddKind] = useState<LineKind>("labor");
  const [addPartId, setAddPartId] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addPrice, setAddPrice] = useState("");
  const [lineBusy, setLineBusy] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);
  const tmpRef = useRef(0);

  // รีเซ็ตเมื่อเปิดใบงานใหม่ (รวมถึงปิด→เปิดใบเดิม เพราะปิดแล้ว key = null) — เทียบระหว่าง render
  const currentId = job?.id ?? null;
  if (currentId !== jobKey) {
    setJobKey(currentId);
    setLines(job?.lines ?? []);
    setError(null);
    setLineError(null);
    setAddKind("labor");
    setAddPartId("");
    setAddDesc("");
    setAddQty("1");
    setAddPrice("");
  }

  const editable = canManage && !!lineAction && job?.status !== "ส่งมอบแล้ว";
  const totals = jobTotals(lines.map((l) => ({ kind: l.kind, amount: l.amount })));

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

  function selectPart(id: string) {
    setAddPartId(id);
    const p = lineOptions?.parts.find((x) => x.id === id);
    if (p) {
      setAddPrice(String(p.price));
      setAddDesc(p.name);
    }
  }

  async function addLine() {
    if (!job || !lineAction || lineBusy) {
      return;
    }
    const qtyNum = Number(addQty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setLineError("จำนวนต้องมากกว่า 0");
      return;
    }
    const part = addKind === "part" ? lineOptions?.parts.find((p) => p.id === addPartId) : undefined;
    if (addKind === "part" && !part) {
      setLineError("เลือกอะไหล่");
      return;
    }
    if (part && part.qtyOnHand < qtyNum) {
      setLineError(`สต๊อกไม่พอ — เหลือ ${part.qtyOnHand}`);
      return;
    }
    const desc = addKind === "part" ? addDesc.trim() || part!.name : addDesc.trim();
    if (addKind === "labor" && !desc) {
      setLineError("กรอกรายละเอียดค่าแรง");
      return;
    }
    const unitPrice = addKind === "part" && addPrice.trim() === "" ? part!.price : Number(addPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setLineError("ราคาต่อหน่วยไม่ถูกต้อง");
      return;
    }

    setLineBusy(true);
    setLineError(null);
    const fd = new FormData();
    fd.set("job_id", job.id);
    fd.set("kind", addKind);
    fd.set("part_id", addKind === "part" ? addPartId : "");
    fd.set("description", desc);
    fd.set("qty", String(qtyNum));
    fd.set("unit_price", String(unitPrice));
    const res = await lineAction(fd);
    setLineBusy(false);
    if (!res.ok) {
      setLineError(res.error);
      return;
    }
    setLines((prev) => [
      ...prev,
      { id: `tmp-${(tmpRef.current += 1)}`, kind: addKind, description: desc, qty: qtyNum, unitPrice, amount: lineAmount(qtyNum, unitPrice) },
    ]);
    setAddPartId("");
    setAddDesc("");
    setAddQty("1");
    setAddPrice("");
  }

  async function removeLine(lineId: string) {
    if (!job || !removeLineAction || lineBusy) {
      return;
    }
    setLineBusy(true);
    setLineError(null);
    const fd = new FormData();
    fd.set("line_id", lineId);
    fd.set("job_id", job.id);
    const res = await removeLineAction(fd);
    setLineBusy(false);
    if (!res.ok) {
      setLineError(res.error);
      return;
    }
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }

  const nexts = job ? nextStatuses(job.status) : [];
  const canAdd = addKind === "part" ? addPartId !== "" : addDesc.trim() !== "";

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

          <div>
            <p className="mb-1 font-medium text-ink">รายการ</p>
            {lines.length === 0 ? (
              <p className="text-muted">ยังไม่มีรายการ</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {lines.map((ln) => {
                  const canRemove = editable && !!removeLineAction && !ln.id.startsWith("tmp-");
                  return (
                    <li key={ln.id} className="flex items-center justify-between gap-3 border-b border-hairline-2 pb-1 last:border-0">
                      <span className="min-w-0 truncate text-ink-soft">
                        <span className="text-muted">{ln.kind === "labor" ? "ค่าแรง" : "อะไหล่"}</span> · {ln.description}
                        {ln.qty > 1 ? ` ×${ln.qty}` : ""}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Money value={ln.amount} />
                        {canRemove && (
                          <button
                            type="button"
                            aria-label="ลบรายการ"
                            disabled={lineBusy}
                            onClick={() => removeLine(ln.id)}
                            className="rounded-full px-2 text-muted hover:text-accent disabled:opacity-50"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {editable && lineOptions && (
            <div className="rounded-[12px] border border-hairline p-3">
              <p className="mb-2 font-medium text-ink">เพิ่มรายการ</p>
              <div className="mb-3">
                <Chips
                  value={addKind}
                  onChange={(k) => {
                    setAddKind(k);
                    setAddPartId("");
                    setAddDesc("");
                    setAddPrice("");
                    setLineError(null);
                  }}
                  options={[
                    { value: "labor" as LineKind, label: "ค่าแรง" },
                    { value: "part" as LineKind, label: "อะไหล่" },
                  ]}
                />
              </div>

              {addKind === "part" ? (
                <Field label="อะไหล่ (ตัดสต๊อกอัตโนมัติ)">
                  <select value={addPartId} onChange={(e) => selectPart(e.target.value)} className={inputCls}>
                    <option value="">— เลือกอะไหล่ —</option>
                    {lineOptions.parts.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.qtyOnHand <= 0}>
                        {p.name} · เหลือ {p.qtyOnHand} · {formatBaht(p.price)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="รายละเอียดค่าแรง">
                  <input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} className={inputCls} />
                </Field>
              )}

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="จำนวน">
                  <input value={addQty} onChange={(e) => setAddQty(e.target.value)} inputMode="numeric" className={inputCls} />
                </Field>
                <Field label="ราคา/หน่วย">
                  <input value={addPrice} onChange={(e) => setAddPrice(e.target.value)} inputMode="numeric" className={inputCls} />
                </Field>
              </div>

              {lineError && <div className="mt-2"><StatusBadge variant="bad">{lineError}</StatusBadge></div>}

              <button
                type="button"
                disabled={!canAdd || lineBusy}
                onClick={addLine}
                className="mt-3 w-full rounded-[24px] border border-hairline py-2.5 text-sm font-medium text-ink disabled:opacity-50"
              >
                {lineBusy ? "กำลังบันทึก…" : "+ เพิ่มรายการ"}
              </button>
            </div>
          )}

          <div className="rounded-[12px] bg-paper p-3">
            <Row label="ค่าแรง"><Money value={totals.laborCost} /></Row>
            <Row label="ค่าอะไหล่"><Money value={totals.partsCost} /></Row>
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-hairline pt-2">
              <span className="font-semibold text-ink">ยอดชำระ</span>
              <span className="font-semibold text-ink"><Money value={totals.total} /></span>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink-soft">
      {label}
      {children}
    </label>
  );
}
