import { DEFAULT_ACCENT, isValidHex } from "@/lib/theme/derive";
import { DEFAULT_FONT_PAIR, findFontPair, isValidFontPath } from "@/lib/theme/fonts";

export type ThemeConfig = { accent: string; fontPair: string; customFont: string };

export type ThemeActionResult = { ok: true } | { ok: false; error: string };

export const DEFAULT_THEME: ThemeConfig = { accent: DEFAULT_ACCENT, fontPair: DEFAULT_FONT_PAIR, customFont: "" };

/** ตรรกะล้วน — คัดค่า theme จากแถว app_setting (ค่าเสีย/ไม่มี → default โทนเดิม) */
export function parseThemeConfig(rows: ReadonlyArray<{ key: string; value: unknown }>): ThemeConfig {
  const val = (key: string): unknown => rows.find((r) => r.key === key)?.value;

  const accentRaw = val("theme_accent");
  const accent = typeof accentRaw === "string" && isValidHex(accentRaw) ? accentRaw : DEFAULT_THEME.accent;

  const pairRaw = val("theme_font_pair");
  const fontPair = typeof pairRaw === "string" && findFontPair(pairRaw) ? pairRaw : DEFAULT_THEME.fontPair;

  const customRaw = val("theme_custom_font");
  const customFont = typeof customRaw === "string" && isValidFontPath(customRaw) ? customRaw : DEFAULT_THEME.customFont;

  return { accent, fontPair, customFont };
}
