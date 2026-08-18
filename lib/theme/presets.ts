/** ธีมสำเร็จรูป (curated) — ทุกชุดยึด design system เดิม เปลี่ยนแค่สีเน้น (FAM-1038) */
import { DEFAULT_ACCENT } from "@/lib/theme/derive";

export type ThemePreset = { id: string; name: string; accent: string };

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: "yamaha", name: "แดงยามาฮ่า", accent: DEFAULT_ACCENT },
  { id: "midnight", name: "น้ำเงินเข้ม", accent: "#1B49D6" },
  { id: "forest", name: "เขียวป่า", accent: "#1F7A4D" },
  { id: "sunset", name: "ส้มพระอาทิตย์", accent: "#E8620E" },
  { id: "royal", name: "ม่วงหลวง", accent: "#6B3FA0" },
  { id: "graphite", name: "กราไฟต์", accent: "#16181D" },
];

/** preset ที่ตรงกับสีเน้นนี้ (เทียบ case-insensitive) — null ถ้าเป็นสีปรับเอง */
export function findPresetByAccent(accent: string): ThemePreset | null {
  const a = accent.toLowerCase();
  return THEME_PRESETS.find((p) => p.accent.toLowerCase() === a) ?? null;
}
