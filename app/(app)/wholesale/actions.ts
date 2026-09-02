"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { sellWholesale } from "@/lib/rpc";
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
