"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Money } from "@/components/ui/Money";
import { formatBaht } from "@/lib/format";
import { toCsv } from "@/lib/report/csv";
import { payrollTotals, type PayslipRow } from "@/lib/payroll/payroll";

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

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
  canSeeMoney,
}: {
  rows: PayslipRow[];
  month: string;
  canSeeMoney: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const shown = search.trim()
    ? rows.filter((r) => `${r.name} ${r.position}`.toLowerCase().includes(search.trim().toLowerCase()))
    : rows;
  const totals = payrollTotals(shown);

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
        <div className="flex gap-2">
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
              </tr>
            </thead>
            <tbody className="tabular">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
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
    </div>
  );
}
