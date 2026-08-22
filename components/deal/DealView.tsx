"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Drawer } from "@/components/ui/Drawer";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { StepBar } from "@/components/ui/StepBar";
import { PrintableSaleDoc } from "@/components/deal/PrintableSaleDoc";
import { PrintableTaxInvoice } from "@/components/deal/PrintableTaxInvoice";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";
import { formatThaiDate } from "@/lib/format";
import { dealTrack, regNext, stageIndex, stageVariant, type RegStage } from "@/lib/deal/stage";
import {
  customerDeals,
  customerServices,
  filterDeals,
  isOffTrack,
  isVoidableStage,
  offTrackCount,
  openDealCount,
  stageCounts,
  type Deal,
  type DealActionResult,
  type ServiceHistory,
} from "@/lib/deal/deals";
import { REG_STAGES } from "@/lib/deal/stage";
import { finNext, financeActionLabel, financeStatusVariant, isFinanceStatus, type FinanceStatus } from "@/lib/deal/finance";

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export function DealView({
  deals,
  services = [],
  seller,
  vatPct,
  canManage,
  action,
  canManageFinance = false,
  financeAction,
  canVoid = false,
  voidAction,
}: {
  deals: Deal[];
  services?: ServiceHistory[];
  seller: QuoteSeller;
  vatPct: number;
  canManage: boolean;
  action: (formData: FormData) => Promise<DealActionResult>;
  canManageFinance?: boolean;
  financeAction?: (formData: FormData) => Promise<DealActionResult>;
  canVoid?: boolean;
  voidAction?: (formData: FormData) => Promise<DealActionResult>;
}) {
  const [stage, setStage] = useState<RegStage | "all">("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "open" | "offtrack">("all");
  const [selected, setSelected] = useState<Deal | null>(null);

  const counts = stageCounts(deals);
  const open = openDealCount(deals);
  const offTrack = offTrackCount(deals);
  const rows = filterDeals(deals, { stage, search, onlyOpen: view === "open", onlyOffTrack: view === "offtrack" });

  const isFiltered = stage !== "all" || search.trim() !== "" || view !== "all";
  function resetFilters() {
    setStage("all");
    setSearch("");
    setView("all");
  }

  const columns: Column<Deal>[] = [
    {
      key: "customer",
      header: "ลูกค้า / รถ",
      primary: true,
      render: (d) => (
        <span>
          {d.customerName} · <span className="text-ink-soft">{d.vehicle}</span>
        </span>
      ),
    },
    {
      key: "pay",
      header: "ชำระ",
      render: (d) => <span className="text-ink-soft">{d.payMethod === "finance" ? "เงินผ่อน" : "เงินสด"}</span>,
    },
    {
      key: "stage",
      header: "ขั้น",
      render: (d) =>
        isOffTrack(d) ? (
          <StatusBadge variant="bad">ไฟแนนซ์ปฏิเสธ</StatusBadge>
        ) : (
          <StatusBadge variant={stageVariant(d.stage)}>{d.stage}</StatusBadge>
        ),
    },
    { key: "date", header: "วันที่ขาย", render: (d) => <span className="text-ink-soft">{formatThaiDate(d.soldAt)}</span> },
    { key: "amount", header: "ยอดสุทธิ", align: "right", render: (d) => <Money value={d.netPrice} /> },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="ดีลทั้งหมด" value={String(deals.length)} hint="ดีล" />
        <StatCard label="ยังไม่ส่งมอบ" value={String(open)} hint="ค้างในไปป์ไลน์" />
        <StatCard
          label="ต้องจัดการ"
          value={String(offTrack)}
          hint="ไฟแนนซ์ปฏิเสธ"
          tone={offTrack > 0 ? "accent" : "default"}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {REG_STAGES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage((cur) => (cur === s ? "all" : s))}
            className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-sm ${
              stage === s ? "border-ink bg-card" : "border-hairline bg-card"
            }`}
          >
            <StatusBadge variant={stageVariant(s)}>{s}</StatusBadge>
            <span className="tabular font-semibold text-ink">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} ดีล`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาลูกค้า / รถ / ทะเบียน"
            placeholder="ค้นลูกค้า / รถ / ทะเบียน"
            className={`${selectClass} w-full sm:w-56`}
          />
          <Chips
            value={view}
            onChange={setView}
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "open", label: "ยังไม่ส่งมอบ" },
              { value: "offtrack", label: offTrack > 0 ? `ต้องจัดการ (${offTrack})` : "ต้องจัดการ" },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d.saleId}
        onRowClick={setSelected}
        empty={
          deals.length > 0 ? (
            <EmptyState
              icon="users"
              title="ไม่พบดีลตามเงื่อนไข"
              description="ลองปรับตัวกรองหรือคำค้นใหม่"
              action={isFiltered ? { label: "ล้างตัวกรอง", onClick: resetFilters } : undefined}
            />
          ) : (
            <EmptyState
              icon="users"
              title="ยังไม่มีดีล"
              description="เปิดการขายเพื่อสร้างดีลแรก แล้วติดตามไฟแนนซ์/ทะเบียนได้จากที่นี่"
              action={{ label: "เปิดการขาย", href: "/sell" }}
            />
          )
        }
      />

      <DealDrawer
        deal={selected}
        seller={seller}
        vatPct={vatPct}
        history={selected ? customerDeals(deals, selected.customerId, selected.saleId) : []}
        serviceHistory={selected ? customerServices(services, selected.customerId) : []}
        canManage={canManage}
        action={action}
        canManageFinance={canManageFinance}
        financeAction={financeAction}
        canVoid={canVoid}
        voidAction={voidAction}
        onClose={() => setSelected(null)}
        onAdvanced={() => setSelected(null)}
      />
    </div>
  );
}

function DealDrawer({
  deal,
  seller,
  vatPct,
  history,
  serviceHistory,
  canManage,
  action,
  canManageFinance,
  financeAction,
  canVoid,
  voidAction,
  onClose,
  onAdvanced,
}: {
  deal: Deal | null;
  seller: QuoteSeller;
  vatPct: number;
  history: Deal[];
  serviceHistory: ServiceHistory[];
  canManage: boolean;
  action: (formData: FormData) => Promise<DealActionResult>;
  canManageFinance: boolean;
  financeAction?: (formData: FormData) => Promise<DealActionResult>;
  canVoid: boolean;
  voidAction?: (formData: FormData) => Promise<DealActionResult>;
  onClose: () => void;
  onAdvanced: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [current, setCurrent] = useState<string | null>(null);
  const [printDoc, setPrintDoc] = useState<"sale" | "tax" | null>(null);
  const [printTick, setPrintTick] = useState(0);

  // พิมพ์หลังเอกสารที่เลือก render แล้ว (มี .print-doc เดียวในหน้า → :has() แสดงตัวถูก)
  useEffect(() => {
    if (printTick === 0 || !printDoc) {
      return;
    }
    const id = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(id);
  }, [printTick, printDoc]);

  function printAs(which: "sale" | "tax") {
    setPrintDoc(which);
    setPrintTick((t) => t + 1);
  }

  // รีเซ็ต error/เหตุผล เมื่อเปิดดีลใหม่ (เทียบ id ระหว่าง render)
  if (deal && deal.saleId !== current) {
    setCurrent(deal.saleId);
    setError(null);
    setRejectReason("");
    setVoiding(false);
    setVoidReason("");
  }

  async function doVoid() {
    if (!deal || !voidAction || busy) {
      return;
    }
    if (!voidReason.trim()) {
      setError("กรุณาระบุเหตุผลที่ยกเลิก");
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("sale_id", deal.saleId);
    fd.set("reason", voidReason.trim());
    const res = await voidAction(fd);
    setBusy(false);
    if (res.ok) {
      onAdvanced();
    } else {
      setError(res.error);
    }
  }

  async function advanceFin(caseId: string, to: FinanceStatus) {
    if (!financeAction || busy) {
      return;
    }
    if (to === "ปฏิเสธ" && !rejectReason.trim()) {
      setError("กรุณาระบุเหตุผลที่ปฏิเสธ");
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("case_id", caseId);
    fd.set("to", to);
    fd.set("reason", rejectReason);
    const res = await financeAction(fd);
    setBusy(false);
    if (res.ok) {
      setRejectReason("");
      onAdvanced();
    } else {
      setError(res.error);
    }
  }

  async function advance(to: RegStage) {
    if (!deal || !deal.regId || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("reg_id", deal.regId);
    fd.set("to", to);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      onAdvanced();
    } else {
      setError(res.error);
    }
  }

  const track = deal ? dealTrack(deal.payMethod) : [];
  const idx = deal ? stageIndex(deal.stage, deal.payMethod) : -1;
  const offTrack = deal ? isOffTrack(deal) : false;
  const next = deal && !offTrack ? regNext(deal.stage, deal.payMethod) : null;

  return (
    <Drawer open={deal !== null} onClose={onClose} title={deal ? `${deal.customerName} · ${deal.vehicle}` : ""}>
      {deal && (
        <div className="flex flex-col gap-4 text-sm">
          <StepBar track={track} currentIndex={Math.max(0, idx)} offTrack={offTrack} />

          <dl className="flex flex-col gap-2">
            <Row label="วิธีชำระ">{deal.payMethod === "finance" ? "เงินผ่อน" : "เงินสด"}</Row>
            <Row label="ยอดสุทธิ"><Money value={deal.netPrice} /></Row>
            <Row label="เลขเครื่อง"><span className="font-mono">{deal.engineNo || "—"}</span></Row>
            <Row label="ทะเบียน">{deal.plateNo || "—"}</Row>
            <Row label="วันที่ขาย">{formatThaiDate(deal.soldAt)}</Row>
          </dl>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => printAs("sale")}
              className="inline-flex items-center gap-1.5 rounded-[24px] border border-hairline px-4 py-2 text-sm font-medium text-ink-soft transition-transform active:scale-[0.97]"
            >
              พิมพ์ใบขาย
            </button>
            {deal.docNo && (
              <button
                type="button"
                onClick={() => printAs("tax")}
                className="inline-flex items-center gap-1.5 rounded-[24px] border border-hairline px-4 py-2 text-sm font-medium text-ink-soft transition-transform active:scale-[0.97]"
              >
                พิมพ์ใบกำกับภาษี
              </button>
            )}
          </div>
          {printDoc === "sale" && <PrintableSaleDoc seller={seller} deal={deal} />}
          {printDoc === "tax" && <PrintableTaxInvoice seller={seller} deal={deal} vatPct={vatPct} />}

          {deal.customerId && (
            <div className="flex flex-col gap-3 rounded-[12px] bg-paper p-3">
              <p className="font-medium text-ink">ประวัติลูกค้า</p>

              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted">การซื้อ · {history.length + 1} คัน</p>
                {history.length === 0 ? (
                  <p className="text-xs text-muted">ลูกค้าใหม่ — ซื้อครั้งแรก</p>
                ) : (
                  <ul className="flex flex-col">
                    {history.map((h) => (
                      <li
                        key={h.saleId}
                        className="flex items-center justify-between gap-3 border-b border-hairline-2 py-1.5 last:border-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-ink">{h.vehicle}</span>
                        <span className="shrink-0 text-xs text-muted">{formatThaiDate(h.soldAt)}</span>
                        <StatusBadge variant={stageVariant(h.stage)}>{h.stage}</StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted">การบริการ · {serviceHistory.length} ครั้ง</p>
                {serviceHistory.length === 0 ? (
                  <p className="text-xs text-muted">ยังไม่เคยเข้าศูนย์บริการ</p>
                ) : (
                  <ul className="flex flex-col">
                    {serviceHistory.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 border-b border-hairline-2 py-1.5 last:border-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-ink">{s.serviceType}</span>
                        <span className="shrink-0 text-xs text-muted">{formatThaiDate(s.checkedInAt)}</span>
                        <Money value={s.total} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {deal.finance && (
            <div className="rounded-[12px] bg-paper p-3">
              <p className="mb-1 font-medium text-ink">สินเชื่อ</p>
              <Row label="บริษัท">{deal.finance.companyName}</Row>
              <Row label="สถานะ">
                <StatusBadge variant={isFinanceStatus(deal.finance.status) ? financeStatusVariant(deal.finance.status) : "warn"}>
                  {deal.finance.status}
                </StatusBadge>
              </Row>
              {deal.finance.amount != null && <Row label="ยอดจัด"><Money value={deal.finance.amount} /></Row>}
              {deal.finance.rejectReason && <Row label="เหตุผลที่ไม่ผ่าน">{deal.finance.rejectReason}</Row>}

              {canManageFinance && financeAction && isFinanceStatus(deal.finance.status) && (
                <FinanceActions
                  caseId={deal.finance.id}
                  status={deal.finance.status}
                  busy={busy}
                  rejectReason={rejectReason}
                  onReason={setRejectReason}
                  onAdvance={advanceFin}
                />
              )}
            </div>
          )}

          {offTrack && (
            <StatusBadge variant="bad">ดีลตกราง — ไฟแนนซ์ปฏิเสธ ต้องยื่นใหม่/ยกเลิก (จัดการในงานสินเชื่อ)</StatusBadge>
          )}
          {error && <StatusBadge variant="bad">{error}</StatusBadge>}

          {canManage && next && (
            <div>
              <p className="mb-2 text-xs text-muted">ต้องทำต่อ</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => advance(next)}
                className="w-full rounded-[24px] bg-accent py-3 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
              >
                {busy ? "กำลังบันทึก…" : `ไป: ${next} →`}
              </button>
            </div>
          )}

          {canVoid && voidAction && isVoidableStage(deal.stage) && (
            <div className="mt-2 border-t border-hairline pt-3">
              {voiding ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted">ลูกค้าเท — ยกเลิกดีลนี้ (คืนรถเข้าสต๊อก + ปิดเคสสินเชื่อ)</p>
                  <input
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="เหตุผลที่ยกเลิก (จำเป็น)"
                    className={inputCls}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy || !voidReason.trim()}
                      onClick={doVoid}
                      className="flex-1 rounded-[24px] bg-accent py-2.5 text-sm font-medium text-card disabled:opacity-50"
                    >
                      {busy ? "กำลังยกเลิก…" : "ยืนยันยกเลิกดีล"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setVoiding(false);
                        setVoidReason("");
                        setError(null);
                      }}
                      className="rounded-[24px] border border-hairline px-4 py-2.5 text-sm text-ink-soft disabled:opacity-50"
                    >
                      ไม่ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setVoiding(true)}
                  className="text-sm text-accent hover:underline"
                >
                  ลูกค้าเท — ยกเลิกดีล
                </button>
              )}
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

function FinanceActions({
  caseId,
  status,
  busy,
  rejectReason,
  onReason,
  onAdvance,
}: {
  caseId: string;
  status: FinanceStatus;
  busy: boolean;
  rejectReason: string;
  onReason: (v: string) => void;
  onAdvance: (caseId: string, to: FinanceStatus) => void;
}) {
  const nexts = finNext(status);
  if (nexts.length === 0) {
    return null;
  }
  const showReason = nexts.includes("ปฏิเสธ");

  return (
    <div className="mt-3 border-t border-hairline pt-3">
      {showReason && (
        <input
          value={rejectReason}
          onChange={(e) => onReason(e.target.value)}
          placeholder="เหตุผล (จำเป็นเมื่อปฏิเสธ)"
          className={`${inputCls} mb-2`}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {nexts.map((to) => {
          const danger = to === "ปฏิเสธ" || to === "ยกเลิก";
          return (
            <button
              key={to}
              type="button"
              disabled={busy}
              onClick={() => onAdvance(caseId, to)}
              className={`rounded-[24px] px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                danger ? "border border-hairline text-accent" : "bg-accent text-card"
              }`}
            >
              {financeActionLabel(to)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
