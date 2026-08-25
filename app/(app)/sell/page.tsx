import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/auth/money";
import { getBranchesCached } from "@/lib/reference/cache";
import { getSettings } from "@/lib/settings";
import { stripMoneyFields } from "@/lib/auth/strip-money";
import { computeAgeDays } from "@/lib/stock/units";
import { SellForm, type CustomerOption, type FinanceCo, type SellUnit } from "@/components/sell/SellForm";
import type { SellInitial } from "@/lib/sell/sell";
import { recordSale } from "./actions";

export const metadata = { title: "ขายรถ — Famai Motor Group" };

// ของแถม default (spec §7) — ควรมาจากตาราง `freebie` ภายหลัง
const DEFAULT_FREEBIES = [
  { name: "หมวกกันน็อก", cost: 450 },
  { name: "พ.ร.บ.", cost: 320 },
  { name: "ผ้าคลุมรถ", cost: 120 },
  { name: "น้ำมันเครื่อง", cost: 180 },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (k: string): string | undefined => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const supabase = await createServerSupabase();

  const [unitsRes, variantsRes, colorsRes, branches, finRes, custRes] = await Promise.all([
    supabase
      .from("motorcycle_unit")
      .select("id, branch_id, variant_id, color_code, engine_no, frame_no, received_at, cost, retail")
      .eq("status", "available"),
    supabase.from("model_variant").select("id, code, model_name"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    getBranchesCached(),
    supabase.from("finance_company").select("id, name, flat_rate_pct").eq("is_active", true),
    // ลูกค้าเดิมสำหรับเลือกซ้ำ (FAM-1110) — RLS คัดเฉพาะบริษัทที่เข้าถึงได้
    supabase.from("customer").select("id, full_name, phone").order("created_at", { ascending: false }).limit(500),
  ]);

  const customers: CustomerOption[] = (custRes.data ?? []).map((c) => ({
    id: c.id,
    fullName: c.full_name,
    phone: c.phone,
  }));

  const variants = new Map((variantsRes.data ?? []).map((v) => [v.id, v]));
  const colors = new Map((colorsRes.data ?? []).map((c) => [`${c.variant_id}:${c.color_code}`, c.color_name]));
  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const today = todayISO();

  const rawUnits: SellUnit[] = (unitsRes.data ?? []).map((u) => {
    const v = variants.get(u.variant_id);
    const b = branchMap.get(u.branch_id);
    return {
      id: u.id,
      modelCode: v?.code ?? "?",
      modelName: v?.model_name ?? "?",
      colorName: colors.get(`${u.variant_id}:${u.color_code}`) ?? u.color_code,
      engineNo: u.engine_no,
      frameNo: u.frame_no,
      branchCode: b?.code ?? "?",
      branchName: b?.name ?? "?",
      ageDays: computeAgeDays(u.received_at, today),
      retail: u.retail,
      cost: u.cost,
    };
  });

  const see = await canSeeMoney();
  const settings = await getSettings();
  const user = await getCurrentUser();
  const units = stripMoneyFields(rawUnits, see, ["cost"]) as SellUnit[];

  const financeCompanies: FinanceCo[] = (finRes.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    ratePct: Number(f.flat_rate_pct ?? 0),
  }));

  const sellerBranchId = user?.branchIds[0] ?? null;
  const sellerBranchCode = (sellerBranchId && branchMap.get(sellerBranchId)?.code) || null;

  // แปลงใบเสนอราคา→ขาย (FAM-1029): prefill จาก query — หา "คันว่างคันแรก" ของรุ่นที่เสนอไป
  const variantParam = str("variant");
  const preUnit = variantParam ? (unitsRes.data ?? []).find((u) => u.variant_id === variantParam) : undefined;
  const payParam = str("pay");
  const initial: SellInitial | undefined =
    variantParam || str("name")
      ? {
          unitId: preUnit?.id,
          customerName: str("name"),
          customerPhone: str("phone"),
          payMethod: payParam === "finance" ? "finance" : payParam === "cash" ? "cash" : undefined,
          listPrice: str("price") ? Number(str("price")) : undefined,
          downPayment: str("down") ? Number(str("down")) : undefined,
          financeId: str("finance") || undefined,
          months: str("months") ? Number(str("months")) : undefined,
        }
      : undefined;

  return (
    <SellForm
      units={units}
      financeCompanies={financeCompanies}
      freebieOptions={DEFAULT_FREEBIES}
      vatPct={settings.vat_pct}
      agingDays={settings.aging_days}
      freebieIsCost={settings.freebie_is_cost}
      financeTerms={settings.finance_terms}
      canSeeMoney={see}
      sellerBranchCode={sellerBranchCode}
      customers={customers}
      action={recordSale}
      initial={initial}
    />
  );
}
