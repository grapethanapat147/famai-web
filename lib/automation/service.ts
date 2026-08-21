/** เตือนเช็กระยะถึงกำหนด (pure เพื่อเทสได้ · E10) */

export type RemRow = {
  id: string;
  customerName: string;
  model: string | null;
  targetKm: number;
  dueDate: string | null; // ISO date หรือ null
  notified: boolean; // ส่งเตือนไปแล้วหรือยัง (notified_at != null)
};

/** ยังไม่เคยเตือน + ถึง/เลยกำหนด (due_date <= today) → เรียงตามกำหนดเร็วสุดก่อน */
export function dueReminders(rows: RemRow[], today: string): RemRow[] {
  return rows
    .filter((r) => !r.notified && r.dueDate != null && r.dueDate <= today)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : 0));
}
