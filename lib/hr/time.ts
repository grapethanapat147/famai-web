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
