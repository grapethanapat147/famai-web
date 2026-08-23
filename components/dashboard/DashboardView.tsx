"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { Money } from "@/components/ui/Money";
import { Chips } from "@/components/ui/Chips";
import { HBarChart } from "@/components/ui/HBarChart";
import { stockStats, agedUnits, type DashUnit } from "@/lib/dashboard/stats";

export function DashboardView({
  units,
  canSeeMoney,
  agingDays,
  buckets,
  overdue,
  soldThisMonth,
  asOf,
}: {
  units: DashUnit[];
  canSeeMoney: boolean;
  agingDays: number;
  buckets: number[];
  overdue: number | null;
  soldThisMonth: number;
  asOf?: string;
}) {
  const [branch, setBranch] = useState("all");

  const branches = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of units) m.set(u.branchCode, u.branchName);
    return [...m].map(([code, name]) => ({ code, name }));
  }, [units]);

  const filtered = useMemo(
    () => (branch === "all" ? units : units.filter((u) => u.branchCode === branch)),
    [units, branch],
  );
  const stats = useMemo(
    () => stockStats(filtered, { agingDays, buckets, canSeeMoney }),
    [filtered, agingDays, buckets, canSeeMoney],
  );

  const money = canSeeMoney && stats.stockValue != null;
  const avgCost = money && stats.inStockCount > 0 ? Math.round(stats.stockValue! / stats.inStockCount) : null;
  const branchLabel = branch === "all" ? "ทุกบริษัท" : (branches.find((b) => b.code === branch)?.name ?? "ทุกบริษัท");
  const maxBranch = Math.max(1, ...stats.byBranch.map((b) => b.value));
  const aged = useMemo(() => agedUnits(filtered, agingDays, 5), [filtered, agingDays]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">ภาพรวม</h1>
          <p className="mt-0.5 text-sm text-muted">
            {branchLabel}
            {asOf ? ` · ข้อมูล ณ ${asOf}` : ""}
          </p>
        </div>
        {branches.length > 1 && (
          <Chips
            value={branch}
            onChange={setBranch}
            options={[{ value: "all", label: "ทุกบริษัท" }, ...branches.map((b) => ({ value: b.code, label: b.name }))]}
          />
        )}
      </div>

      {/* แถบหลัก — มูลค่าสต๊อก (สินทรัพย์ก้อนใหญ่) เด่นเป็นพระเอก + ยอดขายเดือนนี้ */}
      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-[16px] bg-card p-5 shadow-[var(--sh-sm)] lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted">
                {money ? "มูลค่าสต๊อกรวม" : "สต๊อกคงเหลือ"}
              </div>
              <div className="mt-1 font-display text-[clamp(2rem,7vw,2.75rem)] font-semibold leading-none text-ink tabular">
                {money ? <Money value={stats.stockValue} canSee /> : stats.inStockCount}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                {money ? (
                  <>
                    <span>
                      <b className="font-semibold tabular text-ink-soft">{stats.inStockCount}</b> คันคงเหลือ
                    </span>
                    {avgCost != null && (
                      <span className="inline-flex items-center gap-1">
                        เฉลี่ย <Money value={avgCost} canSee className="text-ink-soft" />
                        /คัน
                      </span>
                    )}
                  </>
                ) : (
                  <span>คัน</span>
                )}
              </div>
            </div>

            {/* แยกตามบริษัท — mini split (แสดงเมื่อมีหลายบริษัทในมุมมองปัจจุบัน) */}
            {stats.byBranch.length >= 2 && (
              <div className="shrink-0 sm:w-56 sm:border-l sm:border-hairline sm:pl-5">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">แยกตามบริษัท</div>
                <div className="flex flex-col gap-1.5">
                  {stats.byBranch.map((b) => (
                    <div key={b.label} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-ink-soft" title={b.label}>
                        {b.label}
                      </span>
                      <span className="h-1.5 w-14 shrink-0 rounded-full bg-[var(--hairline-2)]">
                        <span
                          className="block h-full rounded-full bg-ink transition-[width] duration-500 ease-[var(--ease)]"
                          style={{ width: `${(b.value / maxBranch) * 100}%` }}
                        />
                      </span>
                      <span className="w-4 shrink-0 text-right tabular text-ink">{b.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col justify-center rounded-[16px] bg-card p-5 shadow-[var(--sh-sm)]">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">ขายเดือนนี้</div>
          <div className="mt-1 font-display text-[clamp(2rem,7vw,2.75rem)] font-semibold leading-none text-ink tabular">
            {soldThisMonth}
          </div>
          <div className="mt-2.5 text-sm text-muted">คัน</div>
        </section>
      </div>

      {/* ต้องจับตา — ความเสี่ยง/สิ่งที่ต้องตาม รวมเป็นกลุ่มให้กวาดตาเจอง่าย */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-attn" aria-hidden />
          ต้องจับตา
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard label={`ค้างเกิน ${agingDays} วัน`} value={String(stats.agedCount)} hint="คัน" />
          <StatCard label="ทุนจมรถค้าง" value={<Money value={stats.agedValue} canSee={canSeeMoney} />} />
          <StatCard
            label="ยอดค้างจ่าย"
            value={<Money value={overdue} canSee={canSeeMoney} />}
            hint="ต้องติดตาม"
            tone="accent"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-display font-semibold text-ink">ช่วงอายุสต๊อก</h2>
            <span className="tabular text-sm text-muted">{stats.inStockCount} คัน</span>
          </div>
          <HBarChart items={stats.buckets} />
        </section>

        <section className="flex flex-col rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-display font-semibold text-ink">รถค้างนานสุด</h2>
            <span className="tabular text-sm text-muted">{stats.agedCount} คัน</span>
          </div>
          {aged.length === 0 ? (
            <p className="flex-1 py-8 text-center text-sm text-muted">ไม่มีรถค้างเกิน {agingDays} วัน 👍</p>
          ) : (
            <ul className="-mx-1.5 flex flex-col">
              {aged.map((u, i) => (
                <li key={u.id ?? i} className="border-b border-hairline-2 last:border-0">
                  <Link
                    href={u.id ? `/stock?unit=${u.id}` : "/stock"}
                    className="flex items-center justify-between gap-3 rounded-[8px] px-1.5 py-2 text-sm transition-colors hover:bg-paper-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-ink">{u.model ?? "ไม่ระบุรุ่น"}</span>
                    <span className="max-w-[96px] shrink-0 truncate text-muted">{u.branchName}</span>
                    <span className="w-16 shrink-0 text-right tabular font-medium text-accent">{u.ageDays} วัน</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/stock" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
            ดูสต๊อกทั้งหมด →
          </Link>
        </section>
      </div>
    </div>
  );
}
