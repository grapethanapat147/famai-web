import { DEFAULT_ACCENT, accentVars, deriveAccent, deriveSurfaces, surfaceVars } from "@/lib/theme/derive";
import { DEFAULT_FONT_PAIR, customFontUrl, findFontPair, fontFormat, isValidFontPath } from "@/lib/theme/fonts";
import { getThemeConfig } from "@/lib/theme/settings";

/**
 * ฉีดธีม global ตอน SSR (สีของร้าน + ฟอนต์) — ทับเฉพาะเมื่อไม่ใช่ค่า default (กันหน้าตาเดิมเปลี่ยน)
 *
 * ร้านที่เลือกสีเอง จะได้ทั้ง **สีเน้นและพื้นผิว** (พื้นหลัง/การ์ด/หมึก/เส้นขอบ) ย้อมตามสีนั้น
 * — เปลี่ยนสีแล้วเปลี่ยนทั้งเว็บ ไม่ใช่แค่ปุ่ม (FAM-1155)
 * ร้านที่ยังใช้สีเริ่มต้น (แดงยามาฮ่า) หน้าตาไม่ขยับเลย: ธีมสว่างใช้ค่าใน globals.css ตรง ๆ
 * ส่วนธีมมืดยังต้องทับ "เฉพาะสีเน้น" เหมือนเดิม เพราะแดงต้นฉบับเข้มเกินไปบนพื้นมืด
 */
export async function ThemeStyle() {
  const { accent, fontPair, customFont } = await getThemeConfig();

  const isDefaultAccent = accent.toLowerCase() === DEFAULT_ACCENT.toLowerCase();
  const light = deriveAccent(accent, "light");
  const dark = deriveAccent(accent, "dark");
  const lightRule = isDefaultAccent ? "" : `html:root{${accentVars(light)}${surfaceVars(deriveSurfaces(accent, "light"))}}`;
  const darkSurface = isDefaultAccent ? "" : surfaceVars(deriveSurfaces(accent, "dark"));
  const darkRule = `html:root[data-theme="dark"]{${accentVars(dark)}${darkSurface}}`;

  const pair = findFontPair(fontPair) ?? findFontPair(DEFAULT_FONT_PAIR)!;
  let fontRule = "";
  if (fontPair !== DEFAULT_FONT_PAIR) {
    fontRule += `html:root{--f-display:${pair.display};--f-body:${pair.body};}`;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (customFont && isValidFontPath(customFont) && supabaseUrl) {
    const url = customFontUrl(supabaseUrl, customFont);
    fontRule += `@font-face{font-family:'fm-custom';src:url('${url}') format('${fontFormat(customFont)}');font-display:swap;}`;
    fontRule += `html:root{--f-display:'fm-custom', ${pair.display};}`;
  }

  return <style id="fm-theme" dangerouslySetInnerHTML={{ __html: lightRule + darkRule + fontRule }} />;
}
