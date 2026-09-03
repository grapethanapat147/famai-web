"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveBranches } from "@/lib/reference/cache";
import { getSettingsWith } from "@/lib/settings";
import { punchIn, punchOut } from "@/lib/rpc";
import type { TypedSupabaseClient } from "@/lib/supabase/client-type";
import { positionFromRoles } from "@/lib/hr/employee";
import { canApproveLeave, isLeaveType, leaveDays, type HrActionResult } from "@/lib/hr/leave";
import { branchGeofence, formatDistanceM, haversineMeters, withinGeofence } from "@/lib/hr/geo";
import { isSiteKind, nearestSite, type SiteRow } from "@/lib/branch/sites";

/** วันที่/เวลาปัจจุบันตามเขตเวลาไทย */
function bangkokDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

async function myEmployeeId(supabase: TypedSupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase.from("employee").select("id").eq("user_id", userId).maybeSingle();
  return data?.id ?? null;
}

/**
 * เชื่อมบัญชีปัจจุบันกับข้อมูลพนักงาน (opt-in) — ปลดล็อกลงเวลา/ลา เมื่อบัญชียังไม่ผูก employee
 * สร้าง employee ผูก user_id · บริษัท = บริษัทผู้ใช้ (ไม่มี → บริษัทแรก) · ตำแหน่งจาก role · เงินเดือน/emp_code ให้ HR เติมภายหลัง
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
    return { ok: false, error: "ยังไม่มีบริษัทในระบบ — เพิ่มบริษัทก่อน" };
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
    return { ok: false, error: "เชื่อมข้อมูลพนักงานไม่สำเร็จ (สิทธิ์บริษัทไม่พอ?)" };
  }

  revalidatePath("/hr");
  return { ok: true, message: "เชื่อมข้อมูลพนักงานแล้ว — เริ่มลงเวลาได้เลย" };
}

/**
 * ลงเวลาเข้า (ตัวเอง) — คำนวณสาย/สถานะจาก work_start
 * ถ้าบริษัทตั้ง geofence ไว้ ต้องส่งพิกัด (lat/lng) + อยู่ในรัศมี จึงลงเวลาได้ (FAM-1101) · เก็บพิกัด+ระยะไว้
 */
export async function clockIn(formData: FormData): Promise<HrActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  const supabase = await createServerSupabase();
  const { data: emp } = await supabase.from("employee").select("id, branch_id").eq("user_id", me.id).maybeSingle();
  if (!emp) {
    return { ok: false, error: "ไม่มีข้อมูลพนักงานของบัญชีนี้" };
  }
  const empId = emp.id;

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

  const { data: branch } = await supabase
    .from("branch")
    .select("geo_lat, geo_lng, geo_radius_m, require_selfie")
    .eq("id", emp.branch_id)
    .maybeSingle();

  // จุดลงเวลาของบริษัท (FAM-1113) — สาขาหลายจุดมาก่อน · ไม่มีจุดค่อยใช้ geofence เดี่ยวของบริษัท (FAM-1101)
  const { data: siteRows } = await supabase
    .from("branch_site")
    .select("id, branch_id, name, kind, lat, lng, radius_m, is_active")
    .eq("branch_id", emp.branch_id)
    .eq("is_active", true);

  const sites: SiteRow[] = (siteRows ?? []).map((s) => ({
    id: s.id,
    branchId: s.branch_id,
    branchName: "",
    name: s.name,
    kind: isSiteKind(s.kind) ? s.kind : "other",
    lat: Number(s.lat),
    lng: Number(s.lng),
    radiusM: Number(s.radius_m),
    isActive: s.is_active,
  }));

  const fence = branch ? branchGeofence(branch) : null;
  const needGeo = sites.length > 0 || fence !== null;

  let geoFields: {
    check_in_lat?: number;
    check_in_lng?: number;
    check_in_distance_m?: number;
    check_in_site_id?: string;
    check_in_site_name?: string;
  } = {};

  if (needGeo) {
    const lat = Number(formData.get("lat"));
    const lng = Number(formData.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: "ต้องเปิดตำแหน่ง (GPS) เพื่อลงเวลา — อนุญาตการเข้าถึงตำแหน่งแล้วลองใหม่" };
    }

    if (sites.length > 0) {
      const near = nearestSite(sites, emp.branch_id, lat, lng);
      if (!near || !near.inside) {
        const how = near ? ` (ใกล้สุด ${near.site.name} ห่าง ${formatDistanceM(near.distanceM)})` : "";
        return { ok: false, error: `อยู่นอกพื้นที่สาขา${how} — เข้าใกล้สาขาแล้วลองใหม่` };
      }
      geoFields = {
        check_in_lat: lat,
        check_in_lng: lng,
        check_in_distance_m: near.distanceM,
        check_in_site_id: near.site.id,
        check_in_site_name: near.site.name, // แช่ชื่อ ณ วันลงเวลา — เปลี่ยนชื่อสาขาทีหลังประวัติไม่เปลี่ยนตาม
      };
    } else if (fence) {
      const distance = Math.round(haversineMeters(lat, lng, fence.lat, fence.lng));
      if (!withinGeofence(distance, fence.radiusM)) {
        return { ok: false, error: `อยู่นอกพื้นที่ร้าน (${formatDistanceM(distance)} จากจุดลงเวลา) — เข้าใกล้ร้านแล้วลองใหม่` };
      }
      geoFields = { check_in_lat: lat, check_in_lng: lng, check_in_distance_m: distance };
    }
  }

  // เซลฟี่ยืนยัน เฉพาะบริษัทที่เปิด require_selfie — client อัปโหลดแล้วส่ง path มา
  const selfiePath = String(formData.get("selfie_path") ?? "").trim();
  if (branch?.require_selfie && !selfiePath) {
    return { ok: false, error: "ต้องถ่ายเซลฟี่ยืนยันก่อนลงเวลา" };
  }

  // เวลาประทับจาก now() ของฐานข้อมูล ไม่ใช่นาฬิกาเครื่องแอป (FAM-1132 · fixlist ข้อ 23)
  const settings = await getSettingsWith(supabase);
  try {
    await punchIn(supabase, {
      lat: geoFields.check_in_lat ?? null,
      lng: geoFields.check_in_lng ?? null,
      distanceM: geoFields.check_in_distance_m ?? null,
      siteId: geoFields.check_in_site_id ?? null,
      siteName: geoFields.check_in_site_name ?? null,
      selfiePath: selfiePath || null,
      workStart: settings.work_start,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ลงเวลาไม่สำเร็จ" };
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

  // เวลาออก + ชั่วโมงงาน + OT คิดในฐานข้อมูล (สูตรเดียวกับ lib/hr/time.ts) — FAM-1132
  const settings = await getSettingsWith(supabase);
  try {
    await punchOut(supabase, { workEnd: settings.work_end, otStep: 30 });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ลงเวลาออกไม่สำเร็จ" };
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
