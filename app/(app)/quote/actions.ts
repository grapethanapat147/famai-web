"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { nextDocNo } from "@/lib/rpc";
import { canManageQuote, type QuoteActionResult } from "@/lib/quote/quotes";

type OptionInput = {
  slot: number;
  variantId: string | null;
  price: number;
  financeId: string | null;
  down: number;
  terms: Array<{ months: number; monthly: number }>;
};

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * บันทึกใบเสนอราคา — quotation + quotation_option[] (doc_no ผ่าน next_doc_no 'QUOTE')
 * ด่านสิทธิ์ + RLS บริษัท · หลายตารางไม่ atomic → cleanup best-effort กันใบค้างครึ่ง
 */
export async function createQuote(formData: FormData): Promise<QuoteActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageQuote(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ออกใบเสนอราคา" };
  }

  const customerName = String(formData.get("customer_name") ?? "").trim();
  const customerPhone = String(formData.get("customer_phone") ?? "").trim();
  const customerAddress = String(formData.get("customer_address") ?? "").trim();
  const validUntil = String(formData.get("valid_until") ?? "").trim();

  let options: OptionInput[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("options") ?? "[]"));
    if (Array.isArray(parsed)) {
      options = parsed;
    }
  } catch {
    options = [];
  }

  if (!customerName) {
    return { ok: false, error: "กรอกชื่อลูกค้า" };
  }
  const valid = options.filter((o) => o && Number.isFinite(o.price) && o.price > 0);
  if (valid.length === 0) {
    return { ok: false, error: "ต้องมีอย่างน้อย 1 คันที่มีราคา" };
  }

  const supabase = await createServerSupabase();

  let branchId = user.branchIds[0];
  if (!branchId) {
    const { data: anyBranch } = await supabase.from("branch").select("id").limit(1).maybeSingle();
    branchId = anyBranch?.id ?? "";
  }
  if (!branchId) {
    return { ok: false, error: "ไม่พบบริษัทสำหรับออกเอกสาร" };
  }

  const yearBE = new Date().getFullYear() + 543;
  let docNo: string;
  try {
    docNo = await nextDocNo(supabase, branchId, "QUOTE", yearBE);
  } catch {
    return { ok: false, error: "ออกเลขเอกสารไม่สำเร็จ" };
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quotation")
    .insert({
      branch_id: branchId,
      doc_no: docNo,
      quote_date: todayISO(),
      valid_until: validUntil || null,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_address: customerAddress || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (quoteError || !quote) {
    return { ok: false, error: "บันทึกใบเสนอราคาไม่สำเร็จ" };
  }

  const { error: optionError } = await supabase.from("quotation_option").insert(
    valid.map((o, i) => ({
      quotation_id: quote.id,
      slot: o.slot ?? i + 1,
      variant_id: o.variantId,
      price: o.price,
      finance_id: o.financeId,
      down_payment: o.down,
      terms: o.terms,
    })),
  );
  if (optionError) {
    await supabase.from("quotation_option").delete().eq("quotation_id", quote.id);
    await supabase.from("quotation").delete().eq("id", quote.id);
    return { ok: false, error: "บันทึกรายการรถไม่สำเร็จ" };
  }

  revalidatePath("/quote");
  return { ok: true, id: quote.id, docNo };
}

/**
 * แก้ใบเสนอราคาที่บันทึกแล้ว (FAM-1029) — ด่านสิทธิ์ + คงเลขเอกสาร/วันที่ออก
 * อัปเดตข้อมูลลูกค้า/ยืนราคา + แทนที่รายการรถทั้งหมด (ลบแล้วใส่ใหม่ ไม่มี transaction)
 */
export async function updateQuote(formData: FormData): Promise<QuoteActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageQuote(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ใบเสนอราคา" };
  }

  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) {
    return { ok: false, error: "ไม่พบใบเสนอราคา" };
  }

  const customerName = String(formData.get("customer_name") ?? "").trim();
  const customerPhone = String(formData.get("customer_phone") ?? "").trim();
  const customerAddress = String(formData.get("customer_address") ?? "").trim();
  const validUntil = String(formData.get("valid_until") ?? "").trim();

  let options: OptionInput[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("options") ?? "[]"));
    if (Array.isArray(parsed)) {
      options = parsed;
    }
  } catch {
    options = [];
  }

  if (!customerName) {
    return { ok: false, error: "กรอกชื่อลูกค้า" };
  }
  const valid = options.filter((o) => o && Number.isFinite(o.price) && o.price > 0);
  if (valid.length === 0) {
    return { ok: false, error: "ต้องมีอย่างน้อย 1 คันที่มีราคา" };
  }

  const supabase = await createServerSupabase();

  const { data: existing } = await supabase.from("quotation").select("id, doc_no").eq("id", quoteId).maybeSingle();
  if (!existing) {
    return { ok: false, error: "ไม่พบใบเสนอราคา (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }

  const { error: updateError } = await supabase
    .from("quotation")
    .update({
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_address: customerAddress || null,
      valid_until: validUntil || null,
    })
    .eq("id", quoteId);
  if (updateError) {
    return { ok: false, error: "อัปเดตใบเสนอราคาไม่สำเร็จ" };
  }

  const { error: delError } = await supabase.from("quotation_option").delete().eq("quotation_id", quoteId);
  if (delError) {
    return { ok: false, error: "อัปเดตรายการรถไม่สำเร็จ" };
  }

  const { error: optionError } = await supabase.from("quotation_option").insert(
    valid.map((o, i) => ({
      quotation_id: quoteId,
      slot: o.slot ?? i + 1,
      variant_id: o.variantId,
      price: o.price,
      finance_id: o.financeId,
      down_payment: o.down,
      terms: o.terms,
    })),
  );
  if (optionError) {
    return { ok: false, error: "บันทึกรายการรถไม่สำเร็จ" };
  }

  revalidatePath("/quote");
  return { ok: true, id: quoteId, docNo: existing.doc_no };
}

/**
 * ลบใบเสนอราคา (FAM-1029) — ด่านสิทธิ์ + ลบรายการรถก่อน แล้วลบหัวเอกสาร
 * (quotation ไม่มี soft-delete → ลบจริง · จำกัดสิทธิ์ผู้ออกใบ)
 */
export async function deleteQuote(formData: FormData): Promise<QuoteActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageQuote(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ลบใบเสนอราคา" };
  }

  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) {
    return { ok: false, error: "ไม่พบใบเสนอราคา" };
  }

  const supabase = await createServerSupabase();
  await supabase.from("quotation_option").delete().eq("quotation_id", quoteId);
  const { data: deleted, error } = await supabase.from("quotation").delete().eq("id", quoteId).select("id");
  if (error || !deleted || deleted.length === 0) {
    return { ok: false, error: "ลบไม่สำเร็จ (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }

  revalidatePath("/quote");
  return { ok: true };
}
