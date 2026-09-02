import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/auth/money";
import { getBranchesCached } from "@/lib/reference/cache";
import { stripMoneyFields } from "@/lib/auth/strip-money";
import {
  canManageWholesaleCompanies,
  canSellWholesale,
  type WholesaleCompany,
  type WholesaleOrderRow,
  type WholesaleUnit,
} from "@/lib/wholesale/wholesale";
import { WholesaleView } from "@/components/wholesale/WholesaleView";
import { recordWholesaleSale, saveWholesaleCompany } from "./actions";

export const metadata = { title: "ขายส่ง (B2B) — Famai Motor Group" };

/** บิลขายส่งโตตามเวลา — ดึงแค่ล่าสุด (บทเรียนเดียวกับหน้าใบงานซ่อม) */
const LIMIT = 200;

export default async function WholesalePage() {
  const me = await getCurrentUser();
  if (!me || !canSellWholesale(me.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        ดูงานขายส่งได้เฉพาะผู้ดูแล / ผู้บริหาร / ทีมขาย
      </p>
    );
  }

  const supabase = await createServerSupabase();
  const [ordersRes, companiesRes, unitsRes, variantsRes, colorsRes, usersRes, branches] = await Promise.all([
    supabase
      .from("wholesale_order")
      .select("id, company_id, order_no, sold_at, salesperson_id, total, gross_profit, voided_at")
      .order("sold_at", { ascending: false })
      .limit(LIMIT),
    supabase.from("wholesale_company").select("id, name, tax_id, address, phone, contact_name, credit_days, is_active").order("name"),
    supabase
      .from("motorcycle_unit")
      .select("id, branch_id, variant_id, color_code, engine_no, frame_no, cost, retail")
      .eq("status", "available"),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    supabase.from("app_user").select("id, full_name"),
    getBranchesCached(),
  ]);

  const orderIds = (ordersRes.data ?? []).map((o) => o.id);
  const { data: lineRows } = orderIds.length
    ? await supabase.from("wholesale_order_line").select("order_id").in("order_id", orderIds)
    : { data: [] };
  const unitCount = new Map<string, number>();
  for (const l of lineRows ?? []) {
    unitCount.set(l.order_id, (unitCount.get(l.order_id) ?? 0) + 1);
  }

  const companyName = new Map((companiesRes.data ?? []).map((c) => [c.id, c.name]));
  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));
  const variantName = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const colorName = new Map((colorsRes.data ?? []).map((c) => [`${c.variant_id}:${c.color_code}`, c.color_name]));
  const branchName = new Map(branches.map((b) => [b.id, b.name]));

  const see = await canSeeMoney();

  const rawOrders: WholesaleOrderRow[] = (ordersRes.data ?? []).map((o) => ({
    id: o.id,
    orderNo: o.order_no,
    companyName: companyName.get(o.company_id) ?? "—",
    soldAt: o.sold_at,
    units: unitCount.get(o.id) ?? 0,
    total: Number(o.total ?? 0),
    gross: o.gross_profit != null ? Number(o.gross_profit) : null,
    salespersonName: (o.salesperson_id && userName.get(o.salesperson_id)) || "—",
    voided: o.voided_at != null,
  }));
  const orders = stripMoneyFields(rawOrders, see, ["gross"]) as WholesaleOrderRow[];

  const companies: WholesaleCompany[] = (companiesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    taxId: c.tax_id ?? null,
    address: c.address ?? null,
    phone: c.phone ?? null,
    contactName: c.contact_name ?? null,
    creditDays: Number(c.credit_days ?? 0),
    isActive: Boolean(c.is_active),
  }));

  const rawUnits: WholesaleUnit[] = (unitsRes.data ?? []).map((u) => ({
    id: u.id,
    branchId: u.branch_id,
    branchName: branchName.get(u.branch_id) ?? "—",
    model: variantName.get(u.variant_id) ?? "ไม่ระบุรุ่น",
    color: colorName.get(`${u.variant_id}:${u.color_code}`) ?? "—",
    engineNo: u.engine_no ?? "",
    frameNo: u.frame_no ?? "",
    cost: u.cost != null ? Number(u.cost) : null,
    retail: u.retail != null ? Number(u.retail) : null,
  }));
  const units = stripMoneyFields(rawUnits, see, ["cost"]) as WholesaleUnit[];

  return (
    <WholesaleView
      orders={orders}
      companies={companies}
      units={units}
      canSell={canSellWholesale(me.roleCodes)}
      canManageCompanies={canManageWholesaleCompanies(me.roleCodes)}
      canSeeMoney={see}
      sellAction={recordWholesaleSale}
      companyAction={saveWholesaleCompany}
    />
  );
}
