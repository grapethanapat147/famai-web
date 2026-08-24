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

/** ขั้นก่อนหน้า (สำหรับย้อนกลับเมื่อเผลอกดไปต่อ) — null = ขั้นแรก หรืออยู่นอก track */
export function regPrev(stage: RegStage, payMethod: PayMethod): RegStage | null {
  const track = dealTrack(payMethod);
  const i = track.indexOf(stage);
  if (i <= 0) {
    return null;
  }
  return track[i - 1];
}

export function isDelivered(stage: RegStage): boolean {
  return stage === "ส่งมอบแล้ว";
}

/**
 * เหตุผลที่ห้ามเลื่อนขั้นจากหน้าดีล (FAM-1107) — คืน null ถ้าเลื่อนได้
 * เข้า "ป้ายขาว" ต้องมีเลขทะเบียนแล้ว (บันทึกผ่านหน้า งานทะเบียน) — ไม่งั้นเลขทะเบียนจะหายจากระบบถาวร
 * เพราะ recordPlateReceived เป็นผู้บันทึก plate_no เพียงทางเดียว และรับเฉพาะขั้น "รอทะเบียน"
 */
export function advanceBlockReason(to: RegStage, plateNo: string | null): string | null {
  if (to === "ป้ายขาว" && (!plateNo || plateNo.trim() === "")) {
    return "ต้องบันทึกรับเล่ม/เลขทะเบียนที่หน้า “งานทะเบียน” ก่อน จึงจะถึงขั้นป้ายขาว";
  }
  return null;
}

/** ตัวเลือกสถานะย่อยต่อขั้น (FAM-1093 P2) — กด step แล้วเลือกได้ว่าตอนนี้อยู่จุดไหนของขั้นนั้น */
export const STAGE_SUBSTATUS: Record<RegStage, readonly string[]> = {
  ขายแล้ว: ["รอเอกสารลูกค้า", "เอกสารครบ", "ลูกค้าขอเลื่อนรับรถ"],
  ส่งไฟแนนซ์: ["ส่งเรื่องแล้ว", "รอผลพิจารณา", "ขอเอกสารเพิ่ม"],
  อนุมัติ: ["อนุมัติแล้ว", "รอทำสัญญา"],
  รอทะเบียน: ["ยื่นขนส่งแล้ว", "รอเล่มทะเบียน", "รอป้าย"],
  ป้ายขาว: ["ติดป้ายขาวแล้ว", "นัดลูกค้ารับรถ"],
  ส่งมอบแล้ว: ["ส่งมอบครบ", "รอป้ายจริง"],
};

/** ตัวเลือกสถานะย่อยของขั้นที่ระบุ (คืน [] ถ้าไม่รู้จัก) */
export function substatusOptions(stage: string): readonly string[] {
  return isRegStage(stage) ? STAGE_SUBSTATUS[stage] : [];
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
