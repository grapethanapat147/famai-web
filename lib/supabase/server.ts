import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Supabase client สำหรับ Server Components / Route Handlers
 * ผูก session ผ่าน cookies และผ่าน RLS ด้วย publishable key (ไม่ข้าม RLS)
 * session refresh middleware จะเพิ่มใน FAM-1005
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // เรียกจาก Server Component — ปล่อยผ่านได้ (session refresh จัดการใน middleware, FAM-1005)
          }
        },
      },
    },
  );
}
