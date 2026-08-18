import { DEFAULT_ACCENT, deriveAccent } from "@/lib/theme/derive";
import { getThemeConfig } from "@/lib/theme/settings";

/** ฉีดสีเน้น global ตอน SSR — light เฉพาะเมื่อไม่ใช่ค่า default (กันหน้าตาเดิมเปลี่ยน) · dark เสมอ */
export async function ThemeStyle() {
  const { accent } = await getThemeConfig();
  const isDefault = accent.toLowerCase() === DEFAULT_ACCENT.toLowerCase();
  const light = deriveAccent(accent, "light");
  const dark = deriveAccent(accent, "dark");
  const lightRule = isDefault
    ? ""
    : `html:root{--accent:${light.accent};--accent-hover:${light.hover};--accent-deep:${light.deep};--accent-wash:${light.wash};}`;
  const darkRule = `html:root[data-theme="dark"]{--accent:${dark.accent};--accent-hover:${dark.hover};--accent-deep:${dark.deep};--accent-wash:${dark.wash};}`;
  return <style id="fm-theme" dangerouslySetInnerHTML={{ __html: lightRule + darkRule }} />;
}
