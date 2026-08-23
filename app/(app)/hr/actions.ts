"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveBranches } from "@/lib/reference/cache";
import { getSettingsWith } from "@/lib/settings";
import type { TypedSupabaseClient } from "@/lib/supabase/client-type";
import { positionFromRoles } from "@/lib/hr/employee";
import { lateMinutes, workMinutes } from "@/lib/hr/time";
import { canApproveLeave, isLeaveType, leaveDays, type HrActionResult } from "@/lib/hr/leave";

/** วันที่/เวลาปัจจุบันตามเขตเวลาไทย */
function bangkokDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}
function bangkokHHMM(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(d);
}

async function myEmployeeId(supabase: TypedSupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase.from("employee").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

/**
 * เชื่อมบัญชีปัจจุบันกับข้อมูลพนักงาน (opt-in) — ปลดล็อกลงเวลา/ลา เมื่อบัญชียังไม่ผูก employee
 * สร้าง employee ผูก user_id · สาขา = สาขาผู้ใช้ (ไม่มี → สาขาแรก) · ตำแหน่งจาก role · เงินเดือน/emp_code ให้ HR เติมภายหลัง
 */
export async function linkMyEmployee(): Promise<HrActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  const supabase = await createServerSupabase();
  if (await myEmployeeId(supabase, me.id)) {
    return { ok: true, message: "บัญชีนี้ผูกกับข้อมูลพนักงานอยู่แล้ว" };
  }

  let branchId = me.branchIds[0] ?? null;
  if (!branchId) {
    branchId = (await getActiveBranches())[0]?.id ?? null;
  }
  if (!branchId) {
    return { ok: false, error: "ยังไม่มีสาขาในระบบ — เพิ่มสาขาก่อน" };
  }

  const { error } = await supabase.from("employee").insert({
    user_id: me.id,
    branch_id: branchId,
    position: positionFromRoles(me.roleCodes),
    hired_at: bangkokDate(),
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: true }; // มีอยู่แล้ว (race) — ถือว่าสำเร็จ
    }
    return { ok: false, error: "เชื่อมข้อมูลพนักงานไม่สำเร็จ (สิทธิ์สาขาไม่พอ?)" };
  }

  revalidatePath("/hr");
  return { ok: true, message: "เชื่อมข้อมูลพนักงานแล้ว — เริ่มลงเวลาได้เลย" };
}

/** ลงเวลาเข้า (ตัวเอง) — คำนวณสาย/สถานะจาก work_start */
export async function clockIn(): Promise<HrActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  const supabase = await createServerSupabase();
  const empId = await myEmployeeId(supabase, me.id);
  if (!empId) {
    return { ok: false, error: "ไม่มีข้อมูลพนักงานของบัญชีนี้" };
  }

  const today = bangkokDate();
  const { data: existing } = await supabase
    .from("attendance")
    .select("id, check_in")
    .eq("employee_id", empId)
    .eq("work_date", today)
    .maybeSingle();
  if (existing?.check_in) {
    return { ok: false, error: "ลงเวลาเข้าแล้ววันนี้" };
  }

  const settings = await getSettingsWith(supabase);
  const nowIso = new Date().toISOString();
  const late = lateMinutes(bangkokHHMM(), settings.work_start);
  const { error } = await supabase.from("attendance").upsert(
    { employee_id: empId, work_date: today, check_in: nowIso, status: late > 0 ? "สาย" : "ปกติ", late_minutes: late },
    { onConflict: "employee_id,work_date" },
  );
  if (error) {
    return { ok: false, error: "ลงเวลาไม่สำเร็จ" };
  }
  revalidatePath("/hr");
  return { ok: true };
}

/** ลงเวลาออก (ตัวเอง) */
export async function clockOut(): Promise<HrActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  const supabase = await createServerSupabase();
  const empId = await myEmployeeId(supabase, me.id);
  if (!empId) {
    return { ok: false, error: "ไม่มีข้อมูลพนักงานของบัญชีนี้" };
  }

  const today = bangkokDate();
  const { data: att } = await supabase
    .from("attendance")
    .select("id, check_in, check_out")
    .eq("employee_id", empId)
    .eq("work_date", today)
    .maybeSingle();
  if (!att?.check_in) {
    return { ok: false, error: "ยังไม่ได้ลงเวลาเข้า" };
  }
  if (att.check_out) {
    return { ok: false, error: "ลงเวลาออกแล้ว" };
  }

  const nowIso = new Date().toISOString();
  const work = workMinutes(bangkokHHMM(att.check_in), bangkokHHMM(nowIso));
  const { error } = await supabase.from("attendance").update({ check_out: nowIso, work_minutes: work }).eq("id", att.id);
  if (error) {
    return { ok: false, error: "ลงเวลาออกไม่สำเร็จ" };
  }
  revalidatePath("/hr");
  return { ok: true };
}

/** ขอลา (ตัวเอง) */
export async function requestLeave(formData: FormData): Promise<HrActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  const supabase = await createServerSupabase();
  const empId = await myEmployeeId(supabase, me.id);
  if (!empId) {
    return { ok: false, error: "ไม่มีข้อมูลพนักงานของบัญชีนี้" };
  }

  const leaveType = String(formData.get("leave_type") ?? "").trim();
  const dateFrom = String(formData.get("date_from") ?? "").trim();
  const dateTo = String(formData.get("date_to") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!isLeaveType(leaveType)) {
    return { ok: false, error: "เลือกประเภทการลา" };
  }
  if (!dateFrom || !dateTo || leaveDays(dateFrom, dateTo) < 1) {
    return { ok: false, error: "ช่วงวันที่ลาไม่ถูกต้อง" };
  }

  const { error } = await supabase.from("leave_request").insert({
    employee_id: empId,
    leave_type: leaveType,
    date_from: dateFrom,
    date_to: dateTo,
    reason: reason || null,
    status: "รออนุมัติ",
  });
  if (error) {
    return { ok: false, error: "ส่งใบลาไม่สำเร็จ" };
  }
  revalidatePath("/hr");
  return { ok: true };
}

/** อนุมัติ/ปฏิเสธใบลา — เฉพาะผู้มีสิทธิ์ approve */
export async function decideLeave(formData: FormData): Promise<HrActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canApproveLeave(me.perms)) {
    return { ok: false, error: "ไม่มีสิทธิ์อนุมัติใบลา" };
  }

  const leaveId = String(formData.get("leave_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!leaveId || (decision !== "อนุมัติ" && decision !== "ปฏิเสธ")) {
    return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  }
  if (decision === "ปฏิเสธ" && !reason) {
    return { ok: false, error: "กรุณาระบุเหตุผลที่ไม่อนุมัติ" };
  }

  const supabase = await createServerSupabase();
  const patch: { status: string; approved_by: string; approved_at: string; reason?: string } = {
    status: decision,
    approved_by: me.id,
    approved_at: new Date().toISOString(),
  };
  if (decision === "ปฏิเสธ") {
    patch.reason = reason;
  }

  const { data: updated, error } = await supabase
    .from("leave_request")
    .update(patch)
    .eq("id", leaveId)
    .eq("status", "รออนุมัติ")
    .select("id");
  if (error || !updated || updated.length === 0) {
    return { ok: false, error: "ใบลานี้ถูกดำเนินการไปแล้ว หรือไม่มีสิทธิ์" };
  }
  revalidatePath("/hr");
  return { ok: true };
}
