"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { nextDocNo } from "@/lib/rpc";
import { canManageService, isServiceType, type ServiceActionResult } from "@/lib/service/jobs";
import { canTransition, isServiceStatus } from "@/lib/service/status";

/**
 * เลื่อนสถานะใบงานซ่อม — ด่านสิทธิ์ + ตรวจทางเดินที่อนุญาต + compare-and-swap กันเลื่อนซ้ำ/แข่งกัน
 * ตั้ง started_at เมื่อเริ่มซ่อม (ถ้ายังไม่เคย) · finished_at เมื่อเสร็จ
 */
export async function advanceStatus(formData: FormData): Promise<ServiceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageService(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์จัดการใบงานซ่อม" };
  }

  const jobId = String(formData.get("job_id") ?? "").trim();
  const from = String(formData.get("from") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();

  if (!jobId) {
    return { ok: false, error: "ไม่พบใบงาน" };
  }
  if (!isServiceStatus(from) || !isServiceStatus(to) || !canTransition(from, to)) {
    return { ok: false, error: "เปลี่ยนสถานะแบบนี้ไม่ได้" };
  }

  const supabase = await createServerSupabase();

  const { data: jobRow, error: readError } = await supabase
    .from("service_job")
    .select("id, status, started_at")
    .eq("id", jobId)
    .maybeSingle();
  if (readError || !jobRow) {
    return { ok: false, error: "ไม่พบใบงาน (หรือไม่มีสิทธิ์สาขานี้)" };
  }
  if (jobRow.status !== from) {
    return { ok: false, error: "สถานะเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  const now = new Date().toISOString();
  const patch: { status: string; started_at?: string; finished_at?: string } = { status: to };
  if (to === "กำลังซ่อม" && !jobRow.started_at) {
    patch.started_at = now;
  }
  if (to === "เสร็จ") {
    patch.finished_at = now;
  }

  const { data: updated, error: casError } = await supabase
    .from("service_job")
    .update(patch)
    .eq("id", jobId)
    .eq("status", from)
    .select("id");
  if (casError || !updated || updated.length === 0) {
    return { ok: false, error: "สถานะเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  revalidatePath("/service");
  return { ok: true };
}

/**
 * เปิดใบงานซ่อมใหม่ (FAM-1027) — ด่านสิทธิ์ + job_no ผ่าน next_doc_no('SERVICE') + insert เดียว
 * รถในร้าน (unit_id) หรือ รถนอก (engine_no/frame_no) · เริ่มที่สถานะ "รับเข้า" · ยอด 0 (เพิ่มรายการภายหลัง)
 */
export async function createServiceJob(formData: FormData): Promise<ServiceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageService(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์เปิดใบงานซ่อม" };
  }

  const customerId = String(formData.get("customer_id") ?? "").trim() || null;
  const unitId = String(formData.get("unit_id") ?? "").trim() || null;
  const engineNo = String(formData.get("engine_no") ?? "").trim();
  const frameNo = String(formData.get("frame_no") ?? "").trim();
  const serviceType = String(formData.get("service_type") ?? "").trim();
  const symptom = String(formData.get("symptom") ?? "").trim();
  const technicianId = String(formData.get("technician_id") ?? "").trim() || null;
  const odoRaw = String(formData.get("odometer_km") ?? "").trim();
  const odometerKm = odoRaw === "" ? null : Number(odoRaw);

  if (!unitId && !engineNo) {
    return { ok: false, error: "ระบุรถ (เลือกรถในร้าน หรือกรอกเลขเครื่องรถนอก)" };
  }
  if (!isServiceType(serviceType)) {
    return { ok: false, error: "เลือกประเภทงาน" };
  }
  if (odometerKm != null && (!Number.isFinite(odometerKm) || odometerKm < 0)) {
    return { ok: false, error: "เลขไมล์ไม่ถูกต้อง" };
  }

  const supabase = await createServerSupabase();
  let branchId = user.branchIds[0];
  if (!branchId) {
    branchId = (await supabase.from("branch").select("id").limit(1).maybeSingle()).data?.id ?? "";
  }
  if (!branchId) {
    return { ok: false, error: "ไม่พบสาขา" };
  }

  const yearBE = new Date().getFullYear() + 543;
  let jobNo: string;
  try {
    jobNo = await nextDocNo(supabase, branchId, "SERVICE", yearBE);
  } catch {
    return { ok: false, error: "ออกเลขใบงานไม่สำเร็จ" };
  }

  const { error } = await supabase.from("service_job").insert({
    branch_id: branchId,
    job_no: jobNo,
    customer_id: customerId,
    unit_id: unitId,
    engine_no: engineNo || null,
    frame_no: frameNo || null,
    odometer_km: odometerKm,
    service_type: serviceType,
    symptom: symptom || null,
    status: "รับเข้า",
    technician_id: technicianId,
  });
  if (error) {
    return { ok: false, error: "เปิดใบงานไม่สำเร็จ (สิทธิ์ไม่พอ หรือข้อมูลผิด)" };
  }

  revalidatePath("/service");
  return { ok: true };
}
