/**
 * ตรรกะรายการใบงานซ่อม (ค่าแรง/อะไหล่) — ฟังก์ชันบริสุทธิ์ ทดสอบได้ (FAM-1027b)
 * ยอด labor_cost/parts_cost/total คำนวณจากรายการ ไม่เก็บซ้ำ (self-healing เมื่อ recompute)
 */

export const LINE_KINDS = ["labor", "part"] as const;
export type LineKind = (typeof LINE_KINDS)[number];

export function isLineKind(v: string): v is LineKind {
  return v === "labor" || v === "part";
}

/** ยอดต่อรายการ = จำนวน × ราคาต่อหน่วย (ปัดกันเศษ float ทศนิยม 2 ตำแหน่ง) */
export function lineAmount(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice * 100) / 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type JobTotals = { laborCost: number; partsCost: number; total: number };

/** รวมยอดจากรายการ: part → ค่าอะไหล่, อื่น ๆ → ค่าแรง */
export function jobTotals(lines: ReadonlyArray<{ kind: string; amount: number }>): JobTotals {
  let laborCost = 0;
  let partsCost = 0;
  for (const ln of lines) {
    if (ln.kind === "part") {
      partsCost += ln.amount;
    } else {
      laborCost += ln.amount;
    }
  }
  laborCost = round2(laborCost);
  partsCost = round2(partsCost);
  return { laborCost, partsCost, total: round2(laborCost + partsCost) };
}
