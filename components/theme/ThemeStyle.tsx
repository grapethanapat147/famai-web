import { DEFAULT_ACCENT, deriveAccent } from "@/lib/theme/derive";
import { DEFAULT_FONT_PAIR, customFontUrl, findFontPair, fontFormat, isValidFontPath } from "@/lib/theme/fonts";
import { getThemeConfig } from "@/lib/theme/settings";

/**
 * ฉีดธีม global ตอน SSR (สีเน้น + ฟอนต์) — ทับเฉพาะเมื่อไม่ใช่ค่า default (กันหน้าตาเดิมเปลี่ยน)
 * สีเน้น light เฉพาะเมื่อไม่ใช่ default · dark เสมอ · ฟอนต์: คู่สำเร็จ + ฟอนต์อัปโหลด (หัวข้อ)
 */
export async function ThemeStyle() {
  const { accent, fontPair, customFont } = await getThemeConfig();

  const isDefaultAccent = accent.toLowerCase() === DEFAULT_ACCENT.toLowerCase();
  const light = deriveAccent(accent, "light");
  const dark = deriveAccent(accent, "dark");
  const lightRule = isDefaultAccent
    ? ""
    : `html:root{--accent:${light.accent};--accent-hover:${light.hover};--accent-deep:${light.deep};--accent-wash:${light.wash};}`;
  const darkRule = `html:root[data-theme="dark"]{--accent:${dark.accent};--accent-hover:${dark.hover};--accent-deep:${dark.deep};--accent-wash:${dark.wash};}`;

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
