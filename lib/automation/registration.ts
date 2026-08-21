/** ทะเบียนเกินกำหนด (pure เพื่อเทสได้ · E10) */
import { computeAgeDays } from "@/lib/stock/units";

export type RegRow = {
  customerName: string;
  model: string | null;
  branchName: string;
  stage: string;
  dueAt: string | null; // ISO date หรือ null
  plateReceived: boolean; // ได้ป้ายแล้วหรือยัง (plate_received_at != null)
};

export type OverdueReg = RegRow & { daysOverdue: number };

/** ยังไม่ได้ป้าย + เลยกำหนด (due_at < today) → เรียงจากเกินนานสุด */
export function overdueRegistrations(rows: RegRow[], today: string): OverdueReg[] {
  return rows
    .filter((r) => !r.plateReceived && r.dueAt != null && r.dueAt < today)
    .map((r) => ({ ...r, daysOverdue: computeAgeDays(r.dueAt as string, today) }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}
