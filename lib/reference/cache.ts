import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveSettings, SETTING_DEFAULTS, type AppSettings } from "@/lib/settings/resolve";
import { DEFAULT_THEME, parseThemeConfig, type ThemeConfig } from "@/lib/theme/config";

/**
 * แคชข้อมูลอ้างอิงระดับ global (FAM-1084) — ตาราง `app_setting`/`branch`/`company`
 * เป็น RLS `for select to authenticated using (true)` = แถวเดียวกันทุกผู้ใช้ จึงแคชข้ามรีเควสต์ได้ปลอดภัย
 *
 * `unstable_cache` รันนอก request scope (อ่าน cookie ไม่ได้) → ใช้ service_role client อ่าน
 * ตารางเหล่านี้ไม่มีข้อมูลเงิน/ความลับ (ต้นทุน/กำไรอยู่คนละตาราง) จึงอ่านด้วย service_role ได้
 *
 * ทุก getter **resilient**: แคช/คีย์ service_role พลาด → fallback อ่านสดผ่าน session client
 * (พฤติกรรมเดิมก่อนมีแคช) → ต่อให้ยังไม่ตั้ง SUPABASE_SERVICE_ROLE_KEY บนโปรดักชันก็ไม่ regress
 */

export const REF_TAG = {
  settings: "ref:settings",
  branches: "ref:branches",
  companies: "ref:companies",
} as const;
export type RefTag = (typeof REF_TAG)[keyof typeof REF_TAG];

/** reference data เปลี่ยนน้อย — TTL ยาวได้ (มี revalidateTag ตอนบันทึกอยู่แล้ว) */
const TTL_SECONDS = 300;

export type BranchRef = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  tax_id: string | null;
  company_id: string | null;
  is_active: boolean;
};

export type CompanyRef = {
  id: string;
  code: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
};

// ── app_setting (ตั้งค่า + ธีม ใช้ cache entry เดียวกัน tag เดียว) ────────────────

const fetchSettingRowsCached = unstable_cache(
  async (): Promise<Array<{ key: string; value: unknown }>> => {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.from("app_setting").select("key, value");
    if (error) {
      throw new Error(error.message);
    }
    return data ?? [];
  },
  ["ref:app_setting"],
  { tags: [REF_TAG.settings], revalidate: TTL_SECONDS },
);

async function settingRows(): Promise<Array<{ key: string; value: unknown }>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("app_setting").select("key, value");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

/** settings ทั้งหมด (แคช global) — พลาดทั้งแคชและอ่านสด → default ที่ตรงกับ seed */
export async function getSettingsCached(): Promise<AppSettings> {
  try {
    return resolveSettings(await fetchSettingRowsCached());
  } catch {
    try {
      return resolveSettings(await settingRows());
    } catch {
      return { ...SETTING_DEFAULTS };
    }
  }
}

/** ธีม global (แคช global) — พลาดทั้งคู่ → โทน default เดิม */
export async function getThemeConfigCached(): Promise<ThemeConfig> {
  try {
    return parseThemeConfig(await fetchSettingRowsCached());
  } catch {
    try {
      return parseThemeConfig(await settingRows());
    } catch {
      return DEFAULT_THEME;
    }
  }
}

// ── branch ───────────────────────────────────────────────────────────────────

const fetchBranchesCached = unstable_cache(
  async (): Promise<BranchRef[]> => {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("branch")
      .select("id, code, name, address, phone, tax_id, company_id, is_active")
      .order("code");
    if (error) {
      throw new Error(error.message);
    }
    return data ?? [];
  },
  ["ref:branches"],
  { tags: [REF_TAG.branches], revalidate: TTL_SECONDS },
);

/** ทุกบริษัท (รวม inactive) เรียงตามรหัส — แคช global พร้อม fallback อ่านสด */
export async function getBranchesCached(): Promise<BranchRef[]> {
  try {
    return await fetchBranchesCached();
  } catch {
    try {
      const supabase = await createServerSupabase();
      const { data } = await supabase
        .from("branch")
        .select("id, code, name, address, phone, tax_id, company_id, is_active")
        .order("code");
      return data ?? [];
    } catch {
      return [];
    }
  }
}

/** เฉพาะบริษัทที่เปิดใช้งาน (is_active) — ใช้กับดรอปดาวน์/หัวเอกสาร */
export async function getActiveBranches(): Promise<BranchRef[]> {
  return (await getBranchesCached()).filter((b) => b.is_active);
}

// ── company ──────────────────────────────────────────────────────────────────

const fetchCompaniesCached = unstable_cache(
  async (): Promise<CompanyRef[]> => {
    const supabase = createAdminSupabase();
    const { data, error } = await supabase
      .from("company")
      .select("id, code, name, tax_id, address, phone")
      .order("code");
    if (error) {
      throw new Error(error.message);
    }
    return data ?? [];
  },
  ["ref:companies"],
  { tags: [REF_TAG.companies], revalidate: TTL_SECONDS },
);

/** ทุกบริษัท เรียงตามรหัส — แคช global พร้อม fallback อ่านสด */
export async function getCompaniesCached(): Promise<CompanyRef[]> {
  try {
    return await fetchCompaniesCached();
  } catch {
    try {
      const supabase = await createServerSupabase();
      const { data } = await supabase
        .from("company")
        .select("id, code, name, tax_id, address, phone")
        .order("code");
      return data ?? [];
    } catch {
      return [];
    }
  }
}

/**
 * ล้างแคชข้อมูลอ้างอิงตาม tag — เรียกหลังบันทึก settings/theme/บริษัท
 * Next 16: revalidateTag ต้องมี profile arg — ใส่ "max" (แค่สั่ง purge tag ส่วน TTL ของ entry คุมด้วย revalidate ในตัว getter)
 */
export function revalidateReference(...tags: RefTag[]): void {
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
}
