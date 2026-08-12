/**
 * ขั้นของดีล = คำนวณจากระเบียนจริง (registration.stage + finance_case) ไม่เก็บเป็นฟิลด์ที่สาม
 * (docs/04 §9g กฎ 1) · track เป็นเส้นตรง แยกตามวิธีชำระ — เงินสด 4 ขั้น เงินผ่อน 6 ขั้น (§9g กฎ 2)
 */

export type RegStage = "ขายแล้ว" | "ส่งไฟแนนซ์" | "อนุมัติ" | "รอทะเบียน" | "ป้ายขาว" | "ส่งมอบแล้ว";
export type PayMethod = "cash" | "finance";

const FINANCE_TRACK: readonly RegStage[] = ["ขายแล้ว", "ส่งไฟแนนซ์", "อนุมัติ", "รอทะเบียน", "ป้ายขาว", "ส่งมอบแล้ว"];
const CASH_TRACK: readonly RegStage[] = ["ขายแล้ว", "รอทะเบียน", "ป้ายขาว", "ส่งมอบแล้ว"];

export const REG_STAGES: readonly RegStage[] = FINANCE_TRACK;

export function isRegStage(value: string): value is RegStage {
  return (FINANCE_TRACK as readonly string[]).includes(value);
}

/** ลำดับขั้นตามวิธีชำระ (เงินสดตัดขั้นไฟแนนซ์ออก) */
export function dealTrack(payMethod: PayMethod): RegStage[] {
  return [...(payMethod === "finance" ? FINANCE_TRACK : CASH_TRACK)];
}

/** ดัชนีขั้นปัจจุบันใน track (−1 ถ้าไม่อยู่ใน track เช่น cash แต่ติดขั้นไฟแนนซ์ = ข้อมูลเพี้ยน) */
export function stageIndex(stage: RegStage, payMethod: PayMethod): number {
  return dealTrack(payMethod).indexOf(stage);
}

/** ขั้นถัดไปที่กดเลื่อนได้ (null = จบแล้ว หรืออยู่นอก track) */
export function regNext(stage: RegStage, payMethod: PayMethod): RegStage | null {
  const track = dealTrack(payMethod);
  const i = track.indexOf(stage);
  if (i < 0 || i >= track.length - 1) {
    return null;
  }
  return track[i + 1];
}

export function isDelivered(stage: RegStage): boolean {
  return stage === "ส่งมอบแล้ว";
}

export type BadgeVariant = "good" | "warn" | "bad" | "info" | "off";

/** จุดสีบนป้ายขั้น */
export function stageVariant(stage: RegStage): BadgeVariant {
  switch (stage) {
    case "ขายแล้ว":
      return "info";
    case "ส่งไฟแนนซ์":
    case "รอทะเบียน":
      return "warn";
    case "อนุมัติ":
    case "ป้ายขาว":
      return "good";
    case "ส่งมอบแล้ว":
      return "off";
  }
}

/** วันที่ที่ควรบันทึกเมื่อเลื่อนถึงขั้นนี้ (registration timestamps) */
export function stageTimestampField(stage: RegStage): "submitted_at" | "approved_at" | "plate_received_at" | "delivered_at" | null {
  switch (stage) {
    case "ส่งไฟแนนซ์":
      return "submitted_at";
    case "อนุมัติ":
      return "approved_at";
    case "ป้ายขาว":
      return "plate_received_at";
    case "ส่งมอบแล้ว":
      return "delivered_at";
    default:
      return null;
  }
}
