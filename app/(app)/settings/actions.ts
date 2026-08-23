"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { REF_TAG, revalidateReference } from "@/lib/reference/cache";
import { SETTING_FIELDS, parseInput, type SettingsActionResult, type SettingValue } from "@/lib/settings/fields";
import { isValidHex } from "@/lib/theme/derive";
import { findFontPair, isValidFontPath } from "@/lib/theme/fonts";
import type { ThemeActionResult } from "@/lib/theme/config";
import { nullIfBlank, parseCheckbox, parseTaxId, type OrgInfoActionResult } from "@/lib/org/info";
import { validateGeoConfig } from "@/lib/hr/geo";
import type { Json } from "@/lib/supabase/database.types";

/**
 * บันทึกค่าตั้งค่าระบบ — เฉพาะ admin (ตรงกับ RLS app_setting = is_admin())
 * ตรวจทุกค่าใหม่ด้วย parseInput (แหล่งตรวจเดียวกับ client) แล้ว upsert ลง app_setting
 */
export async function updateSettings(formData: FormData): Promise<SettingsActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!user.perms.admin) {
    return { ok: false, error: "แก้ไขได้เฉพาะผู้ดูแลระบบ (admin)" };
  }

  const rows: Array<{ key: string; value: SettingValue }> = [];
  for (const field of SETTING_FIELDS) {
    const raw = String(formData.get(field.key) ?? "");
    const parsed = parseInput(field.kind, raw);
    if (!parsed.ok) {
      return { ok: false, error: `${field.label}: ${parsed.error}` };
    }
    rows.push({ key: field.key, value: parsed.value });
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("app_setting")
    .upsert(rows.map((r) => ({ key: r.key, value: r.value as Json })), { onConflict: "key" });
  if (error) {
    return { ok: false, error: "บันทึกไม่สำเร็จ (สิทธิ์ไม่พอ หรือฐานข้อมูลผิดพลาด)" };
  }

  revalidateReference(REF_TAG.settings);
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * บันทึกธีมของร้าน (FAM-1038/1039) — สีเน้น + ฟอนต์ global · เฉพาะ admin (ตรงกับ RLS app_setting = is_admin())
 * validate ทุกค่ากัน CSS injection (hex / รหัสคู่ฟอนต์ / path ฟอนต์อัปโหลด) · upsert 3 คีย์
 * revalidate ทั้งเลย์เอาต์ (ThemeStyle ฉีดใหม่ทั้งแอป)
 */
export async function updateThemeSettings(formData: FormData): Promise<ThemeActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!user.perms.admin) {
    return { ok: false, error: "แก้ไขได้เฉพาะผู้ดูแลระบบ (admin)" };
  }

  const accent = String(formData.get("accent") ?? "").trim();
  if (!isValidHex(accent)) {
    return { ok: false, error: "รหัสสีไม่ถูกต้อง (ต้องเป็น #RRGGBB)" };
  }

  const fontPair = String(formData.get("font_pair") ?? "").trim();
  if (!findFontPair(fontPair)) {
    return { ok: false, error: "คู่ฟอนต์ไม่ถูกต้อง" };
  }

  const customFont = String(formData.get("custom_font") ?? "").trim();
  if (customFont && !isValidFontPath(customFont)) {
    return { ok: false, error: "ไฟล์ฟอนต์ไม่ถูกต้อง" };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("app_setting").upsert(
    [
      { key: "theme_accent", value: accent },
      { key: "theme_font_pair", value: fontPair },
      { key: "theme_custom_font", value: customFont },
    ],
    { onConflict: "key" },
  );
  if (error) {
    return { ok: false, error: "บันทึกธีมไม่สำเร็จ (สิทธิ์ไม่พอ?)" };
  }

  revalidateReference(REF_TAG.settings);
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * บันทึกข้อมูลกิจการ/บริษัท (FAM-1078) — ชื่อ/เลขภาษี/ที่อยู่/เบอร์ ที่ขึ้นหัวเอกสาร · เฉพาะ admin
 * company: RLS company_admin = is_admin() · branch: ปิด RLS (ใช้ grant) — action gate ด้วย perms.admin
 */
export async function updateOrgInfo(formData: FormData): Promise<OrgInfoActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!user.perms.admin) {
    return { ok: false, error: "แก้ไขได้เฉพาะผู้ดูแลระบบ (admin)" };
  }

  function readFields(prefix: string):
    | { ok: true; value: { name: string; tax_id: string | null; address: string | null; phone: string | null } }
    | { ok: false; error: string } {
    const name = String(formData.get(`${prefix}_name`) ?? "").trim();
    if (name === "") {
      return { ok: false, error: "ชื่อห้ามว่าง" };
    }
    const tax = parseTaxId(String(formData.get(`${prefix}_tax_id`) ?? ""));
    if (!tax.ok) {
      return { ok: false, error: tax.error };
    }
    return {
      ok: true,
      value: {
        name,
        tax_id: tax.value,
        address: nullIfBlank(String(formData.get(`${prefix}_address`) ?? "")),
        phone: nullIfBlank(String(formData.get(`${prefix}_phone`) ?? "")),
      },
    };
  }

  const companyId = String(formData.get("company_id") ?? "").trim();
  if (!companyId) {
    return { ok: false, error: "ไม่พบบริษัท" };
  }
  const companyFields = readFields("company");
  if (!companyFields.ok) {
    return { ok: false, error: `บริษัท: ${companyFields.error}` };
  }

  const branchIds = String(formData.get("branch_ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  type BranchFields = {
    name: string;
    tax_id: string | null;
    address: string | null;
    phone: string | null;
    geo_lat: number | null;
    geo_lng: number | null;
    geo_radius_m: number | null;
    require_selfie: boolean;
  };
  const branchUpdates: Array<{ id: string; fields: BranchFields }> = [];
  for (const id of branchIds) {
    const f = readFields(`branch_${id}`);
    if (!f.ok) {
      return { ok: false, error: `บริษัท: ${f.error}` };
    }
    const geo = validateGeoConfig(
      String(formData.get(`branch_${id}_geo_lat`) ?? ""),
      String(formData.get(`branch_${id}_geo_lng`) ?? ""),
      String(formData.get(`branch_${id}_geo_radius`) ?? ""),
    );
    if (!geo.ok) {
      return { ok: false, error: `พิกัดลงเวลา: ${geo.error}` };
    }
    branchUpdates.push({
      id,
      fields: {
        ...f.value,
        geo_lat: geo.value.lat,
        geo_lng: geo.value.lng,
        geo_radius_m: geo.value.radiusM,
        require_selfie: parseCheckbox(formData.get(`branch_${id}_require_selfie`)),
      },
    });
  }

  const supabase = await createServerSupabase();
  const { error: companyError } = await supabase.from("company").update(companyFields.value).eq("id", companyId);
  if (companyError) {
    return { ok: false, error: "บันทึกข้อมูลบริษัทไม่สำเร็จ (สิทธิ์ไม่พอ หรือฐานข้อมูลผิดพลาด)" };
  }
  for (const b of branchUpdates) {
    const { error: branchError } = await supabase.from("branch").update(b.fields).eq("id", b.id);
    if (branchError) {
      return { ok: false, error: "บันทึกข้อมูลบริษัทไม่สำเร็จ (สิทธิ์ไม่พอ หรือฐานข้อมูลผิดพลาด)" };
    }
  }

  revalidateReference(REF_TAG.branches, REF_TAG.companies);
  revalidatePath("/settings");
  return { ok: true };
}
