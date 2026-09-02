import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/auth/money";
import { canManageAr, type Receivable } from "@/lib/ar/receivables";
import { ArView } from "@/components/ar/ArView";
import { recordPayment } from "./actions";

export const metadata = { title: "เงินค้างรับ — Famai Motor Group" };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ArPage() {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser();

  const { data: recRows } = await supabase
    .from("receivable")
    .select("id, kind, payer_finance_id, sale_id, wholesale_order_id, amount_due, amount_paid, due_at, settled_at, balance")
    .order("due_at", { ascending: true, nullsFirst: false });
  const recs = recRows ?? [];
  const saleIds = [...new Set(recs.map((r) => r.sale_id).filter((id): id is string => Boolean(id)))];
  // เงินค้างรับจากบิลขายส่งไม่ได้ผูกกับ sale (FAM-1128) — ดึงชื่อร้านค้ามาโชว์แทน
  const wholesaleIds = [...new Set(recs.map((r) => r.wholesale_order_id).filter((id): id is string => Boolean(id)))];

  const [salesRes, customersRes, companiesRes, unitsRes, variantsRes, colorsRes, wholesaleRes, wholesaleCoRes] = await Promise.all([
    saleIds.length
      ? supabase.from("sale").select("id, customer_id, unit_id").in("id", saleIds)
      : Promise.resolve({ data: [] }),
    supabase.from("customer").select("id, full_name"),
    supabase.from("finance_company").select("id, name"),
    supabase.from("motorcycle_unit").select("id, variant_id, color_code"),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    wholesaleIds.length
      ? supabase.from("wholesale_order").select("id, order_no, company_id").in("id", wholesaleIds)
      : Promise.resolve({ data: [] }),
    supabase.from("wholesale_company").select("id, name"),
  ]);

  const saleMap = new Map((salesRes.data ?? []).map((s) => [s.id, s]));
  const customerName = new Map((customersRes.data ?? []).map((c) => [c.id, c.full_name]));
  const companyName = new Map((companiesRes.data ?? []).map((c) => [c.id, c.name]));
  const variantName = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const colorName = new Map((colorsRes.data ?? []).map((c) => [`${c.variant_id}:${c.color_code}`, c.color_name]));
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]));
  const wholesaleCoName = new Map((wholesaleCoRes.data ?? []).map((c) => [c.id, c.name]));
  const wholesaleOrder = new Map((wholesaleRes.data ?? []).map((o) => [o.id, o]));

  const receivables: Receivable[] = recs.map((r) => {
    const sale = r.sale_id ? saleMap.get(r.sale_id) : undefined;
    const wo = r.wholesale_order_id ? wholesaleOrder.get(r.wholesale_order_id) : undefined;
    const unit = sale?.unit_id ? unitMap.get(sale.unit_id) : undefined;
    const model = unit ? variantName.get(unit.variant_id) : undefined;
    const color = unit ? colorName.get(`${unit.variant_id}:${unit.color_code}`) : undefined;
    const payerName =
      r.kind === "finance"
        ? (r.payer_finance_id && companyName.get(r.payer_finance_id)) || "ไฟแนนซ์"
        : wo
          ? (wholesaleCoName.get(wo.company_id) ?? "ร้านค้าขายส่ง")
          : (sale?.customer_id && customerName.get(sale.customer_id)) || "ลูกค้า";
    return {
      id: r.id,
      kind: r.kind,
      payerName,
      vehicle: model ? `${model}${color ? ` · ${color}` : ""}` : wo ? `บิลขายส่ง ${wo.order_no}` : "—",
      amountDue: Number(r.amount_due),
      amountPaid: Number(r.amount_paid),
      balance: Number(r.balance),
      dueAt: r.due_at,
      settledAt: r.settled_at,
    };
  });

  return (
    <ArView
      receivables={receivables}
      canManage={canManageAr(user?.roleCodes ?? [])}
      canSeeMoney={await canSeeMoney()}
      today={todayISO()}
      action={recordPayment}
    />
  );
}
