import { isValidHex } from "@/lib/theme/derive";

export type ThemeConfig = { accent: string };

export const DEFAULT_THEME: ThemeConfig = { accent: "#E60012" };

/** ตรรกะล้วน — คัดค่า theme จากแถว app_setting (ค่าเสีย/ไม่มี → default) */
export function parseThemeConfig(rows: ReadonlyArray<{ key: string; value: unknown }>): ThemeConfig {
  const accentRow = rows.find((r) => r.key === "theme_accent");
  const accent = typeof accentRow?.value === "string" && isValidHex(accentRow.value) ? accentRow.value : DEFAULT_THEME.accent;
  return { accent };
}
