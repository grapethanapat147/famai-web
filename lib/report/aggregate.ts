/**
 * รวมยอดสำหรับรายงาน (ฟังก์ชันบริสุทธิ์ ทดสอบได้) — group + sum หลายคอลัมน์
 */

/** อยู่ในช่วงวันที่ (from/to = ISO date, ค่าว่าง = ไม่จำกัดฝั่งนั้น) */
export function inRange(dateISO: string, from: string, to: string): boolean {
  const d = dateISO.slice(0, 10);
  if (from && d < from.slice(0, 10)) {
    return false;
  }
  if (to && d > to.slice(0, 10)) {
    return false;
  }
  return true;
}

export type AggRow = { key: string; count: number; sums: number[] };

/**
 * จัดกลุ่มตาม keyOf แล้วรวมค่าตาม valueOfs (หลายคอลัมน์)
 * เรียงตามคอลัมน์แรกมาก→น้อย แล้วตามชื่อกลุ่ม
 */
export function groupAggregate<T>(
  rows: readonly T[],
  keyOf: (row: T) => string,
  valueOfs: ReadonlyArray<(row: T) => number>,
): AggRow[] {
  const map = new Map<string, AggRow>();
  for (const r of rows) {
    const key = keyOf(r) || "—";
    let row = map.get(key);
    if (!row) {
      row = { key, count: 0, sums: valueOfs.map(() => 0) };
      map.set(key, row);
    }
    row.count += 1;
    valueOfs.forEach((f, i) => {
      row!.sums[i] += f(r);
    });
  }
  return [...map.values()].sort((a, b) => (b.sums[0] ?? 0) - (a.sums[0] ?? 0) || a.key.localeCompare(b.key, "th"));
}

/** ผลรวมคอลัมน์ที่ i ของทุกกลุ่ม (แถวรวมท้ายตาราง) */
export function sumColumn(rows: readonly AggRow[], i: number): number {
  return rows.reduce((s, r) => s + (r.sums[i] ?? 0), 0);
}

/** จำนวนรายการรวมของทุกกลุ่ม */
export function totalCount(rows: readonly AggRow[]): number {
  return rows.reduce((s, r) => s + r.count, 0);
}

/** เดือน พ.ศ. จาก ISO date เช่น '2026-08-…' → '2569-08' (จัดกลุ่มรายเดือน) */
export function monthKeyBE(dateISO: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(dateISO);
  if (!m) {
    return "—";
  }
  return `${Number(m[1]) + 543}-${m[2]}`;
}
