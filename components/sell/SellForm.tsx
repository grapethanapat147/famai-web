"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Chips } from "@/components/ui/Chips";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { computeDeal } from "@/lib/sell/deal";

export type SellUnit = {
  id: string;
  modelCode: string;
  modelName: string;
  colorName: string;
  engineNo: string;
  branchCode: string;
  branchName: string;
  ageDays: number;
  retail: number | null;
  cost?: number | null;
};
export type FinanceCo = { id: string; name: string; ratePct: number };
export type FreebieOption = { name: string; cost: number };

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink tabular";

export function SellForm({
  units,
  financeCompanies,
  freebieOptions,
  vatPct,
  agingDays,
  freebieIsCost,
  financeTerms,
  canSeeMoney,
  sellerBranchCode,
}: {
  units: SellUnit[];
  financeCompanies: FinanceCo[];
  freebieOptions: FreebieOption[];
  vatPct: number;
  agingDays: number;
  freebieIsCost: boolean;
  financeTerms: number[];
  canSeeMoney: boolean;
  sellerBranchCode: string | null;
}) {
  const [unitId, setUnitId] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "finance">("cash");
  const [listPrice, setListPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [financeCoId, setFinanceCoId] = useState("");
  const [months, setMonths] = useState(financeTerms[0] ?? 12);
  const [freebies, setFreebies] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const unit = units.find((u) => u.id === unitId) ?? null;

  function selectUnit(id: string) {
    setUnitId(id);
    setListPrice(units.find((x) => x.id === id)?.retail ?? 0);
    setSaved(false);
  }

  const monthlyRatePct = financeCompanies.find((f) => f.id === financeCoId)?.ratePct ?? 0;
  const freebieCost = useMemo(
    () => freebies.reduce((s, n) => s + (freebieOptions.find((f) => f.name === n)?.cost ?? 0), 0),
    [freebies, freebieOptions],
  );

  const deal = useMemo(
    () =>
      computeDeal({
        listPrice,
        discount,
        cost: unit?.cost ?? null,
        freebieCost,
        freebieIsCost,
        vatPct,
        payMethod,
        downPayment,
        months,
        monthlyRatePct,
      }),
    [listPrice, discount, unit, freebieCost, freebieIsCost, vatPct, payMethod, downPayment, months, monthlyRatePct],
  );

  const aged = unit ? unit.ageDays > agingDays : false;
  const mismatch = unit && sellerBranchCode ? unit.branchCode !== sellerBranchCode : false;
  const belowCost = canSeeMoney && deal.grossProfit != null && deal.grossProfit < 0;

  const toggleFreebie = (name: string) =>
    setFreebies((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <Field label="เลือกคันจากสต๊อก" full>
          <select value={unitId} onChange={(e) => selectUnit(e.target.value)} className={inputCls}>
            <option value="">— เลือกรถ —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.modelName} · {u.colorName} · {u.engineNo} ({u.branchName})
              </option>
            ))}
          </select>
        </Field>

        {unit && (aged || mismatch) && (
          <div className="flex flex-col gap-1">
            {aged && <StatusBadge variant="warn">รถค้างสต๊อก {unit.ageDays} วัน — พิจารณาส่วนลดพิเศษ</StatusBadge>}
            {mismatch && (
              <StatusBadge variant="bad">
                เลือกไม่ตรงกับสาขาที่รถอยู่ ({unit.branchName}) — ให้ย้ายรถก่อน
              </StatusBadge>
            )}
          </div>
        )}

        <Field label="วิธีชำระ" full>
          <Chips
            value={payMethod}
            onChange={(v) => setPayMethod(v)}
            options={[
              { value: "cash", label: "เงินสด" },
              { value: "finance", label: "เงินผ่อน" },
            ]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ราคาตั้ง">
            <input type="number" value={listPrice || ""} onChange={(e) => setListPrice(Number(e.target.value) || 0)} className={inputCls} />
          </Field>
          <Field label="ส่วนลด / โปรโมชั่น">
            <input type="number" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className={inputCls} />
          </Field>
        </div>

        {payMethod === "finance" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="เงินดาวน์">
              <input type="number" value={downPayment || ""} onChange={(e) => setDownPayment(Number(e.target.value) || 0)} className={inputCls} />
            </Field>
            <Field label="จำนวนงวด">
              <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={inputCls}>
                {financeTerms.map((t) => (
                  <option key={t} value={t}>
                    {t} งวด
                  </option>
                ))}
              </select>
            </Field>
            <Field label="บริษัทไฟแนนซ์" full>
              <select value={financeCoId} onChange={(e) => setFinanceCoId(e.target.value)} className={inputCls}>
                <option value="">— เลือก —</option>
                {financeCompanies.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.ratePct}% /เดือน)
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        <Field label="ของแถม (กดเพิ่ม/เอาออก)" full>
          <div className="flex flex-wrap gap-1.5">
            {freebieOptions.map((f) => {
              const on = freebies.includes(f.name);
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => toggleFreebie(f.name)}
                  className={`rounded-full px-3 py-1.5 text-sm ${on ? "bg-ink text-card" : "border border-hairline bg-card text-ink-soft"}`}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </Field>

        <button
          type="button"
          disabled={!unit || mismatch}
          onClick={() => setConfirmOpen(true)}
          className="mt-2 rounded-[24px] bg-accent py-3 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          บันทึกการขาย
        </button>
        {saved && (
          <StatusBadge variant="good">ยืนยันแล้ว (ตัวอย่าง) — บันทึกลง DB จริงรอ sell RPC (deferred)</StatusBadge>
        )}
      </div>

      <aside className="h-max rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)] lg:sticky lg:top-20">
        <h2 className="mb-3 font-display font-semibold text-ink">สรุปดีล</h2>
        <SummaryRow label="ราคาสุทธิ" value={<Money value={deal.netPrice} />} strong />
        <SummaryRow label={`มูลค่าก่อน VAT (${vatPct}%)`} value={<Money value={Math.round(deal.valueBeforeVat)} />} />
        <SummaryRow label="ภาษีมูลค่าเพิ่ม" value={<Money value={Math.round(deal.vat)} />} />

        {payMethod === "finance" && (
          <>
            <div className="my-2 border-t border-hairline-2" />
            <SummaryRow label="ยอดจัด" value={<Money value={deal.financed} />} />
            <SummaryRow
              label={`ค่างวด × ${months} งวด`}
              value={<Money value={deal.monthlyPayment != null ? Math.round(deal.monthlyPayment) : null} />}
              strong
            />
          </>
        )}

        {canSeeMoney && (
          <>
            <div className="my-2 border-t border-hairline-2" />
            <SummaryRow label="ต้นทุน" value={<Money value={unit?.cost ?? null} canSee={canSeeMoney} />} />
            <SummaryRow label="กำไรของดีล" value={<Money value={deal.grossProfit} canSee={canSeeMoney} />} strong />
            <SummaryRow
              label="อัตรากำไร"
              value={
                <span className={belowCost ? "text-accent" : "text-ink-soft"}>
                  {deal.marginPct != null ? `${deal.marginPct.toFixed(1)}%` : "—"}
                </span>
              }
            />
          </>
        )}

        {belowCost && <p className="mt-2 text-xs text-accent">ขายต่ำกว่าทุน — ต้องยืนยันซ้ำ</p>}
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          คิดจาก ราคาสุทธิ = ราคาตั้ง − ส่วนลด
          {canSeeMoney ? ` · กำไร = สุทธิ − ต้นทุน${freebieIsCost ? " − ของแถม" : ""}` : ""}
        </p>
      </aside>

      <ConfirmDialog
        open={confirmOpen}
        message={`ยืนยันบันทึกการขาย ${unit ? `${unit.modelName} · ${unit.colorName}` : ""} ราคาสุทธิ ${deal.netPrice.toLocaleString("en-US")} ฿${belowCost ? " (ต่ำกว่าทุน!)" : ""} — ข้อมูลถูกต้องแล้วใช่ไหม?`}
        confirmLabel="ยืนยันบันทึก"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          setSaved(true);
        }}
      />
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-ink-soft ${full ? "col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className={strong ? "font-semibold text-ink" : "text-ink-soft"}>{value}</span>
    </div>
  );
}
