import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { latestPrice } from "@/lib/models/rows";
import { canManageQuote, type QuoteListRow } from "@/lib/quote/quotes";
import { QuoteView, type QuoteFinanceCo, type QuoteVehicle } from "@/components/quote/QuoteView";
import { createQuote } from "./actions";

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
    .select("id, doc_no, quote_date, valid_until, customer_name, created_by")
    .order("quote_date", { ascending: false });
  const quotesRaw = quoteRows ?? [];
  const quoteIds = quotesRaw.map((q) => q.id);

  const [optsRes, usersRes, variantsRes, pricesRes, finRes] = await Promise.all([
    quoteIds.length
      ? supabase.from("quotation_option").select("quotation_id").in("quotation_id", quoteIds)
      : Promise.resolve({ data: [] }),
    supabase.from("app_user").select("id, full_name"),
    supabase.from("model_variant").select("id, code, model_name, model_th"),
    supabase.from("price_history").select("variant_id, effective_from, retail"),
    supabase.from("finance_company").select("id, name, flat_rate_pct").eq("is_active", true),
  ]);

  const optCount = new Map<string, number>();
  for (const o of optsRes.data ?? []) {
    optCount.set(o.quotation_id, (optCount.get(o.quotation_id) ?? 0) + 1);
  }
  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));

  const quotes: QuoteListRow[] = quotesRaw.map((q) => ({
    id: q.id,
    docNo: q.doc_no,
    customerName: q.customer_name,
    quoteDate: q.quote_date,
    validUntil: q.valid_until,
    optionCount: optCount.get(q.id) ?? 0,
    createdByName: (q.created_by && userName.get(q.created_by)) || null,
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
  }));

  const financeTerms = await getSetting("finance_terms");

  return (
    <QuoteView
      quotes={quotes}
      vehicles={vehicles}
      financeCompanies={financeCompanies}
      financeTerms={financeTerms}
      today={todayISO()}
      canManage={canManageQuote(user?.roleCodes ?? [])}
      action={createQuote}
    />
  );
}
