"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { canManageTransfer, sameCompany, type TransferActionResult } from "@/lib/transfer/transfers";

function canReachBranch(user: CurrentUser, branchId: string): boolean {
  return user.allBranch || user.branchIds.includes(branchId);
}

/**
 * ขอโอนรถไปบริษัทอื่น (ต้นทาง) — ด่านสิทธิ์ + รถต้อง available + ในบริษัทเดียวกัน (R1 B1)
 * CAS unit available→in_transfer แล้วค่อยสร้าง unit_transfer · revert ถ้าสร้างไม่สำเร็จ
 */
export async function requestTransfer(formData: FormData): Promise<TransferActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageTransfer(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์โอนย้ายรถ" };
  }

  const unitId = String(formData.get("unit_id") ?? "").trim();
  const toBranch = String(formData.get("to_branch") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!unitId || !toBranch) {
    return { ok: false, error: "เลือกรถและบริษัทปลายทาง" };
  }

  const supabase = await createServerSupabase();
  const { data: unit, error: unitError } = await supabase
    .from("motorcycle_unit")
    .select("id, status, branch_id")
    .eq("id", unitId)
    .maybeSingle();
  if (unitError || !unit) {
    return { ok: false, error: "ไม่พบรถ (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }
  if (unit.status !== "available") {
    return { ok: false, error: "รถคันนี้ไม่พร้อมโอน (ไม่ว่าง)" };
  }
  if (unit.branch_id === toBranch) {
    return { ok: false, error: "บริษัทปลายทางต้องต่างจากบริษัทต้นทาง" };
  }

  const { data: branches } = await supabase.from("branch").select("id, company_id").in("id", [unit.branch_id, toBranch]);
  const fromCo = branches?.find((b) => b.id === unit.branch_id)?.company_id ?? null;
  const toCo = branches?.find((b) => b.id === toBranch)?.company_id ?? null;
  if (!sameCompany(fromCo, toCo)) {
    return { ok: false, error: "โอนข้ามบริษัทไม่ได้ — ต้องเปิดการขายระหว่างบริษัท" };
  }

  const { data: moved, error: casError } = await supabase
    .from("motorcycle_unit")
    .update({ status: "in_transfer" })
    .eq("id", unitId)
    .eq("status", "available")
    .select("id");
  if (casError || !moved || moved.length === 0) {
    return { ok: false, error: "สถานะรถเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  const { error: insertError } = await supabase.from("unit_transfer").insert({
    unit_id: unitId,
    from_branch: unit.branch_id,
    to_branch: toBranch,
    status: "in_transit",
    note: note || null,
  });
  if (insertError) {
    await supabase.from("motorcycle_unit").update({ status: "available" }).eq("id", unitId).eq("status", "in_transfer");
    return { ok: false, error: "สร้างรายการโอนไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/transfer");
  return { ok: true };
}

/**
 * รับรถเข้าบริษัทปลายทาง — เฉพาะบริษัทปลายทาง · CAS transfer in_transit→received
 * แล้วย้าย unit ไปบริษัทปลายทาง + กลับเป็น available · revert ถ้าย้าย unit ไม่ได้
 */
export async function receiveTransfer(formData: FormData): Promise<TransferActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageTransfer(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์โอนย้ายรถ" };
  }

  const transferId = String(formData.get("transfer_id") ?? "").trim();
  if (!transferId) {
    return { ok: false, error: "ไม่พบรายการโอน" };
  }

  const supabase = await createServerSupabase();
  const { data: transfer, error: readError } = await supabase
    .from("unit_transfer")
    .select("id, status, unit_id, to_branch")
    .eq("id", transferId)
    .maybeSingle();
  if (readError || !transfer) {
    return { ok: false, error: "ไม่พบรายการโอน" };
  }
  if (transfer.status !== "in_transit") {
    return { ok: false, error: "รายการนี้ไม่ได้อยู่ระหว่างโอน" };
  }
  if (!canReachBranch(user, transfer.to_branch)) {
    return { ok: false, error: "รับได้เฉพาะบริษัทปลายทาง" };
  }

  const now = new Date().toISOString();
  const { data: done, error: casError } = await supabase
    .from("unit_transfer")
    .update({ status: "received", received_at: now })
    .eq("id", transferId)
    .eq("status", "in_transit")
    .select("id");
  if (casError || !done || done.length === 0) {
    return { ok: false, error: "รายการเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  const { error: unitError } = await supabase
    .from("motorcycle_unit")
    .update({ branch_id: transfer.to_branch, status: "available" })
    .eq("id", transfer.unit_id)
    .eq("status", "in_transfer");
  if (unitError) {
    await supabase.from("unit_transfer").update({ status: "in_transit", received_at: null }).eq("id", transferId);
    return { ok: false, error: "ย้ายรถเข้าบริษัทไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/transfer");
  return { ok: true };
}

/** ยกเลิกการโอน (ต้นทาง) — คืนรถเป็น available ที่บริษัทเดิม */
export async function cancelTransfer(formData: FormData): Promise<TransferActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageTransfer(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์โอนย้ายรถ" };
  }

  const transferId = String(formData.get("transfer_id") ?? "").trim();
  if (!transferId) {
    return { ok: false, error: "ไม่พบรายการโอน" };
  }

  const supabase = await createServerSupabase();
  const { data: transfer, error: readError } = await supabase
    .from("unit_transfer")
    .select("id, status, unit_id, from_branch")
    .eq("id", transferId)
    .maybeSingle();
  if (readError || !transfer) {
    return { ok: false, error: "ไม่พบรายการโอน" };
  }
  if (transfer.status !== "in_transit") {
    return { ok: false, error: "รายการนี้ยกเลิกไม่ได้แล้ว" };
  }
  if (!canReachBranch(user, transfer.from_branch)) {
    return { ok: false, error: "ยกเลิกได้เฉพาะบริษัทต้นทาง" };
  }

  const { data: done, error: casError } = await supabase
    .from("unit_transfer")
    .update({ status: "cancelled" })
    .eq("id", transferId)
    .eq("status", "in_transit")
    .select("id");
  if (casError || !done || done.length === 0) {
    return { ok: false, error: "รายการเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  await supabase
    .from("motorcycle_unit")
    .update({ status: "available" })
    .eq("id", transfer.unit_id)
    .eq("status", "in_transfer");

  revalidatePath("/transfer");
  return { ok: true };
}
