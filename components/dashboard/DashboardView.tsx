"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Money } from "@/components/ui/Money";
import { Chips } from "@/components/ui/Chips";
import { HBarChart } from "@/components/ui/HBarChart";
import { stockStats, type DashUnit } from "@/lib/dashboard/stats";

export function DashboardView({
  units,
  canSeeMoney,
  agingDays,
  buckets,
  overdue,
  soldThisMonth,
}: {
  units: DashUnit[];
  canSeeMoney: boolean;
  agingDays: number;
  buckets: number[];
  overdue: number | null;
  soldThisMonth: number;
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {branches.length > 1 && (
        <Chips
          value={branch}
          onChange={setBranch}
          options={[{ value: "all", label: "ทุกสาขา" }, ...branches.map((b) => ({ value: b.code, label: b.name }))]}
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="สต๊อกคงเหลือ" value={String(stats.inStockCount)} hint="คัน" />
        <StatCard label="มูลค่าสต๊อก" value={<Money value={stats.stockValue} canSee={canSeeMoney} />} />
        <StatCard label={`รถค้างเกิน ${agingDays} วัน`} value={String(stats.agedCount)} hint="คัน" />
        <StatCard label="ทุนจมรถค้าง" value={<Money value={stats.agedValue} canSee={canSeeMoney} />} />
        <StatCard label="ขายเดือนนี้" value={String(soldThisMonth)} hint="คัน" />

        {/* ยอดค้างจ่าย — R1: ตัวแดง เด่น */}
        <StatCard
          label="ยอดค้างจ่าย"
          value={<Money value={overdue} canSee={canSeeMoney} />}
          hint="ต้องติดตาม"
          tone="accent"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
          <h2 className="mb-3 font-display font-semibold text-ink">สต๊อกแยกตามสาขา</h2>
          <HBarChart items={stats.byBranch} />
        </section>
        <section className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
          <h2 className="mb-3 font-display font-semibold text-ink">ช่วงอายุสต๊อก</h2>
          <HBarChart items={stats.buckets} />
        </section>
      </div>
    </div>
  );
}
