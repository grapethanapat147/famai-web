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
  it("สีถูกต้อง → ได้ชุดสีครบทั้งธีมสว่างและมืด", () => {
    const pref = buildAccentPref("#1B49D6");
    expect(pref).not.toBeNull();
    expect(pref!.hex).toBe("#1B49D6");
    for (const mode of ["light", "dark"] as const) {
      for (const key of ["accent", "hover", "deep", "wash"] as const) {
        expect(pref![mode][key], `${mode}.${key}`).toBeTruthy();
      }
    }
  });

  it("สีไม่ถูกต้อง → null (ตกกลับไปใช้สีของร้าน ไม่ใช่พังทั้งหน้า)", () => {
    for (const bad of ["", "แดง", "#12", "1B49D6ff!"]) {
      expect(buildAccentPref(bad), bad).toBeNull();
    }
  });

  it("CSS ที่ได้ทับทั้งธีมสว่างและธีมมืด", () => {
    const css = accentOverrideCss(buildAccentPref("#1F7A4D")!);
    expect(css).toContain("html:root{");
    expect(css).toContain('html:root[data-theme="dark"]{');
    for (const v of ["--accent:", "--accent-hover:", "--accent-deep:", "--accent-wash:"]) {
      expect(css.match(new RegExp(v.replace(/[-]/g, "\\-"), "g"))?.length, v).toBe(2);
    }
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
