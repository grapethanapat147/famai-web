/**
 * คำนวณค่างวดสำหรับใบเสนอราคา (เทียบไฟแนนซ์หลายงวด) — ดอกเบี้ยคงที่ต่อเดือน (flat)
 * ยอดจัด = ราคา − เงินดาวน์ · ยอดรวม = ยอดจัด × (1 + ดอกเบี้ย%/เดือน × จำนวนงวด) · ค่างวด = ยอดรวม ÷ งวด
 */

export type TermRow = { months: number; monthly: number };

export function financedAmount(price: number, down: number): number {
  return Math.max(0, price - down);
}

/** ค่างวด/เดือน (ปัดเป็นจำนวนเต็ม) */
export function flatMonthly(financed: number, ratePctPerMonth: number, months: number): number {
  if (months <= 0) {
    return 0;
  }
  const total = financed * (1 + (ratePctPerMonth / 100) * months);
  return total / months;
}

/** ตารางค่างวดสำหรับทุกจำนวนงวดที่เลือก */
export function optionTerms(
  price: number,
  down: number,
  ratePctPerMonth: number,
  termsList: readonly number[],
): TermRow[] {
  const financed = financedAmount(price, down);
  return termsList.map((months) => ({ months, monthly: Math.round(flatMonthly(financed, ratePctPerMonth, months)) }));
}
