"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { SETTING_FIELDS, parseInput, type SettingsActionResult, type SettingValue } from "@/lib/settings/fields";
import { isValidHex } from "@/lib/theme/derive";
import type { ThemeActionResult } from "@/lib/theme/config";
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

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * บันทึกธีมของร้าน (FAM-1038) — สีเน้น global · เฉพาะ admin (ตรงกับ RLS app_setting = is_admin())
 * validate hex กัน CSS injection · upsert theme_accent · revalidate ทั้งเลย์เอาต์ (ThemeStyle ฉีดใหม่ทั้งแอป)
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

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("app_setting").upsert({ key: "theme_accent", value: accent }, { onConflict: "key" });
  if (error) {
    return { ok: false, error: "บันทึกธีมไม่สำเร็จ (สิทธิ์ไม่พอ?)" };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
