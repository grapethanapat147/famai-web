"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageDeal, type DealActionResult } from "@/lib/deal/deals";
import { isRegStage, regNext, stageTimestampField, type PayMethod } from "@/lib/deal/stage";
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
    return { ok: false, error: "ไม่พบงานทะเบียน (หรือไม่มีสิทธิ์สาขานี้)" };
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
    return { ok: false, error: "ไม่พบงานสินเชื่อ (หรือไม่มีสิทธิ์สาขานี้)" };
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
