/** คำนวณดีลการขาย — spec §6.2 (กำไร), §6.3 (VAT), §6.4 (ค่างวดดอกเบี้ยคงที่) */

export type PayMethod = "cash" | "finance";

export type DealInput = {
  listPrice: number; // ราคาตั้ง (รวม VAT)
  discount: number; // ส่วนลด
  cost: number | null; // ต้นทุน (null = ไม่มีสิทธิ์ money → ไม่คิดกำไร)
  freebieCost: number; // รวมต้นทุนของแถม
  freebieIsCost: boolean; // หักของแถมจากกำไรไหม (settings)
  vatPct: number; // อัตราภาษี %
  payMethod: PayMethod;
  downPayment: number; // เงินดาวน์ (เงินผ่อน)
  months: number; // จำนวนงวด
  monthlyRatePct: number; // ดอกเบี้ยคงที่ต่อเดือน %
};

export type Deal = {
  netPrice: number; // ราคาสุทธิ = ราคาตั้ง − ส่วนลด
  valueBeforeVat: number; // มูลค่าก่อนภาษี
  vat: number; // ภาษีมูลค่าเพิ่ม
  grossProfit: number | null; // กำไรของดีล (null = ไม่มีสิทธิ์)
  marginPct: number | null; // อัตรากำไร %
  financed: number | null; // ยอดจัด (เงินผ่อน)
  totalPayable: number | null; // ยอดรวมจ่าย
  monthlyPayment: number | null; // ค่างวด/เดือน
};

export function computeDeal(i: DealInput): Deal {
  const netPrice = Math.max(0, i.listPrice - i.discount);
  const valueBeforeVat = i.vatPct > 0 ? netPrice / (1 + i.vatPct / 100) : netPrice;
  const vat = netPrice - valueBeforeVat;

  let grossProfit: number | null = null;
  let marginPct: number | null = null;
  if (i.cost != null) {
    const freebie = i.freebieIsCost ? i.freebieCost : 0;
    grossProfit = netPrice - i.cost - freebie;
    marginPct = netPrice > 0 ? (grossProfit / netPrice) * 100 : 0;
  }

  let financed: number | null = null;
  let totalPayable: number | null = null;
  let monthlyPayment: number | null = null;
  if (i.payMethod === "finance" && i.months > 0) {
    financed = Math.max(0, netPrice - i.downPayment);
    totalPayable = financed * (1 + (i.monthlyRatePct / 100) * i.months);
    monthlyPayment = totalPayable / i.months;
  }

  return { netPrice, valueBeforeVat, vat, grossProfit, marginPct, financed, totalPayable, monthlyPayment };
}
