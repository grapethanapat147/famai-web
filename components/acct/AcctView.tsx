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

export function AcctView({
  docs,
  issuable,
  issueReceiptAction,
}: {
  docs: DocDetail[];
  issuable: IssuableSale[];
  issueReceiptAction: (formData: FormData) => Promise<AcctActionResult>;
}) {
  const [search, setSearch] = useState("");
  const [issuing, setIssuing] = useState(false);
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
      key: "print",
      header: "",
      align: "right",
      render: (d) => (
        <button
          type="button"
          onClick={() => {
            setPrintDoc(d);
            setPrintTick((t) => t + 1);
          }}
          className="rounded-[20px] border border-hairline px-3 py-1 text-xs text-ink-soft transition-transform active:scale-[0.97] hover:text-ink"
        >
          พิมพ์
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{docs.length} เอกสาร</p>
        <button
          type="button"
          onClick={() => setIssuing(true)}
          className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.98]"
        >
          + ออกใบเสร็จ
        </button>
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
            description={docs.length ? "ลองปรับคำค้น" : "กด “ออกใบเสร็จ” เพื่อออกใบเสร็จรับเงินจากการขาย"}
            action={docs.length === 0 ? { label: "ออกใบเสร็จ", onClick: () => setIssuing(true) } : undefined}
          />
        }
      />

      <IssueReceiptModal open={issuing} issuable={issuable} action={issueReceiptAction} onClose={() => setIssuing(false)} />
      {printDoc && <PrintableReceipt doc={printDoc} />}
    </div>
  );
}

function IssueReceiptModal({
  open,
  issuable,
  action,
  onClose,
}: {
  open: boolean;
  issuable: IssuableSale[];
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
    <Modal open={open} onClose={onClose} title="ออกใบเสร็จรับเงิน">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          เลือกการขาย (พิมพ์ค้นชื่อ/รุ่น)
          <Combobox
            ariaLabel="เลือกการขาย"
            placeholder="พิมพ์ชื่อลูกค้า / รุ่นรถ…"
            value={saleId}
            onChange={setSaleId}
            emptyText="ไม่มีการขายที่ยังไม่ออกใบเสร็จ"
            options={issuable.map((s) => ({
              value: s.saleId,
              label: `${s.customerName} · ${s.vehicle}`,
              sub: `${formatBaht(s.netPrice)} · ${formatThaiDate(s.soldAt)}`,
              keywords: s.customerName,
            }))}
          />
        </label>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}
        {savedNo && <StatusBadge variant="good">ออกใบเสร็จแล้ว — เลขที่ {savedNo}</StatusBadge>}

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
            {busy ? "กำลังออก…" : "ออกใบเสร็จ"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
