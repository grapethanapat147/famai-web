/**
 * โครงตารางปฏิทินรายเดือน (ฟังก์ชันบริสุทธิ์ ทดสอบได้) — ใช้ Date.UTC เลี่ยง bug timezone
 * เริ่มสัปดาห์วันอาทิตย์ · คืนเป็นสัปดาห์ละ 7 วัน คลุมทั้งเดือน
 */

const DAY = 86_400_000;

export type GridDay = { date: string; inMonth: boolean };

function isoUTC(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** month0 = เดือนนับจาก 0 (ม.ค.=0) */
export function buildMonthGrid(year: number, month0: number): GridDay[][] {
  const firstUTC = Date.UTC(year, month0, 1);
  const firstDow = new Date(firstUTC).getUTCDay(); // 0=อาทิตย์
  const lastDay = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const lastUTC = Date.UTC(year, month0, lastDay);

  const weeks: GridDay[][] = [];
  let cur = firstUTC - firstDow * DAY;
  do {
    const week: GridDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(cur);
      week.push({ date: isoUTC(cur), inMonth: d.getUTCMonth() === month0 });
      cur += DAY;
    }
    weeks.push(week);
  } while (cur <= lastUTC);

  return weeks;
}

const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** "2026-08" → "สิงหาคม 2569" */
export function monthLabel(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) {
    return month;
  }
  return `${TH_MONTHS[Number(m[2]) - 1] ?? m[2]} ${Number(m[1]) + 543}`;
}

/** เลื่อนงวดเดือน ±1 → "YYYY-MM" */
export function shiftMonth(month: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) {
    return month;
  }
  const base = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + delta, 1));
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}`;
}
