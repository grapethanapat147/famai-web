"use client";

import { useState, type ReactNode } from "react";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import {
  expenseTotals,
  filterExpenses,
  type ExpenseActionResult,
  type ExpenseRow,
} from "@/lib/expense/expenses";

export type ExpenseCategoryOption = { id: string; name: string };

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";
const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export function ExpenseView({
  expenses,
  categories,
  canManage,
  canSeeMoney,
  today,
  action,
}: {
  expenses: ExpenseRow[];
  categories: ExpenseCategoryOption[];
  canManage: boolean;
  canSeeMoney: boolean;
  today: string;
  action: (formData: FormData) => Promise<ExpenseActionResult>;
}) {
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [adding, setAdding] = useState(false);

  const rows = filterExpenses(expenses, { categoryId, search, fromDate, onlyMissingReceipt: onlyMissing });
  const totals = expenseTotals(rows);

  const columns: Column<ExpenseRow>[] = [
    {
      key: "date",
      header: "วันที่ / หมวด",
      primary: true,
      render: (e) => (
        <span>
          <span className="text-ink-soft">{formatThaiDate(e.spentAt)}</span> ·{" "}
          <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[11px] text-muted">{e.categoryName}</span>
        </span>
      ),
    },
    { key: "vendor", header: "ซื้อกับใคร", render: (e) => <span>{e.vendor || "—"}</span> },
    {
      key: "receipt",
      header: "ใบเสร็จ",
      render: (e) => (e.hasReceipt ? <span className="text-muted">มี</span> : <StatusBadge variant="warn">ใบเสร็จหาย</StatusBadge>),
    },
    { key: "amount", header: "จำนวนเงิน", align: "right", render: (e) => <Money value={e.amount} canSee={canSeeMoney} /> },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="รวม" value={<Money value={totals.total} canSee={canSeeMoney} />} />
          <Stat label="จำนวน" value={<span className="tabular">{totals.count}</span>} />
          <Stat label="ใบเสร็จหาย" value={<Money value={totals.missingReceiptAmount} canSee={canSeeMoney} />} accent={totals.missingReceiptCount > 0} />
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.99]"
          >
            + บันทึกค่าใช้จ่าย
          </button>
        )}
      </div>

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} รายการ`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นร้าน / หมวด / หมายเหตุ"
            className={`${selectClass} w-full sm:w-52`}
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass}>
            <option value="all">ทุกหมวด</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted">
            ตั้งแต่
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={selectClass} />
          </label>
          <button
            type="button"
            onClick={() => setOnlyMissing((v) => !v)}
            aria-pressed={onlyMissing}
            className={`rounded-full px-3 py-1.5 text-sm ${onlyMissing ? "bg-ink text-card" : "border border-hairline bg-card text-ink-soft"}`}
          >
            เฉพาะใบเสร็จหาย
          </button>
        </FilterBar>
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(e) => e.id} empty="ไม่มีค่าใช้จ่าย (หรือยังไม่ได้ล็อกอิน)" />

      {canManage && (
        <AddExpenseModal open={adding} categories={categories} today={today} action={action} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-[10px] border border-hairline bg-card px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className={`tabular font-semibold ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function AddExpenseModal({
  open,
  categories,
  today,
  action,
  onClose,
}: {
  open: boolean;
  categories: ExpenseCategoryOption[];
  today: string;
  action: (formData: FormData) => Promise<ExpenseActionResult>;
  onClose: () => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [spentAt, setSpentAt] = useState(today);
  const [taxNo, setTaxNo] = useState("");
  const [hasReceipt, setHasReceipt] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amt = Number(amount);
  const canSubmit = categoryId !== "" && Number.isFinite(amt) && amt > 0;

  function reset() {
    setCategoryId("");
    setAmount("");
    setVendor("");
    setSpentAt(today);
    setTaxNo("");
    setHasReceipt(true);
    setNote("");
    setError(null);
  }

  async function submit() {
    if (!canSubmit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("category_id", categoryId);
    fd.set("amount", amount);
    fd.set("vendor", vendor);
    fd.set("spent_at", spentAt);
    fd.set("tax_invoice_no", taxNo);
    fd.set("has_receipt", hasReceipt ? "true" : "false");
    fd.set("note", note);
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
    <Modal open={open} onClose={onClose} title="บันทึกค่าใช้จ่าย">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="หมวด *">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
              <option value="">— เลือกหมวด —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="จำนวนเงิน *">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
        </div>
        <Field label="ซื้อกับใคร (ร้าน/ผู้รับเงิน)">
          <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="เช่น ปตท. / Starbucks" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="วันที่จ่าย">
            <input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} className={inputCls} />
          </Field>
          <Field label="เลขใบกำกับภาษี">
            <input value={taxNo} onChange={(e) => setTaxNo(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-soft">มีใบเสร็จ</span>
          <button
            type="button"
            aria-pressed={hasReceipt}
            onClick={() => setHasReceipt((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${hasReceipt ? "bg-accent" : "bg-hairline-2"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition-transform ${hasReceipt ? "left-0.5 translate-x-5" : "left-0.5"}`} />
          </button>
        </div>
        <Field label="หมายเหตุ">
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
            {busy ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </div>
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
