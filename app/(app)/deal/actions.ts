"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveBranches } from "@/lib/reference/cache";
import { canManageDeal, canVoidDeal, isVoidableStage, validateDealCustomer, type DealActionResult } from "@/lib/deal/deals";
import { isRegStage, regNext, regPrev, stageTimestampField, substatusOptions, type PayMethod } from "@/lib/deal/stage";
import { validateLeadInput } from "@/lib/deal/lead";
import { canFinanceTransition, canManageFinance, isFinanceStatus } from "@/lib/deal/finance";

/**
 * เลื่อนขั้นทะเบียน (ไปป์ไลน์ดีล) — ด่านสิทธิ์ + วิธีชำระอ่านจากการขายจริง (ไม่เชื่อ client)
 * อนุญาตเฉพาะขั้นถัดไปเดียวใน track · compare-and-swap กันเลื่อนซ้ำ/แข่งกัน · ตั้งวันที่ตามขั้น
 */
export async function advanceRegistration(formData: FormData): Promise<DealActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageDeal(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์จัดการดีล" };
  }

  const regId = String(formData.get("reg_id") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  if (!regId || !isRegStage(to)) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = await createServerSupabase();

  const { data: reg, error: regError } = await supabase
    .from("registration")
    .select("id, stage, sale_id")
    .eq("id", regId)
    .maybeSingle();
  if (regError || !reg) {
    return { ok: false, error: "ไม่พบงานทะเบียน (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }
  if (!isRegStage(reg.stage)) {
    return { ok: false, error: "สถานะทะเบียนไม่ถูกต้อง" };
  }

  // วิธีชำระจากการขายจริง — กันดันดีลเงินสดผ่านขั้นไฟแนนซ์
  const { data: sale } = await supabase.from("sale").select("pay_method").eq("id", reg.sale_id).maybeSingle();
  const payMethod: PayMethod = sale?.pay_method === "finance" ? "finance" : "cash";

  if (regNext(reg.stage, payMethod) !== to) {
    return { ok: false, error: "เลื่อนขั้นแบบนี้ไม่ได้" };
  }

  const patch: {
    stage: string;
    submitted_at?: string;
    approved_at?: string;
    plate_received_at?: string;
    delivered_at?: string;
  } = { stage: to };
  const tsField = stageTimestampField(to);
  if (tsField) {
    patch[tsField] = new Date().toISOString().slice(0, 10);
  }

  const { data: updated, error: casError } = await supabase
    .from("registration")
    .update(patch)
    .eq("id", regId)
    .eq("stage", reg.stage)
    .select("id");
  if (casError || !updated || updated.length === 0) {
    return { ok: false, error: "สถานะเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  revalidatePath("/deal");
  return { ok: true };
}

/**
 * ย้อนขั้นทะเบียน 1 ขั้น (เผลอกดไปต่อ) — ด่านสิทธิ์เดียวกับเลื่อนขั้น · วิธีชำระอ่านจากการขายจริง
 * อนุญาตเฉพาะขั้นก่อนหน้าเดียวใน track · เคลียร์ timestamp ของขั้นที่ออก · compare-and-swap กันแข่ง
 */
export async function revertRegistration(formData: FormData): Promise<DealActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageDeal(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์จัดการดีล" };
  }

  const regId = String(formData.get("reg_id") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  if (!regId || !isRegStage(to)) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }

  const supabase = await createServerSupabase();

  const { data: reg, error: regError } = await supabase
    .from("registration")
    .select("id, stage, sale_id")
    .eq("id", regId)
    .maybeSingle();
  if (regError || !reg) {
    return { ok: false, error: "ไม่พบงานทะเบียน (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }
  if (!isRegStage(reg.stage)) {
    return { ok: false, error: "สถานะทะเบียนไม่ถูกต้อง" };
  }

  const { data: sale } = await supabase.from("sale").select("pay_method").eq("id", reg.sale_id).maybeSingle();
  const payMethod: PayMethod = sale?.pay_method === "finance" ? "finance" : "cash";

  if (regPrev(reg.stage, payMethod) !== to) {
    return { ok: false, error: "ย้อนขั้นแบบนี้ไม่ได้" };
  }

  // เคลียร์วันที่ของขั้นที่กำลังออก (เช่น ย้อนจาก 'ส่งมอบแล้ว' → ล้าง delivered_at)
  const patch: {
    stage: string;
    submitted_at?: null;
    approved_at?: null;
    plate_received_at?: null;
    delivered_at?: null;
  } = { stage: to };
  const leftField = stageTimestampField(reg.stage);
  if (leftField) {
    patch[leftField] = null;
  }

  const { data: updated, error: casError } = await supabase
    .from("registration")
    .update(patch)
    .eq("id", regId)
    .eq("stage", reg.stage)
    .select("id");
  if (casError || !updated || updated.length === 0) {
    return { ok: false, error: "สถานะเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  revalidatePath("/deal");
  return { ok: true };
}

/**
 * บันทึกสถานะย่อย + หมายเหตุ ต่อขั้นของดีล (FAM-1093 P2) — กด step แล้วเลือกสถานะย่อย + โน้ต
 * ด่านสิทธิ์ deal · upsert registration_step (1 แถวต่อ (ดีล, ขั้น)) + เก็บว่าใครแก้ล่าสุดเมื่อไหร่
 */
export async function updateDealStep(formData: FormData): Promise<DealActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageDeal(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์จัดการดีล" };
  }

  const regId = String(formData.get("reg_id") ?? "").trim();
  const stage = String(formData.get("stage") ?? "").trim();
  const subStatus = String(formData.get("sub_status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!regId || !isRegStage(stage)) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  if (subStatus !== "" && !substatusOptions(stage).includes(subStatus)) {
    return { ok: false, error: "สถานะย่อยไม่ถูกต้อง" };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("registration_step").upsert(
    {
      registration_id: regId,
      stage,
      sub_status: subStatus || null,
      note: note || null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "registration_id,stage" },
  );
  if (error) {
    return { ok: false, error: "บันทึกสถานะขั้นไม่สำเร็จ (รัน migration registration_step แล้วหรือยัง?)" };
  }

  revalidatePath("/deal");
  return { ok: true, message: "บันทึกแล้ว" };
}

/**
 * แก้ข้อมูลลูกค้า/บันทึกในดีล (FAM-1093) — ชื่อ/เบอร์/ที่อยู่(ตามบัตร)/เลขบัตร + โน้ตงานทะเบียน
 * ด่านสิทธิ์ deal (รวม sales) · update customer + registration.note (RLS บริษัทคุมอยู่แล้ว)
 */
export async function updateDealCustomer(formData: FormData): Promise<DealActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageDeal(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์จัดการดีล" };
  }

  const customerId = String(formData.get("customer_id") ?? "").trim();
  const regId = String(formData.get("reg_id") ?? "").trim();
  const parsed = validateDealCustomer({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
    taxId: String(formData.get("tax_id") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const v = parsed.value;

  const supabase = await createServerSupabase();
  if (customerId) {
    const { error } = await supabase
      .from("customer")
      .update({ full_name: v.name, phone: v.phone, address: v.address, tax_id: v.taxId })
      .eq("id", customerId);
    if (error) {
      return { ok: false, error: "บันทึกข้อมูลลูกค้าไม่สำเร็จ (สิทธิ์บริษัท?)" };
    }
  }
  if (regId) {
    const { error } = await supabase.from("registration").update({ note: v.note }).eq("id", regId);
    if (error) {
      return { ok: false, error: "บันทึกโน้ตไม่สำเร็จ" };
    }
  }

  revalidatePath("/deal");
  return { ok: true, message: "บันทึกข้อมูลลูกค้าแล้ว" };
}

/**
 * เพิ่มลูกค้า (ลีด) — เก็บข้อมูลไว้ก่อนเพื่อติดตามการขายในอนาคต · ด่านสิทธิ์ deal (รวม sales)
 * insert customer (owner = ผู้เพิ่ม, บริษัทผู้ใช้) + สร้าง follow_up_task ติดตาม (best-effort) → เข้าระบบเตือน
 */
export async function addCustomer(formData: FormData): Promise<DealActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageDeal(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์เพิ่มลูกค้า" };
  }

  const parsed = validateLeadInput({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    interestedVariantId: String(formData.get("interested_variant_id") ?? ""),
    source: String(formData.get("source") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const v = parsed.value;

  const supabase = await createServerSupabase();
  const branchId = user.branchIds[0] ?? (await getActiveBranches())[0]?.id ?? null;
  if (!branchId) {
    return { ok: false, error: "ยังไม่มีบริษัทในระบบ — เพิ่มบริษัทก่อน" };
  }

  const { data: cust, error } = await supabase
    .from("customer")
    .insert({
      branch_id: branchId,
      full_name: v.name,
      phone: v.phone,
      source: v.source,
      interested_variant_id: v.interestedVariantId,
      owner_id: user.id,
    })
    .select("id")
    .single();
  if (error || !cust) {
    return { ok: false, error: "บันทึกลูกค้าไม่สำเร็จ (สิทธิ์บริษัทไม่พอ?)" };
  }

  // งานติดตาม 3 วัน (best-effort — ไม่ล้มการเพิ่มลูกค้าถ้าสร้างไม่ได้)
  const dueAt = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await supabase.from("follow_up_task").insert({
    branch_id: branchId,
    customer_id: cust.id,
    kind: "ติดตามลูกค้าใหม่",
    due_at: dueAt,
    assigned_to: user.id,
    note: v.note,
  });

  revalidatePath("/deal");
  return { ok: true, message: "บันทึกลูกค้าแล้ว — ตั้งงานติดตามใน 3 วัน" };
}

/**
 * เลื่อนสถานะงานสินเชื่อ (FAM-1028) — ด่านสิทธิ์การเงิน + ตรวจทางเดิน + compare-and-swap
 * ปฏิเสธต้องมีเหตุผล · ยื่นใหม่ (→ส่งเรื่อง) ล้างเหตุผล/วันตัดสิน · log finance_case_event (best-effort)
 */
export async function advanceFinance(formData: FormData): Promise<DealActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageFinance(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์จัดการงานสินเชื่อ" };
  }

  const caseId = String(formData.get("case_id") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!caseId || !isFinanceStatus(to)) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  if (to === "ปฏิเสธ" && !reason) {
    return { ok: false, error: "กรุณาระบุเหตุผลที่ปฏิเสธ" };
  }

  const supabase = await createServerSupabase();
  const { data: fc, error: readError } = await supabase
    .from("finance_case")
    .select("id, status")
    .eq("id", caseId)
    .maybeSingle();
  if (readError || !fc) {
    return { ok: false, error: "ไม่พบงานสินเชื่อ (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }
  if (!isFinanceStatus(fc.status) || !canFinanceTransition(fc.status, to)) {
    return { ok: false, error: "เปลี่ยนสถานะแบบนี้ไม่ได้" };
  }

  const today = new Date().toISOString().slice(0, 10);
  const patch: { status: string; decided_at?: string | null; reject_reason?: string | null } = { status: to };
  if (to === "อนุมัติแล้ว") {
    patch.decided_at = today;
  } else if (to === "ปฏิเสธ") {
    patch.decided_at = today;
    patch.reject_reason = reason;
  } else if (to === "ส่งเรื่อง") {
    patch.decided_at = null;
    patch.reject_reason = null;
  }

  const { data: updated, error: casError } = await supabase
    .from("finance_case")
    .update(patch)
    .eq("id", caseId)
    .eq("status", fc.status)
    .select("id");
  if (casError || !updated || updated.length === 0) {
    return { ok: false, error: "สถานะเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  // log เหตุการณ์ (best-effort — ไม่ revert ถ้า log ล้ม)
  await supabase.from("finance_case_event").insert({
    case_id: caseId,
    from_status: fc.status,
    to_status: to,
    by_user: user.id,
    note: to === "ปฏิเสธ" ? reason : null,
  });

  revalidatePath("/deal");
  return { ok: true };
}

/**
 * ยกเลิกดีล — ลูกค้าเท (FAM-1028) — ด่านสิทธิ์ยกเลิก (admin/manager) + เหตุผลจำเป็น
 * ยกเลิกได้ก่อนส่งมอบเท่านั้น · soft-void การขาย (voided_at/voided_reason) แบบ compare-and-swap กันยกเลิกซ้ำ
 * ผลข้างเคียง best-effort (ไม่ล้มการยกเลิกหลักถ้าพลาด): คืนรถเข้าสต๊อก (sold→available, CAS) + ปิดเคสสินเชื่อ (→ยกเลิก)
 */
export async function voidDeal(formData: FormData): Promise<DealActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canVoidDeal(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ยกเลิกดีล (เฉพาะหัวหน้า/ผู้ดูแล)" };
  }

  const saleId = String(formData.get("sale_id") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!saleId) {
    return { ok: false, error: "ไม่พบดีล" };
  }
  if (!reason) {
    return { ok: false, error: "กรุณาระบุเหตุผลที่ยกเลิก" };
  }

  const supabase = await createServerSupabase();

  const { data: sale, error: readError } = await supabase
    .from("sale")
    .select("id, unit_id, voided_at")
    .eq("id", saleId)
    .maybeSingle();
  if (readError || !sale) {
    return { ok: false, error: "ไม่พบดีล (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }
  if (sale.voided_at) {
    return { ok: false, error: "ดีลนี้ถูกยกเลิกไปแล้ว" };
  }

  // ห้ามยกเลิกหลังส่งมอบ — อ่านขั้นทะเบียนจริง
  const { data: reg } = await supabase.from("registration").select("stage").eq("sale_id", saleId).maybeSingle();
  if (reg && isRegStage(reg.stage) && !isVoidableStage(reg.stage)) {
    return { ok: false, error: "ดีลส่งมอบแล้ว ยกเลิกผ่านหน้านี้ไม่ได้" };
  }

  const { data: voided, error: casError } = await supabase
    .from("sale")
    .update({ voided_at: new Date().toISOString(), voided_reason: reason })
    .eq("id", saleId)
    .is("voided_at", null)
    .select("id");
  if (casError || !voided || voided.length === 0) {
    return { ok: false, error: "ดีลเพิ่งถูกยกเลิก กรุณารีเฟรช" };
  }

  // คืนรถเข้าสต๊อก (best-effort) — เฉพาะคันที่ยังสถานะ sold
  if (sale.unit_id) {
    await supabase.from("motorcycle_unit").update({ status: "available" }).eq("id", sale.unit_id).eq("status", "sold");
  }
  // ปิดเคสสินเชื่อของดีลนี้ (best-effort) — ดีลถูกยกเลิกแล้ว เคสสินเชื่อย่อมยกเลิกตาม (idempotent)
  await supabase.from("finance_case").update({ status: "ยกเลิก" }).eq("sale_id", saleId).neq("status", "ยกเลิก");

  revalidatePath("/deal");
  return { ok: true };
}
