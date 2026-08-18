import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { DEFAULT_THEME, parseThemeConfig, type ThemeConfig } from "@/lib/theme/config";

export type { ThemeConfig } from "@/lib/theme/config";

/** อ่าน theme global จาก DB — resilient (พลาด → default โทนเดิม ไม่พังทั้งแอป) */
export async function getThemeConfig(): Promise<ThemeConfig> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("app_setting").select("key, value").eq("key", "theme_accent");
    if (error || !data) {
      return DEFAULT_THEME;
    }
    return parseThemeConfig(data);
  } catch {
    return DEFAULT_THEME;
  }
}
