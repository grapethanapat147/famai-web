"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageService, type ServiceActionResult } from "@/lib/service/jobs";
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
