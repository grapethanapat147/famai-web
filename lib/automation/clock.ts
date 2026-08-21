/** วันที่สำหรับ cron (pure เพื่อเทสได้) — ISO + ป้ายภาษาไทย จากเวลาท้องถิ่นของ Date ที่ส่งเข้ามา */

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function nowParts(now: Date): { today: string; label: string } {
  return {
    today: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    label: `${now.getDate()} ${THAI_MONTHS[now.getMonth()]} ${now.getFullYear()}`,
  };
}
