import { DashboardView } from "@/components/dashboard/DashboardView";
import type { DashUnit } from "@/lib/dashboard/stats";

/** พรีวิว Dashboard ด้วย sample data (FAM-1017) — /dash จริงต่อ DB ผ่าน RLS */
export const metadata = { title: "Dashboard (preview) — Famai" };

const B = {
  fmg: { branchCode: "FMG01", branchName: "Famai Motor Group" },
  fmm: { branchCode: "FMM01", branchName: "Famai Motor" },
  fcg: { branchCode: "FCG01", branchName: "Famai Center Group" },
};

const SAMPLE: DashUnit[] = [
  { ...B.fmg, id: "u1", model: "FINN 115i", status: "available", ageDays: 12, cost: 40800 },
  { ...B.fmg, id: "u2", model: "NMAX 155", status: "available", ageDays: 95, cost: 78000 },
  { ...B.fmg, id: "u3", model: "XMAX 300", status: "available", ageDays: 200, cost: 175000 },
  { ...B.fmg, id: "u4", model: "Grand Filano Hybrid", status: "reserved", ageDays: 40, cost: 62000 },
  { ...B.fmg, id: "u5", model: "Aerox 155", status: "sold", ageDays: 5, cost: 55900 },
  { ...B.fmm, id: "u6", model: "Aerox 155", status: "available", ageDays: 30, cost: 46900 },
  { ...B.fmm, id: "u7", model: "MT-15", status: "available", ageDays: 70, cost: 51000 },
  { ...B.fmm, id: "u8", model: "R15 M", status: "available", ageDays: 120, cost: 189000 },
  { ...B.fcg, id: "u9", model: "Grand Filano", status: "available", ageDays: 15, cost: 41200 },
  { ...B.fcg, id: "u10", model: "Fazzio Hybrid", status: "in_transfer", ageDays: 88, cost: 55900 },
];

export default function DevDashPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <p className="mb-4 text-xs text-muted">preview · sample data — /dash จริงต่อ DB ผ่าน RLS</p>
      <DashboardView
        units={SAMPLE}
        canSeeMoney
        agingDays={90}
        buckets={[30, 60, 90]}
        overdue={128400}
        soldThisMonth={0}
        asOf="19 ส.ค. 2026"
      />
    </main>
  );
}
