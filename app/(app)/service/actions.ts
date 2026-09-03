"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { TypedSupabaseClient } from "@/lib/supabase/client-type";
import { nextDocNo } from "@/lib/rpc";
import { canManageService, isServiceType, type ServiceActionResult } from "@/lib/service/jobs";
import { canTransition, isServiceStatus } from "@/lib/service/status";
import { nextServiceReminder } from "@/lib/rpc";
import { isLineKind, jobTotals, lineAmount } from "@/lib/service/lines";

/** คำนวณยอด labor/parts/total ใหม่จากรายการทั้งหมดของใบงาน แล้วเขียนกลับ (self-healing) */
async function recomputeJobTotals(supabase: TypedSupabaseClient, jobId: string): Promise<void> {
  const { data: lines } = await supabase.from("service_job_line").select("kind, amount").eq("job_id", jobId);
  const totals = jobTotals((lines ?? []).map((l) => ({ kind: String(l.kind), amount: Number(l.amount) })));
  await supabase
    .from("service_job")
    .update({ labor_cost: totals.laborCost, parts_cost: totals.partsCost, total: totals.total })
    .eq("id", jobId);
}

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
    return { ok: false, error: "ไม่พบใบงาน (หรือไม่มีสิทธิ์บริษัทนี้)" };
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

  // ปิดงานแล้วตั้งรอบเช็กระยะถัดไป (best-effort — ไม่ล้มการเปลี่ยนสถานะถ้าตั้งไม่ได้)
  if (to === "เสร็จ") {
    try {
      await nextServiceReminder(supabase, jobId);
      revalidatePath("/cal");
    } catch {
      // ตั้งเตือนไม่ได้ไม่ควรทำให้ปิดใบงานล้ม — รอบถัดไปตั้งมือได้จากหน้าปฏิทิน
    }
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
    return { ok: false, error: "ไม่พบบริษัท" };
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

/**
 * เพิ่มรายการใบงานซ่อม (FAM-1027b) — ค่าแรง หรือ อะไหล่ (ตัดสต๊อกอัตโนมัติ)
 * ด่านสิทธิ์ service + ใบงานต้องยังไม่ส่งมอบ · part = compare-and-swap ตัดสต๊อก + part_movement kind=job
 * (หลายตาราง ไม่มี RPC → best-effort revert แบบเดียวกับ issuePart) · แล้วคำนวณยอดใหม่
 */
export async function addServiceLine(formData: FormData): Promise<ServiceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageService(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้รายการใบงาน" };
  }

  const jobId = String(formData.get("job_id") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const partId = String(formData.get("part_id") ?? "").trim() || null;
  let description = String(formData.get("description") ?? "").trim();
  const qty = Number(String(formData.get("qty") ?? "").trim());
  const unitPriceRaw = String(formData.get("unit_price") ?? "").trim();

  if (!jobId) {
    return { ok: false, error: "ไม่พบใบงาน" };
  }
  if (!isLineKind(kind)) {
    return { ok: false, error: "ประเภทรายการไม่ถูกต้อง" };
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, error: "จำนวนต้องมากกว่า 0" };
  }

  const supabase = await createServerSupabase();

  const { data: job } = await supabase.from("service_job").select("id, status").eq("id", jobId).maybeSingle();
  if (!job) {
    return { ok: false, error: "ไม่พบใบงาน (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }
  if (job.status === "ส่งมอบแล้ว") {
    return { ok: false, error: "ใบงานส่งมอบแล้ว แก้รายการไม่ได้" };
  }

  let unitPrice: number;
  let part: { id: string; branch_id: string; qty_on_hand: number; price: number; name: string; cost: number } | null = null;

  if (kind === "part") {
    if (!partId) {
      return { ok: false, error: "เลือกอะไหล่" };
    }
    const { data: p } = await supabase
      .from("part")
      .select("id, branch_id, qty_on_hand, price, name, cost")
      .eq("id", partId)
      .maybeSingle();
    if (!p) {
      return { ok: false, error: "ไม่พบอะไหล่ (หรือไม่มีสิทธิ์บริษัทนี้)" };
    }
    part = { id: p.id, branch_id: p.branch_id, qty_on_hand: p.qty_on_hand, price: Number(p.price), name: p.name, cost: Number(p.cost ?? 0) };
    if (part.qty_on_hand < qty) {
      return { ok: false, error: `สต๊อกไม่พอ — เหลือ ${part.qty_on_hand}` };
    }
    unitPrice = unitPriceRaw === "" ? part.price : Number(unitPriceRaw);
    if (!description) {
      description = part.name;
    }
  } else {
    unitPrice = Number(unitPriceRaw);
    if (!description) {
      return { ok: false, error: "กรอกรายละเอียดค่าแรง" };
    }
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { ok: false, error: "ราคาต่อหน่วยไม่ถูกต้อง" };
  }

  const amount = lineAmount(qty, unitPrice);

  // อะไหล่: ตัดสต๊อก (CAS) → บันทึก movement ก่อน insert line
  let movementId: number | null = null;
  if (kind === "part" && part) {
    const { data: updated, error: casError } = await supabase
      .from("part")
      .update({ qty_on_hand: part.qty_on_hand - qty })
      .eq("id", part.id)
      .eq("qty_on_hand", part.qty_on_hand)
      .select("id");
    if (casError || !updated || updated.length === 0) {
      return { ok: false, error: "สต๊อกเพิ่งเปลี่ยน กรุณาลองใหม่" };
    }

    const { data: move, error: moveError } = await supabase
      .from("part_movement")
      .insert({ part_id: part.id, branch_id: part.branch_id, kind: "job", qty: -qty, job_id: jobId, unit_price: unitPrice, unit_cost: part.cost, by_user: user.id })
      .select("id")
      .maybeSingle();
    if (moveError || !move) {
      await supabase.from("part").update({ qty_on_hand: part.qty_on_hand }).eq("id", part.id).eq("qty_on_hand", part.qty_on_hand - qty);
      return { ok: false, error: "บันทึกการตัดสต๊อกไม่สำเร็จ กรุณาลองใหม่" };
    }
    movementId = move.id;
  }

  const { error: lineError } = await supabase.from("service_job_line").insert({
    job_id: jobId,
    kind,
    part_id: kind === "part" ? partId : null,
    description,
    qty,
    unit_price: unitPrice,
    amount,
  });
  if (lineError) {
    // ย้อนสต๊อก + ลบ movement (best-effort) เมื่อ insert line ไม่สำเร็จ
    if (kind === "part" && part) {
      await supabase.from("part").update({ qty_on_hand: part.qty_on_hand }).eq("id", part.id).eq("qty_on_hand", part.qty_on_hand - qty);
      if (movementId != null) {
        await supabase.from("part_movement").delete().eq("id", movementId);
      }
    }
    return { ok: false, error: "เพิ่มรายการไม่สำเร็จ" };
  }

  await recomputeJobTotals(supabase, jobId);
  revalidatePath("/service");
  return { ok: true };
}

/**
 * ลบรายการใบงานซ่อม (FAM-1027b) — ด่านสิทธิ์ + ใบงานต้องยังไม่ส่งมอบ
 * ถ้าเป็นอะไหล่ → คืนสต๊อก (CAS) + part_movement kind=adjust · แล้วคำนวณยอดใหม่
 */
export async function removeServiceLine(formData: FormData): Promise<ServiceActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageService(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้รายการใบงาน" };
  }

  const lineIdRaw = String(formData.get("line_id") ?? "").trim();
  const lineId = Number(lineIdRaw);
  if (!lineIdRaw || !Number.isInteger(lineId)) {
    return { ok: false, error: "ไม่พบรายการ" };
  }

  const supabase = await createServerSupabase();

  const { data: line } = await supabase
    .from("service_job_line")
    .select("id, job_id, kind, part_id, qty")
    .eq("id", lineId)
    .maybeSingle();
  if (!line) {
    return { ok: false, error: "ไม่พบรายการ (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }

  const { data: job } = await supabase.from("service_job").select("id, status").eq("id", line.job_id).maybeSingle();
  if (job && job.status === "ส่งมอบแล้ว") {
    return { ok: false, error: "ใบงานส่งมอบแล้ว แก้รายการไม่ได้" };
  }

  const { data: deleted, error: delError } = await supabase
    .from("service_job_line")
    .delete()
    .eq("id", lineId)
    .select("id");
  if (delError || !deleted || deleted.length === 0) {
    return { ok: false, error: "ลบรายการไม่สำเร็จ" };
  }

  if (line.kind === "part" && line.part_id) {
    const returnQty = Number(line.qty);
    const { data: p } = await supabase.from("part").select("id, branch_id, qty_on_hand, cost").eq("id", line.part_id).maybeSingle();
    if (p) {
      await supabase
        .from("part")
        .update({ qty_on_hand: p.qty_on_hand + returnQty })
        .eq("id", p.id)
        .eq("qty_on_hand", p.qty_on_hand);
      await supabase.from("part_movement").insert({
        part_id: p.id,
        branch_id: p.branch_id,
        kind: "adjust",
        qty: returnQty,
        unit_cost: p.cost,
        job_id: line.job_id,
        by_user: user.id,
        note: "คืนสต๊อก: ลบรายการอะไหล่ในใบงาน",
      });
    }
  }

  await recomputeJobTotals(supabase, line.job_id);
  revalidatePath("/service");
  return { ok: true };
}
