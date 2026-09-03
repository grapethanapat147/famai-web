"use client";

import { useState, type ReactNode } from "react";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AttachmentPanel } from "@/components/attachments/AttachmentPanel";
import type { AttachmentActionResult, AttachmentRow } from "@/lib/attachments/attachments";
import { formatThaiDate } from "@/lib/format";
import {
  expenseTotals,
  filterExpenses,
  isExpenseApproved,
  type ExpenseActionResult,
  type ExpenseRow,
} from "@/lib/expense/expenses";

export type ExpenseCategoryOption = { id: string; name: string };
export type AttachmentActions = {
  add: (formData: FormData) => Promise<AttachmentActionResult>;
  remove: (formData: FormData) => Promise<AttachmentActionResult>;
  url: (formData: FormData) => Promise<AttachmentActionResult>;
};

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";
const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

export function ExpenseView({
  expenses,
  categories,
  canManage,
  canSeeMoney,
  today,
  action,
  canApprove = false,
  approveAction,
  revokeAction,
  attachments = {},
  canAttach = false,
  canDeleteAttachments = false,
  currentUserId = null,
  attachmentActions,
}: {
  expenses: ExpenseRow[];
  categories: ExpenseCategoryOption[];
  canManage: boolean;
  canSeeMoney: boolean;
  today: string;
  action: (formData: FormData) => Promise<ExpenseActionResult>;
  canApprove?: boolean;
  approveAction?: (formData: FormData) => Promise<ExpenseActionResult>;
  revokeAction?: (formData: FormData) => Promise<ExpenseActionResult>;
  /** ไฟล์แนบใบเสร็จ แยกตาม expense id (FAM-1134 · fixlist ข้อ 09) */
  attachments?: Record<string, AttachmentRow[]>;
  canAttach?: boolean;
  canDeleteAttachments?: boolean;
  currentUserId?: string | null;
  attachmentActions?: AttachmentActions;
}) {
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<ExpenseRow | null>(null);

  const rows = filterExpenses(expenses, { categoryId, search, fromDate, onlyMissingReceipt: onlyMissing });

  const isFiltered = categoryId !== "all" || search.trim() !== "" || fromDate !== "" || onlyMissing;
  function resetFilters() {
    setCategoryId("all");
    setSearch("");
    setFromDate("");
    setOnlyMissing(false);
  }
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
    {
      key: "status",
      header: "สถานะ",
      render: (e) =>
        isExpenseApproved(e) ? <StatusBadge variant="good">อนุมัติแล้ว</StatusBadge> : <StatusBadge variant="warn">รออนุมัติ</StatusBadge>,
    },
    { key: "amount", header: "จำนวนเงิน", align: "right", render: (e) => <Money value={e.amount} canSee={canSeeMoney} /> },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="รวม" value={<Money value={totals.total} canSee={canSeeMoney} />} />
          <Stat label="จำนวน" value={<span className="tabular">{totals.count}</span>} />
          <Stat label="รออนุมัติ" value={<Money value={totals.pendingAmount} canSee={canSeeMoney} />} accent={totals.pendingCount > 0} />
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
            aria-label="ค้นหาร้าน / หมวด / หมายเหตุ"
            placeholder="ค้นร้าน / หมวด / หมายเหตุ"
            className={`${selectClass} w-full sm:w-52`}
          />
          <select aria-label="กรองตามหมวด" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={selectClass}>
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

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        onRowClick={setSelected}
        empty={
          expenses.length > 0 ? (
            <EmptyState
              icon="files"
              title="ไม่พบค่าใช้จ่ายตามเงื่อนไข"
              description="ลองปรับหมวด คำค้น ช่วงวันที่ หรือตัวกรองใบเสร็จ"
              action={isFiltered ? { label: "ล้างตัวกรอง", onClick: resetFilters } : undefined}
            />
          ) : (
            <EmptyState icon="files" title="ยังไม่มีค่าใช้จ่าย" description="บันทึกรายจ่ายพร้อมแนบใบเสร็จเพื่อคุมงบประมาณ" />
          )
        }
      />

      {canManage && (
        <AddExpenseModal open={adding} categories={categories} today={today} action={action} onClose={() => setAdding(false)} />
      )}

      <ExpenseDetailModal
        expense={selected}
        attachments={selected ? (attachments[selected.id] ?? []) : []}
        canAttach={canAttach}
        canDeleteAttachments={canDeleteAttachments}
        currentUserId={currentUserId}
        attachmentActions={attachmentActions}
        canSeeMoney={canSeeMoney}
        canApprove={canApprove}
        approveAction={approveAction}
        revokeAction={revokeAction}
        onClose={() => setSelected(null)}
        onDone={() => setSelected(null)}
      />
    </div>
  );
}

function ExpenseDetailModal({
  expense,
  attachments,
  canAttach,
  canDeleteAttachments,
  currentUserId,
  attachmentActions,
  canSeeMoney,
  canApprove,
  approveAction,
  revokeAction,
  onClose,
  onDone,
}: {
  expense: ExpenseRow | null;
  attachments: AttachmentRow[];
  canAttach: boolean;
  canDeleteAttachments: boolean;
  currentUserId: string | null;
  attachmentActions?: AttachmentActions;
  canSeeMoney: boolean;
  canApprove: boolean;
  approveAction?: (formData: FormData) => Promise<ExpenseActionResult>;
  revokeAction?: (formData: FormData) => Promise<ExpenseActionResult>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  // รีเซ็ต error เมื่อเปิดรายการใหม่ (เทียบ id ระหว่าง render)
  if (expense && expense.id !== current) {
    setCurrent(expense.id);
    setError(null);
  }

  async function run(fn: ((formData: FormData) => Promise<ExpenseActionResult>) | undefined) {
    if (!expense || !fn || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("expense_id", expense.id);
    const res = await fn(fd);
    setBusy(false);
    if (res.ok) {
      onDone();
    } else {
      setError(res.error);
    }
  }

  const approved = expense ? isExpenseApproved(expense) : false;

  return (
    <Modal open={expense !== null} onClose={onClose} title="รายละเอียดค่าใช้จ่าย">
      {expense && (
        <div className="flex flex-col gap-3 text-sm">
          <Row label="หมวด">{expense.categoryName}</Row>
          <Row label="ซื้อกับใคร">{expense.vendor || "—"}</Row>
          <Row label="จำนวนเงิน"><Money value={expense.amount} canSee={canSeeMoney} /></Row>
          <Row label="วันที่จ่าย">{formatThaiDate(expense.spentAt)}</Row>
          <Row label="เลขใบกำกับภาษี">{expense.taxInvoiceNo || "—"}</Row>
          <Row label="ใบเสร็จ">{expense.hasReceipt ? "มี" : <StatusBadge variant="warn">ใบเสร็จหาย</StatusBadge>}</Row>
          {expense.note && <Row label="หมายเหตุ">{expense.note}</Row>}
          <Row label="ผู้บันทึก">{expense.createdByName || "—"}</Row>
          <Row label="สถานะ">
            {approved ? (
              <StatusBadge variant="good">อนุมัติแล้ว{expense.approvedByName ? ` · ${expense.approvedByName}` : ""}</StatusBadge>
            ) : (
              <StatusBadge variant="warn">รออนุมัติ</StatusBadge>
            )}
          </Row>

          <AttachmentPanel
            ownerTable="expense"
            ownerId={expense.id}
            items={attachments}
            canManage={canAttach}
            canDeleteAny={canDeleteAttachments}
            currentUserId={currentUserId}
            addAction={attachmentActions?.add}
            removeAction={attachmentActions?.remove}
            urlAction={attachmentActions?.url}
          />

          {error && <StatusBadge variant="bad">{error}</StatusBadge>}

          {canApprove && !approved && approveAction && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(approveAction)}
              className="mt-1 w-full rounded-[24px] bg-accent py-3 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? "กำลังอนุมัติ…" : "อนุมัติค่าใช้จ่าย"}
            </button>
          )}
          {canApprove && approved && revokeAction && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(revokeAction)}
              className="mt-1 w-full rounded-[24px] border border-hairline py-2.5 text-sm text-ink-soft disabled:opacity-50"
            >
              {busy ? "กำลังถอน…" : "ถอนอนุมัติ"}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-ink">{children}</span>
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
