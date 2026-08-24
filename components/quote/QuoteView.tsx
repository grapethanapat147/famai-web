"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBaht, formatThaiDate } from "@/lib/format";
import { financeLabel, financedAmount, optionTerms, type RateTiers } from "@/lib/quote/finance";
import {
  filterQuotes,
  isExpired,
  savedOptionsToSlots,
  type QuoteActionResult,
  type SavedQuote,
} from "@/lib/quote/quotes";
import { quotePrintColumns } from "@/lib/quote/print";
import { PrintableQuoteDoc, type QuoteSeller } from "@/components/quote/PrintableQuoteDoc";

export type QuoteVehicle = { variantId: string; code: string; name: string; retail: number };
export type QuoteFinanceCo = { id: string; name: string; ratePct: number; rateTiers?: RateTiers | null };

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";
const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

export function QuoteView({
  quotes,
  vehicles,
  financeCompanies,
  financeTerms,
  today,
  seller,
  canManage,
  action,
  updateAction,
  deleteAction,
}: {
  quotes: SavedQuote[];
  vehicles: QuoteVehicle[];
  financeCompanies: QuoteFinanceCo[];
  financeTerms: number[];
  today: string;
  seller: QuoteSeller;
  canManage: boolean;
  action: (formData: FormData) => Promise<QuoteActionResult>;
  updateAction?: (formData: FormData) => Promise<QuoteActionResult>;
  deleteAction?: (formData: FormData) => Promise<QuoteActionResult>;
}) {
  const [mode, setMode] = useState<"list" | "build">("list");
  const [editing, setEditing] = useState<SavedQuote | null>(null);

  function openNew() {
    setEditing(null);
    setMode("build");
  }

  function openQuote(q: SavedQuote) {
    setEditing(q);
    setMode("build");
  }

  if (mode === "build") {
    return (
      <QuoteBuilder
        key={editing?.id ?? "new"}
        editing={editing}
        vehicles={vehicles}
        financeCompanies={financeCompanies}
        financeTerms={financeTerms}
        today={today}
        seller={seller}
        canManage={canManage}
        action={action}
        updateAction={updateAction}
        deleteAction={deleteAction}
        onBack={() => setMode("list")}
      />
    );
  }

  return <QuoteList quotes={quotes} today={today} canManage={canManage} onNew={openNew} onOpen={openQuote} />;
}

/* ── รายการใบเสนอราคา ─────────────────────────────────────────────────── */
function QuoteList({
  quotes,
  today,
  canManage,
  onNew,
  onOpen,
}: {
  quotes: SavedQuote[];
  today: string;
  canManage: boolean;
  onNew: () => void;
  onOpen: (q: SavedQuote) => void;
}) {
  const [search, setSearch] = useState("");
  const rows = filterQuotes(quotes, search) as SavedQuote[];
  const isFiltered = search.trim() !== "";

  const columns: Column<SavedQuote>[] = [
    {
      key: "doc",
      header: "เลขที่ / ลูกค้า",
      primary: true,
      render: (q) => (
        <span>
          <span className="font-mono text-xs text-muted">{q.docNo}</span> · {q.customerName}
        </span>
      ),
    },
    { key: "date", header: "วันที่", render: (q) => <span className="text-ink-soft">{formatThaiDate(q.quoteDate)}</span> },
    { key: "opts", header: "จำนวนคัน", align: "right", render: (q) => <span className="tabular">{q.optionCount}</span> },
    {
      key: "valid",
      header: "หมดอายุ",
      render: (q) =>
        q.validUntil ? (
          isExpired(q.validUntil, today) ? (
            <StatusBadge variant="off">หมดอายุ</StatusBadge>
          ) : (
            <span className="text-ink-soft">{formatThaiDate(q.validUntil)}</span>
          )
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{rows.length} ใบ</p>
        {canManage && (
          <button
            type="button"
            onClick={onNew}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.99]"
          >
            + สร้างใบเสนอราคา
          </button>
        )}
      </div>
      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} ใบ`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาเลขที่ / ลูกค้า"
            placeholder="ค้นเลขที่ / ลูกค้า"
            className={`${selectClass} w-full sm:w-56`}
          />
        </FilterBar>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(q) => q.id}
        onRowClick={onOpen}
        empty={
          quotes.length > 0 ? (
            <EmptyState
              icon="file"
              title="ไม่พบใบเสนอราคาตามคำค้น"
              description="ลองปรับคำค้นใหม่"
              action={isFiltered ? { label: "ล้างคำค้น", onClick: () => setSearch("") } : undefined}
            />
          ) : (
            <EmptyState
              icon="file"
              title="ยังไม่มีใบเสนอราคา"
              description="สร้างใบเสนอราคาใหม่เพื่อเทียบรถและไฟแนนซ์ให้ลูกค้า"
              action={{ label: "สร้างใบเสนอราคา", onClick: onNew }}
            />
          )
        }
      />
    </div>
  );
}

/* ── ตัวสร้าง/เทียบใบเสนอราคา ─────────────────────────────────────────── */
type OptState = { vehicleId: string; price: number; financeId: string; down: number };
const emptyOpt: OptState = { vehicleId: "", price: 0, financeId: "", down: 0 };

function QuoteBuilder({
  editing,
  vehicles,
  financeCompanies,
  financeTerms,
  today,
  seller,
  canManage,
  action,
  updateAction,
  deleteAction,
  onBack,
}: {
  editing: SavedQuote | null;
  vehicles: QuoteVehicle[];
  financeCompanies: QuoteFinanceCo[];
  financeTerms: number[];
  today: string;
  seller: QuoteSeller;
  canManage: boolean;
  action: (formData: FormData) => Promise<QuoteActionResult>;
  updateAction?: (formData: FormData) => Promise<QuoteActionResult>;
  deleteAction?: (formData: FormData) => Promise<QuoteActionResult>;
  onBack: () => void;
}) {
  const isEdit = editing !== null;
  const [customerName, setCustomerName] = useState(editing?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(editing?.customerPhone ?? "");
  const [validUntil, setValidUntil] = useState(editing?.validUntil ?? "");
  const [opts, setOpts] = useState<OptState[]>(() =>
    editing ? savedOptionsToSlots(editing.options) : [{ ...emptyOpt }, { ...emptyOpt }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedDoc, setSavedDoc] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function setOpt(i: number, patch: Partial<OptState>) {
    setOpts((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
    setSavedDoc(null);
    setSaveNote(null);
  }

  function selectVehicle(i: number, variantId: string) {
    const v = vehicles.find((x) => x.variantId === variantId);
    setOpt(i, { vehicleId: variantId, price: v?.retail ?? 0 });
  }

  const built = opts.map((o) => {
    const v = vehicles.find((x) => x.variantId === o.vehicleId);
    const fin = financeCompanies.find((f) => f.id === o.financeId);
    const financed = financedAmount(o.price, o.down);
    const terms = fin ? optionTerms(o.price, o.down, fin.ratePct, financeTerms, fin.rateTiers) : [];
    return { o, v, fin, financed, terms };
  });
  const active = built.filter((b) => b.v && b.o.price > 0);
  const canSubmit = customerName.trim() !== "" && active.length > 0;
  const printColumns = quotePrintColumns(built);

  // แปลงคันนี้เป็นการขาย (FAM-1029) — พาไป /sell พร้อม prefill ลูกค้า/รุ่น/ไฟแนนซ์
  function sellHref(o: OptState): string {
    const params = new URLSearchParams({ variant: o.vehicleId });
    if (customerName.trim()) {
      params.set("name", customerName.trim());
    }
    if (customerPhone.trim()) {
      params.set("phone", customerPhone.trim());
    }
    params.set("pay", o.financeId ? "finance" : "cash");
    if (o.financeId) {
      params.set("finance", o.financeId);
    }
    if (o.price) {
      params.set("price", String(o.price));
    }
    if (o.down) {
      params.set("down", String(o.down));
    }
    return `/sell?${params.toString()}`;
  }

  function buildFormData(): FormData {
    const payload = active.map((b, i) => ({
      slot: i + 1,
      variantId: b.v!.variantId,
      price: b.o.price,
      financeId: b.fin?.id ?? null,
      down: b.o.down,
      terms: b.terms,
    }));
    const fd = new FormData();
    fd.set("customer_name", customerName.trim());
    fd.set("customer_phone", customerPhone.trim());
    fd.set("valid_until", validUntil);
    fd.set("options", JSON.stringify(payload));
    return fd;
  }

  async function save() {
    if (!canSubmit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = buildFormData();
    if (isEdit && updateAction) {
      fd.set("quote_id", editing.id);
      const res = await updateAction(fd);
      setBusy(false);
      if (res.ok) {
        setSaveNote(`อัปเดตใบเสนอราคาแล้ว — เลขที่ ${editing.docNo}`);
      } else {
        setError(res.error);
      }
      return;
    }
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setSavedDoc(res.docNo ?? "บันทึกแล้ว");
    } else {
      setError(res.error);
    }
  }

  // ทำสำเนา (เฉพาะโหมดแก้) — บันทึกสถานะปัจจุบันเป็นใบใหม่
  async function duplicate() {
    if (!canSubmit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await action(buildFormData());
    setBusy(false);
    if (res.ok) {
      setSaveNote(`ทำสำเนาเป็นใบใหม่แล้ว — เลขที่ ${res.docNo ?? "ใหม่"}`);
    } else {
      setError(res.error);
    }
  }

  async function remove() {
    if (!isEdit || !deleteAction || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("quote_id", editing.id);
    const res = await deleteAction(fd);
    setBusy(false);
    if (res.ok) {
      onBack();
    } else {
      setError(res.error);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onBack} className="text-sm text-ink-soft hover:text-ink">
            ← กลับรายการ
          </button>
          {isEdit && <span className="truncate font-mono text-xs text-muted">แก้ · {editing.docNo}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            disabled={printColumns.length === 0}
            className={`rounded-[24px] border px-4 py-2 text-sm disabled:opacity-50 ${
              preview ? "border-ink bg-card text-ink" : "border-hairline text-ink-soft"
            }`}
          >
            {preview ? "ซ่อนตัวอย่าง" : "ดูตัวอย่าง"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={printColumns.length === 0}
            className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft disabled:opacity-50"
          >
            พิมพ์
          </button>
          {isEdit && canManage && (
            <button
              type="button"
              onClick={duplicate}
              disabled={!canSubmit || busy}
              className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft disabled:opacity-50"
            >
              ทำสำเนา
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={save}
              disabled={!canSubmit || busy}
              className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก…" : isEdit ? "อัปเดต" : "บันทึก"}
            </button>
          )}
        </div>
      </div>

      {savedDoc && <div className="mb-4"><StatusBadge variant="good">บันทึกใบเสนอราคาแล้ว — เลขที่ {savedDoc}</StatusBadge></div>}
      {saveNote && <div className="mb-4"><StatusBadge variant="good">{saveNote}</StatusBadge></div>}
      {error && <div className="mb-4"><StatusBadge variant="bad">{error}</StatusBadge></div>}

      <div className="mb-5 grid gap-3 sm:grid-cols-3 print:hidden">
        <Field label="ชื่อลูกค้า *">
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="เบอร์โทร">
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputCls} />
        </Field>
        <Field label="ยืนราคาถึงวันที่">
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} />
        </Field>
      </div>

      {/* กรอกแต่ละคัน */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 print:hidden">
        {opts.map((o, i) => {
          const v = vehicles.find((x) => x.variantId === o.vehicleId);
          const discount = v && o.price > 0 && o.price < v.retail ? v.retail - o.price : 0;
          return (
          <div key={i} className="flex flex-col gap-3 rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
            <p className="font-display font-semibold text-ink">คันที่ {i + 1}</p>
            <Field label="รุ่นรถ">
              <select value={o.vehicleId} onChange={(e) => selectVehicle(i, e.target.value)} className={inputCls}>
                <option value="">— เลือกรุ่น —</option>
                {vehicles.map((v) => (
                  <option key={v.variantId} value={v.variantId}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ราคา">
                <input type="number" value={o.price || ""} onChange={(e) => setOpt(i, { price: Number(e.target.value) || 0 })} className={inputCls} />
              </Field>
              <Field label="เงินดาวน์">
                <input type="number" value={o.down || ""} onChange={(e) => setOpt(i, { down: Number(e.target.value) || 0 })} className={inputCls} />
              </Field>
            </div>
            {v && (
              <p className="-mt-1 text-xs text-muted">
                ราคาตั้ง {formatBaht(v.retail)}
                {discount > 0 && <span className="text-pos"> · ลด {formatBaht(discount)}</span>}
                {o.price > v.retail && <span className="text-attn"> · สูงกว่าราคาตั้ง</span>}
              </p>
            )}
            <Field label="บริษัทไฟแนนซ์">
              <select value={o.financeId} onChange={(e) => setOpt(i, { financeId: e.target.value })} className={inputCls}>
                <option value="">เงินสด (ไม่ผ่อน)</option>
                {financeCompanies.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.ratePct}%/เดือน)
                  </option>
                ))}
              </select>
            </Field>

            {canManage && o.vehicleId !== "" && o.price > 0 && customerName.trim() !== "" && (
              <Link href={sellHref(o)} className="text-sm font-medium text-accent hover:underline">
                แปลงเป็นการขาย →
              </Link>
            )}
          </div>
          );
        })}
      </div>

      {/* ตารางเทียบ (บนจอ) — mark ให้แคปเป็นรูปได้ในโหมดลูกค้า (FAM-1040) */}
      <div className="print:hidden" data-capture="ใบเทียบราคา">
        <CompareTable built={built} active={active.length > 0} financeTerms={financeTerms} />
      </div>

      {/* เอกสารพิมพ์: ซ่อนบนจอ (เว้นเปิดตัวอย่าง) · แสดงเดี่ยวตอนพิมพ์ */}
      {printColumns.length > 0 && (
        <div className={preview ? "mt-6" : ""}>
          <PrintableQuoteDoc
            seller={seller}
            docNo={isEdit ? editing.docNo : savedDoc}
            quoteDate={isEdit ? editing.quoteDate : today}
            validUntil={validUntil || null}
            customerName={customerName}
            customerPhone={customerPhone}
            columns={printColumns}
            financeTerms={financeTerms}
            preview={preview}
          />
        </div>
      )}

      {isEdit && canManage && deleteAction && (
        <div className="mt-6 flex justify-end print:hidden">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-soft">ลบใบนี้ถาวร?</span>
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="rounded-[24px] bg-accent px-4 py-2 text-sm font-medium text-card disabled:opacity-50"
              >
                {busy ? "กำลังลบ…" : "ยืนยันลบ"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft disabled:opacity-50"
              >
                ไม่ลบ
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm text-accent hover:underline">
              ลบใบเสนอราคานี้
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CompareTable({
  built,
  active,
  financeTerms,
}: {
  built: Array<{ o: OptState; v?: QuoteVehicle; fin?: QuoteFinanceCo; financed: number; terms: Array<{ months: number; monthly: number }> }>;
  active: boolean;
  financeTerms: number[];
}) {
  const cols = built.filter((b) => b.v && b.o.price > 0);
  if (!active) {
    return (
      <p className="rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted print:hidden">
        เลือกรุ่นและใส่ราคาเพื่อดูตารางเทียบ
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="border-b-2 border-ink/15 text-left align-bottom">
            <th className="py-2 pr-3 text-xs font-medium uppercase tracking-wide text-muted">รายการ</th>
            {cols.map((b, i) => (
              <th key={i} className="py-2 pl-3 text-right">
                <span className="block text-[10px] font-medium uppercase tracking-wide text-muted">ตัวเลือก {i + 1}</span>
                <span className="block font-display font-semibold text-ink">{b.v!.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          <CompareRow label="ราคา" cols={cols.map((b) => <Money key="p" value={b.o.price} />)} />
          <CompareRow label="เงินดาวน์" cols={cols.map((b) => <Money key="d" value={b.o.down} />)} />
          <CompareRow label="ยอดจัด" cols={cols.map((b) => <Money key="f" value={b.financed} />)} strong highlight />
          <CompareRow
            label="ไฟแนนซ์"
            cols={cols.map((b, i) => (
              <span key={i} className="text-ink-soft">
                {b.fin ? financeLabel(b.fin.name, b.fin.ratePct, b.fin.rateTiers) : "เงินสด"}
              </span>
            ))}
          />
          <tr>
            <td colSpan={cols.length + 1} className="pt-2 text-xs text-muted">
              ค่างวด/เดือน
            </td>
          </tr>
          {financeTerms.map((m) => (
            <CompareRow
              key={m}
              label={`${m} งวด`}
              cols={cols.map((b, i) => {
                const t = b.terms.find((x) => x.months === m);
                return <Money key={i} value={t ? t.monthly : null} />;
              })}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompareRow({
  label,
  cols,
  strong,
  highlight,
}: {
  label: string;
  cols: ReactNode[];
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <tr className={`border-b border-hairline-2 last:border-0 ${highlight ? "bg-paper-2" : ""}`}>
      <td className={`py-1.5 pr-3 ${strong ? "font-medium text-ink" : "text-muted"}`}>{label}</td>
      {cols.map((c, i) => (
        <td key={i} className={`py-1.5 pl-3 text-right ${strong ? "font-semibold text-ink" : "text-ink-soft"}`}>
          {c}
        </td>
      ))}
    </tr>
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
