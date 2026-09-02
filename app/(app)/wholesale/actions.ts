"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { sellWholesale, voidWholesaleOrder } from "@/lib/rpc";
import { getSettingsWith } from "@/lib/settings";
import { amountBreakdown, canManageAccount } from "@/lib/acct/documents";
import {
  canManageWholesaleCompanies,
  canSellWholesale,
  validateWholesaleCompany,
  validateWholesaleOrder,
  type WholesaleActionResult,
  type WholesaleLineInput,
  type WholesaleUnit,
} from "@/lib/wholesale/wholesale";

/**
 * บันทึกขายส่ง (FAM-1127 · fixlist ข้อ 12)
 * ตรวจซ้ำฝั่งเซิร์ฟเวอร์ด้วยสต๊อกจริง แล้วส่งต่อให้ RPC ที่ล็อกแถวและตัดสต๊อกในทรานแซกชันเดียว
 */
export async function recordWholesaleSale(formData: FormData): Promise<WholesaleActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canSellWholesale(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ขายรถ" };
  }

  const companyId = String(formData.get("company_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  let lines: WholesaleLineInput[];
  try {
    const raw: unknown = JSON.parse(String(formData.get("lines") ?? "[]"));
    lines = Array.isArray(raw)
      ? raw.map((l) => ({ unitId: String((l as { unitId?: unknown }).unitId ?? ""), price: String((l as { price?: unknown }).price ?? "") }))
      : [];
  } catch {
    return { ok: false, error: "ข้อมูลรายการไม่ถูกต้อง" };
  }

  const supabase = await createServerSupabase();
  const { data: unitRows } = await supabase
    .from("motorcycle_unit")
    .select("id, branch_id, variant_id, color_code, engine_no, frame_no, cost, retail")
    .eq("status", "available");

  const units: WholesaleUnit[] = (unitRows ?? []).map((u) => ({
    id: u.id,
    branchId: u.branch_id,
    branchName: "",
    model: "",
    color: "",
    engineNo: u.engine_no ?? "",
    frameNo: u.frame_no ?? "",
    cost: u.cost != null ? Number(u.cost) : null,
    retail: u.retail != null ? Number(u.retail) : null,
  }));

  const parsed = validateWholesaleOrder({ companyId, lines }, units);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  try {
    const res = await sellWholesale(supabase, { companyId: parsed.value.companyId, lines: parsed.value.lines, note });
    revalidatePath("/wholesale");
    revalidatePath("/stock");
    revalidatePath("/ar");
    return { ok: true, orderNo: res.order_no, message: `บันทึกขายส่งแล้ว — ${res.order_no} · ${res.units} คัน` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "บันทึกขายส่งไม่สำเร็จ" };
  }
}

/** เพิ่ม/แก้ไขร้านค้าขายส่ง (FAM-1127) — ด่านผู้จัดการ ตรงกับ RLS wholesale_company_write */
export async function saveWholesaleCompany(formData: FormData): Promise<WholesaleActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageWholesaleCompanies(user.roleCodes)) {
    return { ok: false, error: "จัดการร้านค้าขายส่งได้เฉพาะผู้ดูแล / ผู้บริหาร" };
  }

  const parsed = validateWholesaleCompany({
    name: String(formData.get("name") ?? ""),
    taxId: String(formData.get("tax_id") ?? ""),
    address: String(formData.get("address") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    contactName: String(formData.get("contact_name") ?? ""),
    creditDays: String(formData.get("credit_days") ?? ""),
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createServerSupabase();
  const row = {
    name: parsed.value.name,
    tax_id: parsed.value.taxId,
    address: parsed.value.address,
    phone: parsed.value.phone,
    contact_name: parsed.value.contactName,
    credit_days: parsed.value.creditDays,
    is_active: String(formData.get("is_active") ?? "true") !== "false",
  };
  const companyId = String(formData.get("company_id") ?? "").trim();

  const { error } = companyId
    ? await supabase.from("wholesale_company").update(row).eq("id", companyId)
    : await supabase.from("wholesale_company").insert(row);

  if (error) {
    const duplicate = error.code === "23505";
    return { ok: false, error: duplicate ? `มีร้านค้าชื่อ "${row.name}" อยู่แล้ว` : "บันทึกร้านค้าไม่สำเร็จ (สิทธิ์ไม่พอ หรือฐานข้อมูลผิดพลาด)" };
  }

  revalidatePath("/wholesale");
  return { ok: true, message: companyId ? "บันทึกร้านค้าแล้ว" : "เพิ่มร้านค้าแล้ว" };
}

/**
 * ออกใบกำกับภาษีของบิลขายส่ง (FAM-1128)
 * ผู้ซื้อ = ร้านค้าปลายทาง · ยอด = ยอดรวมทั้งบิล · รายการ = รุ่นรถทุกคันในบิล
 * เลขเอกสารดึงจากชุด TAXINV เดียวกับขายปลีก (เล่มใบกำกับเป็นชุดเดียว)
 */
export async function issueWholesaleTaxInvoice(formData: FormData): Promise<WholesaleActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageAccount(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ออกเอกสารบัญชี" };
  }

  const orderId = String(formData.get("order_id") ?? "").trim();
  if (!orderId) {
    return { ok: false, error: "เลือกบิลก่อน" };
  }

  const supabase = await createServerSupabase();
  const { data: order } = await supabase
    .from("wholesale_order")
    .select("id, branch_id, company_id, order_no, total, voided_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.voided_at) {
    return { ok: false, error: "ไม่พบบิล (หรือถูกยกเลิกแล้ว)" };
  }

  const [{ data: company }, { data: branch }, { data: lines }] = await Promise.all([
    supabase.from("wholesale_company").select("name, address, tax_id, phone").eq("id", order.company_id).maybeSingle(),
    supabase.from("branch").select("name, address, tax_id, phone").eq("id", order.branch_id).maybeSingle(),
    supabase.from("wholesale_order_line").select("unit_id").eq("order_id", orderId),
  ]);
  if (!company) {
    return { ok: false, error: "ไม่พบร้านค้าของบิลนี้" };
  }
  if (!company.tax_id || company.tax_id.trim() === "") {
    return { ok: false, error: `ยังไม่ได้กรอกเลขผู้เสียภาษีของ ${company.name} — กรอกที่แท็บร้านค้าก่อนออกใบกำกับ` };
  }

  const { data: existing } = await supabase
    .from("document")
    .select("doc_no")
    .eq("wholesale_order_id", orderId)
    .eq("doc_type", "TAXINV")
    .is("voided_at", null)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: `ออกใบกำกับของบิลนี้ไปแล้ว (${existing.doc_no})` };
  }

  const unitIds = (lines ?? []).map((l) => l.unit_id);
  const { data: units } = unitIds.length
    ? await supabase.from("motorcycle_unit").select("id, variant_id, engine_no, frame_no").in("id", unitIds)
    : { data: [] };
  const { data: variants } = await supabase.from("model_variant").select("id, model_name");
  const variantName = new Map((variants ?? []).map((v) => [v.id, v.model_name]));
  const vehicle = (units ?? [])
    .map((u) => `${variantName.get(u.variant_id) ?? "รถ"} (${u.engine_no || u.frame_no || "—"})`)
    .join(", ");

  const { data: docNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_branch: order.branch_id,
    p_type: "TAXINV",
    p_year: beYear(),
  });
  if (noError || !docNo) {
    return { ok: false, error: "ออกเลขเอกสารไม่สำเร็จ" };
  }

  const settings = await getSettingsWith(supabase);
  const amt = amountBreakdown(Number(order.total ?? 0), settings.vat_pct);

  const { error } = await supabase.from("document").insert({
    branch_id: order.branch_id,
    doc_type: "TAXINV",
    part: "full",
    doc_no: docNo,
    doc_date: todayISO(),
    wholesale_order_id: orderId,
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
      name: company.name,
      address: company.address ?? null,
      taxId: company.tax_id,
      phone: company.phone ?? null,
      item: { vehicle: vehicle || `ขายส่ง ${order.order_no}`, engineNo: "", frameNo: "" },
    },
  });
  if (error) {
    return { ok: false, error: "บันทึกใบกำกับไม่สำเร็จ — คุณอาจไม่มีสิทธิ์ในบริษัทนี้" };
  }

  revalidatePath("/wholesale");
  revalidatePath("/acct");
  revalidatePath("/taxinv");
  return { ok: true, message: `ออกใบกำกับแล้ว — ${docNo}` };
}

/** ยกเลิกบิลขายส่ง (FAM-1128) — RPC คืนรถเข้าสต๊อกและล้างเงินค้างรับให้ในทรานแซกชันเดียว */
export async function voidWholesale(formData: FormData): Promise<WholesaleActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageWholesaleCompanies(user.roleCodes)) {
    return { ok: false, error: "ยกเลิกบิลขายส่งได้เฉพาะผู้ดูแล / ผู้บริหาร" };
  }

  const orderId = String(formData.get("order_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!orderId) {
    return { ok: false, error: "ไม่พบบิล" };
  }
  if (reason === "") {
    return { ok: false, error: "ระบุเหตุผลที่ยกเลิก" };
  }

  const supabase = await createServerSupabase();
  try {
    const res = await voidWholesaleOrder(supabase, orderId, reason);
    revalidatePath("/wholesale");
    revalidatePath("/stock");
    revalidatePath("/ar");
    return { ok: true, message: `ยกเลิก ${res.order_no} แล้ว — คืนรถเข้าสต๊อก ${res.units_restored} คัน` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ยกเลิกบิลไม่สำเร็จ" };
  }
}

/** ปี พ.ศ. ของวันนี้ (เขตเวลาไทย) */
function beYear(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric" }).format(new Date())) + 543;
}
function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}
