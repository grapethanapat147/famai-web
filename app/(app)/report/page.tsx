import { createServerSupabase } from "@/lib/supabase/server";
import { canSeeMoney } from "@/lib/auth/money";
import { stripMoneyFields } from "@/lib/auth/strip-money";
import {
  ReportView,
  type ArReportRow,
  type ExpenseReportRow,
  type SaleReportRow,
} from "@/components/report/ReportView";

export const metadata = { title: "รายงาน — Famai Motor Group" };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ReportPage() {
  const supabase = await createServerSupabase();

  const [salesRes, unitsRes, variantsRes, branchesRes, usersRes, expensesRes, categoriesRes, arRes] = await Promise.all([
    supabase.from("sale").select("id, sold_at, unit_id, salesperson_id, branch_id, net_price, gross_profit").is("voided_at", null),
    supabase.from("motorcycle_unit").select("id, variant_id"),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("branch").select("id, name"),
    supabase.from("app_user").select("id, full_name"),
    supabase.from("expense").select("spent_at, category_id, amount"),
    supabase.from("expense_category").select("id, name"),
    supabase.from("receivable").select("kind, balance, settled_at"),
  ]);

  const variantName = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const branchName = new Map((branchesRes.data ?? []).map((b) => [b.id, b.name]));
  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));
  const categoryName = new Map((categoriesRes.data ?? []).map((c) => [c.id, c.name]));
  const unitVariant = new Map((unitsRes.data ?? []).map((u) => [u.id, u.variant_id]));

  const rawSales: SaleReportRow[] = (salesRes.data ?? []).map((s) => {
    const variantId = s.unit_id ? unitVariant.get(s.unit_id) : undefined;
    return {
      soldAt: s.sold_at,
      model: (variantId && variantName.get(variantId)) || "—",
      branch: branchName.get(s.branch_id) ?? "—",
      salesperson: (s.salesperson_id && userName.get(s.salesperson_id)) || "ไม่ระบุ",
      net: Number(s.net_price),
      gross: s.gross_profit != null ? Number(s.gross_profit) : null,
    };
  });

  const see = await canSeeMoney();
  const sales = stripMoneyFields(rawSales, see, ["gross"]) as SaleReportRow[];

  const expenses: ExpenseReportRow[] = (expensesRes.data ?? []).map((e) => ({
    spentAt: e.spent_at,
    category: categoryName.get(e.category_id) ?? "—",
    amount: Number(e.amount),
  }));

  const receivables: ArReportRow[] = (arRes.data ?? []).map((r) => ({
    kind: r.kind,
    balance: Number(r.balance),
    settled: r.settled_at != null,
  }));

  return (
    <ReportView sales={sales} expenses={expenses} receivables={receivables} canSeeMoney={see} today={todayISO()} />
  );
}
