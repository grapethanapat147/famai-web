import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client สาธารณะ (E11) — ไม่ผูก session/cookie, ตั้ง default schema = pub
 * ใช้อ่านเฉพาะ pub.model / เรียก pub.order_status (แคตตาล็อก + เช็กสถานะสำหรับลูกค้า)
 * ความปลอดภัยมาจากขอบเขต schema pub + RLS ไม่ใช่การซ่อนคีย์ (publishable เปิดเผยได้)
 */
export function createPublicSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "pub" },
  });
}
