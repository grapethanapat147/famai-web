"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageSites, validateSite, type SiteActionResult } from "@/lib/branch/sites";

/**
 * เพิ่ม/แก้ไขสาขา (จุดลงเวลา) — FAM-1113
 * ด่านสิทธิ์ admin/manager · RLS branch_site_write คุมอีกชั้น (is_manager + บริษัทที่เข้าถึงได้)
 * ส่ง site_id มา = แก้ไข · ไม่ส่ง = เพิ่มใหม่
 */
export async function saveSite(formData: FormData): Promise<SiteActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageSites(me.roleCodes)) {
    return { ok: false, error: "จัดการสาขาได้เฉพาะผู้ดูแล / ผู้บริหาร" };
  }

  const parsed = validateSite({
    branchId: String(formData.get("branch_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? "main"),
    lat: String(formData.get("lat") ?? ""),
    lng: String(formData.get("lng") ?? ""),
    radius: String(formData.get("radius") ?? ""),
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const v = parsed.value;
  const siteId = String(formData.get("site_id") ?? "").trim();
  const isActive = String(formData.get("is_active") ?? "true") !== "false";

  const supabase = await createServerSupabase();
  const row = {
    branch_id: v.branchId,
    name: v.name,
    kind: v.kind,
    lat: v.lat,
    lng: v.lng,
    radius_m: v.radiusM,
    is_active: isActive,
  };

  const { error } = siteId
    ? await supabase.from("branch_site").update(row).eq("id", siteId)
    : await supabase.from("branch_site").insert({ ...row, created_by: me.id });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `บริษัทนี้มีสาขาชื่อ "${v.name}" อยู่แล้ว` };
    }
    return { ok: false, error: "บันทึกไม่สำเร็จ — คุณอาจไม่มีสิทธิ์ในบริษัทนี้ ให้ผู้ดูแลตรวจสิทธิ์ที่หน้า บัญชีผู้ใช้" };
  }

  revalidatePath("/sites");
  revalidatePath("/hr");
  return { ok: true, message: siteId ? "บันทึกสาขาแล้ว" : `เพิ่มสาขา "${v.name}" แล้ว` };
}

/**
 * ย้ายพิกัดเก่าของบริษัท (branch.geo_*) มาเป็นจุดลงเวลาใน branch_site — FAM-1114
 * ทำให้เหลือแหล่งพิกัดเดียว: สร้างจุดชื่อ "สาขาหลัก" แล้วล้าง geo_* ทิ้ง
 * ทำแบบ idempotent: ถ้าบริษัทมีจุดอยู่แล้วจะไม่สร้างซ้ำ แค่ล้างค่าเก่าออก
 */
export async function importLegacyGeo(formData: FormData): Promise<SiteActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageSites(me.roleCodes)) {
    return { ok: false, error: "จัดการสาขาได้เฉพาะผู้ดูแล / ผู้บริหาร" };
  }
  const branchId = String(formData.get("branch_id") ?? "").trim();
  if (branchId === "") {
    return { ok: false, error: "ไม่พบบริษัท" };
  }

  const supabase = await createServerSupabase();
  const { data: branch, error: readError } = await supabase
    .from("branch")
    .select("name, geo_lat, geo_lng, geo_radius_m")
    .eq("id", branchId)
    .maybeSingle();
  if (readError || !branch) {
    return { ok: false, error: "อ่านข้อมูลบริษัทไม่สำเร็จ" };
  }
  if (branch.geo_lat == null || branch.geo_lng == null || branch.geo_radius_m == null) {
    return { ok: false, error: "บริษัทนี้ไม่มีพิกัดเก่าให้ย้าย" };
  }

  const { count } = await supabase
    .from("branch_site")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", branchId);

  if ((count ?? 0) === 0) {
    const { error: insertError } = await supabase.from("branch_site").insert({
      branch_id: branchId,
      name: branch.name,
      kind: "main",
      lat: Number(branch.geo_lat),
      lng: Number(branch.geo_lng),
      radius_m: Number(branch.geo_radius_m),
      is_active: true,
    });
    if (insertError) {
      return { ok: false, error: "สร้างจุดลงเวลาไม่สำเร็จ (สิทธิ์ไม่พอ หรือฐานข้อมูลผิดพลาด)" };
    }
  }

  const { error: clearError } = await supabase
    .from("branch")
    .update({ geo_lat: null, geo_lng: null, geo_radius_m: null })
    .eq("id", branchId);
  if (clearError) {
    return { ok: false, error: "ย้ายจุดแล้วแต่ล้างพิกัดเก่าไม่สำเร็จ — ลองใหม่อีกครั้ง" };
  }

  revalidatePath("/sites");
  revalidatePath("/settings");
  revalidatePath("/hr");
  return { ok: true, message: `ย้ายพิกัดของ ${branch.name} มาเป็นจุดลงเวลาแล้ว` };
}
