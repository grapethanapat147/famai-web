/**
 * ตัวเลขเงินสำหรับหน้าสรุปผู้บริหาร — FAM-1120 · fixlist ข้อ 15
 * เดิมหน้าแรกมีแต่ "ขายได้กี่คัน" เจ้าของอยากรู้เป็นเงินบาทต้องไปไล่รวมเอง
 *
 * ฟังก์ชันบริสุทธิ์ทั้งหมด (ไม่แตะ DB) — หน้าเพจดึงแถวดิบมาป้อน
 */

export type SaleAmount = { soldAt: string; netPrice: number };
export type DatedAmount = { date: string; amount: number };

export type SalesMoney = { today: number; month: number; countToday: number; countMonth: number };

/** ยอดขายเป็นเงิน วันนี้ / เดือนนี้ (รับเฉพาะแถวที่เพจกรองมาแล้วว่าอยู่ในเดือนนี้) */
export function salesMoney(sales: readonly SaleAmount[], todayISO: string): SalesMoney {
  const day = todayISO.slice(0, 10);
  const month = day.slice(0, 7);
  let today = 0;
  let monthTotal = 0;
  let countToday = 0;
  let countMonth = 0;
  for (const s of sales) {
    const d = s.soldAt.slice(0, 10);
    if (!d.startsWith(month)) {
      continue;
    }
    monthTotal += s.netPrice;
    countMonth += 1;
    if (d === day) {
      today += s.netPrice;
      countToday += 1;
    }
  }
  return { today, month: monthTotal, countToday, countMonth };
}

export type CashToday = { in: number; out: number; net: number };

/** สรุปเงินวันนี้: รับเข้า − จ่ายออก = คงเหลือสุทธิ */
export function cashToday(
  receipts: readonly DatedAmount[],
  expenses: readonly DatedAmount[],
  todayISO: string,
): CashToday {
  const day = todayISO.slice(0, 10);
  const sumOn = (rows: readonly DatedAmount[]) =>
    rows.reduce((sum, r) => (r.date.slice(0, 10) === day ? sum + r.amount : sum), 0);
  const cashIn = sumOn(receipts);
  const cashOut = sumOn(expenses);
  return { in: cashIn, out: cashOut, net: cashIn - cashOut };
}

export type FinanceApproval = { approved: number; rejected: number; pending: number; ratePct: number | null };

/**
 * อัตราไฟแนนซ์อนุมัติ = อนุมัติ ÷ (อนุมัติ + ปฏิเสธ)
 * เคสที่ยังไม่รู้ผลไม่นับเป็นตัวหาร — ไม่งั้นอัตราจะต่ำหลอกตอนต้นเดือน
 * ยังไม่มีเคสที่รู้ผลเลย → null (โชว์ "—" ไม่ใช่ 0%)
 */
export function financeApproval(statuses: readonly string[]): FinanceApproval {
  let approved = 0;
  let rejected = 0;
  let pending = 0;
  for (const s of statuses) {
    if (s === "อนุมัติแล้ว") {
      approved += 1;
    } else if (s === "ปฏิเสธ") {
      rejected += 1;
    } else {
      pending += 1;
    }
  }
  const decided = approved + rejected;
  return { approved, rejected, pending, ratePct: decided === 0 ? null : Math.round((approved / decided) * 100) };
}

export type LowStockModel = { model: string; qty: number };

/**
 * รุ่นที่ใกล้หมดสต๊อก (เหลือ ≤ ค่าตั้ง low_stock) เรียงน้อยสุดก่อน
 * นับเฉพาะรุ่นที่ยังมีของ — รุ่นที่หมดเกลี้ยงไม่ใช่ "ใกล้หมด" และมักเป็นรุ่นที่เลิกขายแล้ว
 */
export function lowStockModels(
  units: readonly { model?: string }[],
  threshold: number,
  limit = 5,
): LowStockModel[] {
  const byModel = new Map<string, number>();
  for (const u of units) {
    const m = u.model;
    if (!m) {
      continue;
    }
    byModel.set(m, (byModel.get(m) ?? 0) + 1);
  }
  return [...byModel.entries()]
    .filter(([, qty]) => qty > 0 && qty <= threshold)
    .map(([model, qty]) => ({ model, qty }))
    .sort((a, b) => (a.qty !== b.qty ? a.qty - b.qty : a.model.localeCompare(b.model, "th")))
    .slice(0, limit);
}
