import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageDeal, canVoidDeal, type Deal, type FinanceInfo, type ServiceHistory } from "@/lib/deal/deals";
import { canManageFinance } from "@/lib/deal/finance";
import { isRegStage, type PayMethod, type RegStage } from "@/lib/deal/stage";
import { DealView } from "@/components/deal/DealView";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";
import { advanceFinance, advanceRegistration, voidDeal } from "./actions";

export const metadata = { title: "ลูกค้าและดีล — Famai Motor Group" };

export default async function DealPage() {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser();

  // ดีล = การขายที่ยังไม่ถูกยกเลิก · ล่าสุดขึ้นบน (R1)
  const { data: saleRows } = await supabase
    .from("sale")
    .select("id, customer_id, unit_id, pay_method, net_price, sold_at")
    .is("voided_at", null)
    .order("sold_at", { ascending: false });
  const sales = saleRows ?? [];
  const saleIds = sales.map((s) => s.id);

  const [regsRes, finRes, customersRes, companiesRes, unitsRes, variantsRes, colorsRes, branchRes, orgCompanyRes] = await Promise.all([
    saleIds.length
      ? supabase.from("registration").select("id, sale_id, stage, plate_no").in("sale_id", saleIds)
      : Promise.resolve({ data: [] }),
    saleIds.length
      ? supabase.from("finance_case").select("id, sale_id, company_id, status, amount, reject_reason").in("sale_id", saleIds)
      : Promise.resolve({ data: [] }),
    supabase.from("customer").select("id, full_name"),
    supabase.from("finance_company").select("id, name"),
    supabase.from("motorcycle_unit").select("id, variant_id, color_code, engine_no"),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    supabase.from("branch").select("id, name, address, phone, tax_id, company_id").eq("is_active", true),
    supabase.from("company").select("id, name, address, phone, tax_id"),
  ]);

  type FinRow = {
    id: string;
    sale_id: string | null;
    company_id: string;
    status: string;
    amount: number | null;
    reject_reason: string | null;
  };
  const regBySale = new Map((regsRes.data ?? []).map((r) => [r.sale_id, r]));
  const finBySale = new Map<string, FinRow>();
  for (const f of (finRes.data ?? []) as FinRow[]) {
    if (f.sale_id && !finBySale.has(f.sale_id)) {
      finBySale.set(f.sale_id, f);
    }
  }
  const customerName = new Map((customersRes.data ?? []).map((c) => [c.id, c.full_name]));
  const companyName = new Map((companiesRes.data ?? []).map((c) => [c.id, c.name]));
  const variantName = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const colorName = new Map((colorsRes.data ?? []).map((c) => [`${c.variant_id}:${c.color_code}`, c.color_name]));
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]));

  const deals: Deal[] = sales.map((s) => {
    const reg = s.id ? regBySale.get(s.id) : undefined;
    const fin = finBySale.get(s.id);
    const unit = s.unit_id ? unitMap.get(s.unit_id) : undefined;
    const model = unit ? variantName.get(unit.variant_id) : undefined;
    const color = unit ? colorName.get(`${unit.variant_id}:${unit.color_code}`) : undefined;
    const payMethod: PayMethod = s.pay_method === "finance" ? "finance" : "cash";
    const stage: RegStage = reg && isRegStage(reg.stage) ? reg.stage : "ขายแล้ว";
    const finance: FinanceInfo | null = fin
      ? {
          id: fin.id,
          companyName: companyName.get(fin.company_id) ?? "—",
          status: fin.status,
          amount: fin.amount != null ? Number(fin.amount) : null,
          rejectReason: fin.reject_reason,
        }
      : null;
    return {
      saleId: s.id,
      regId: reg?.id ?? null,
      customerId: s.customer_id ?? "",
      customerName: (s.customer_id && customerName.get(s.customer_id)) || "ลูกค้าทั่วไป",
      vehicle: model ? `${model}${color ? ` · ${color}` : ""}` : "—",
      engineNo: unit?.engine_no ?? "",
      payMethod,
      netPrice: Number(s.net_price),
      soldAt: s.sold_at,
      stage,
      plateNo: reg?.plate_no ?? null,
      finance,
    };
  });

  // ประวัติบริการของลูกค้า (จาก service_job) — โชว์ในแผงดีล
  const { data: svcRows } = await supabase
    .from("service_job")
    .select("customer_id, service_type, checked_in_at, status, total");
  const services: ServiceHistory[] = (svcRows ?? [])
    .filter((s) => s.customer_id != null)
    .map((s) => ({
      customerId: s.customer_id as string,
      serviceType: s.service_type ?? "บริการ",
      checkedInAt: s.checked_in_at,
      status: s.status,
      total: Number(s.total ?? 0),
    }));

  const branches = branchRes.data ?? [];
  const userBranch = branches.find((b) => user?.branchIds.includes(b.id)) ?? branches[0] ?? null;
  const org = userBranch?.company_id
    ? (orgCompanyRes.data ?? []).find((c) => c.id === userBranch.company_id) ?? null
    : null;
  const seller: QuoteSeller = {
    shopName: org?.name ?? "Famai Motor Group",
    branchName: userBranch?.name ?? "สำนักงานใหญ่",
    address: userBranch?.address ?? org?.address ?? null,
    phone: userBranch?.phone ?? org?.phone ?? null,
    taxId: userBranch?.tax_id ?? org?.tax_id ?? null,
    sellerName: user?.fullName ?? "",
  };

  const roleCodes = user?.roleCodes ?? [];
  return (
    <DealView
      deals={deals}
      services={services}
      seller={seller}
      canManage={canManageDeal(roleCodes)}
      action={advanceRegistration}
      canManageFinance={canManageFinance(roleCodes)}
      financeAction={advanceFinance}
      canVoid={canVoidDeal(roleCodes)}
      voidAction={voidDeal}
    />
  );
}
