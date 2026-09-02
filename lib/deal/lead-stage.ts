/**
 * ขั้นของลูกค้าก่อนขาย (customer.stage) — FAM-1119 · fixlist ข้อ 07 `เจ้าของย้ำ`
 *
 * เดิมค่านี้ถูกตั้งตอนสร้างลูกค้า (`เข้ามาดูรถ`) แล้วกระโดดไป `ปิดการขาย` ตอน sell_unit เท่านั้น
 * ไม่มีโค้ดตรงไหนเปลี่ยนขั้นระหว่างทาง และตาราง lead_stage_history ไม่เคยถูกเขียน
 * ทีมขายจึงไม่รู้ว่าลูกค้าแต่ละคนคุยถึงไหน และควรตามใครก่อน
 *
 * ค่าที่ใช้ตรงกับที่มีอยู่ใน DB แล้ว: default `เข้ามาดูรถ` · sell_unit เขียน `ปิดการขาย`
 */

import type { BadgeVariant } from "@/lib/deal/stage";

export type LeadStage = "เข้ามาดูรถ" | "สนใจ" | "ทำสัญญา" | "ปิดการขาย" | "ไม่ซื้อ";

/** ทางเดินปกติ — `ไม่ซื้อ` เป็นทางออกที่กดได้จากทุกขั้น ไม่อยู่ในลำดับ */
export const LEAD_TRACK: readonly LeadStage[] = ["เข้ามาดูรถ", "สนใจ", "ทำสัญญา", "ปิดการขาย"];

/** ทุกขั้นที่เลือกได้ในตัวกรอง */
export const LEAD_STAGES: readonly LeadStage[] = [...LEAD_TRACK, "ไม่ซื้อ"];

export const LEAD_STAGE_HINT: Record<LeadStage, string> = {
  เข้ามาดูรถ: "เพิ่งเข้ามา ยังไม่ระบุรุ่นที่สนใจ",
  สนใจ: "ระบุรุ่น/ราคาแล้ว รอตัดสินใจ",
  ทำสัญญา: "ตกลงซื้อแล้ว รอเปิดบิล",
  ปิดการขาย: "เปิดบิลแล้ว — ตั้งอัตโนมัติตอนบันทึกการขาย",
  ไม่ซื้อ: "ปิดเคส ไม่ต้องตามต่อ",
};

export function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

export function leadStageIndex(stage: LeadStage): number {
  return LEAD_TRACK.indexOf(stage);
}

export function leadStageVariant(stage: LeadStage): BadgeVariant {
  if (stage === "ปิดการขาย") {
    return "good";
  }
  if (stage === "ไม่ซื้อ") {
    return "off";
  }
  return stage === "ทำสัญญา" ? "warn" : "info";
}

/**
 * ขั้นที่กดเปลี่ยนได้จากขั้นปัจจุบัน
 * - `ปิดการขาย` ตั้งโดย sell_unit เท่านั้น (กดมือไม่ได้ ไม่งั้นสถานะจะโกหกว่ามีบิลแล้ว)
 * - ปิดเคสแล้ว (`ปิดการขาย` / `ไม่ซื้อ`) เปิดกลับได้เฉพาะ `ไม่ซื้อ` → กลับเข้าทางเดิน
 */
export function nextLeadStages(current: LeadStage): LeadStage[] {
  if (current === "ปิดการขาย") {
    return [];
  }
  if (current === "ไม่ซื้อ") {
    return ["เข้ามาดูรถ", "สนใจ", "ทำสัญญา"];
  }
  const i = leadStageIndex(current);
  const forward = LEAD_TRACK.slice(i + 1).filter((s) => s !== "ปิดการขาย");
  const back = LEAD_TRACK.slice(0, i);
  return [...forward, ...back, "ไม่ซื้อ"];
}

export type LeadStageChange = { customerId: string; from: LeadStage; to: string };

/** ตรวจคำขอเปลี่ยนขั้น — ใช้ทั้งฝั่ง client (ปุ่ม) และ server (บังคับจริง) */
export function validateLeadStageChange(
  input: LeadStageChange,
): { ok: true; value: { customerId: string; from: LeadStage; to: LeadStage } } | { ok: false; error: string } {
  const customerId = input.customerId.trim();
  if (customerId === "") {
    return { ok: false, error: "ไม่พบลูกค้า" };
  }
  if (!isLeadStage(input.to)) {
    return { ok: false, error: "ขั้นไม่ถูกต้อง" };
  }
  if (input.to === input.from) {
    return { ok: false, error: "อยู่ขั้นนี้อยู่แล้ว" };
  }
  if (input.to === "ปิดการขาย") {
    return { ok: false, error: "ขั้นปิดการขายตั้งเองไม่ได้ — จะตั้งให้อัตโนมัติตอนบันทึกการขาย" };
  }
  if (input.from === "ปิดการขาย") {
    return { ok: false, error: "ลูกค้ารายนี้ปิดการขายแล้ว เปลี่ยนขั้นไม่ได้" };
  }
  return { ok: true, value: { customerId, from: input.from, to: input.to } };
}

/** ผู้มีสิทธิ์เปลี่ยนขั้นลูกค้า — ตรงกับคนที่ขายได้ */
const LEAD_ROLES = ["admin", "manager", "sales"];
export function canChangeLeadStage(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return LEAD_ROLES.some((r) => roles.has(r));
}
