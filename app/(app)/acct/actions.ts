"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSettingsWith } from "@/lib/settings";
import type { TypedSupabaseClient } from "@/lib/supabase/client-type";
import { amountBreakdown, canManageAccount, validateDocEdit, type AcctActionResult, type DocEditInput, type DocItem } from "@/lib/acct/documents";

/** ปี พ.ศ. ของวันนี้ (เขตเวลาไทย) */
function beYear(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric" }).format(new Date())) + 543;
}
function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

/** รายการรถ (รุ่น · สี / เลขถัง / เลขเครื่อง) จากคันที่ขาย — แช่ลง buyer_snapshot.item ให้แก้ไขได้ภายหลัง */
async function fetchDocItem(supabase: TypedSupabaseClient, unitId: string | null): Promise<DocItem> {
  const empty: DocItem = { vehicle: "", frameNo: "", engineNo: "" };
  if (!unitId) {
    return empty;
  }
  const { data: unit } = await supabase
    .from("motorcycle_unit")
    .select("variant_id, color_code, engine_no, frame_no")
    .eq("id", unitId)
    .maybeSingle();
  if (!unit) {
    return empty;
  }
  const [{ data: variant }, { data: color }] = await Promise.all([
    supabase.from("model_variant").select("model_name").eq("id", unit.variant_id).maybeSingle(),
    supabase.from("model_color").select("color_name").eq("variant_id", unit.variant_id).eq("color_code", unit.color_code).maybeSingle(),
  ]);
  const vehicle = variant?.model_name ? `${variant.model_name}${color?.color_name ? ` · ${color.color_name}` : ""}` : "";
  return { vehicle, frameNo: unit.frame_no ?? "", engineNo: unit.engine_no ?? "" };
}

/**
 * ออกใบเสร็จรับเงิน (FAM-1102) — สร้าง document (RECEIPT) จากการขาย พร้อมเลขรัน + snapshot ผู้ขาย/ผู้ซื้อ + รายการรถ
 * หัวใช้ข้อมูลบริษัท (branch) · แช่ ณ วันออก (เอกสารไม่เปลี่ยนตามข้อมูลปัจจุบัน) · ด่านสิทธิ์บัญชี
 */
export async function issueReceipt(formData: FormData): Promise<AcctActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageAccount(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ออกเอกสารบัญชี" };
  }

  const saleId = String(formData.get("sale_id") ?? "").trim();
  if (!saleId) {
    return { ok: false, error: "เลือกการขายก่อน" };
  }

  const supabase = await createServerSupabase();

  const { data: sale } = await supabase
    .from("sale")
    .select("id, branch_id, customer_id, unit_id, net_price, sold_at, voided_at")
    .eq("id", saleId)
    .maybeSingle();
  if (!sale || sale.voided_at) {
    return { ok: false, error: "ไม่พบการขาย (หรือถูกยกเลิก)" };
  }

  // กันออกซ้ำ
  const { data: existing } = await supabase
    .from("document")
    .select("doc_no")
    .eq("sale_id", saleId)
    .eq("doc_type", "RECEIPT")
    .maybeSingle();
  if (existing) {
    return { ok: false, error: `ออกใบเสร็จของการขายนี้ไปแล้ว (${existing.doc_no})` };
  }

  const [{ data: customer }, { data: branch }, item] = await Promise.all([
    sale.customer_id
      ? supabase.from("customer").select("full_name, address, tax_id, phone").eq("id", sale.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("branch").select("name, address, tax_id, phone, code").eq("id", sale.branch_id).maybeSingle(),
    fetchDocItem(supabase, sale.unit_id),
  ]);

  const { data: docNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_branch: sale.branch_id,
    p_type: "RECEIPT",
    p_year: beYear(),
  });
  if (noError || !docNo) {
    return { ok: false, error: "ออกเลขเอกสารไม่สำเร็จ" };
  }

  const settings = await getSettingsWith(supabase);
  const amt = amountBreakdown(Number(sale.net_price), settings.vat_pct);

  const { error } = await supabase.from("document").insert({
    branch_id: sale.branch_id,
    doc_type: "RECEIPT",
    doc_no: docNo,
    doc_date: todayISO(),
    sale_id: saleId,
    customer_id: sale.customer_id,
    amount_base: amt.base,
    amount_vat: amt.vat,
    amount_total: amt.total,
    seller_snapshot: {
      name: branch?.name ?? "บริษัท",
      address: branch?.address ?? null,
      taxId: branch?.tax_id ?? null,
      phone: branch?.phone ?? null,
    },
    buyer_snapshot: {
      name: customer?.full_name ?? "ลูกค้า",
      address: customer?.address ?? null,
      taxId: customer?.tax_id ?? null,
      phone: customer?.phone ?? null,
      item,
    },
  });
  if (error) {
    return { ok: false, error: "บันทึกใบเสร็จไม่สำเร็จ (สิทธิ์บริษัท?)" };
  }

  revalidatePath("/acct");
  return { ok: true, docNo };
}

/**
 * ออกใบกำกับภาษี (FAM-1102 P2) — ออกได้ก็ต่อเมื่อออกใบเสร็จของการขายนั้นแล้ว (ขั้นถัดจากใบเสร็จ)
 * คัด snapshot ผู้ขาย/ผู้ซื้อ/รายการ + ยอด จากใบเสร็จมาตั้งต้น (แก้ไขภายหลังได้) · เลขรัน TAXINV แยกชุด
 */
export async function issueTaxInvoice(formData: FormData): Promise<AcctActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageAccount(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ออกเอกสารบัญชี" };
  }

  const saleId = String(formData.get("sale_id") ?? "").trim();
  if (!saleId) {
    return { ok: false, error: "เลือกการขายก่อน" };
  }

  const supabase = await createServerSupabase();

  const { data: sale } = await supabase.from("sale").select("id, branch_id, customer_id, voided_at").eq("id", saleId).maybeSingle();
  if (!sale || sale.voided_at) {
    return { ok: false, error: "ไม่พบการขาย (หรือถูกยกเลิก)" };
  }

  // ต้องมีใบเสร็จก่อน — คัด snapshot/ยอด มาตั้งต้น
  const { data: receipt } = await supabase
    .from("document")
    .select("seller_snapshot, buyer_snapshot, amount_base, amount_vat, amount_total")
    .eq("sale_id", saleId)
    .eq("doc_type", "RECEIPT")
    .maybeSingle();
  if (!receipt) {
    return { ok: false, error: "ต้องออกใบเสร็จของการขายนี้ก่อน" };
  }

  // กันออกซ้ำ
  const { data: existing } = await supabase
    .from("document")
    .select("doc_no")
    .eq("sale_id", saleId)
    .eq("doc_type", "TAXINV")
    .maybeSingle();
  if (existing) {
    return { ok: false, error: `ออกใบกำกับภาษีของการขายนี้ไปแล้ว (${existing.doc_no})` };
  }

  const { data: docNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_branch: sale.branch_id,
    p_type: "TAXINV",
    p_year: beYear(),
  });
  if (noError || !docNo) {
    return { ok: false, error: "ออกเลขเอกสารไม่สำเร็จ" };
  }

  const { error } = await supabase.from("document").insert({
    branch_id: sale.branch_id,
    doc_type: "TAXINV",
    doc_no: docNo,
    doc_date: todayISO(),
    sale_id: saleId,
    customer_id: sale.customer_id,
    amount_base: receipt.amount_base,
    amount_vat: receipt.amount_vat,
    amount_total: receipt.amount_total,
    seller_snapshot: receipt.seller_snapshot,
    buyer_snapshot: receipt.buyer_snapshot,
  });
  if (error) {
    return { ok: false, error: "บันทึกใบกำกับภาษีไม่สำเร็จ (สิทธิ์บริษัท?)" };
  }

  revalidatePath("/acct");
  return { ok: true, docNo };
}

/**
 * แก้ไขเอกสาร (FAM-1102 P2) — แก้ไขได้ทุกช่อง **ยกเว้นเลขที่/ประเภทเอกสาร** (ไม่รับค่าจากฟอร์ม → เปลี่ยนไม่ได้)
 * เอกสารที่ยกเลิกแล้วแก้ไม่ได้ · RLS จำกัดเฉพาะบริษัทที่เข้าถึงได้
 */
export async function updateDocument(formData: FormData): Promise<AcctActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageAccount(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ไขเอกสาร" };
  }

  const docId = String(formData.get("doc_id") ?? "").trim();
  if (!docId) {
    return { ok: false, error: "ไม่พบเอกสาร" };
  }

  const read = (k: string): string => String(formData.get(k) ?? "");
  const input: DocEditInput = {
    sellerName: read("seller_name"),
    sellerAddress: read("seller_address"),
    sellerTaxId: read("seller_tax_id"),
    sellerPhone: read("seller_phone"),
    buyerName: read("buyer_name"),
    buyerAddress: read("buyer_address"),
    buyerTaxId: read("buyer_tax_id"),
    buyerPhone: read("buyer_phone"),
    vehicle: read("vehicle"),
    frameNo: read("frame_no"),
    engineNo: read("engine_no"),
    base: read("base"),
    vat: read("vat"),
    docDate: read("doc_date"),
  };
  const parsed = validateDocEdit(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createServerSupabase();
  const { data: doc } = await supabase.from("document").select("voided_at").eq("id", docId).maybeSingle();
  if (!doc) {
    return { ok: false, error: "ไม่พบเอกสาร" };
  }
  if (doc.voided_at) {
    return { ok: false, error: "เอกสารถูกยกเลิกแล้ว แก้ไขไม่ได้" };
  }

  const v = parsed.value;
  const { error } = await supabase
    .from("document")
    .update({
      doc_date: v.docDate,
      amount_base: v.base,
      amount_vat: v.vat,
      amount_total: v.total,
      seller_snapshot: { ...v.seller },
      buyer_snapshot: { ...v.buyer, item: v.item },
    })
    .eq("id", docId);
  if (error) {
    return { ok: false, error: "บันทึกการแก้ไขไม่สำเร็จ (สิทธิ์บริษัท?)" };
  }

  revalidatePath("/acct");
  return { ok: true };
}

/** ยกเลิกเอกสาร (FAM-1102 P2) — เลขเดิมคงอยู่ (ห้ามลบเพื่อคงลำดับเลข) · ออกใบใหม่ได้ */
export async function voidDocument(formData: FormData): Promise<AcctActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageAccount(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ยกเลิกเอกสาร" };
  }

  const docId = String(formData.get("doc_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!docId) {
    return { ok: false, error: "ไม่พบเอกสาร" };
  }

  const supabase = await createServerSupabase();
  const { data: updated, error } = await supabase
    .from("document")
    .update({ voided_at: new Date().toISOString(), voided_reason: reason || null })
    .eq("id", docId)
    .is("voided_at", null)
    .select("id");
  if (error || !updated || updated.length === 0) {
    return { ok: false, error: "ยกเลิกไม่สำเร็จ (อาจถูกยกเลิกไปแล้ว)" };
  }

  revalidatePath("/acct");
  return { ok: true };
}
