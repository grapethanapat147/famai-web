/**
 * ตัดฟิลด์เงิน (ต้นทุน/กำไร/มูลค่า/ยอดจัด) ออกจากข้อมูลเมื่อไม่มีสิทธิ์เห็น
 * — ค่าที่ไม่มีสิทธิ์จะ **ไม่ถูกส่งออก/serialize** ไปฝั่ง client เลย (spec §8.3, handoff §9b)
 * pure (ไม่มี server-only) เพื่อให้เทสต์ได้ตรง ๆ
 */
export function stripMoneyFields<T extends Record<string, unknown>>(
  rows: T[],
  canSee: boolean,
  fields: readonly (keyof T)[],
): Array<Partial<T>> {
  if (canSee) return rows;
  return rows.map((row) => {
    const copy: Partial<T> = { ...row };
    for (const field of fields) {
      delete copy[field];
    }
    return copy;
  });
}

export function stripMoneyRow<T extends Record<string, unknown>>(
  row: T,
  canSee: boolean,
  fields: readonly (keyof T)[],
): Partial<T> {
  return stripMoneyFields([row], canSee, fields)[0];
}
