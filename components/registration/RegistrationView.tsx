"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import { phaseVariant, PLATE_WARN_DAYS, type PlateActionResult, type PlatePhase, type PlateRow, type StaffOption } from "@/lib/registration/plate";

const PHASES: PlatePhase[] = ["รอยื่นขนส่ง", "รอเล่มทะเบียน", "ได้ป้ายแล้ว"];
const selectClass = "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export function RegistrationView({
  queue,
  staff,
  today,
  recordSubmissionAction,
  recordPlateAction,
  recordDeliveryAction,
}: {
  queue: PlateRow[];
  staff: StaffOption[];
  today: string;
  recordSubmissionAction: (formData: FormData) => Promise<PlateActionResult>;
  recordPlateAction: (formData: FormData) => Promise<PlateActionResult>;
  recordDeliveryAction: (formData: FormData) => Promise<PlateActionResult>;
}) {
  const [search, setSearch] = useState("");
  const [phase, setPhase] = useState<"all" | PlatePhase>("all");
  const [submitting, setSubmitting] = useState<PlateRow | null>(null);
  const [receiving, setReceiving] = useState<PlateRow | null>(null);
  const [delivering, setDelivering] = useState<PlateRow | null>(null);

  const counts = useMemo(() => {
    const c: Record<PlatePhase, number> = { รอยื่นขนส่ง: 0, รอเล่มทะเบียน: 0, ได้ป้ายแล้ว: 0 };
    for (const r of queue) {
      c[r.phase] += 1;
    }
    return c;
  }, [queue]);

  const q = search.trim().toLowerCase();
  const rows = queue.filter((r) => {
    if (phase !== "all" && r.phase !== phase) {
      return false;
    }
    return q === "" || `${r.vehicle} ${r.frameNo} ${r.customerName} ${r.plateNo ?? ""} ${r.dltRequestNo ?? ""}`.toLowerCase().includes(q);
  });

  const columns: Column<PlateRow>[] = [
    {
      key: "vehicle",
      header: "รถ / เลขตัวถัง",
      primary: true,
      render: (r) => (
        <span>
          {r.vehicle}
          {r.frameNo ? <span className="ml-1 font-mono text-[11px] text-muted">{r.frameNo}</span> : null}
        </span>
      ),
    },
    {
      key: "customer",
      header: "ลูกค้า / บริษัท",
      render: (r) => (
        <span className="text-ink-soft">
          {r.customerName} <span className="text-muted">· {r.branch}</span>
        </span>
      ),
    },
    {
      key: "phase",
      header: "สถานะ / อายุ",
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <StatusBadge variant={phaseVariant(r.phase, r.ageDays, PLATE_WARN_DAYS)}>{r.phase}</StatusBadge>
          <span className={r.ageDays >= PLATE_WARN_DAYS && r.phase !== "ได้ป้ายแล้ว" ? "text-xs text-accent" : "text-xs text-muted"}>
            {r.ageDays} วัน{r.ageDays >= PLATE_WARN_DAYS && r.phase !== "ได้ป้ายแล้ว" ? " ⚠️" : ""}
          </span>
        </span>
      ),
    },
    {
      key: "ref",
      header: "คำขอ / ทะเบียน",
      render: (r) =>
        r.plateNo ? (
          <span className="font-mono text-xs text-ink">{r.plateNo}</span>
        ) : r.dltRequestNo ? (
          <span className="text-xs text-ink-soft">
            คำขอ <span className="font-mono">{r.dltRequestNo}</span>
            {r.dltSubmittedAt ? <span className="text-muted"> · {formatThaiDate(r.dltSubmittedAt)}</span> : null}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (r) => {
        if (r.phase === "รอยื่นขนส่ง") {
          return <RowButton onClick={() => setSubmitting(r)}>บันทึกเลขคำขอ</RowButton>;
        }
        if (r.phase === "รอเล่มทะเบียน") {
          return <RowButton onClick={() => setReceiving(r)}>รับเล่มแล้ว</RowButton>;
        }
        return <RowButton onClick={() => setDelivering(r)}>ส่งมอบ</RowButton>;
      },
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>คิวงานทะเบียน {queue.length} รายการ</span>
        <span className="text-hairline">·</span>
        <span>รอยื่น {counts["รอยื่นขนส่ง"]}</span>
        <span>รอเล่ม {counts["รอเล่มทะเบียน"]}</span>
        <span>ได้ป้าย {counts["ได้ป้ายแล้ว"]}</span>
      </div>

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} รายการ`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหารถ / ลูกค้า / ทะเบียน"
            placeholder="ค้นรถ / ลูกค้า / เลขทะเบียน"
            className={`${selectClass} w-full sm:w-56`}
          />
          <Chips
            value={phase}
            onChange={setPhase}
            options={[{ value: "all", label: "ทั้งหมด" }, ...PHASES.map((p) => ({ value: p, label: p }))]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.regId}
        empty={
          <EmptyState
            icon="file"
            title={queue.length ? "ไม่พบงานตามเงื่อนไข" : "ไม่มีงานทะเบียนค้าง"}
            description={queue.length ? "ลองปรับคำค้นหรือตัวกรอง" : "ดีลจะเข้าคิวนี้อัตโนมัติเมื่อถึงขั้น “รอทะเบียน”"}
          />
        }
      />

      {submitting && <DltSubmitModal key={submitting.regId} row={submitting} action={recordSubmissionAction} onClose={() => setSubmitting(null)} />}
      {receiving && <PlateReceivedModal key={receiving.regId} row={receiving} action={recordPlateAction} onClose={() => setReceiving(null)} />}
      {delivering && (
        <DeliveryModal key={delivering.regId} row={delivering} staff={staff} today={today} action={recordDeliveryAction} onClose={() => setDelivering(null)} />
      )}
    </div>
  );
}

function RowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[20px] border border-hairline px-3 py-1 text-xs text-ink-soft transition-transform active:scale-[0.97] hover:text-ink"
    >
      {children}
    </button>
  );
}

function DltSubmitModal({ row, action, onClose }: { row: PlateRow; action: (formData: FormData) => Promise<PlateActionResult>; onClose: () => void }) {
  const router = useRouter();
  const [requestNo, setRequestNo] = useState(row.dltRequestNo ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("reg_id", row.regId);
    fd.set("request_no", requestNo);
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
    <Modal open onClose={onClose} title="บันทึกการยื่นกรมขนส่ง">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">
          {row.vehicle} · <span className="text-muted">{row.customerName}</span>
        </p>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          เลขคำขอจดทะเบียน
          <input
            value={requestNo}
            onChange={(e) => setRequestNo(e.target.value)}
            placeholder="เช่น 6512345"
            className={selectClass}
            autoFocus
          />
        </label>
        {error && <StatusBadge variant="bad">{error}</StatusBadge>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ปิด
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || requestNo.trim() === ""}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกการยื่น"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PlateReceivedModal({ row, action, onClose }: { row: PlateRow; action: (formData: FormData) => Promise<PlateActionResult>; onClose: () => void }) {
  const router = useRouter();
  const [plateNo, setPlateNo] = useState(row.plateNo ?? "");
  const [bookNo, setBookNo] = useState(row.bookNo ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("reg_id", row.regId);
    fd.set("plate_no", plateNo);
    fd.set("book_no", bookNo);
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
    <Modal open onClose={onClose} title="รับเล่ม / ป้ายทะเบียน">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">
          {row.vehicle} · <span className="text-muted">{row.customerName}</span>
        </p>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          เลขทะเบียน
          <input value={plateNo} onChange={(e) => setPlateNo(e.target.value)} placeholder="เช่น 1กก 1234 ปทุมธานี" className={selectClass} autoFocus />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          เลขเล่มทะเบียน (ถ้ามี)
          <input value={bookNo} onChange={(e) => setBookNo(e.target.value)} placeholder="เลขเล่ม" className={selectClass} />
        </label>
        <p className="text-xs text-muted">บันทึกแล้วดีลจะเลื่อนไปขั้น “ป้ายขาว” อัตโนมัติ</p>
        {error && <StatusBadge variant="bad">{error}</StatusBadge>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ปิด
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || plateNo.trim() === ""}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกรับเล่ม/ป้าย"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DeliveryModal({
  row,
  staff,
  today,
  action,
  onClose,
}: {
  row: PlateRow;
  staff: StaffOption[];
  today: string;
  action: (formData: FormData) => Promise<PlateActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [deliveredAt, setDeliveredAt] = useState(today);
  const [place, setPlace] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("reg_id", row.regId);
    fd.set("delivered_at", deliveredAt);
    fd.set("delivery_place", place);
    fd.set("delivered_by", deliveredBy);
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
    <Modal open onClose={onClose} title="ส่งมอบรถ">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">
          {row.vehicle} · <span className="text-muted">{row.customerName}</span>
          {row.plateNo ? <span className="ml-1 font-mono text-xs text-ink">· {row.plateNo}</span> : null}
        </p>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          วันที่ส่งมอบ
          <input type="date" value={deliveredAt} onChange={(e) => setDeliveredAt(e.target.value)} className={selectClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          สถานที่ส่งมอบ (ถ้ามี)
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="เช่น หน้าร้าน สาขาปทุมฯ / บ้านลูกค้า" className={selectClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          ผู้ส่งมอบ (ถ้ามี)
          <select value={deliveredBy} onChange={(e) => setDeliveredBy(e.target.value)} className={selectClass}>
            <option value="">— เลือกพนักงาน —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted">บันทึกแล้วดีลจะปิดเป็น “ส่งมอบแล้ว”</p>
        {error && <StatusBadge variant="bad">{error}</StatusBadge>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ปิด
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || deliveredAt === ""}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "ยืนยันส่งมอบ"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
