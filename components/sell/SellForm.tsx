"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Chips } from "@/components/ui/Chips";
import { Combobox } from "@/components/ui/Combobox";
import { Money } from "@/components/ui/Money";
import { MoneyStepInput } from "@/components/ui/MoneyStepInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { computeDeal } from "@/lib/sell/deal";
import type { SellActionResult, SellInitial } from "@/lib/sell/sell";

export type SellUnit = {
  id: string;
  modelCode: string;
  modelName: string;
  colorName: string;
  engineNo: string;
  frameNo: string;
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
  action,
  initial,
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
  action?: (formData: FormData) => Promise<SellActionResult>;
  initial?: SellInitial;
}) {
  const fromQuote = !!initial && (!!initial.unitId || !!initial.customerName);
  const initListPrice =
    initial?.listPrice ?? (initial?.unitId ? (units.find((u) => u.id === initial.unitId)?.retail ?? 0) : 0);
  const [unitId, setUnitId] = useState(initial?.unitId ?? "");
  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [payMethod, setPayMethod] = useState<"cash" | "finance">(initial?.payMethod ?? "cash");
  const [listPrice, setListPrice] = useState(initListPrice ?? 0);
  const [discount, setDiscount] = useState(0);
  const [downPayment, setDownPayment] = useState(initial?.downPayment ?? 0);
  const [note, setNote] = useState("");
  const [financeCoId, setFinanceCoId] = useState(initial?.financeId ?? "");
  const [months, setMonths] = useState(initial?.months ?? financeTerms[0] ?? 12);
  const [freebies, setFreebies] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedDoc, setSavedDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unit = units.find((u) => u.id === unitId) ?? null;

  function selectUnit(id: string) {
    setUnitId(id);
    setListPrice(units.find((x) => x.id === id)?.retail ?? 0);
    setSavedDoc(null);
    setError(null);
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

  async function submitSale() {
    if (!unit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    if (!action) {
      // โหมดพรีวิว (ไม่มี action) — แสดงผลตัวอย่าง
      setBusy(false);
      setSavedDoc("ตัวอย่าง");
      return;
    }
    const fd = new FormData();
    fd.set("unit_id", unit.id);
    fd.set("customer_name", customerName.trim());
    fd.set("customer_phone", customerPhone.trim());
    fd.set("pay_method", payMethod);
    fd.set("list_price", String(listPrice));
    fd.set("discount", String(discount));
    fd.set("freebie_cost", String(freebieCost));
    fd.set("note", note);
    if (payMethod === "finance") {
      fd.set("finance_id", financeCoId);
      fd.set("down_payment", String(downPayment));
      fd.set("term_months", String(months));
    }
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setSavedDoc(res.docNo ?? "บันทึกแล้ว");
      // รีเซ็ตฟอร์มกันบันทึกซ้ำ
      setNote("");
      setUnitId("");
      setCustomerName("");
      setCustomerPhone("");
      setDiscount(0);
      setDownPayment(0);
      setFreebies([]);
    } else {
      setError(res.error);
    }
  }

  const toggleFreebie = (name: string) =>
    setFreebies((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        {fromQuote && (
          <StatusBadge variant="good">แปลงจากใบเสนอราคา — ตรวจคัน/ราคาแล้วยืนยันบันทึก{unitId ? "" : " (ยังไม่มีรถว่างของรุ่นนี้ — เลือกคันเอง)"}</StatusBadge>
        )}
        <Field label="เลือกคันจากสต๊อก (พิมพ์ค้นได้)" full>
          <Combobox
            ariaLabel="เลือกคันจากสต๊อก"
            placeholder="พิมพ์รุ่น / สี / รหัสรุ่น / เลขถัง / เลขเครื่อง…"
            value={unitId}
            onChange={selectUnit}
            emptyText="ไม่พบรถในสต๊อก"
            options={units.map((u) => ({
              value: u.id,
              label: `${u.modelName} · ${u.colorName}`,
              sub: `${u.modelCode} · ถัง ${u.frameNo}`,
              keywords: `${u.modelCode} ${u.frameNo} ${u.engineNo} ${u.branchName}`,
            }))}
          />
        </Field>

        {unit && (
          <div className="flex flex-col gap-2 rounded-[12px] border border-hairline bg-paper-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-display font-semibold text-ink">
                  {unit.modelName} · {unit.colorName}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                  <span className="font-mono">{unit.engineNo}</span>
                  <span>{unit.branchName}</span>
                </div>
              </div>
              <StatusBadge variant={aged ? "warn" : "good"}>{unit.ageDays} วัน</StatusBadge>
            </div>
            {(aged || mismatch) && (
              <div className="flex flex-col gap-1 border-t border-hairline-2 pt-2">
                {aged && <StatusBadge variant="warn">รถค้างสต๊อก {unit.ageDays} วัน — พิจารณาส่วนลดพิเศษ</StatusBadge>}
                {mismatch && (
                  <StatusBadge variant="bad">เลือกไม่ตรงกับบริษัทที่รถอยู่ ({unit.branchName}) — ให้ย้ายรถก่อน</StatusBadge>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="ชื่อลูกค้า *">
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="ชื่อ-นามสกุล" className={inputCls} />
          </Field>
          <Field label="เบอร์โทร">
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} inputMode="tel" className={inputCls} />
          </Field>
        </div>

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
            <MoneyStepInput value={listPrice} onChange={setListPrice} ariaLabel="ราคาตั้ง" />
          </Field>
          <Field label="ส่วนลด / โปรโมชั่น">
            <MoneyStepInput value={discount} onChange={setDiscount} ariaLabel="ส่วนลด" />
          </Field>
        </div>

        {payMethod === "finance" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="เงินดาวน์">
              <MoneyStepInput value={downPayment} onChange={setDownPayment} ariaLabel="เงินดาวน์" />
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
                  aria-pressed={on}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition active:scale-95 ${
                    on ? "bg-ink text-card" : "border border-hairline bg-card text-ink-soft hover:border-ink/40 hover:text-ink"
                  }`}
                >
                  {f.name}
                  {canSeeMoney && (
                    <span className={on ? "text-card/60" : "text-muted"}>฿{f.cost.toLocaleString("en-US")}</span>
                  )}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="หมายเหตุ (ถ้ามี)" full>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="เงื่อนไขพิเศษ / ข้อตกลง / สิ่งที่ต้องจำ"
            className={inputCls}
          />
        </Field>

        <button
          type="button"
          disabled={!unit || mismatch || customerName.trim() === "" || busy}
          onClick={() => setConfirmOpen(true)}
          className="mt-2 rounded-[24px] bg-accent py-3 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? "กำลังบันทึก…" : "บันทึกการขาย"}
        </button>
        {savedDoc && (
          <StatusBadge variant="good">
            บันทึกการขายแล้ว{savedDoc !== "ตัวอย่าง" ? ` — เลขที่ ${savedDoc}` : " (ตัวอย่าง)"}
          </StatusBadge>
        )}
        {error && <StatusBadge variant="bad">{error}</StatusBadge>}
      </div>

      <aside className="h-max rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)] lg:sticky lg:top-20">
        <h2 className="mb-3 font-display font-semibold text-ink">สรุปดีล</h2>
        {!unit ? (
          <p className="py-8 text-center text-sm leading-relaxed text-muted">
            เลือกคันจากสต๊อก
            <br />
            เพื่อดูสรุปดีล
          </p>
        ) : (
          <>
            <div className="mb-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted">ราคาสุทธิ</div>
              <div className="mt-0.5 font-display text-[26px] font-semibold leading-none text-ink tabular">
                <Money value={deal.netPrice} />
              </div>
            </div>
            <SummaryRow label={`มูลค่าก่อน VAT (${vatPct}%)`} value={<Money value={Math.round(deal.valueBeforeVat)} />} />
            <SummaryRow label="ภาษีมูลค่าเพิ่ม" value={<Money value={Math.round(deal.vat)} />} />

            {payMethod === "finance" && (
              <>
                <div className="my-3 border-t border-hairline-2" />
                <SummaryRow label="ยอดจัด" value={<Money value={deal.financed} />} />
                <div className="mt-1.5">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted">ค่างวด/เดือน</div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="font-display text-[26px] font-semibold leading-none text-ink tabular">
                      <Money value={deal.monthlyPayment != null ? Math.round(deal.monthlyPayment) : null} />
                    </span>
                    <span className="text-sm text-muted">× {months} งวด</span>
                  </div>
                </div>
              </>
            )}

            {canSeeMoney && (
              <>
                <div className="my-3 border-t border-hairline-2" />
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
          </>
        )}
      </aside>

      <ConfirmDialog
        open={confirmOpen}
        message={`ยืนยันบันทึกการขาย ${unit ? `${unit.modelName} · ${unit.colorName}` : ""} ราคาสุทธิ ${deal.netPrice.toLocaleString("en-US")} ฿${belowCost ? " (ต่ำกว่าทุน!)" : ""} — ข้อมูลถูกต้องแล้วใช่ไหม?`}
        confirmLabel="ยืนยันบันทึก"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void submitSale();
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
