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

/** บวกวันจากวันที่ ISO (YYYY-MM-DD) → ISO ใหม่ · รองรับข้ามเดือน/ปี */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** จำนวนวันเหลือถึงสิ้นเดือน (วันสุดท้ายของเดือน = 0) */
export function daysUntilMonthEnd(now: Date): number {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
}

/** "YYYY-MM" ของเดือนปัจจุบัน */
export function yearMonth(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}
