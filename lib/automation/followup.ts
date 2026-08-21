/** วางแผนสร้างงานติดตามหลังขาย (pure เพื่อเทสได้ · E10) */
import { addDays } from "@/lib/automation/clock";

export type SaleRow = { id: string; branchId: string; customerId: string; soldAt: string };

export type NewFollowUp = {
  branch_id: string;
  customer_id: string;
  sale_id: string;
  kind: string;
  due_at: string;
};

/** key ของงานติดตามที่มีแล้ว เพื่อกันสร้างซ้ำ */
export function followUpKey(saleId: string, kind: string): string {
  return `${saleId}:${kind}`;
}

/** cadence (วัน) → kind ตามสคีมา (7d|30d|90d|1y|3y) */
export function cadenceKind(days: number): string {
  if (days === 365) {
    return "1y";
  }
  if (days === 1095) {
    return "3y";
  }
  return `${days}d`;
}

/**
 * งานติดตามที่ควรสร้าง: ต่อการขาย × cadence (วัน) ที่ถึงกำหนดแล้ว (soldAt+d <= today)
 * และยังไม่มี (sale, kind) อยู่เดิม · kind = "<d>d"
 */
export function plannedFollowUps(
  sales: SaleRow[],
  existingKeys: Set<string>,
  cadenceDays: number[],
  today: string,
): NewFollowUp[] {
  const out: NewFollowUp[] = [];
  for (const s of sales) {
    for (const d of cadenceDays) {
      const kind = cadenceKind(d);
      const dueAt = addDays(s.soldAt, d);
      if (dueAt <= today && !existingKeys.has(followUpKey(s.id, kind))) {
        out.push({ branch_id: s.branchId, customer_id: s.customerId, sale_id: s.id, kind, due_at: dueAt });
      }
    }
  }
  return out;
}
