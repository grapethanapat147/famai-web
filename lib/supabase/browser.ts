import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Supabase client สำหรับ browser / client components
 * ใช้ publishable key (เปิดเผยได้ — ความปลอดภัยมาจาก RLS ไม่ใช่การซ่อนคีย์)
 */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
