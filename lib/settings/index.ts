import "server-only";

import { cache } from "react";
import type { TypedSupabaseClient } from "@/lib/supabase/client-type";
import { resolveSettings, SETTING_DEFAULTS, type AppSettings } from "@/lib/settings/resolve";
import { getSettingsCached } from "@/lib/reference/cache";

export { SETTING_DEFAULTS, type AppSettings };

async function fetchSettings(client: TypedSupabaseClient): Promise<AppSettings> {
  const { data, error } = await client.from("app_setting").select("key, value");
  if (error) {
    throw new Error(`อ่าน app_setting ไม่ได้: ${error.message}`);
  }
  return resolveSettings(data ?? []);
}

/**
 * โหลด settings ทั้งหมด — แคช global ข้ามรีเควสต์ (FAM-1084) แล้ว memoized ต่อ render ด้วย React cache
 * app_setting เป็น RLS using(true) = เหมือนกันทุกผู้ใช้ · พลาด → default (ตรงกับ seed)
 */
export const getSettings = cache((): Promise<AppSettings> => getSettingsCached());

/** โหลดค่าเดียวแบบ type-safe เช่น await getSetting("vat_pct") -> number */
export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  return (await getSettings())[key];
}

/** เวอร์ชันที่ระบุ client เอง (เช่น cron/admin ที่ไม่มี request context) */
export function getSettingsWith(client: TypedSupabaseClient): Promise<AppSettings> {
  return fetchSettings(client);
}
