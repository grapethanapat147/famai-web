"use client";

import { useState } from "react";
import { Chips } from "@/components/ui/Chips";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { StatCard } from "@/components/ui/StatCard";
import { formatBaht, formatThaiDate } from "@/lib/format";
import { groupAggregate, groupMembers, inRange, monthKeyBE, sumColumn, totalCount, type AggRow } from "@/lib/report/aggregate";
import { toCsv } from "@/lib/report/csv";

export type SaleReportRow = { soldAt: string; model: string; branch: string; salesperson: string; net: number; gross: number | null };
export type ExpenseReportRow = { spentAt: string; category: string; amount: number };
export type ArReportRow = { kind: string; balance: number; settled: boolean };

type ReportType = "sales" | "expense" | "ar";
type Metric = { header: string; money: boolean };
type DetailColumn = { header: string; align?: "right"; money?: boolean };
type DetailCell = string | number;

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

const KIND_LABEL: Record<string, string> = { finance: "ไฟแนนซ์", customer: "ลูกค้า" };

export function ReportView({
  sales,
  expenses,
  receivables,
  canSeeMoney,
  today,
}: {
  sales: SaleReportRow[];
  expenses: ExpenseReportRow[];
  receivables: ArReportRow[];
  canSeeMoney: boolean;
  today: string;
}) {
  const [type, setType] = useState<ReportType>("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [salesGroup, setSalesGroup] = useState<"model" | "branch" | "salesperson" | "month">("model");
  const [expenseGroup, setExpenseGroup] = useState<"category" | "month">("category");
  const [detailKey, setDetailKey] = useState<string | null>(null);

  // ── สร้างตารางตามรายงานที่เลือก ───────────────────────────────────────
  let title = "";
  let groupHeader = "";
  let metrics: Metric[] = [];
  let rows: AggRow[] = [];
  let dateUsed = true;
  // drill-down: คอลัมน์ + ตัวดึงรายการดิบของกลุ่มที่กด (ดูรายละเอียดแต่ละรายการ)
  let detailColumns: DetailColumn[] = [];
  let detailFor: (key: string) => DetailCell[][] = () => [];

  if (type === "sales") {
    title = "ยอดขาย";
    const inR = sales.filter((s) => inRange(s.soldAt, from, to));
    const keyOf = salesGroup === "month" ? (s: SaleReportRow) => monthKeyBE(s.soldAt) : (s: SaleReportRow) => s[salesGroup];
    groupHeader = { model: "รุ่น", branch: "บริษัท", salesperson: "พนักงานขาย", month: "เดือน (พ.ศ.)" }[salesGroup];
    const valueOfs = canSeeMoney
      ? [(s: SaleReportRow) => s.net, (s: SaleReportRow) => s.gross ?? 0]
      : [(s: SaleReportRow) => s.net];
    metrics = canSeeMoney
      ? [{ header: "ยอดสุทธิ", money: true }, { header: "กำไร", money: true }]
      : [{ header: "ยอดสุทธิ", money: true }];
    rows = groupAggregate(inR, keyOf, valueOfs);
    detailColumns = [
      { header: "วันที่" },
      { header: "รุ่น" },
      { header: "บริษัท" },
      { header: "พนักงาน" },
      { header: "ยอดสุทธิ", align: "right", money: true },
      ...(canSeeMoney ? [{ header: "กำไร", align: "right", money: true } as DetailColumn] : []),
    ];
    detailFor = (key) =>
      groupMembers(inR, keyOf, key).map((s) => [
        formatThaiDate(s.soldAt),
        s.model,
        s.branch,
        s.salesperson,
        s.net,
        ...(canSeeMoney ? [s.gross ?? 0] : []),
      ]);
  } else if (type === "expense") {
    title = "ค่าใช้จ่าย";
    const inR = expenses.filter((e) => inRange(e.spentAt, from, to));
    const keyOf = expenseGroup === "month" ? (e: ExpenseReportRow) => monthKeyBE(e.spentAt) : (e: ExpenseReportRow) => e.category;
    groupHeader = expenseGroup === "month" ? "เดือน (พ.ศ.)" : "หมวด";
    metrics = [{ header: "ยอดรวม", money: true }];
    rows = groupAggregate(inR, keyOf, [(e) => e.amount]);
    detailColumns = [{ header: "วันที่" }, { header: "หมวด" }, { header: "ยอด", align: "right", money: true }];
    detailFor = (key) => groupMembers(inR, keyOf, key).map((e) => [formatThaiDate(e.spentAt), e.category, e.amount]);
  } else {
    title = "เงินค้างรับ (คงเหลือ)";
    dateUsed = false;
    const open = receivables.filter((r) => !r.settled && r.balance > 0);
    const keyOf = (r: ArReportRow) => KIND_LABEL[r.kind] ?? r.kind;
    groupHeader = "ประเภท";
    metrics = [{ header: "ยอดค้าง", money: true }];
    rows = groupAggregate(open, keyOf, [(r) => r.balance]);
    detailColumns = [{ header: "ประเภท" }, { header: "ยอดค้าง", align: "right", money: true }];
    detailFor = (key) => groupMembers(open, keyOf, key).map((r) => [keyOf(r), r.balance]);
  }

  const totals = metrics.map((_, i) => sumColumn(rows, i));
  const grandCount = totalCount(rows);
  const detailRecords = detailKey != null ? detailFor(detailKey) : [];

  function exportCsv() {
    const header = [groupHeader, "จำนวน", ...metrics.map((m) => m.header)];
    const body = rows.map((r) => [r.key, r.count, ...r.sums.map((n) => Math.round(n))]);
    const total = ["รวม", grandCount, ...totals.map((n) => Math.round(n))];
    const csv = toCsv([header, ...body, total]);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${type}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Chips
          value={type}
          onChange={(v) => {
            setType(v);
            setDetailKey(null);
          }}
          options={[
            { value: "sales", label: "ยอดขาย" },
            { value: "expense", label: "ค่าใช้จ่าย" },
            { value: "ar", label: "เงินค้างรับ" },
          ]}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft">
            พิมพ์
          </button>
          <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card disabled:opacity-50">
            ส่งออก CSV
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        {dateUsed && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <label className="flex items-center gap-1">
              ตั้งแต่
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${selectClass} w-[150px]`} />
            </label>
            <label className="flex items-center gap-1">
              ถึง
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${selectClass} w-[150px]`} />
            </label>
          </div>
        )}
        {type === "sales" && (
          <Chips
            value={salesGroup}
            onChange={setSalesGroup}
            options={[
              { value: "model", label: "ตามรุ่น" },
              { value: "branch", label: "ตามบริษัท" },
              { value: "salesperson", label: "ตามพนักงาน" },
              { value: "month", label: "ตามเดือน" },
            ]}
          />
        )}
        {type === "expense" && (
          <Chips
            value={expenseGroup}
            onChange={setExpenseGroup}
            options={[
              { value: "category", label: "ตามหมวด" },
              { value: "month", label: "ตามเดือน" },
            ]}
          />
        )}
      </div>

      {rows.length > 0 && (
        <div className={`mb-4 grid grid-cols-2 gap-3 print:hidden ${metrics.length >= 2 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <StatCard label={`จำนวน (${title})`} value={String(grandCount)} hint="รายการ" />
          {metrics.map((m, i) => (
            <StatCard
              key={m.header}
              label={m.header}
              value={<Money value={Math.round(totals[i])} canSee={canSeeMoney} />}
              tone={type === "ar" && i === 0 ? "accent" : "default"}
            />
          ))}
        </div>
      )}

      <div className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display font-semibold text-ink">
            สรุป{title} <span className="text-sm font-normal text-muted">· {grandCount} รายการ</span>
          </h2>
          <span className="text-xs text-muted print:hidden">แตะแถวเพื่อดูรายละเอียด</span>
          {from || to ? <span className="hidden text-xs text-muted print:inline">{from || "…"} — {to || "…"}</span> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left">
                <th className="py-2 pr-3 font-medium text-muted">{groupHeader}</th>
                <th className="py-2 px-3 text-right font-medium text-muted">จำนวน</th>
                {metrics.map((m) => (
                  <th key={m.header} className="py-2 pl-3 text-right font-medium text-muted">
                    {m.header}
                  </th>
                ))}
                <th className="w-6 print:hidden" aria-hidden />
              </tr>
            </thead>
            <tbody className="tabular">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3 + metrics.length} className="py-8 text-center text-muted">
                    ไม่มีข้อมูลในช่วงที่เลือก — ลองปรับช่วงวันที่หรือตัวกรอง
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailKey(r.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailKey(r.key);
                      }
                    }}
                    className="cursor-pointer border-b border-hairline-2 transition-colors hover:bg-paper-2 focus:bg-paper-2 focus:outline-none"
                  >
                    <td className="py-1.5 pr-3 text-ink">{r.key}</td>
                    <td className="py-1.5 px-3 text-right text-ink-soft">{r.count}</td>
                    {r.sums.map((n, i) => (
                      <td key={i} className="py-1.5 pl-3 text-right">
                        {metrics[i].money ? <Money value={Math.round(n)} /> : Math.round(n)}
                      </td>
                    ))}
                    <td className="pl-2 text-right text-muted print:hidden" aria-hidden>
                      ›
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t border-hairline font-semibold text-ink">
                  <td className="py-2 pr-3">รวม</td>
                  <td className="py-2 px-3 text-right">{grandCount}</td>
                  {totals.map((n, i) => (
                    <td key={i} className="py-2 pl-3 text-right tabular">
                      {formatBaht(Math.round(n))}
                    </td>
                  ))}
                  <td className="print:hidden" aria-hidden />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {detailKey != null && (
        <DetailModal
          title={`${title} · ${detailKey}`}
          count={detailRecords.length}
          columns={detailColumns}
          records={detailRecords}
          onClose={() => setDetailKey(null)}
        />
      )}
    </div>
  );
}

function DetailModal({
  title,
  count,
  columns,
  records,
  onClose,
}: {
  title: string;
  count: number;
  columns: DetailColumn[];
  records: DetailCell[][];
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={title} size="lg">
      <p className="mb-3 text-sm text-muted">{count} รายการ</p>
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-hairline text-left">
              {columns.map((c) => (
                <th key={c.header} className={`py-2 font-medium text-muted ${c.align === "right" ? "pl-3 text-right" : "pr-3"}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular">
            {records.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-muted">
                  ไม่มีรายการ
                </td>
              </tr>
            ) : (
              records.map((cells, ri) => (
                <tr key={ri} className="border-b border-hairline-2">
                  {cells.map((cell, ci) => (
                    <td key={ci} className={`py-1.5 text-ink-soft ${columns[ci].align === "right" ? "pl-3 text-right" : "pr-3"}`}>
                      {columns[ci].money ? <Money value={Math.round(Number(cell))} /> : cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
