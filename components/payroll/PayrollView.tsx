"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Money } from "@/components/ui/Money";
import { formatBaht } from "@/lib/format";
import type { PayrollActionResult } from "@/app/(app)/payroll/actions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toCsv } from "@/lib/report/csv";
import { bankFileRows, buildBankFile, ssnFileRows, ssnSummary } from "@/lib/payroll/exports";
import { payrollTotals, type PayslipRow, isPeriodLocked, periodStatusVariant, type PeriodStatus } from "@/lib/payroll/payroll";
import { PrintableEmployeePayslip } from "@/components/payroll/PrintableEmployeePayslip";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";

/** ข้อมูลนำส่ง/โอนต่อพนักงาน — แยกจาก PayslipRow เพราะเป็นข้อมูลอ่อนไหว (FAM-1124) */
export type PayoutInfo = { employeeId: string; ssnNo: string | null; bankCode: string | null; bankAccount: string | null };

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

function otHint(minutes: number): string {
  if (!minutes) {
    return "";
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h ? `${h} ชม.` : ""}${m ? ` ${m} น.` : ""}`.trim();
}

export function PayrollView({
  rows,
  month,
  seller,
  canSeeMoney,
  periodStatus = null,
  canClose = false,
  periodAction,
  payoutInfo = [],
}: {
  rows: PayslipRow[];
  month: string;
  seller: QuoteSeller;
  canSeeMoney: boolean;
  /** สถานะงวด (FAM-1122 · fixlist ข้อ 08) — ปิดแล้ว = ยอดถูกแช่ ไม่คำนวณใหม่ */
  periodStatus?: PeriodStatus | null;
  canClose?: boolean;
  periodAction?: (formData: FormData) => Promise<PayrollActionResult>;
  /** เลขประกันสังคม + บัญชีธนาคาร (FAM-1124) — ว่างเมื่อผู้ใช้ไม่มีสิทธิ์ดูเงิน */
  payoutInfo?: PayoutInfo[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [payslipEmp, setPayslipEmp] = useState<PayslipRow | null>(null);
  const [printTick, setPrintTick] = useState(0);
  const [periodBusy, setPeriodBusy] = useState(false);
  const [periodMsg, setPeriodMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const locked = isPeriodLocked(periodStatus);

  async function runPeriod(action: "close" | "pay" | "reopen") {
    if (!periodAction || periodBusy) {
      return;
    }
    if (action === "reopen" && !window.confirm("เปิดงวดใหม่จะทิ้งยอดที่แช่ไว้ แล้วกลับไปคำนวณสดตามข้อมูลจริง ยืนยันไหม")) {
      return;
    }
    setPeriodBusy(true);
    setPeriodMsg(null);
    const fd = new FormData();
    fd.set("month", month);
    fd.set("action", action);
    const res = await periodAction(fd);
    setPeriodBusy(false);
    setPeriodMsg(res.ok ? { ok: true, text: res.message ?? "บันทึกแล้ว" } : { ok: false, text: res.error });
    if (res.ok) {
      router.refresh();
    }
  }

  // พิมพ์สลิปหลังเอกสารของคนที่เลือก render แล้ว (rAF กันพิมพ์ก่อน paint)
  useEffect(() => {
    if (printTick === 0 || !payslipEmp) {
      return;
    }
    const id = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(id);
  }, [printTick, payslipEmp]);

  function printPayslip(emp: PayslipRow) {
    setPayslipEmp(emp);
    setPrintTick((t) => t + 1);
  }

  const shown = search.trim()
    ? rows.filter((r) => `${r.name} ${r.position}`.toLowerCase().includes(search.trim().toLowerCase()))
    : rows;
  const totals = payrollTotals(shown);

  const infoById = new Map(payoutInfo.map((p) => [p.employeeId, p]));

  function download(name: string, table: (string | number)[][]) {
    const blob = new Blob(["\ufeff" + toCsv(table)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** ข้อ 13 — ใบสรุปนำส่งประกันสังคม */
  function exportSsn() {
    const summary = ssnSummary(
      shown.map((r) => ({
        employeeId: r.employeeId,
        name: r.name,
        ssnNo: infoById.get(r.employeeId)?.ssnNo ?? null,
        base: r.base,
        ssn: r.ssn,
      })),
    );
    if (summary.employeeCount === 0) {
      setExportMsg({ ok: false, text: "งวดนี้ไม่มีใครถูกหักประกันสังคม" });
      return;
    }
    download(`ssn-${month}.csv`, ssnFileRows(summary));
    setExportMsg(
      summary.missingSsnNo.length > 0
        ? { ok: false, text: `ดาวน์โหลดแล้ว แต่ยังขาดเลขประกันสังคม ${summary.missingSsnNo.length} คน (${summary.missingSsnNo.map((r) => r.name).join(", ")}) — ยื่นไม่ผ่านจนกว่าจะกรอก` }
        : { ok: true, text: `ใบนำส่ง ${summary.employeeCount} คน · นำส่งรวม ${formatBaht(summary.grandTotal)}` },
    );
  }

  /** ข้อ 14 — ไฟล์โอนเงินเดือนส่งธนาคาร */
  function exportBank() {
    const result = buildBankFile(
      shown.map((r) => ({
        employeeId: r.employeeId,
        name: r.name,
        bankCode: infoById.get(r.employeeId)?.bankCode ?? null,
        bankAccount: infoById.get(r.employeeId)?.bankAccount ?? null,
        net: r.net,
      })),
    );
    if (result.ready.length === 0) {
      setExportMsg({ ok: false, text: "ไม่มีใครโอนได้ — ยังไม่ได้กรอกเลขบัญชี (แก้ที่หน้าพนักงาน)" });
      return;
    }
    download(`bank-transfer-${month}.csv`, bankFileRows(result.ready));
    setExportMsg(
      result.skipped.length > 0
        ? { ok: false, text: `โอนได้ ${result.ready.length} คน · ต้องจ่ายมือ ${result.skipped.length} คน (${result.skipped.map((s) => `${s.row.name}: ${s.reason}`).join(" · ")})` }
        : { ok: true, text: `ไฟล์โอน ${result.ready.length} คน · รวม ${formatBaht(result.total)}` },
    );
  }

  function exportCsv() {
    const header = ["พนักงาน", "ตำแหน่ง", "ฐานเงินเดือน", "OT", "คอมมิชชั่น", "ประกันสังคม", "เงินสุทธิ"];
    const body = shown.map((r) => [r.name, r.position, r.base, r.otAmount, r.commission, r.ssn, r.net]);
    const total = ["รวม", "", totals.base, totals.otAmount, totals.commission, totals.ssn, totals.net];
    const csv = toCsv([header, ...body, total]);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl">
      {(locked || periodMsg || exportMsg) && (
        <div className="mb-3 flex flex-col gap-2 print:hidden">
          {locked && (
            <p className="rounded-[10px] border border-dashed border-hairline px-3 py-2 text-sm text-ink-soft">
              🔒 งวดนี้ปิดแล้ว — ยอดที่เห็นคือยอดที่แช่ไว้ตอนปิดงวด แก้บันทึกเวลาย้อนหลังจะไม่ทำให้ตัวเลขนี้เปลี่ยน
            </p>
          )}
          {periodMsg && <StatusBadge variant={periodMsg.ok ? "good" : "bad"}>{periodMsg.text}</StatusBadge>}
          {exportMsg && <StatusBadge variant={exportMsg.ok ? "good" : "warn"}>{exportMsg.text}</StatusBadge>}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <label className="flex items-center gap-2 text-sm text-muted">
          งวดเดือน
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && router.push(`?month=${e.target.value}`)}
            className={`${selectClass} w-[150px]`}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge variant={periodStatusVariant(periodStatus)}>{periodStatus ?? "ร่าง (คำนวณสด)"}</StatusBadge>
          {canClose && periodAction && (
            <>
              {!locked && (
                <button
                  type="button"
                  disabled={periodBusy}
                  onClick={() => runPeriod("close")}
                  className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card disabled:opacity-50"
                >
                  {periodBusy ? "กำลังปิดงวด…" : "🔒 ปิดงวด"}
                </button>
              )}
              {periodStatus === "ปิดงวดแล้ว" && (
                <>
                  <button
                    type="button"
                    disabled={periodBusy}
                    onClick={() => runPeriod("pay")}
                    className="rounded-[24px] bg-accent px-4 py-2 text-sm font-medium text-card disabled:opacity-50"
                  >
                    บันทึกว่าจ่ายแล้ว
                  </button>
                  <button
                    type="button"
                    disabled={periodBusy}
                    onClick={() => runPeriod("reopen")}
                    className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft disabled:opacity-50"
                  >
                    เปิดงวดใหม่
                  </button>
                </>
              )}
            </>
          )}
          {canSeeMoney && payoutInfo.length > 0 && (
            <>
              <button type="button" onClick={exportSsn} className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft">
                ใบนำส่ง ปกส.
              </button>
              <button type="button" onClick={exportBank} className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft">
                ไฟล์โอนธนาคาร
              </button>
            </>
          )}
          <button type="button" onClick={() => window.print()} className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft">
            พิมพ์
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={shown.length === 0 || !canSeeMoney}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            ส่งออก CSV
          </button>
        </div>
      </div>

      <div className="mb-4 print:hidden">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="ค้นหาชื่อ / ตำแหน่ง"
          placeholder="ค้นชื่อ / ตำแหน่ง"
          className={`${selectClass} w-full sm:w-64`}
        />
      </div>

      <div className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
        <h2 className="mb-3 font-display font-semibold text-ink">
          สลิปเงินเดือน <span className="text-sm font-normal text-muted">· {shown.length} คน · งวด {month}</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left">
                <th className="py-2 pr-3 font-medium text-muted">พนักงาน</th>
                <th className="py-2 px-3 text-right font-medium text-muted">ฐานเงินเดือน</th>
                <th className="py-2 px-3 text-right font-medium text-muted">OT</th>
                <th className="py-2 px-3 text-right font-medium text-muted">คอมมิชชั่น</th>
                <th className="py-2 px-3 text-right font-medium text-muted">ปกส.</th>
                <th className="py-2 pl-3 text-right font-medium text-muted">เงินสุทธิ</th>
                {canSeeMoney && <th className="py-2 pl-3 text-right font-medium text-muted print:hidden">สลิป</th>}
              </tr>
            </thead>
            <tbody className="tabular">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={canSeeMoney ? 7 : 6} className="py-8 text-center text-muted">
                    ยังไม่มีข้อมูลเงินเดือนในงวดนี้ — เลือกงวดอื่น หรือปรับตัวกรอง
                  </td>
                </tr>
              ) : (
                shown.map((r) => (
                  <tr key={r.employeeId} className="border-b border-hairline-2">
                    <td className="py-1.5 pr-3">
                      <span className="text-ink">{r.name}</span> <span className="text-muted">· {r.position}</span>
                    </td>
                    <td className="py-1.5 px-3 text-right"><Money value={r.base} canSee={canSeeMoney} /></td>
                    <td className="py-1.5 px-3 text-right">
                      <Money value={r.otAmount} canSee={canSeeMoney} />
                      {r.otMinutes ? <span className="ml-1 text-[11px] text-muted">({otHint(r.otMinutes)})</span> : null}
                    </td>
                    <td className="py-1.5 px-3 text-right"><Money value={r.commission} canSee={canSeeMoney} /></td>
                    <td className="py-1.5 px-3 text-right text-accent">{canSeeMoney ? `(${formatBaht(r.ssn, { withSymbol: false })})` : "—"}</td>
                    <td className="py-1.5 pl-3 text-right font-semibold text-ink"><Money value={r.net} canSee={canSeeMoney} /></td>
                    {canSeeMoney && (
                      <td className="py-1.5 pl-3 text-right print:hidden">
                        <button
                          type="button"
                          onClick={() => printPayslip(r)}
                          className="rounded-full border border-hairline px-3 py-1 text-xs text-ink-soft hover:text-ink"
                        >
                          พิมพ์
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {shown.length > 0 && canSeeMoney && (
              <tfoot>
                <tr className="border-t border-hairline font-semibold text-ink">
                  <td className="py-2 pr-3">รวม</td>
                  <td className="py-2 px-3 text-right tabular">{formatBaht(totals.base)}</td>
                  <td className="py-2 px-3 text-right tabular">{formatBaht(totals.otAmount)}</td>
                  <td className="py-2 px-3 text-right tabular">{formatBaht(totals.commission)}</td>
                  <td className="py-2 px-3 text-right tabular text-accent">({formatBaht(totals.ssn, { withSymbol: false })})</td>
                  <td className="py-2 pl-3 text-right tabular">{formatBaht(totals.net)}</td>
                  <td className="print:hidden" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          คำนวณสด: OT = (ฐาน ÷ 240 ชม.) × ชั่วโมง OT × เรต · คอม = กำไรของพนักงานในงวด × % · ปกส. = min(ฐาน × %, เพดาน)
          · ยังไม่รวมเบี้ยเลี้ยง/หักสาย/ภาษี
        </p>
      </div>

      {payslipEmp && <PrintableEmployeePayslip seller={seller} month={month} row={payslipEmp} />}
    </div>
  );
}
