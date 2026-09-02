/**
 * เฟสหลักของดีล (FAM-1111) — มุมมองที่เจ้าของร้านใช้จริง:
 *   คุยกับลูกค้า → ไฟแนนซ์ → เปิดการขาย → ส่งมอบ
 *
 * เป็น "เลนส์" ทับระเบียนจริง ไม่ใช่ฟิลด์ที่สาม (docs/04 §9g กฎ 1 — ไม่เก็บสถานะซ้ำ)
 *   คุยกับลูกค้า = ลูกค้าที่ยังไม่มีบิลขาย (ลีด)
 *   ไฟแนนซ์     = เปิดบิลแล้วแต่เคสสินเชื่อยังไม่จบ (เงินผ่อนเท่านั้น)
 *   เปิดการขาย  = บิลเดินอยู่ (อนุมัติ/ทะเบียน/ป้าย) รอส่งมอบ
 *   ส่งมอบ      = ปิดดีล
 *
 * ขั้นละเอียด 6 ขั้น (ขายแล้ว/ส่งไฟแนนซ์/อนุมัติ/รอทะเบียน/ป้ายขาว/ส่งมอบแล้ว) ยังอยู่ครบ
 * ใช้ในงานทะเบียนและช่องบันทึกต่อขั้น — เฟสนี้แค่ย่อให้เห็นภาพรวมที่ตรงกับงานจริง
 */

import type { PayMethod, RegStage } from "@/lib/deal/stage";

export type DealPhase = "คุยกับลูกค้า" | "ไฟแนนซ์" | "เปิดการขาย" | "ส่งมอบ";

export const DEAL_PHASES: readonly DealPhase[] = ["คุยกับลูกค้า", "ไฟแนนซ์", "เปิดการขาย", "ส่งมอบ"];

/** คำอธิบายสั้นใต้ชื่อเฟส — บอกว่าเฟสนี้ "ต้องทำอะไร" */
export const PHASE_HINT: Record<DealPhase, string> = {
  คุยกับลูกค้า: "ยังไม่เปิดบิล — ติดตาม/เสนอราคา",
  ไฟแนนซ์: "รอผลพิจารณาสินเชื่อ",
  เปิดการขาย: "เปิดบิลแล้ว — ทำทะเบียน/ป้าย",
  ส่งมอบ: "ส่งมอบรถแล้ว ปิดดีล",
};

/** สถานะสินเชื่อที่ถือว่า "ยังอยู่ระหว่างดำเนินการ" (ยังไม่รู้ผล) */
const FINANCE_PENDING = new Set(["ส่งเรื่อง", "ยื่นเอกสาร", "รอผล", "ติดตามต่อ"]);

/** ขั้นที่ยังถือว่าอยู่ช่วงต้น — ถ้าไฟแนนซ์ยังค้างอยู่ให้จัดเป็นเฟส "ไฟแนนซ์" */
const EARLY_STAGES = new Set<RegStage>(["ขายแล้ว", "ส่งไฟแนนซ์"]);

/**
 * เฟสของดีลที่เปิดบิลแล้ว — คิดจาก registration.stage + finance_case.status
 * ลีด (ยังไม่มีบิล) ไม่ผ่านฟังก์ชันนี้ — ฝั่ง view จัดเป็น "คุยกับลูกค้า" โดยตรง
 */
export function dealPhase(input: { payMethod: PayMethod; financeStatus: string | null; stage: RegStage }): DealPhase {
  if (input.stage === "ส่งมอบแล้ว") {
    return "ส่งมอบ";
  }
  const financePending = input.payMethod === "finance" && input.financeStatus != null && FINANCE_PENDING.has(input.financeStatus);
  if (financePending && EARLY_STAGES.has(input.stage)) {
    return "ไฟแนนซ์";
  }
  return "เปิดการขาย";
}

/** ลำดับเฟสในแถบความคืบหน้า (−1 = ไม่รู้จัก) */
export function phaseIndex(phase: DealPhase): number {
  return DEAL_PHASES.indexOf(phase);
}

export function isDealPhase(value: string): value is DealPhase {
  return (DEAL_PHASES as readonly string[]).includes(value);
}

export type PhaseBadge = "good" | "warn" | "bad" | "info" | "off";

/** สีป้ายเฟส — ไฟแนนซ์ = รอผล (ส้ม) · ส่งมอบ = จบ (เขียว) */
export function phaseVariant(phase: DealPhase): PhaseBadge {
  switch (phase) {
    case "คุยกับลูกค้า":
      return "info";
    case "ไฟแนนซ์":
      return "warn";
    case "เปิดการขาย":
      return "info";
    case "ส่งมอบ":
      return "good";
  }
}
