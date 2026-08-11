import { createServerSupabase } from "@/lib/supabase/server";
import { canSeeMoney } from "@/lib/auth/money";
import { getSettings } from "@/lib/settings";
import { stripMoneyFields } from "@/lib/auth/strip-money";
import { computeAgeDays } from "@/lib/stock/units";
import { type DashUnit } from "@/lib/dashboard/stats";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata = { title: "Dashboard — Famai Motor Group" };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DashPage() {
  const supabase = await createServerSupabase();

  const [unitsRes, branchesRes, recRes, saleRes] = await Promise.all([
    supabase.from("motorcycle_unit").select("branch_id, status, received_at, cost"),
    supabase.from("branch").select("id, code, name"),
    supabase.from("receivable").select("balance, settled_at"),
    supabase.from("sale").select("sold_at"),
  ]);

  const branchMap = new Map((branchesRes.data ?? []).map((b) => [b.id, b]));
  const today = todayISO();
  const rawUnits: DashUnit[] = (unitsRes.data ?? []).map((u) => {
    const b = branchMap.get(u.branch_id);
    return {
      branchCode: b?.code ?? "?",
      branchName: b?.name ?? "?",
      status: u.status,
      ageDays: computeAgeDays(u.received_at, today),
      cost: u.cost,
    };
  });

  const see = await canSeeMoney();
  const settings = await getSettings();
  const units = stripMoneyFields(rawUnits, see, ["cost"]) as DashUnit[];

  const overdueRaw = (recRes.data ?? [])
    .filter((r) => r.settled_at == null)
    .reduce((sum, r) => sum + Number(r.balance ?? 0), 0);
  const overdue = see ? overdueRaw : null;

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const soldThisMonth = (saleRes.data ?? []).filter((s) => s.sold_at >= monthStart).length;

  return (
    <DashboardView
      units={units}
      canSeeMoney={see}
      agingDays={settings.aging_days}
      buckets={settings.aging_buckets}
      overdue={overdue}
      soldThisMonth={soldThisMonth}
    />
  );
}
