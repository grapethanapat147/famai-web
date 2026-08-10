import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * service_role client — ข้ามผ่าน RLS ทั้งหมด
 * ใช้เฉพาะงานฝั่งเซิร์ฟเวอร์ที่จำเป็นจริง (cron / admin ops) และ **ห้าม import จาก client component**
 * key อ่านจาก env ฝั่ง server เท่านั้น (ดู .env.example / docs/06-supabase-setup.md §2)
 */
export function createAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ยังไม่ตั้งค่า — เพิ่มใน .env.local (server-only)");
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
