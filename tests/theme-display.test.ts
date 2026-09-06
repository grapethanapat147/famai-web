import { describe, expect, it } from "vitest";
import {
  ACCENT_STYLE_ID,
  DEFAULT_TEXT_SIZE,
  STORAGE_KEYS,
  TEXT_SIZES,
  accentOverrideCss,
  buildAccentPref,
  isTextSizeId,
  normalizeTextSize,
  textSizeLabel,
} from "@/lib/theme/display";
import { deriveSurfaces } from "@/lib/theme/derive";
import { THEME_PRESETS } from "@/lib/theme/presets";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-init";

describe("ขนาดตัวอักษร 4 ระดับ (FAM-1153)", () => {
  it("มี 4 ระดับ เรียงจากเล็กไปใหญ่ และไม่ซ้ำกัน", () => {
    expect(TEXT_SIZES).toHaveLength(4);
    const px = TEXT_SIZES.map((s) => s.rootPx);
    expect(px).toEqual([...px].sort((a, b) => a - b));
    expect(new Set(px).size).toBe(4);
    expect(new Set(TEXT_SIZES.map((s) => s.id)).size).toBe(4);
  });

  it("ระดับกลางคือ 16px = ค่าเริ่มต้นของเบราว์เซอร์ (ไม่ต้องประกาศใน CSS)", () => {
    expect(TEXT_SIZES.find((s) => s.id === DEFAULT_TEXT_SIZE)?.rootPx).toBe(16);
  });

  it("ค่าที่ไม่รู้จักตกกลับไปที่ปกติ", () => {
    expect(normalizeTextSize(null)).toBe("md");
    expect(normalizeTextSize("")).toBe("md");
    expect(normalizeTextSize("huge")).toBe("md");
    expect(isTextSizeId("xl")).toBe(true);
    expect(isTextSizeId("xxl")).toBe(false);
  });

  it("ของเดิมที่เก็บเป็น fm-density=compact ย้ายมาเป็นระดับ 'เล็ก'", () => {
    expect(normalizeTextSize(null, "compact")).toBe("sm");
    expect(normalizeTextSize(null, "comfortable")).toBe("md");
    // ค่าใหม่ต้องชนะค่าเดิมเสมอ
    expect(normalizeTextSize("xl", "compact")).toBe("xl");
  });

  it("ทุกระดับมีป้ายภาษาไทย", () => {
    for (const s of TEXT_SIZES) {
      expect(textSizeLabel(s.id)).toBe(s.label);
      expect(s.label.trim()).not.toBe("");
    }
  });
});

describe("สีเน้นเฉพาะเครื่อง (FAM-1153)", () => {
  it("สีถูกต้อง → ได้ทั้งชุดสีเน้นและชุดพื้นผิว ครบทั้งธีมสว่างและมืด", () => {
    const pref = buildAccentPref("#1B49D6");
    expect(pref).not.toBeNull();
    expect(pref!.hex).toBe("#1B49D6");
    for (const mode of ["light", "dark"] as const) {
      for (const key of ["accent", "hover", "deep", "wash"] as const) {
        expect(pref![mode].accent[key], `${mode}.accent.${key}`).toBeTruthy();
      }
      for (const key of ["paper", "paper2", "card", "ink", "inkSoft", "muted", "hairline", "hairline2"] as const) {
        expect(pref![mode].surface[key], `${mode}.surface.${key}`).toBeTruthy();
      }
    }
  });

  it("สีไม่ถูกต้อง → null (ตกกลับไปใช้สีของร้าน ไม่ใช่พังทั้งหน้า)", () => {
    for (const bad of ["", "แดง", "#12", "1B49D6ff!"]) {
      expect(buildAccentPref(bad), bad).toBeNull();
    }
  });

  it("CSS ที่ได้ทับทั้งธีมสว่างและธีมมืด ครบทั้งสีเน้นและพื้นผิว", () => {
    const css = accentOverrideCss(buildAccentPref("#1F7A4D")!);
    // ต้องมี specificity สูงกว่าธีมของร้าน (html:root) ไม่งั้นสีส่วนตัวถูกทับ
    expect(css).toContain("html:root:root{");
    expect(css).toContain('html:root:root[data-theme="dark"]{');
    const tokens = [
      "--accent:", "--accent-hover:", "--accent-deep:", "--accent-wash:",
      "--paper:", "--paper-2:", "--card:", "--ink:", "--ink-soft:", "--muted:", "--hairline:", "--hairline-2:",
    ];
    for (const v of tokens) {
      // แต่ละโทเคนต้องโผล่ 2 ครั้ง (ธีมสว่าง + ธีมมืด) พอดี
      expect(css.split(v).length - 1, v).toBe(2);
    }
  });
});

describe("สีส่วนตัวต้องชนะสีของร้าน (FAM-1155)", () => {
  it("CSS ของเครื่องใช้ :root:root — ชนะด้วย specificity ไม่ใช่ลำดับใน DOM", () => {
    const css = accentOverrideCss(buildAccentPref("#1B49D6")!);
    expect(css.startsWith("html:root:root{")).toBe(true);
    expect(css).not.toMatch(/[^:]html:root\{/);
  });

  it("สคริปต์ก่อน paint ใช้ตัวเลือกเดียวกัน (ไม่งั้นสีกระพริบตอนโหลด)", () => {
    expect(THEME_INIT_SCRIPT).toContain("html:root:root{");
  });
});

describe("สคริปต์ก่อน paint ต้องรู้จักคีย์เดียวกับ UI", () => {
  it("อ้างถึงคีย์ localStorage ครบทุกตัวที่ UI ใช้", () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(THEME_INIT_SCRIPT, key).toContain(key);
    }
  });

  it("ใช้ id ของ <style> ตัวเดียวกับที่ UI ลบ/สร้างทับ (ไม่งั้นสีซ้อนกัน)", () => {
    expect(THEME_INIT_SCRIPT).toContain(ACCENT_STYLE_ID);
  });

  it("ไม่ตั้ง data-text-size สำหรับระดับปกติ (กัน CSS ทำงานเกินจำเป็น)", () => {
    expect(THEME_INIT_SCRIPT).toContain("s!=='md'");
  });
});

/**
 * ย้อมทั้งเว็บแล้วต้องยัง "อ่านออก" — FAM-1155
 * คำนวณอัตราคอนทราสต์ตาม WCAG จากสีที่ derive จริง เทียบกับพาเลตต์กลางเดิม
 */
function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("ย้อมทั้งเว็บแล้วยังอ่านออก (FAM-1155)", () => {
  const ACCENTS = THEME_PRESETS.map((p) => p.accent);

  it.each(ACCENTS)("%s: ตัวหนังสือหลักบนพื้นและบนการ์ด ผ่าน WCAG AA (4.5:1) ทั้งสองธีม", (hex) => {
    for (const mode of ["light", "dark"] as const) {
      const s = deriveSurfaces(hex, mode);
      expect(contrast(s.ink, s.paper), `${mode} ink/paper`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(s.ink, s.card), `${mode} ink/card`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(s.inkSoft, s.card), `${mode} inkSoft/card`).toBeGreaterThanOrEqual(4.5);
      // ตัวหนังสือจาง ๆ ใช้กับข้อความรอง — ขอผ่านเกณฑ์ตัวใหญ่ (3:1) เป็นอย่างน้อย
      expect(contrast(s.muted, s.card), `${mode} muted/card`).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(ACCENTS)("%s: การ์ดยังแยกจากพื้นหลังได้ (ไม่กลืนเป็นสีเดียว)", (hex) => {
    for (const mode of ["light", "dark"] as const) {
      const s = deriveSurfaces(hex, mode);
      expect(s.card, mode).not.toBe(s.paper);
      expect(s.paper2, mode).not.toBe(s.paper);
    }
  });

  it("สีคนละเฉดให้พื้นหลังคนละสี (ย้อมจริง ไม่ใช่คืนค่าเดิม)", () => {
    const red = deriveSurfaces("#E60012", "light").paper;
    const blue = deriveSurfaces("#1B49D6", "light").paper;
    const green = deriveSurfaces("#1F7A4D", "light").paper;
    expect(new Set([red, blue, green]).size).toBe(3);
  });

  it("ความสว่างของพื้นยังใกล้พาเลตต์กลางเดิม (ไม่ทำให้จอมืดหรือขาวโพลน)", () => {
    for (const hex of ACCENTS) {
      const light = luminance(deriveSurfaces(hex, "light").paper);
      const dark = luminance(deriveSurfaces(hex, "dark").paper);
      expect(light, `${hex} light`).toBeGreaterThan(luminance("#eeeeee"));
      expect(dark, `${hex} dark`).toBeLessThan(luminance("#242424"));
    }
  });
});
