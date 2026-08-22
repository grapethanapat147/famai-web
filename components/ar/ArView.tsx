"use client";

import { useState, type ReactNode } from "react";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import {
  arTotals,
  clampPayment,
  filterReceivables,
  isOverdue,
  isSettled,
  kindLabel,
  PAYMENT_METHODS,
  type ArActionResult,
  type Receivable,
} from "@/lib/ar/receivables";

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink tabular";
const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export function ArView({
  receivables,
  canManage,
  canSeeMoney,
  today,
  action,
}: {
  receivables: Receivable[];
  canManage: boolean;
  canSeeMoney: boolean;
  today: string;
  action: (formData: FormData) => Promise<ArActionResult>;
}) {
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [paying, setPaying] = useState<Receivable | null>(null);

  const totals = arTotals(receivables, today);
  const rows = filterReceivables(receivables, { kind, search, onlyOpen, onlyOverdue, today });

  const isFiltered = kind !== "all" || search.trim() !== "" || onlyOverdue;
  function resetFilters() {
    setKind("all");
    setSearch("");
    setOnlyOverdue(false);
  }

  const columns: Column<Receivable>[] = [
    {
      key: "payer",
      header: "ผู้ค้าง / รถ",
      primary: true,
      render: (r) => (
        <span>
          <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[11px] text-muted">{kindLabel(r.kind)}</span>{" "}
          {r.payerName} · <span className="text-ink-soft">{r.vehicle}</span>
        </span>
      ),
    },
    { key: "due", header: "ยอดตั้ง", align: "right", render: (r) => <Money value={r.amountDue} canSee={canSeeMoney} /> },
    {
      key: "balance",
      header: "คงค้าง",
      align: "right",
      render: (r) =>
        isSettled(r) ? (
          <StatusBadge variant="good">ชำระครบ</StatusBadge>
        ) : (
          <span className={isOverdue(r, today) ? "font-semibold text-accent" : ""}>
            <Money value={r.balance} canSee={canSeeMoney} />
          </span>
        ),
    },
    {
      key: "dueAt",
      header: "กำหนด",
      render: (r) =>
        r.dueAt ? (
          isOverdue(r, today) ? (
            <StatusBadge variant="bad">เกินกำหนด {formatThaiDate(r.dueAt)}</StatusBadge>
          ) : (
            <span className="text-ink-soft">{formatThaiDate(r.dueAt)}</span>
          )
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="ค้างทั้งหมด" value={<Money value={totals.outstanding} canSee={canSeeMoney} />} hint={`${totals.openCount} รายการ`} />
        <StatCard
          label="เกินกำหนด"
          value={<Money value={totals.overdue} canSee={canSeeMoney} />}
          hint={totals.overdueCount > 0 ? `${totals.overdueCount} รายการ · ทวงถามด่วน` : "ไม่มีที่เกินกำหนด"}
          tone={totals.overdue > 0 ? "accent" : "default"}
        />
        <StatCard label="รายการค้าง" value={String(totals.openCount)} hint="รายการ" />
      </div>

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} รายการ`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นผู้ค้าง / รถ"
            className={`${selectClass} w-full sm:w-56`}
          />
          <Chips
            value={kind}
            onChange={setKind}
            options={[
              { value: "all", label: "ทุกประเภท" },
              { value: "finance", label: "ไฟแนนซ์" },
              { value: "customer", label: "ลูกค้า" },
            ]}
          />
          <Chips
            value={onlyOverdue ? "overdue" : onlyOpen ? "open" : "all"}
            onChange={(v) => {
              setOnlyOverdue(v === "overdue");
              setOnlyOpen(v !== "all");
            }}
            options={[
              { value: "open", label: "ยังค้าง" },
              { value: "overdue", label: "เกินกำหนด" },
              { value: "all", label: "ทั้งหมด" },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={canManage ? (r) => (!isSettled(r) ? setPaying(r) : undefined) : undefined}
        empty={
          receivables.length > 0 ? (
            <EmptyState
              icon="cash"
              title="ไม่พบรายการตามเงื่อนไข"
              description="ลองปรับตัวกรองหรือคำค้นใหม่"
              action={isFiltered ? { label: "ล้างตัวกรอง", onClick: resetFilters } : undefined}
            />
          ) : (
            <EmptyState
              icon="cash"
              title="ไม่มียอดค้างรับ"
              description="เก็บเงินครบทุกรายการแล้ว — ไม่มีลูกหนี้ค้างชำระ"
            />
          )
        }
      />

      {canManage && <PaymentModal receivable={paying} onClose={() => setPaying(null)} action={action} />}
    </div>
  );
}

function PaymentModal({
  receivable,
  onClose,
  action,
}: {
  receivable: Receivable | null;
  onClose: () => void;
  action: (formData: FormData) => Promise<ArActionResult>;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [refNo, setRefNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  // เติมค่าเริ่มต้น (ยอดคงค้าง) เมื่อเปิด modal ของรายการใหม่
  if (receivable && receivable.id !== current) {
    setCurrent(receivable.id);
    setAmount(String(receivable.balance));
    setMethod(PAYMENT_METHODS[0]);
    setRefNo("");
    setError(null);
  }

  const amt = Number(amount);
  const overpay = receivable ? amt > receivable.balance + 0.001 : false;
  const canSubmit = Boolean(receivable) && Number.isFinite(amt) && amt > 0 && !overpay;

  async function submit() {
    if (!receivable || !canSubmit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("receivable_id", receivable.id);
    fd.set("amount", String(clampPayment(amt, receivable.balance)));
    fd.set("method", method);
    fd.set("ref_no", refNo);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={receivable !== null} onClose={onClose} title={receivable ? `ลงรับเงิน — ${receivable.payerName}` : ""}>
      {receivable && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-[10px] bg-paper px-3 py-2 text-sm">
            <span className="text-muted">ยอดคงค้าง</span>
            <span className="font-semibold text-ink"><Money value={receivable.balance} /></span>
          </div>
          <Field label="จำนวนเงินที่รับ">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="วิธีรับ">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="เลขอ้างอิง (ถ้ามี)">
              <input value={refNo} onChange={(e) => setRefNo(e.target.value)} className={inputCls} />
            </Field>
          </div>

          {overpay && <StatusBadge variant="bad">รับเกินยอดค้าง</StatusBadge>}
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
              {busy ? "กำลังบันทึก…" : "บันทึกรับเงิน"}
            </button>
          </div>
        </div>
      )}
    </Modal>
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
