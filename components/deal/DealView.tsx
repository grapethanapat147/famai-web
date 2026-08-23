"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { StepBar } from "@/components/ui/StepBar";
import { PrintableSaleDoc } from "@/components/deal/PrintableSaleDoc";
import { PrintableTaxInvoice } from "@/components/deal/PrintableTaxInvoice";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";
import { formatThaiDate } from "@/lib/format";
import { dealTrack, regNext, regPrev, stageIndex, stageVariant, substatusOptions, type RegStage } from "@/lib/deal/stage";
import { LEAD_SOURCES, type LeadRow } from "@/lib/deal/lead";
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
  revertAction,
  leads = [],
  leadVariants = [],
  addCustomerAction,
  canManageFinance = false,
  financeAction,
  canVoid = false,
  voidAction,
  customerAction,
  stepAction,
  initialSearch = "",
}: {
  deals: Deal[];
  services?: ServiceHistory[];
  seller: QuoteSeller;
  vatPct: number;
  initialSearch?: string;
  canManage: boolean;
  action: (formData: FormData) => Promise<DealActionResult>;
  revertAction?: (formData: FormData) => Promise<DealActionResult>;
  leads?: LeadRow[];
  leadVariants?: { id: string; name: string }[];
  addCustomerAction?: (formData: FormData) => Promise<DealActionResult>;
  canManageFinance?: boolean;
  financeAction?: (formData: FormData) => Promise<DealActionResult>;
  canVoid?: boolean;
  voidAction?: (formData: FormData) => Promise<DealActionResult>;
  customerAction?: (formData: FormData) => Promise<DealActionResult>;
  stepAction?: (formData: FormData) => Promise<DealActionResult>;
}) {
  const [stage, setStage] = useState<RegStage | "all">("all");
  const [search, setSearch] = useState(initialSearch);
  const [view, setView] = useState<"all" | "open" | "offtrack" | "leads">("all");
  const [selected, setSelected] = useState<Deal | null>(null);
  const [adding, setAdding] = useState(false);

  const counts = stageCounts(deals);
  const open = openDealCount(deals);
  const offTrack = offTrackCount(deals);
  const rows = filterDeals(deals, { stage, search, onlyOpen: view === "open", onlyOffTrack: view === "offtrack" });

  const leadQuery = search.trim().toLowerCase();
  const filteredLeads = leadQuery
    ? leads.filter((l) => `${l.name} ${l.phone ?? ""} ${l.interestedModel ?? ""}`.toLowerCase().includes(leadQuery))
    : leads;

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
      {addCustomerAction && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.98]"
          >
            + เพิ่มลูกค้า
          </button>
        </div>
      )}
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

      {view !== "leads" && (
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
      )}

      <div className="mb-4">
        <FilterBar summary={view === "leads" ? `ลีด ${filteredLeads.length} ราย` : `กำลังดู: ${rows.length} ดีล`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาลูกค้า / รถ / ทะเบียน"
            placeholder={view === "leads" ? "ค้นชื่อ / เบอร์ / รุ่น" : "ค้นลูกค้า / รถ / ทะเบียน"}
            className={`${selectClass} w-full sm:w-56`}
          />
          <Chips
            value={view}
            onChange={setView}
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "open", label: "ยังไม่ส่งมอบ" },
              { value: "offtrack", label: offTrack > 0 ? `ต้องจัดการ (${offTrack})` : "ต้องจัดการ" },
              { value: "leads", label: leads.length ? `ลีด (${leads.length})` : "ลีด" },
            ]}
          />
        </FilterBar>
      </div>

      {view === "leads" ? (
        <LeadsList leads={filteredLeads} hasAny={leads.length > 0} onAdd={addCustomerAction ? () => setAdding(true) : undefined} />
      ) : (
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
      )}

      <DealDrawer
        deal={selected}
        seller={seller}
        vatPct={vatPct}
        history={selected ? customerDeals(deals, selected.customerId, selected.saleId) : []}
        serviceHistory={selected ? customerServices(services, selected.customerId) : []}
        canManage={canManage}
        action={action}
        revertAction={revertAction}
        canManageFinance={canManageFinance}
        financeAction={financeAction}
        canVoid={canVoid}
        voidAction={voidAction}
        customerAction={customerAction}
        stepAction={stepAction}
        onClose={() => setSelected(null)}
        onAdvanced={() => setSelected(null)}
      />

      {addCustomerAction && (
        <AddCustomerModal open={adding} variants={leadVariants} action={addCustomerAction} onClose={() => setAdding(false)} />
      )}
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
  revertAction,
  canManageFinance,
  financeAction,
  canVoid,
  voidAction,
  customerAction,
  stepAction,
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
  revertAction?: (formData: FormData) => Promise<DealActionResult>;
  canManageFinance: boolean;
  financeAction?: (formData: FormData) => Promise<DealActionResult>;
  canVoid: boolean;
  voidAction?: (formData: FormData) => Promise<DealActionResult>;
  customerAction?: (formData: FormData) => Promise<DealActionResult>;
  stepAction?: (formData: FormData) => Promise<DealActionResult>;
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
  const [activeStep, setActiveStep] = useState<number | null>(null);

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
    setActiveStep(null);
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

  async function revert(to: RegStage) {
    if (!deal || !deal.regId || !revertAction || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("reg_id", deal.regId);
    fd.set("to", to);
    const res = await revertAction(fd);
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
  const prev = deal && !offTrack ? regPrev(deal.stage, deal.payMethod) : null;

  return (
    <Modal open={deal !== null} onClose={onClose} size="lg" title={deal ? `${deal.customerName} · ${deal.vehicle}` : ""}>
      {deal && (
        <div className="flex flex-col gap-4 text-sm">
          <StepBar
            track={track}
            currentIndex={Math.max(0, idx)}
            offTrack={offTrack}
            onStepClick={stepAction && canManage ? (i) => setActiveStep((cur) => (cur === i ? null : i)) : undefined}
            activeIndex={activeStep ?? undefined}
          />

          {stepAction && canManage && activeStep !== null && track[activeStep] && (
            <StepEditor
              deal={deal}
              stage={track[activeStep]}
              action={stepAction}
              onSaved={() => {
                setActiveStep(null);
                onAdvanced();
              }}
            />
          )}
          {stepAction && canManage && activeStep === null && (
            <p className="-mt-1 text-center text-[11px] text-muted">แตะแต่ละขั้นเพื่อใส่สถานะย่อย/บันทึก</p>
          )}

          {customerAction && canManage && <CustomerEditSection deal={deal} action={customerAction} onSaved={onAdvanced} />}

          <dl className="flex flex-col gap-2">
            <Row label="วิธีชำระ">{deal.payMethod === "finance" ? "เงินผ่อน" : "เงินสด"}</Row>
            <Row label="ยอดสุทธิ"><Money value={deal.netPrice} /></Row>
            <Row label="เลขเครื่อง"><span className="font-mono">{deal.engineNo || "—"}</span></Row>
            <Row label="เลขถัง"><span className="font-mono">{deal.frameNo || "—"}</span></Row>
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

          {canManage && !offTrack && (next || (prev && revertAction)) && (
            <div>
              <p className="mb-2 text-xs text-muted">ต้องทำต่อ</p>
              <div className="flex gap-2">
                {prev && revertAction && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => revert(prev)}
                    title={`ย้อนกลับไป: ${prev}`}
                    className="rounded-[24px] border border-hairline px-4 py-3 text-sm font-medium text-ink-soft transition-transform active:scale-[0.98] disabled:opacity-50"
                  >
                    ← ย้อนกลับ
                  </button>
                )}
                {next && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => advance(next)}
                    className="flex-1 rounded-[24px] bg-accent py-3 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
                  >
                    {busy ? "กำลังบันทึก…" : `ไป: ${next} →`}
                  </button>
                )}
              </div>
              {prev && revertAction && !next && (
                <p className="mt-2 text-xs text-muted">ดีลนี้ถึงขั้นสุดท้ายแล้ว — กด “ย้อนกลับ” ได้หากเผลอกดไปต่อ</p>
              )}
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

/** เวลาอัปเดตล่าสุด — วันที่ + เวลา (เขตเวลาไทย) */
function updatedStamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(iso));
  } catch {
    return formatThaiDate(iso);
  }
}

/** แก้สถานะย่อย + หมายเหตุ ของขั้นที่กดเลือก (FAM-1093 P2) */
function StepEditor({ deal, stage, action, onSaved }: { deal: Deal; stage: string; action: (fd: FormData) => Promise<DealActionResult>; onSaved: () => void }) {
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [subStatus, setSubStatus] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existing = deal.steps.find((s) => s.stage === stage) ?? null;
  const key = `${deal.saleId}:${stage}`;
  if (key !== currentKey) {
    setCurrentKey(key);
    setSubStatus(existing?.subStatus ?? "");
    setNote(existing?.note ?? "");
    setError(null);
  }

  const options = substatusOptions(stage);

  async function save(): Promise<void> {
    if (!deal.regId || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("reg_id", deal.regId);
    fd.set("stage", stage);
    fd.set("sub_status", subStatus);
    fd.set("note", note.trim());
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      onSaved();
    } else {
      setError(res.error);
    }
  }

  return (
    <section className="rounded-[12px] border border-accent/40 bg-paper p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-ink">ขั้น: {stage}</span>
        {existing && (
          <span className="text-[11px] text-muted">อัปเดตล่าสุด {updatedStamp(existing.updatedAt)}{existing.updatedByName ? ` · ${existing.updatedByName}` : ""}</span>
        )}
      </div>
      {!deal.regId ? (
        <p className="text-xs text-muted">ดีลนี้ยังไม่มีงานทะเบียน — บันทึกสถานะย่อยไม่ได้</p>
      ) : (
        <div className="flex flex-col gap-3">
          {options.length > 0 && (
            <Field label="สถานะย่อย">
              <select value={subStatus} onChange={(e) => setSubStatus(e.target.value)} className={inputCls}>
                <option value="">— ไม่ระบุ —</option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="หมายเหตุขั้นนี้">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น รอลูกค้าส่งสำเนาบัตร" className={inputCls} />
          </Field>
          {error && <StatusBadge variant="bad">{error}</StatusBadge>}
          <button type="button" onClick={save} disabled={busy} className="self-end rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50">
            {busy ? "กำลังบันทึก…" : "บันทึกขั้นนี้"}
          </button>
        </div>
      )}
    </section>
  );
}

type CustomerDraft = { name: string; phone: string; address: string; taxId: string; note: string };

function draftKey(saleId: string): string {
  return `fam-deal-draft-${saleId}`;
}

/**
 * แก้ข้อมูลลูกค้า/บันทึกในดีล (FAM-1093) — ชื่อ/เบอร์/ที่อยู่(บัตร)/เลขบัตร + โน้ต
 * จำ draft ใน localStorage อัตโนมัติ → เผลอปิด/ย้อนกลับมาแก้ต่อได้โดยไม่ต้องเริ่มใหม่
 */
function CustomerEditSection({ deal, action, onSaved }: { deal: Deal; action: (fd: FormData) => Promise<DealActionResult>; onSaved: () => void }) {
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [f, setF] = useState<CustomerDraft>({ name: "", phone: "", address: "", taxId: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // เปิดดีลใหม่ → prefill · ถ้ามี draft ค้าง ใช้ต่อ + เปิดให้เห็นเลย
  if (deal.saleId !== current) {
    setCurrent(deal.saleId);
    const base: CustomerDraft = {
      name: deal.customerName === "ลูกค้าทั่วไป" ? "" : deal.customerName,
      phone: deal.customerPhone ?? "",
      address: deal.customerAddress ?? "",
      taxId: deal.customerTaxId ?? "",
      note: deal.regNote ?? "",
    };
    let draft: CustomerDraft | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(draftKey(deal.saleId));
        if (raw) {
          draft = JSON.parse(raw) as CustomerDraft;
        }
      } catch {
        draft = null;
      }
    }
    setF(draft ?? base);
    setHasDraft(draft !== null);
    setOpen(draft !== null);
    setError(null);
  }

  function update(patch: Partial<CustomerDraft>): void {
    const next = { ...f, ...patch };
    setF(next);
    setHasDraft(true);
    setError(null);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(draftKey(deal.saleId), JSON.stringify(next));
      } catch {
        /* storage เต็ม/ปิด — ข้ามได้ */
      }
    }
  }

  async function save(): Promise<void> {
    if (f.name.trim() === "" || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("customer_id", deal.customerId);
    if (deal.regId) {
      fd.set("reg_id", deal.regId);
    }
    fd.set("name", f.name.trim());
    fd.set("phone", f.phone.trim());
    fd.set("address", f.address.trim());
    fd.set("tax_id", f.taxId.trim());
    fd.set("note", f.note.trim());
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(draftKey(deal.saleId));
        } catch {
          /* ข้าม */
        }
      }
      setHasDraft(false);
      onSaved();
    } else {
      setError(res.error);
    }
  }

  return (
    <section className="rounded-[12px] border border-hairline bg-paper p-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2">
        <span className="font-medium text-ink">ข้อมูลลูกค้า / บันทึก</span>
        <span className="flex items-center gap-2 text-xs">
          {hasDraft && <span className="rounded-full bg-attn/15 px-2 py-0.5 text-attn">ร่างยังไม่บันทึก</span>}
          <span className="text-ink-soft">{open ? "ย่อ ▲" : "แก้ไข ▼"}</span>
        </span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="ชื่อ-นามสกุล *">
              <input value={f.name} onChange={(e) => update({ name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="เบอร์โทร">
              <input value={f.phone} onChange={(e) => update({ phone: e.target.value })} inputMode="tel" className={inputCls} />
            </Field>
          </div>
          <Field label="ที่อยู่ (ตามบัตร)">
            <input value={f.address} onChange={(e) => update({ address: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="เลขบัตรประชาชน">
              <input value={f.taxId} onChange={(e) => update({ taxId: e.target.value })} inputMode="numeric" placeholder="13 หลัก" className={inputCls} />
            </Field>
            <Field label="หมายเหตุ">
              <input value={f.note} onChange={(e) => update({ note: e.target.value })} className={inputCls} />
            </Field>
          </div>

          {error && <StatusBadge variant="bad">{error}</StatusBadge>}
          <p className="text-[11px] text-muted">ระบบจำสิ่งที่พิมพ์ไว้อัตโนมัติ — เผลอปิดแล้วเปิดใหม่ยังกรอกต่อได้</p>
          <button
            type="button"
            onClick={save}
            disabled={f.name.trim() === "" || busy}
            className="self-end rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกข้อมูลลูกค้า"}
          </button>
        </div>
      )}
    </section>
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

/** ลิสต์ลีด (ลูกค้าที่ยังไม่ปิดการขาย) — ปุ่มเปิดการขาย prefill ชื่อ/เบอร์/รุ่นที่สนใจ */
function LeadsList({ leads, hasAny, onAdd }: { leads: LeadRow[]; hasAny: boolean; onAdd?: () => void }) {
  if (leads.length === 0) {
    return (
      <EmptyState
        icon="users"
        title={hasAny ? "ไม่พบลีดตามคำค้น" : "ยังไม่มีลีด"}
        description={hasAny ? "ลองปรับคำค้นใหม่" : "กด “เพิ่มลูกค้า” เพื่อเก็บข้อมูลลูกค้าไว้ติดตามการขายในอนาคต"}
        action={!hasAny && onAdd ? { label: "เพิ่มลูกค้า", onClick: onAdd } : undefined}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {leads.map((l) => {
        const params = new URLSearchParams({ name: l.name });
        if (l.phone) {
          params.set("phone", l.phone);
        }
        if (l.interestedVariantId) {
          params.set("variant", l.interestedVariantId);
        }
        return (
          <li key={l.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-card p-3 shadow-[var(--sh-sm)]">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">
                {l.name}
                {l.phone && <span className="ml-2 font-mono text-xs text-muted">{l.phone}</span>}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                {l.interestedModel && <span>สนใจ {l.interestedModel}</span>}
                {l.source && <span>· {l.source}</span>}
                <span>· เพิ่ม {formatThaiDate(l.createdAt)}</span>
              </p>
            </div>
            <a
              href={`/sell?${params.toString()}`}
              className="shrink-0 rounded-[24px] bg-accent px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.98]"
            >
              เปิดการขาย
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function AddCustomerModal({
  open,
  variants,
  action,
  onClose,
}: {
  open: boolean;
  variants: { id: string; name: string }[];
  action: (formData: FormData) => Promise<DealActionResult>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [variantId, setVariantId] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (name.trim() === "" || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("phone", phone.trim());
    fd.set("interested_variant_id", variantId);
    fd.set("source", source);
    fd.set("note", note.trim());
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setName("");
      setPhone("");
      setVariantId("");
      setSource("");
      setNote("");
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มลูกค้า">
      <div className="flex flex-col gap-3">
        <Field label="ชื่อลูกค้า *">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ-นามสกุล" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="เบอร์โทร">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputCls} />
          </Field>
          <Field label="ช่องทาง">
            <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
              <option value="">— ไม่ระบุ —</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="รุ่นที่สนใจ">
          <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={inputCls}>
            <option value="">— ไม่ระบุ —</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="หมายเหตุ">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น งบประมาณ / นัดติดตาม" className={inputCls} />
        </Field>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={name.trim() === "" || busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกลูกค้า"}
          </button>
        </div>
      </div>
    </Modal>
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
