import "server-only";

import { cache } from "react";
import type { TypedSupabaseClient } from "@/lib/supabase/client-type";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveSettings, SETTING_DEFAULTS, type AppSettings } from "@/lib/settings/resolve";

export { SETTING_DEFAULTS, type AppSettings };

async function fetchSettings(client: TypedSupabaseClient): Promise<AppSettings> {
  const { data, error } = await client.from("app_setting").select("key, value");
  if (error) {
    throw new Error(`อ่าน app_setting ไม่ได้: ${error.message}`);
  }
  return resolveSettings(data ?? []);
}

/**
 * โหลด settings ทั้งหมด ผ่าน server client (ตาม RLS ของผู้ใช้) — memoized ต่อ render ด้วย React cache
 * ถ้าไม่มี session/อ่านไม่เจอแถว จะได้ค่า default (ตรงกับ seed) ซึ่งปลอดภัย
 */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const client = await createServerSupabase();
  return fetchSettings(client);
});

/** โหลดค่าเดียวแบบ type-safe เช่น await getSetting("vat_pct") -> number */
export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  return (await getSettings())[key];
}

/** เวอร์ชันที่ระบุ client เอง (เช่น cron/admin ที่ไม่มี request context) */
export function getSettingsWith(client: TypedSupabaseClient): Promise<AppSettings> {
  return fetchSettings(client);
}
