import "server-only";
import { cache } from "react";
import { getThemeConfigCached } from "@/lib/reference/cache";

export type { ThemeConfig } from "@/lib/theme/config";

/**
 * อ่าน theme global — แคช global ข้ามรีเควสต์ (FAM-1084) ตัด round-trip ออกจาก ThemeStyle ทุกครั้งที่เปลี่ยนหน้า
 * resilient (พลาด → default โทนเดิม ไม่พังทั้งแอป) · memoized ต่อ request ด้วย React cache
 */
export const getThemeConfig = cache(() => getThemeConfigCached());
