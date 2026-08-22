import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveBranches, getCompaniesCached } from "@/lib/reference/cache";
import { getSetting } from "@/lib/settings";
import { latestPrice } from "@/lib/models/rows";
import { parseRateTiers } from "@/lib/quote/finance";
import { canManageQuote, type SavedQuote, type SavedQuoteOption } from "@/lib/quote/quotes";
import { QuoteView, type QuoteFinanceCo, type QuoteVehicle } from "@/components/quote/QuoteView";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";
import { createQuote, deleteQuote, updateQuote } from "./actions";

export const metadata = { title: "ใบเสนอราคา — Famai Motor Group" };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function QuotePage() {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser();

  const { data: quoteRows } = await supabase
    .from("quotation")
    .select("id, doc_no, quote_date, valid_until, customer_name, customer_phone, created_by")
    .order("quote_date", { ascending: false });
  const quotesRaw = quoteRows ?? [];
  const quoteIds = quotesRaw.map((q) => q.id);

  const [optsRes, usersRes, variantsRes, pricesRes, finRes, branches, companies] = await Promise.all([
    quoteIds.length
      ? supabase
          .from("quotation_option")
          .select("quotation_id, slot, variant_id, price, finance_id, down_payment")
          .in("quotation_id", quoteIds)
      : Promise.resolve({ data: [] }),
    supabase.from("app_user").select("id, full_name"),
    supabase.from("model_variant").select("id, code, model_name, model_th"),
    supabase.from("price_history").select("variant_id, effective_from, retail"),
    supabase.from("finance_company").select("id, name, flat_rate_pct, rate_tiers").eq("is_active", true),
    getActiveBranches(),
    getCompaniesCached(),
  ]);

  const optionsByQuote = new Map<string, SavedQuoteOption[]>();
  for (const o of optsRes.data ?? []) {
    const list = optionsByQuote.get(o.quotation_id) ?? [];
    list.push({
      slot: o.slot,
      variantId: o.variant_id,
      price: Number(o.price),
      financeId: o.finance_id,
      down: o.down_payment != null ? Number(o.down_payment) : 0,
    });
    optionsByQuote.set(o.quotation_id, list);
  }
  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));

  const quotes: SavedQuote[] = quotesRaw.map((q) => ({
    id: q.id,
    docNo: q.doc_no,
    customerName: q.customer_name,
    customerPhone: q.customer_phone ?? "",
    quoteDate: q.quote_date,
    validUntil: q.valid_until,
    optionCount: (optionsByQuote.get(q.id) ?? []).length,
    createdByName: (q.created_by && userName.get(q.created_by)) || null,
    options: optionsByQuote.get(q.id) ?? [],
  }));

  const pricesByVariant = new Map<string, Array<{ effective_from: string; retail: number | null }>>();
  for (const p of pricesRes.data ?? []) {
    const list = pricesByVariant.get(p.variant_id) ?? [];
    list.push({ effective_from: p.effective_from, retail: p.retail });
    pricesByVariant.set(p.variant_id, list);
  }

  const vehicles: QuoteVehicle[] = (variantsRes.data ?? [])
    .map((v) => {
      const price = latestPrice(pricesByVariant.get(v.id) ?? []);
      return {
        variantId: v.id,
        code: v.code,
        name: v.model_th ? `${v.model_name} ${v.model_th}` : v.model_name,
        retail: price?.retail != null ? Number(price.retail) : 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  const financeCompanies: QuoteFinanceCo[] = (finRes.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    ratePct: Number(f.flat_rate_pct ?? 0),
    rateTiers: parseRateTiers(f.rate_tiers),
  }));

  const financeTerms = await getSetting("finance_terms");

  const userBranch = branches.find((b) => user?.branchIds.includes(b.id)) ?? branches[0] ?? null;
  const company = userBranch?.company_id
    ? companies.find((c) => c.id === userBranch.company_id) ?? null
    : null;
  const seller: QuoteSeller = {
    shopName: company?.name ?? "Famai Motor Group",
    branchName: userBranch?.name ?? "สำนักงานใหญ่",
    address: userBranch?.address ?? company?.address ?? null,
    phone: userBranch?.phone ?? company?.phone ?? null,
    taxId: userBranch?.tax_id ?? company?.tax_id ?? null,
    sellerName: user?.fullName ?? "",
  };

  return (
    <QuoteView
      quotes={quotes}
      vehicles={vehicles}
      financeCompanies={financeCompanies}
      financeTerms={financeTerms}
      today={todayISO()}
      seller={seller}
      canManage={canManageQuote(user?.roleCodes ?? [])}
      action={createQuote}
      updateAction={updateQuote}
      deleteAction={deleteQuote}
    />
  );
}
