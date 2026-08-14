"use client";

import { useState, type ReactNode } from "react";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StepBar } from "@/components/ui/StepBar";
import { formatThaiDate } from "@/lib/format";
import { dealTrack, regNext, stageIndex, stageVariant, type RegStage } from "@/lib/deal/stage";
import { filterDeals, isOffTrack, stageCounts, type Deal, type DealActionResult } from "@/lib/deal/deals";
import { REG_STAGES } from "@/lib/deal/stage";
import { finNext, financeActionLabel, financeStatusVariant, isFinanceStatus, type FinanceStatus } from "@/lib/deal/finance";

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export function DealView({
  deals,
  canManage,
  action,
  canManageFinance = false,
  financeAction,
}: {
  deals: Deal[];
  canManage: boolean;
  action: (formData: FormData) => Promise<DealActionResult>;
  canManageFinance?: boolean;
  financeAction?: (formData: FormData) => Promise<DealActionResult>;
}) {
  const [stage, setStage] = useState<RegStage | "all">("all");
  const [search, setSearch] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [selected, setSelected] = useState<Deal | null>(null);

  const counts = stageCounts(deals);
  const rows = filterDeals(deals, { stage, search, onlyOpen });

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
            placeholder="ค้นลูกค้า / รถ / ทะเบียน"
            className={`${selectClass} w-full sm:w-56`}
          />
          <Chips
            value={onlyOpen ? "open" : "all"}
            onChange={(v) => setOnlyOpen(v === "open")}
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "open", label: "ยังไม่ส่งมอบ" },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d.saleId}
        onRowClick={setSelected}
        empty="ไม่พบดีล (หรือยังไม่ได้ล็อกอิน)"
      />

      <DealDrawer
        deal={selected}
        canManage={canManage}
        action={action}
        canManageFinance={canManageFinance}
        financeAction={financeAction}
        onClose={() => setSelected(null)}
        onAdvanced={() => setSelected(null)}
      />
    </div>
  );
}

function DealDrawer({
  deal,
  canManage,
  action,
  canManageFinance,
  financeAction,
  onClose,
  onAdvanced,
}: {
  deal: Deal | null;
  canManage: boolean;
  action: (formData: FormData) => Promise<DealActionResult>;
  canManageFinance: boolean;
  financeAction?: (formData: FormData) => Promise<DealActionResult>;
  onClose: () => void;
  onAdvanced: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [current, setCurrent] = useState<string | null>(null);

  // รีเซ็ต error/เหตุผล เมื่อเปิดดีลใหม่ (เทียบ id ระหว่าง render)
  if (deal && deal.saleId !== current) {
    setCurrent(deal.saleId);
    setError(null);
    setRejectReason("");
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
