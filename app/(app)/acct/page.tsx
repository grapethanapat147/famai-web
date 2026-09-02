import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSettingsCached } from "@/lib/reference/cache";
import { canManageAccount, parseDocItem, type DocDetail, type IssuableSale, type PartySnapshot } from "@/lib/acct/documents";
import { AcctView } from "@/components/acct/AcctView";
import { issueReceipt, issueTaxInvoice, updateDocument, voidDocument } from "./actions";

export const metadata = { title: "บัญชี — Famai Motor Group" };

function party(snapshot: unknown): PartySnapshot {
  const s = (snapshot ?? {}) as Record<string, unknown>;
  return {
    name: typeof s.name === "string" ? s.name : "—",
    address: typeof s.address === "string" ? s.address : null,
    taxId: typeof s.taxId === "string" ? s.taxId : null,
    phone: typeof s.phone === "string" ? s.phone : null,
  };
}

export async function AccountingPage({ initialDocType = "all" }: { initialDocType?: "all" | "RECEIPT" | "TAXINV" }) {
  const user = await getCurrentUser();
  if (!user || !canManageAccount(user.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        งานบัญชีเข้าได้เฉพาะผู้ดูแล / ผู้บริหาร / ฝ่ายบัญชี
      </p>
    );
  }

  const supabase = await createServerSupabase();
  const [settings, docsRes, salesRes, unitsRes, variantsRes, colorsRes, customersRes] = await Promise.all([
    getSettingsCached(),
    supabase
      .from("document")
      .select("id, doc_type, doc_no, doc_date, sale_id, amount_base, amount_vat, amount_total, seller_snapshot, buyer_snapshot, voided_at")
      .order("doc_no", { ascending: false }),
    supabase.from("sale").select("id, customer_id, unit_id, net_price, sold_at, public_token").is("voided_at", null).order("sold_at", { ascending: false }),
    supabase.from("motorcycle_unit").select("id, variant_id, color_code, engine_no, frame_no"),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    supabase.from("customer").select("id, full_name"),
  ]);

  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]));
  const variantName = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const colorName = new Map((colorsRes.data ?? []).map((c) => [`${c.variant_id}:${c.color_code}`, c.color_name]));
  const customerName = new Map((customersRes.data ?? []).map((c) => [c.id, c.full_name]));

  function vehicleOf(saleId: string | null): { vehicle: string; engineNo: string; frameNo: string } {
    const sale = saleId ? (salesRes.data ?? []).find((s) => s.id === saleId) : undefined;
    const unit = sale?.unit_id ? unitMap.get(sale.unit_id) : undefined;
    if (!unit) {
      return { vehicle: "—", engineNo: "", frameNo: "" };
    }
    const model = variantName.get(unit.variant_id);
    const color = colorName.get(`${unit.variant_id}:${unit.color_code}`);
    return { vehicle: model ? `${model}${color ? ` · ${color}` : ""}` : "—", engineNo: unit.engine_no, frameNo: unit.frame_no };
  }

  // รหัสให้ลูกค้าเช็กสถานะเองที่ /status — พิมพ์ท้ายใบเสร็จ (FAM-1117 · fixlist ข้อ 06)
  const tokenBySale = new Map((salesRes.data ?? []).map((s) => [s.id, s.public_token]));

  const docs: DocDetail[] = (docsRes.data ?? []).map((d) => {
    // รายการรถ: ใช้ snapshot ที่แช่ไว้ (แก้ไขได้) ก่อน — เอกสารเก่าที่ไม่มี fallback ไปดึงจากการขาย
    const stored = parseDocItem(d.buyer_snapshot);
    const item = stored && stored.vehicle ? stored : vehicleOf(d.sale_id);
    return {
      id: d.id,
      docType: d.doc_type,
      docNo: d.doc_no,
      date: d.doc_date,
      seller: party(d.seller_snapshot),
      buyer: party(d.buyer_snapshot),
      base: Number(d.amount_base ?? 0),
      vat: Number(d.amount_vat ?? 0),
      total: Number(d.amount_total ?? 0),
      voided: d.voided_at != null,
      publicToken: d.sale_id ? (tokenBySale.get(d.sale_id) ?? null) : null,
      vehicle: item.vehicle || "—",
      engineNo: item.engineNo,
      frameNo: item.frameNo,
    };
  });

  const receiptSaleIds = new Set((docsRes.data ?? []).filter((d) => d.doc_type === "RECEIPT" && d.sale_id).map((d) => d.sale_id));
  const taxinvSaleIds = new Set((docsRes.data ?? []).filter((d) => d.doc_type === "TAXINV" && d.sale_id).map((d) => d.sale_id));

  function issuableSale(saleId: string): IssuableSale {
    const s = (salesRes.data ?? []).find((x) => x.id === saleId)!;
    return {
      saleId: s.id,
      customerName: (s.customer_id && customerName.get(s.customer_id)) || "ลูกค้าทั่วไป",
      vehicle: vehicleOf(s.id).vehicle,
      netPrice: Number(s.net_price),
      soldAt: s.sold_at,
      hasReceipt: receiptSaleIds.has(s.id),
    };
  }

  // ใบเสร็จ: การขายที่ยังไม่มีใบเสร็จ · ใบกำกับภาษี: การขายที่มีใบเสร็จแล้วแต่ยังไม่มีใบกำกับ
  const receiptIssuable: IssuableSale[] = (salesRes.data ?? []).filter((s) => !receiptSaleIds.has(s.id)).map((s) => issuableSale(s.id));
  const taxinvIssuable: IssuableSale[] = (salesRes.data ?? [])
    .filter((s) => receiptSaleIds.has(s.id) && !taxinvSaleIds.has(s.id))
    .map((s) => issuableSale(s.id));

  return (
    <AcctView
      docs={docs}
      initialDocType={initialDocType}
      receiptIssuable={receiptIssuable}
      taxinvIssuable={taxinvIssuable}
      vatPct={settings.vat_pct}
      issueReceiptAction={issueReceipt}
      issueTaxInvoiceAction={issueTaxInvoice}
      updateDocumentAction={updateDocument}
      voidDocumentAction={voidDocument}
    />
  );
}


export default async function AcctPage() {
  return <AccountingPage />;
}
