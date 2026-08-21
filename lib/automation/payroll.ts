/** เตือนปิดงวดเงินเดือน (pure เพื่อเทสได้ · E10) */

const CLOSED = new Set(["ปิดงวดแล้ว", "จ่ายแล้ว"]);

/** มีงวดของเดือน ym (YYYY-MM) ที่ปิด/จ่ายแล้วอย่างน้อยหนึ่ง → ถือว่าจัดการแล้ว */
export function isMonthClosed(periods: Array<{ periodEnd: string; status: string }>, ym: string): boolean {
  return periods.some((p) => p.periodEnd.slice(0, 7) === ym && CLOSED.has(p.status));
}

/** เตือนเมื่อ: ใกล้สิ้นเดือน (เหลือ <= windowDays วัน) และยังไม่ปิดงวดเดือนนี้ */
export function shouldRemindPayroll(daysLeft: number, closedThisMonth: boolean, windowDays = 3): boolean {
  return daysLeft <= windowDays && !closedThisMonth;
}
