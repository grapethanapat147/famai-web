"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import {
  directionOf,
  filterTransfers,
  statusVariant,
  transferCounts,
  TRANSFER_STATUS_LABEL,
  type Transfer,
  type TransferActionResult,
  type TransferStatus,
  sameCompany,
} from "@/lib/transfer/transfers";

export type TransferUnit = { id: string; vehicle: string; engineNo: string; branchName: string; branchId: string; companyId: string | null };
export type TransferBranch = { id: string; name: string; companyId: string | null };

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";
const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

export function TransferView({
  transfers,
  units,
  branches,
  myBranchIds,
  canManage,
  requestAction,
  receiveAction,
  cancelAction,
}: {
  transfers: Transfer[];
  units: TransferUnit[];
  branches: TransferBranch[];
  myBranchIds: string[];
  canManage: boolean;
  requestAction: (formData: FormData) => Promise<TransferActionResult>;
  receiveAction: (formData: FormData) => Promise<TransferActionResult>;
  cancelAction: (formData: FormData) => Promise<TransferActionResult>;
}) {
  const [status, setStatus] = useState<TransferStatus | "all">("in_transit");
  const [direction, setDirection] = useState<"all" | "in" | "out">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Transfer | null>(null);
  const [requesting, setRequesting] = useState(false);

  const counts = transferCounts(transfers, myBranchIds);
  const rows = filterTransfers(transfers, { status, direction, search, myBranchIds });

  const isFiltered = status !== "all" || direction !== "all" || search.trim() !== "";
  function resetFilters() {
    setStatus("all");
    setDirection("all");
    setSearch("");
  }

  const columns: Column<Transfer>[] = [
    {
      key: "unit",
      header: "รถ",
      primary: true,
      render: (t) => (
        <span>
          {t.vehicle} · <span className="font-mono text-xs text-muted">{t.engineNo}</span>
        </span>
      ),
    },
    {
      key: "route",
      header: "ต้นทาง → ปลายทาง",
      render: (t) => (
        <span className="text-ink-soft">
          {t.fromBranch} <span className="text-muted">→</span> {t.toBranch}
        </span>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (t) => <StatusBadge variant={statusVariant(t.status)}>{TRANSFER_STATUS_LABEL[t.status]}</StatusBadge>,
    },
    { key: "date", header: "วันที่ขอ", render: (t) => <span className="text-ink-soft">{formatThaiDate(t.requestedAt)}</span> },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Stat label="กำลังโอน" value={counts.inTransit} />
          <Stat label="รอรับ (บริษัทฉัน)" value={counts.incoming} accent={counts.incoming > 0} />
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setRequesting(true)}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.99]"
          >
            + ขอโอนรถ
          </button>
        )}
      </div>

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} รายการ`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหารถ / เลขเครื่อง / บริษัท"
            placeholder="ค้นรถ / เลขเครื่อง / บริษัท"
            className={`${selectClass} w-full sm:w-56`}
          />
          <Chips
            value={direction}
            onChange={setDirection}
            options={[
              { value: "all", label: "ทุกทิศ" },
              { value: "in", label: "ขาเข้า" },
              { value: "out", label: "ขาออก" },
            ]}
          />
          <Chips
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "ทุกสถานะ" },
              { value: "in_transit", label: "กำลังโอน" },
              { value: "received", label: "รับแล้ว" },
              { value: "cancelled", label: "ยกเลิก" },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(t) => t.id}
        onRowClick={setSelected}
        empty={
          transfers.length > 0 ? (
            <EmptyState
              icon="repeat"
              title="ไม่พบรายการโอนตามเงื่อนไข"
              description="ลองปรับสถานะ ทิศทาง หรือคำค้น"
              action={isFiltered ? { label: "ล้างตัวกรอง", onClick: resetFilters } : undefined}
            />
          ) : (
            <EmptyState
              icon="repeat"
              title="ยังไม่มีรายการโอน"
              description="สร้างคำขอโอนเมื่อต้องย้ายรถระหว่างบริษัท"
            />
          )
        }
      />

      <TransferDrawer
        transfer={selected}
        myBranchIds={myBranchIds}
        canManage={canManage}
        receiveAction={receiveAction}
        cancelAction={cancelAction}
        onClose={() => setSelected(null)}
        onDone={() => setSelected(null)}
      />

      {canManage && (
        <RequestModal
          open={requesting}
          units={units}
          branches={branches}
          action={requestAction}
          onClose={() => setRequesting(false)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-[10px] border border-hairline bg-card px-3 py-2">
      <span className="text-xs text-muted">{label} </span>
      <span className={`tabular font-semibold ${accent ? "text-accent" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function TransferDrawer({
  transfer,
  myBranchIds,
  canManage,
  receiveAction,
  cancelAction,
  onClose,
  onDone,
}: {
  transfer: Transfer | null;
  myBranchIds: string[];
  canManage: boolean;
  receiveAction: (formData: FormData) => Promise<TransferActionResult>;
  cancelAction: (formData: FormData) => Promise<TransferActionResult>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: (fd: FormData) => Promise<TransferActionResult>) {
    if (!transfer || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("transfer_id", transfer.id);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      onDone();
    } else {
      setError(res.error);
    }
  }

  const dir = transfer ? directionOf(transfer, myBranchIds) : "other";
  const canReceive = canManage && transfer?.status === "in_transit" && (dir === "in" || dir === "both");
  const canCancel = canManage && transfer?.status === "in_transit" && (dir === "out" || dir === "both");

  return (
    <Drawer open={transfer !== null} onClose={onClose} title={transfer ? transfer.vehicle : ""}>
      {transfer && (
        <div className="flex flex-col gap-4 text-sm">
          <StatusBadge variant={statusVariant(transfer.status)}>{TRANSFER_STATUS_LABEL[transfer.status]}</StatusBadge>
          <dl className="flex flex-col gap-2">
            <Row label="เลขเครื่อง"><span className="font-mono">{transfer.engineNo}</span></Row>
            <Row label="บริษัทต้นทาง">{transfer.fromBranch}</Row>
            <Row label="บริษัทปลายทาง">{transfer.toBranch}</Row>
            <Row label="วันที่ขอโอน">{formatThaiDate(transfer.requestedAt)}</Row>
            {transfer.receivedAt && <Row label="วันที่รับ">{formatThaiDate(transfer.receivedAt)}</Row>}
            {transfer.note && <Row label="หมายเหตุ">{transfer.note}</Row>}
          </dl>

          {error && <StatusBadge variant="bad">{error}</StatusBadge>}

          {canReceive && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(receiveAction)}
              className="rounded-[24px] bg-accent py-3 text-sm font-medium text-card disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก…" : "รับรถเข้าบริษัท"}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(cancelAction)}
              className="rounded-[24px] border border-hairline py-2.5 text-sm text-accent disabled:opacity-50"
            >
              ยกเลิกการโอน
            </button>
          )}
        </div>
      )}
    </Drawer>
  );
}

function RequestModal({
  open,
  units,
  branches,
  action,
  onClose,
}: {
  open: boolean;
  units: TransferUnit[];
  branches: TransferBranch[];
  action: (formData: FormData) => Promise<TransferActionResult>;
  onClose: () => void;
}) {
  const [unitId, setUnitId] = useState("");
  const [toBranch, setToBranch] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUnit = units.find((u) => u.id === unitId) ?? null;
  const crossCompanyExists =
    selectedUnit != null && branches.some((b) => b.id !== selectedUnit.branchId && !sameCompany(selectedUnit.companyId, b.companyId));
  const canSubmit = unitId !== "" && toBranch !== "";

  async function submit() {
    if (!canSubmit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("unit_id", unitId);
    fd.set("to_branch", toBranch);
    fd.set("note", note);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setUnitId("");
      setToBranch("");
      setNote("");
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="ขอโอนรถไปบริษัทอื่น">
      <div className="flex flex-col gap-3">
        <Field label="เลือกรถ (เฉพาะที่ว่าง)">
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputCls}>
            <option value="">— เลือกรถ —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.vehicle} · {u.engineNo} ({u.branchName})
              </option>
            ))}
          </select>
        </Field>
        <Field label="บริษัทปลายทาง">
          <select value={toBranch} onChange={(e) => setToBranch(e.target.value)} className={inputCls}>
            <option value="">— เลือกบริษัท —</option>
            {branches.map((b) => {
              const crossCompany = selectedUnit != null && b.id !== selectedUnit.branchId && !sameCompany(selectedUnit.companyId, b.companyId);
              return (
                <option key={b.id} value={b.id} disabled={crossCompany || b.id === selectedUnit?.branchId}>
                  {b.name}
                  {crossCompany ? " — คนละนิติบุคคล (ต้องขายส่งแทน)" : b.id === selectedUnit?.branchId ? " — ต้นทางเอง" : ""}
                </option>
              );
            })}
          </select>
        </Field>
        {selectedUnit && crossCompanyExists && (
          <p className="rounded-[10px] bg-paper px-3 py-2 text-xs text-ink-soft">
            บริษัทที่อยู่คนละนิติบุคคลกับรถคันนี้ถูกปิดไว้ — การย้ายข้ามบริษัทถือเป็นการขาย ต้องเปิดบิลที่หน้า{" "}
            <Link href="/wholesale" className="text-accent hover:underline">
              ขายส่ง (B2B)
            </Link>
          </p>
        )}
        <Field label="หมายเหตุ (ถ้ามี)">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
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
            {busy ? "กำลังบันทึก…" : "ขอโอน"}
          </button>
        </div>
      </div>
    </Modal>
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
