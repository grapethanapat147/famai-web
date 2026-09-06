/**
 * การแสดงผล "ต่อเครื่อง" (FAM-1153) — ขนาดตัวอักษร + สีเน้นที่ผู้ใช้แต่ละคนเลือกเอง
 *
 * ต่างจากธีมของร้าน (ตั้งค่าระบบ → ธีม) ซึ่งแอดมินตั้งครั้งเดียวมีผลทุกเครื่อง
 * อันนี้เก็บใน localStorage ของเครื่องนั้น ไม่กระทบคนอื่น และไม่แตะฐานข้อมูล
 *
 * ฟังก์ชันในไฟล์นี้บริสุทธิ์ทั้งหมด (ไม่แตะ window) เพื่อให้เทสต์ได้ตรง ๆ
 */

import { deriveAccent, isValidHex } from "@/lib/theme/derive";

export type TextSizeId = "sm" | "md" | "lg" | "xl";

/** 4 ระดับ — ทั้ง spacing และตัวอักษรของ Tailwind เป็น rem จึงขยับตาม font-size ของ root ทั้งแอป */
export const TEXT_SIZES: readonly { id: TextSizeId; label: string; rootPx: number }[] = [
  { id: "sm", label: "เล็ก", rootPx: 14 },
  { id: "md", label: "ปกติ", rootPx: 16 },
  { id: "lg", label: "ใหญ่", rootPx: 18 },
  { id: "xl", label: "ใหญ่มาก", rootPx: 20 },
];

export const DEFAULT_TEXT_SIZE: TextSizeId = "md";

export function isTextSizeId(v: string | null | undefined): v is TextSizeId {
  return TEXT_SIZES.some((s) => s.id === v);
}

export function textSizeLabel(id: TextSizeId): string {
  return TEXT_SIZES.find((s) => s.id === id)?.label ?? "ปกติ";
}

/**
 * อ่านค่าที่เก็บไว้ให้เป็นระดับที่รู้จัก
 * รองรับของเดิมที่เก็บเป็น `fm-density` แค่ 2 ระดับ — compact เดิม (15px) ใกล้ "เล็ก" ที่สุด
 */
export function normalizeTextSize(stored: string | null, legacyDensity: string | null = null): TextSizeId {
  if (isTextSizeId(stored)) {
    return stored;
  }
  if (legacyDensity === "compact") {
    return "sm";
  }
  return DEFAULT_TEXT_SIZE;
}

/** ชุดสีที่พร้อมยัดลง CSS — เก็บลง localStorage ทั้งก้อนเพื่อให้สคริปต์ก่อน paint ใช้ได้โดยไม่ต้องคำนวณสีซ้ำ */
export type AccentPref = {
  hex: string;
  light: { accent: string; hover: string; deep: string; wash: string };
  dark: { accent: string; hover: string; deep: string; wash: string };
};

/** แปลงสีที่ผู้ใช้เลือกเป็นชุดพร้อมใช้ — คืน null ถ้าสีไม่ถูกต้อง (ให้ตกกลับไปใช้สีของร้าน) */
export function buildAccentPref(hex: string): AccentPref | null {
  if (!isValidHex(hex)) {
    return null;
  }
  return { hex, light: deriveAccent(hex, "light"), dark: deriveAccent(hex, "dark") };
}

/** CSS ที่ทับสีของร้านเฉพาะเครื่องนี้ — ใช้ทั้งตอน init (ก่อน paint) และตอนกดเปลี่ยนสด */
export function accentOverrideCss(pref: AccentPref): string {
  const vars = (s: AccentPref["light"]) =>
    `--accent:${s.accent};--accent-hover:${s.hover};--accent-deep:${s.deep};--accent-wash:${s.wash};`;
  return `html:root{${vars(pref.light)}}html:root[data-theme="dark"]{${vars(pref.dark)}}`;
}

/** คีย์ใน localStorage — รวมไว้ที่เดียวกันเพื่อให้สคริปต์ก่อน paint กับ UI ใช้ชื่อตรงกันเสมอ */
export const STORAGE_KEYS = {
  theme: "fm-theme",
  textSize: "fm-text-size",
  accent: "fm-accent",
  legacyDensity: "fm-density",
} as const;

/** id ของ <style> ที่ฉีดสีเฉพาะเครื่อง — ใช้ซ้ำเพื่อไม่ให้มีหลายก้อนซ้อนกัน */
export const ACCENT_STYLE_ID = "fm-accent-user";
