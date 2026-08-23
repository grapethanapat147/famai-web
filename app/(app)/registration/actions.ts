"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManagePlate, validateDelivery, validateDltRequest, validatePlateReceived, type PlateActionResult } from "@/lib/registration/plate";

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

/**
 * บันทึกการยื่นจดทะเบียนต่อกรมขนส่ง (FAM-1100) — เก็บเลขคำขอ + วันยื่น (ยังอยู่ขั้น "รอทะเบียน")
 * ทำได้เฉพาะดีลขั้นรอทะเบียน · ด่านสิทธิ์งานทะเบียน · log registration_event (best-effort)
 */
export async function recordDltSubmission(formData: FormData): Promise<PlateActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManagePlate(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์จัดการงานทะเบียน" };
  }

  const regId = String(formData.get("reg_id") ?? "").trim();
  const parsed = validateDltRequest(String(formData.get("request_no") ?? ""));
  if (!regId) {
    return { ok: false, error: "ไม่พบงานทะเบียน" };
  }
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createServerSupabase();
  const { data: reg } = await supabase.from("registration").select("id, stage").eq("id", regId).maybeSingle();
  if (!reg) {
    return { ok: false, error: "ไม่พบงานทะเบียน (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }
  if (reg.stage !== "รอทะเบียน") {
    return { ok: false, error: "งานนี้ไม่ได้อยู่ขั้นรอทะเบียน" };
  }

  const { error } = await supabase
    .from("registration")
    .update({ dlt_request_no: parsed.value, dlt_submitted_at: todayISO() })
    .eq("id", regId);
  if (error) {
    return { ok: false, error: "บันทึกการยื่นไม่สำเร็จ (รัน migration registration_plate แล้วหรือยัง?)" };
  }

  await supabase.from("registration_event").insert({
    registration_id: regId,
    from_stage: reg.stage,
    to_stage: reg.stage,
    by_user: user.id,
    note: `ยื่นกรมขนส่ง เลขคำขอ ${parsed.value}`,
  });

  revalidatePath("/registration");
  revalidatePath("/deal");
  return { ok: true, message: "บันทึกการยื่นแล้ว" };
}

/**
 * บันทึกรับเล่ม/ป้าย (FAM-1100) — เก็บเลขทะเบียน + เลขเล่ม แล้วเลื่อนดีล รอทะเบียน → ป้ายขาว
 * compare-and-swap กันกดซ้ำ/แข่งกัน (ตรงกับไปป์ไลน์ดีล) · log registration_event
 */
export async function recordPlateReceived(formData: FormData): Promise<PlateActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManagePlate(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์จัดการงานทะเบียน" };
  }

  const regId = String(formData.get("reg_id") ?? "").trim();
  const parsed = validatePlateReceived(String(formData.get("plate_no") ?? ""), String(formData.get("book_no") ?? ""));
  if (!regId) {
    return { ok: false, error: "ไม่พบงานทะเบียน" };
  }
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createServerSupabase();
  const { data: reg } = await supabase.from("registration").select("id, stage").eq("id", regId).maybeSingle();
  if (!reg) {
    return { ok: false, error: "ไม่พบงานทะเบียน (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }
  if (reg.stage !== "รอทะเบียน") {
    return { ok: false, error: "ต้องอยู่ขั้นรอทะเบียนก่อนจึงรับเล่มได้" };
  }

  const { data: updated, error } = await supabase
    .from("registration")
    .update({ stage: "ป้ายขาว", plate_no: parsed.value.plateNo, book_no: parsed.value.bookNo, plate_received_at: todayISO() })
    .eq("id", regId)
    .eq("stage", "รอทะเบียน")
    .select("id");
  if (error || !updated || updated.length === 0) {
    return { ok: false, error: "สถานะเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  await supabase.from("registration_event").insert({
    registration_id: regId,
    from_stage: "รอทะเบียน",
    to_stage: "ป้ายขาว",
    by_user: user.id,
    note: `รับเล่ม/ป้าย ${parsed.value.plateNo}`,
  });

  revalidatePath("/registration");
  revalidatePath("/deal");
  return { ok: true, message: "บันทึกรับเล่ม/ป้ายแล้ว" };
}

/**
 * บันทึกส่งมอบรถ (FAM-1105) — เก็บวันที่/สถานที่/ผู้ส่งมอบ แล้วปิดดีล ป้ายขาว → ส่งมอบแล้ว
 * ปิดวงจรดีล · compare-and-swap กันกดซ้ำ · log registration_event
 */
export async function recordDelivery(formData: FormData): Promise<PlateActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManagePlate(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์บันทึกการส่งมอบ" };
  }

  const regId = String(formData.get("reg_id") ?? "").trim();
  const parsed = validateDelivery({
    deliveredAt: String(formData.get("delivered_at") ?? ""),
    place: String(formData.get("delivery_place") ?? ""),
    deliveredBy: String(formData.get("delivered_by") ?? ""),
  });
  if (!regId) {
    return { ok: false, error: "ไม่พบงานทะเบียน" };
  }
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createServerSupabase();
  const { data: reg } = await supabase.from("registration").select("id, stage").eq("id", regId).maybeSingle();
  if (!reg) {
    return { ok: false, error: "ไม่พบงานทะเบียน (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }
  if (reg.stage !== "ป้ายขาว") {
    return { ok: false, error: "ต้องได้ป้าย (ขั้นป้ายขาว) ก่อนจึงส่งมอบได้" };
  }

  const { data: updated, error } = await supabase
    .from("registration")
    .update({
      stage: "ส่งมอบแล้ว",
      delivered_at: parsed.value.deliveredAt,
      delivery_place: parsed.value.place,
      delivered_by: parsed.value.deliveredBy,
    })
    .eq("id", regId)
    .eq("stage", "ป้ายขาว")
    .select("id");
  if (error || !updated || updated.length === 0) {
    return { ok: false, error: "สถานะเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  await supabase.from("registration_event").insert({
    registration_id: regId,
    from_stage: "ป้ายขาว",
    to_stage: "ส่งมอบแล้ว",
    by_user: user.id,
    note: parsed.value.place ? `ส่งมอบที่ ${parsed.value.place}` : "ส่งมอบรถ",
  });

  revalidatePath("/registration");
  revalidatePath("/deal");
  return { ok: true, message: "บันทึกการส่งมอบแล้ว — ปิดดีล" };
}
