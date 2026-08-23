"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Combobox } from "@/components/ui/Combobox";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PrintableReceipt } from "@/components/acct/PrintableReceipt";
import { formatBaht, formatThaiDate } from "@/lib/format";
import { docTypeLabel, type AcctActionResult, type DocDetail, type IssuableSale } from "@/lib/acct/documents";

type IssueKind = "receipt" | "taxinv";

export function AcctView({
  docs,
  receiptIssuable,
  taxinvIssuable,
  vatPct,
  issueReceiptAction,
  issueTaxInvoiceAction,
  updateDocumentAction,
  voidDocumentAction,
}: {
  docs: DocDetail[];
  receiptIssuable: IssuableSale[];
  taxinvIssuable: IssuableSale[];
  vatPct: number;
  issueReceiptAction: (formData: FormData) => Promise<AcctActionResult>;
  issueTaxInvoiceAction: (formData: FormData) => Promise<AcctActionResult>;
  updateDocumentAction: (formData: FormData) => Promise<AcctActionResult>;
  voidDocumentAction: (formData: FormData) => Promise<AcctActionResult>;
}) {
  const [search, setSearch] = useState("");
  const [issuing, setIssuing] = useState<IssueKind | null>(null);
  const [editing, setEditing] = useState<DocDetail | null>(null);
  const [voiding, setVoiding] = useState<DocDetail | null>(null);
  const [printDoc, setPrintDoc] = useState<DocDetail | null>(null);
  const [printTick, setPrintTick] = useState(0);

  // พิมพ์หลังเอกสารที่เลือก render แล้ว (มี .print-doc เดียวในหน้า → :has() แสดงตัวถูก)
  useEffect(() => {
    if (printTick === 0 || !printDoc) {
      return;
    }
    const id = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(id);
  }, [printTick, printDoc]);

  const q = search.trim().toLowerCase();
  const rows = q ? docs.filter((d) => `${d.docNo} ${d.buyer.name}`.toLowerCase().includes(q)) : docs;

  const columns: Column<DocDetail>[] = [
    {
      key: "docNo",
      header: "เลขที่ / ประเภท",
      primary: true,
      render: (d) => (
        <span>
          <span className="font-mono text-xs">{d.docNo}</span> <span className="text-muted">· {docTypeLabel(d.docType)}</span>
          {d.voided && <span className="ml-1 text-[11px] text-accent">(ยกเลิก)</span>}
        </span>
      ),
    },
    { key: "customer", header: "ลูกค้า", render: (d) => <span className="text-ink-soft">{d.buyer.name}</span> },
    { key: "date", header: "วันที่", render: (d) => <span className="text-ink-soft">{formatThaiDate(d.date)}</span> },
    { key: "total", header: "ยอดรวม", align: "right", render: (d) => <Money value={d.total} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (d) => (
        <span className="flex justify-end gap-1.5">
          {!d.voided && (
            <>
              <RowButton onClick={() => setEditing(d)}>แก้ไข</RowButton>
              <RowButton onClick={() => setVoiding(d)}>ยกเลิก</RowButton>
            </>
          )}
          <RowButton
            onClick={() => {
              setPrintDoc(d);
              setPrintTick((t) => t + 1);
            }}
          >
            พิมพ์
          </RowButton>
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{docs.length} เอกสาร</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIssuing("receipt")}
            className="rounded-[24px] border border-hairline px-4 py-2 text-sm font-medium text-ink transition-transform active:scale-[0.98]"
          >
            + ใบเสร็จ
          </button>
          <button
            type="button"
            onClick={() => setIssuing("taxinv")}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.98]"
          >
            + ใบกำกับภาษี
          </button>
        </div>
      </div>

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} เอกสาร`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาเอกสาร"
            placeholder="ค้นเลขที่ / ลูกค้า"
            className="w-full rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink sm:w-56"
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        empty={
          <EmptyState
            icon="file"
            title={docs.length ? "ไม่พบเอกสาร" : "ยังไม่มีเอกสาร"}
            description={docs.length ? "ลองปรับคำค้น" : "กด “ใบเสร็จ” เพื่อออกใบเสร็จรับเงินจากการขาย"}
            action={docs.length === 0 ? { label: "ออกใบเสร็จ", onClick: () => setIssuing("receipt") } : undefined}
          />
        }
      />

      {issuing === "receipt" && (
        <IssueModal
          title="ออกใบเสร็จรับเงิน"
          cta="ออกใบเสร็จ"
          issuable={receiptIssuable}
          emptyText="ไม่มีการขายที่ยังไม่ออกใบเสร็จ"
          action={issueReceiptAction}
          onClose={() => setIssuing(null)}
        />
      )}
      {issuing === "taxinv" && (
        <IssueModal
          title="ออกใบกำกับภาษี"
          cta="ออกใบกำกับภาษี"
          issuable={taxinvIssuable}
          emptyText="ไม่มีการขายที่ออกใบเสร็จแล้วและยังไม่ออกใบกำกับภาษี"
          action={issueTaxInvoiceAction}
          onClose={() => setIssuing(null)}
        />
      )}
      {editing && <EditDocModal key={editing.id} doc={editing} vatPct={vatPct} action={updateDocumentAction} onClose={() => setEditing(null)} />}
      {voiding && <VoidDocModal key={voiding.id} doc={voiding} action={voidDocumentAction} onClose={() => setVoiding(null)} />}
      {printDoc && <PrintableReceipt doc={printDoc} />}
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

function IssueModal({
  title,
  cta,
  issuable,
  emptyText,
  action,
  onClose,
}: {
  title: string;
  cta: string;
  issuable: IssuableSale[];
  emptyText: string;
  action: (formData: FormData) => Promise<AcctActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saleId, setSaleId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNo, setSavedNo] = useState<string | null>(null);

  async function submit() {
    if (!saleId || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("sale_id", saleId);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setSavedNo(res.docNo ?? "ออกแล้ว");
      setSaleId("");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          เลือกการขาย (พิมพ์ค้นชื่อ/รุ่น)
          <Combobox
            ariaLabel="เลือกการขาย"
            placeholder="พิมพ์ชื่อลูกค้า / รุ่นรถ…"
            value={saleId}
            onChange={setSaleId}
            emptyText={emptyText}
            options={issuable.map((s) => ({
              value: s.saleId,
              label: `${s.customerName} · ${s.vehicle}`,
              sub: `${formatBaht(s.netPrice)} · ${formatThaiDate(s.soldAt)}`,
              keywords: s.customerName,
            }))}
          />
        </label>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}
        {savedNo && <StatusBadge variant="good">ออกเอกสารแล้ว — เลขที่ {savedNo}</StatusBadge>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ปิด
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!saleId || busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังออก…" : cta}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ink-soft">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink"
      />
    </label>
  );
}

function EditDocModal({
  doc,
  vatPct,
  action,
  onClose,
}: {
  doc: DocDetail;
  vatPct: number;
  action: (formData: FormData) => Promise<AcctActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [docDate, setDocDate] = useState(doc.date.slice(0, 10));
  const [sellerName, setSellerName] = useState(doc.seller.name);
  const [sellerAddress, setSellerAddress] = useState(doc.seller.address ?? "");
  const [sellerTaxId, setSellerTaxId] = useState(doc.seller.taxId ?? "");
  const [sellerPhone, setSellerPhone] = useState(doc.seller.phone ?? "");
  const [buyerName, setBuyerName] = useState(doc.buyer.name);
  const [buyerAddress, setBuyerAddress] = useState(doc.buyer.address ?? "");
  const [buyerTaxId, setBuyerTaxId] = useState(doc.buyer.taxId ?? "");
  const [buyerPhone, setBuyerPhone] = useState(doc.buyer.phone ?? "");
  const [vehicle, setVehicle] = useState(doc.vehicle === "—" ? "" : doc.vehicle);
  const [frameNo, setFrameNo] = useState(doc.frameNo);
  const [engineNo, setEngineNo] = useState(doc.engineNo);
  const [base, setBase] = useState(String(doc.base));
  const [vat, setVat] = useState(String(doc.vat));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = (Number(base) || 0) + (Number(vat) || 0);

  function applyVat() {
    const b = Number(base);
    if (Number.isFinite(b) && b > 0) {
      setVat(String(Math.round(b * (vatPct / 100) * 100) / 100));
    }
  }

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("doc_id", doc.id);
    fd.set("doc_date", docDate);
    fd.set("seller_name", sellerName);
    fd.set("seller_address", sellerAddress);
    fd.set("seller_tax_id", sellerTaxId);
    fd.set("seller_phone", sellerPhone);
    fd.set("buyer_name", buyerName);
    fd.set("buyer_address", buyerAddress);
    fd.set("buyer_tax_id", buyerTaxId);
    fd.set("buyer_phone", buyerPhone);
    fd.set("vehicle", vehicle);
    fd.set("frame_no", frameNo);
    fd.set("engine_no", engineNo);
    fd.set("base", base);
    fd.set("vat", vat);
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
    <Modal open onClose={onClose} title={`แก้ไข ${docTypeLabel(doc.docType)}`} size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-[10px] bg-paper-2 px-3 py-2">
          <div className="text-xs text-muted">
            เลขที่ (แก้ไม่ได้)
            <div className="font-mono text-sm text-ink">{doc.docNo}</div>
          </div>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            วันที่
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink"
            />
          </label>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-muted">ผู้ขาย</legend>
          <Field label="ชื่อบริษัท" value={sellerName} onChange={setSellerName} />
          <Field label="ที่อยู่" value={sellerAddress} onChange={setSellerAddress} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="เลขผู้เสียภาษี" value={sellerTaxId} onChange={setSellerTaxId} />
            <Field label="โทร." value={sellerPhone} onChange={setSellerPhone} />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-muted">ผู้ซื้อ</legend>
          <Field label="ชื่อ-นามสกุล" value={buyerName} onChange={setBuyerName} />
          <Field label="ที่อยู่" value={buyerAddress} onChange={setBuyerAddress} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="เลขผู้เสียภาษี" value={buyerTaxId} onChange={setBuyerTaxId} />
            <Field label="โทร." value={buyerPhone} onChange={setBuyerPhone} />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-muted">รายการรถ</legend>
          <Field label="ยี่ห้อ / รุ่น / สี" value={vehicle} onChange={setVehicle} placeholder="เช่น NMAX · ดำ-เทา" />
          <div className="grid grid-cols-2 gap-2">
            <Field label="เลขตัวถัง" value={frameNo} onChange={setFrameNo} />
            <Field label="เลขเครื่อง" value={engineNo} onChange={setEngineNo} />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-muted">จำนวนเงิน</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              มูลค่าก่อนภาษี
              <input
                type="number"
                inputMode="decimal"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                className="rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              <span className="flex items-center justify-between">
                ภาษีมูลค่าเพิ่ม
                <button type="button" onClick={applyVat} className="text-[11px] text-accent hover:underline">
                  คิด {vatPct}%
                </button>
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={vat}
                onChange={(e) => setVat(e.target.value)}
                className="rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
          </div>
          <div className="flex items-center justify-between rounded-[10px] bg-paper-2 px-3 py-2 text-sm">
            <span className="text-muted">รวมทั้งสิ้น</span>
            <span className="font-medium text-ink">{formatBaht(total)}</span>
          </div>
        </fieldset>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function VoidDocModal({
  doc,
  action,
  onClose,
}: {
  doc: DocDetail;
  action: (formData: FormData) => Promise<AcctActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("doc_id", doc.id);
    fd.set("reason", reason);
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
    <Modal open onClose={onClose} title="ยกเลิกเอกสาร">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">
          ยกเลิก <span className="font-mono text-xs">{doc.docNo}</span> ({docTypeLabel(doc.docType)})? เลขเอกสารจะคงอยู่ (กันเลขขาดช่วง) และออกใบใหม่ได้
        </p>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          เหตุผล (ถ้ามี)
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เช่น พิมพ์ผิด / ลูกค้ายกเลิก"
            className="rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink"
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
            disabled={busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังยกเลิก…" : "ยืนยันยกเลิก"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
