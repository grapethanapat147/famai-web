import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client สำหรับ browser / client components
 * ใช้ publishable key (เปิดเผยได้ — ความปลอดภัยมาจาก RLS ไม่ใช่การซ่อนคีย์)
 */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
