import type { StatusVariant } from "@/components/ui/StatusBadge";

export type DashUnit = {
  branchCode: string;
  branchName: string;
  status: string; // available | reserved | in_transfer | sold | returned
  ageDays: number;
  cost?: number | null; // อาจถูก strip
  id?: string;
  model?: string; // ชื่อรุ่น (สำหรับรายการรถค้าง)
};

const IN_STOCK = new Set(["available", "reserved", "in_transfer"]);

/** คันในสต๊อกที่ค้างเกินเกณฑ์ เรียงจากค้างนานสุด (สำหรับการ์ด "รถค้างนานสุด") */
export function agedUnits(units: DashUnit[], agingDays: number, limit = 5): DashUnit[] {
  return units
    .filter((u) => IN_STOCK.has(u.status) && u.ageDays > agingDays)
    .sort((a, b) => b.ageDays - a.ageDays)
    .slice(0, limit);
}

export type BarItem = { label: string; value: number; tone?: StatusVariant };

export type StockStats = {
  inStockCount: number;
  agedCount: number;
  stockValue: number | null; // null = ไม่มีสิทธิ์ money
  agedValue: number | null;
  byBranch: BarItem[];
  buckets: BarItem[];
};

export function stockStats(
  units: DashUnit[],
  opts: { agingDays: number; buckets: number[]; canSeeMoney: boolean },
): StockStats {
  const inStock = units.filter((u) => IN_STOCK.has(u.status));
  const aged = inStock.filter((u) => u.ageDays > opts.agingDays);

  const sumCost = (list: DashUnit[]): number | null =>
    opts.canSeeMoney ? list.reduce((s, u) => s + (u.cost ?? 0), 0) : null;

  const branchMap = new Map<string, number>();
  for (const u of inStock) {
    branchMap.set(u.branchName, (branchMap.get(u.branchName) ?? 0) + 1);
  }
  const byBranch: BarItem[] = [...branchMap].map(([label, value]) => ({ label, value }));

  // ช่วงอายุจาก settings เช่น [30,60,90] → 4 ช่วง
  const edges = [...opts.buckets].sort((a, b) => a - b);
  const counts = new Array<number>(edges.length + 1).fill(0);
  for (const u of inStock) {
    let idx = edges.findIndex((e) => u.ageDays <= e);
    if (idx === -1) idx = edges.length;
    counts[idx] += 1;
  }
  const variants: StatusVariant[] = ["good", "info", "warn", "bad", "bad"];
  const buckets: BarItem[] = counts.map((value, i) => {
    let label: string;
    if (i === 0) label = `≤ ${edges[0] ?? "?"} วัน`;
    else if (i < edges.length) label = `${edges[i - 1] + 1}–${edges[i]} วัน`;
    else label = `เกิน ${edges[edges.length - 1] ?? "?"} วัน`;
    return { label, value, tone: variants[Math.min(i, variants.length - 1)] };
  });

  return {
    inStockCount: inStock.length,
    agedCount: aged.length,
    stockValue: sumCost(inStock),
    agedValue: sumCost(aged),
    byBranch,
    buckets,
  };
}
