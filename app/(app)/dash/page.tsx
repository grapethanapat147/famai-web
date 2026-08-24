import { createServerSupabase } from "@/lib/supabase/server";
import { canSeeMoney } from "@/lib/auth/money";
import { getBranchesCached } from "@/lib/reference/cache";
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

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function thaiDate(): string {
  const d = new Date();
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export default async function DashPage() {
  const supabase = await createServerSupabase();

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  // scope ฝั่ง DB (FAM-1108) — หน้าแรกเปิดทุกวันบนมือถือ: ดึงเฉพาะรถคงเหลือ/หนี้ค้าง/ยอดเดือนนี้
  // (เดิมดึงทั้งประวัติแล้วทิ้ง — โตตามอายุระบบ และชน cap 1000 แถวแล้วตัวเลขเพี้ยนเงียบๆ)
  const [unitsRes, branches, variantsRes, recRes, saleRes] = await Promise.all([
    supabase
      .from("motorcycle_unit")
      .select("id, branch_id, variant_id, status, received_at, cost")
      .in("status", ["available", "reserved", "in_transfer"]),
    getBranchesCached(),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("receivable").select("balance, settled_at").is("settled_at", null),
    supabase.from("sale").select("sold_at").gte("sold_at", monthStart),
  ]);

  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const variantMap = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const today = todayISO();
  const rawUnits: DashUnit[] = (unitsRes.data ?? []).map((u) => {
    const b = branchMap.get(u.branch_id);
    return {
      id: u.id,
      branchCode: b?.code ?? "?",
      branchName: b?.name ?? "?",
      status: u.status,
      ageDays: computeAgeDays(u.received_at, today),
      cost: u.cost,
      model: variantMap.get(u.variant_id) ?? undefined,
    };
  });

  const see = await canSeeMoney();
  const settings = await getSettings();
  const units = stripMoneyFields(rawUnits, see, ["cost"]) as DashUnit[];

  const overdueRaw = (recRes.data ?? []).reduce((sum, r) => sum + Number(r.balance ?? 0), 0);
  const overdue = see ? overdueRaw : null;

  const soldThisMonth = (saleRes.data ?? []).length;

  return (
    <DashboardView
      units={units}
      canSeeMoney={see}
      agingDays={settings.aging_days}
      buckets={settings.aging_buckets}
      overdue={overdue}
      soldThisMonth={soldThisMonth}
      asOf={thaiDate()}
    />
  );
}
