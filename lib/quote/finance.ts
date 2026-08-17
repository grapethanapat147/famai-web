/**
 * คำนวณค่างวดสำหรับใบเสนอราคา (เทียบไฟแนนซ์หลายงวด) — ดอกเบี้ยคงที่ต่อเดือน (flat)
 * ยอดจัด = ราคา − เงินดาวน์ · ยอดรวม = ยอดจัด × (1 + ดอกเบี้ย%/เดือน × จำนวนงวด) · ค่างวด = ยอดรวม ÷ งวด
 */

export type TermRow = { months: number; monthly: number };

/** เรตดอกเบี้ยรายช่วงงวด — คีย์ = จำนวนงวด (string), ค่า = %/เดือน เช่น {"12":1.29,"36":1.45} */
export type RateTiers = Record<string, number>;

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

/** อ่าน rate_tiers (jsonb) ให้เหลือเฉพาะคีย์จำนวนงวด→เรตที่เป็นตัวเลข · ว่าง/ผิดรูป → null */
export function parseRateTiers(raw: unknown): RateTiers | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const out: RateTiers = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const rate = Number(value);
    if (/^\d+$/.test(key) && Number.isFinite(rate) && rate >= 0) {
      out[key] = rate;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function hasRateTiers(tiers?: RateTiers | null): boolean {
  return !!tiers && Object.keys(tiers).length > 0;
}

/** เรต%/เดือน ของจำนวนงวดนี้ — ใช้ rate_tiers[months] ถ้ามี ไม่งั้นใช้เรตฐาน (flat) */
export function rateForTerm(months: number, flatRatePct: number, tiers?: RateTiers | null): number {
  if (tiers) {
    const tiered = tiers[String(months)];
    if (tiered != null && Number.isFinite(tiered)) {
      return tiered;
    }
  }
  return flatRatePct;
}

/** ป้ายเรตของไฟแนนซ์ — มี tier → "เรตตามงวด" (เพราะ % ต่างกันแต่ละงวด), ไม่งั้นโชว์เรตฐาน */
export function financeLabel(name: string, ratePct: number, tiers?: RateTiers | null): string {
  return hasRateTiers(tiers) ? `${name} · เรตตามงวด` : `${name} ${ratePct}%`;
}

/** ตารางค่างวดสำหรับทุกจำนวนงวดที่เลือก — รองรับเรตรายช่วงงวด (tiers) ถ้าไม่ส่งใช้ flat เดิม */
export function optionTerms(
  price: number,
  down: number,
  ratePctPerMonth: number,
  termsList: readonly number[],
  tiers?: RateTiers | null,
): TermRow[] {
  const financed = financedAmount(price, down);
  return termsList.map((months) => ({
    months,
    monthly: Math.round(flatMonthly(financed, rateForTerm(months, ratePctPerMonth, tiers), months)),
  }));
}
