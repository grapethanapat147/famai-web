/**
 * ตรรกะเวลาเข้างาน (ฟังก์ชันบริสุทธิ์ ทดสอบได้) — เทียบเป็นนาทีของวัน (HH:MM)
 * ตัวเรียก (action) แปลง check_in เป็นเวลาไทยก่อน แล้วส่ง HH:MM เข้ามา
 */

/** "08:30" → 510 นาที (คืน 0 ถ้ารูปแบบผิด) */
export function hhmmToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) {
    return 0;
  }
  return Number(m[1]) * 60 + Number(m[2]);
}

/** สายกี่นาที (0 = ตรงเวลา/มาก่อน) */
export function lateMinutes(checkInHHMM: string, workStart: string): number {
  return Math.max(0, hhmmToMinutes(checkInHHMM) - hhmmToMinutes(workStart));
}

export function isLate(checkInHHMM: string, workStart: string): boolean {
  return lateMinutes(checkInHHMM, workStart) > 0;
}

/** ช่วงเวลาทำงานเป็นนาที (check_out − check_in) — คืน 0 ถ้าติดลบ */
export function workMinutes(checkInHHMM: string, checkOutHHMM: string): number {
  return Math.max(0, hhmmToMinutes(checkOutHHMM) - hhmmToMinutes(checkInHHMM));
}

/**
 * นาที OT = เวลาที่อยู่เกินเวลาเลิกงาน (FAM-1116 · fixlist ข้อ 04)
 * นับจาก max(เวลาเลิกงาน, เวลาเข้า) เพื่อไม่ให้คนเข้ากะบ่ายได้ OT ทั้งกะ
 * ปัดลงเป็นช่วงละ `stepMinutes` นาที (ค่าเริ่มต้น 30) — อยู่เกิน 10 นาทีไม่ใช่ OT
 */
export function otMinutes(checkInHHMM: string, checkOutHHMM: string, workEnd: string, stepMinutes = 30): number {
  const step = Math.max(1, Math.trunc(stepMinutes));
  const out = hhmmToMinutes(checkOutHHMM);
  const from = Math.max(hhmmToMinutes(workEnd), hhmmToMinutes(checkInHHMM));
  const over = out - from;
  if (over < step) {
    return 0;
  }
  return Math.floor(over / step) * step;
}

/** นาที OT → ข้อความอ่านง่าย: 90 → "1 ชม. 30 น." · 120 → "2 ชม." */
export function formatOt(minutes: number): string {
  const m = Math.max(0, Math.trunc(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) {
    return `${rest} น.`;
  }
  return rest === 0 ? `${h} ชม.` : `${h} ชม. ${rest} น.`;
}
