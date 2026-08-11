/** รูปแบบการแสดงผลเฉพาะงานนี้ — docs/04 §7 */

const TH_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** เงินบาท: คั่นหลักพัน · ติดลบเป็นวงเล็บ (สีจัดที่ component) · '฿' ต่อท้าย */
export function formatBaht(value: number, opts: { withSymbol?: boolean } = {}): string {
  const withSymbol = opts.withSymbol ?? true;
  const abs = Math.abs(Math.round(value));
  const body = abs.toLocaleString("en-US");
  const num = value < 0 ? `(${body})` : body;
  return withSymbol ? `${num} ฿` : num;
}

/** วันที่ พ.ศ. เช่น '11 ก.ย. 2567' — parse จากส่วนของสตริง (เลี่ยง bug timezone ของ Node, handoff §7) */
export function formatThaiDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = TH_MONTHS[Number(m[2]) - 1] ?? m[2];
  return `${Number(m[3])} ${month} ${Number(m[1]) + 543}`;
}

export type ChangeDirection = "up" | "down" | "flat" | "none";

/** เทียบช่วงก่อน — ถ้าช่วงก่อนไม่มีข้อมูล ต้องไม่โชว์ 0%/∞ (spec §6.7) */
export function formatPercentChange(
  current: number,
  previous: number,
): { text: string; direction: ChangeDirection } {
  if (!previous) {
    return { text: "ช่วงก่อนไม่มีข้อมูล", direction: "none" };
  }
  const pct = ((current - previous) / previous) * 100;
  const direction: ChangeDirection = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const sign = pct > 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(1)}%`, direction };
}
