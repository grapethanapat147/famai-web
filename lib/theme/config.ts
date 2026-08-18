import { DEFAULT_ACCENT, isValidHex } from "@/lib/theme/derive";

export type ThemeConfig = { accent: string };

export type ThemeActionResult = { ok: true } | { ok: false; error: string };

export const DEFAULT_THEME: ThemeConfig = { accent: DEFAULT_ACCENT };

/** ตรรกะล้วน — คัดค่า theme จากแถว app_setting (ค่าเสีย/ไม่มี → default) */
export function parseThemeConfig(rows: ReadonlyArray<{ key: string; value: unknown }>): ThemeConfig {
  const accentRow = rows.find((r) => r.key === "theme_accent");
  const accent = typeof accentRow?.value === "string" && isValidHex(accentRow.value) ? accentRow.value : DEFAULT_THEME.accent;
  return { accent };
}
