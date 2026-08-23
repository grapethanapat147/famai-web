"use client";

import { SellForm, type FinanceCo, type FreebieOption, type SellUnit } from "@/components/sell/SellForm";
import type { SellActionResult } from "@/lib/sell/sell";

/** พรีวิวหน้าขาย (FAM-1011/1023) — sample data · /sell จริงต่อ DB ผ่าน sell_unit RPC */

const UNITS: SellUnit[] = [
  { id: "1", modelCode: "B6FU00", modelName: "FINN ล้อแม็ก", colorName: "ฟ้า", engineNo: "E34RE-057401", frameNo: "MLEUE364111399878", branchCode: "FMG01", branchName: "Famai Motor Group", ageDays: 12, retail: 46900, cost: 40800 },
  { id: "2", modelCode: "BTF200", modelName: "NMAX สแตนดาร์ด", colorName: "แดง", engineNo: "E3X8E-112097", frameNo: "MLERG583XPG200145", branchCode: "FMM01", branchName: "Famai Motor", ageDays: 95, retail: 92000, cost: 78000 },
  { id: "3", modelCode: "DR9200", modelName: "XMAX 300", colorName: "ดำ/เทา", engineNo: "EA71E-900233", frameNo: "MLDSG897XPB900233", branchCode: "FMG01", branchName: "Famai Motor Group", ageDays: 5, retail: 189000, cost: 175000 },
];

const FINANCE: FinanceCo[] = [
  { id: "krungsri", name: "กรุงศรี ออโต้", ratePct: 1.35 },
  { id: "thanachart", name: "ธนชาต", ratePct: 1.48 },
  { id: "tisco", name: "ทิสโก้", ratePct: 1.42 },
];

const FREEBIES: FreebieOption[] = [
  { name: "หมวกกันน็อก", cost: 450 },
  { name: "พ.ร.บ.", cost: 320 },
  { name: "ผ้าคลุมรถ", cost: 120 },
  { name: "น้ำมันเครื่อง", cost: 180 },
];

async function mockSell(formData: FormData): Promise<SellActionResult> {
  if (!String(formData.get("customer_name") ?? "").trim()) {
    return { ok: false, error: "กรอกชื่อลูกค้า" };
  }
  return { ok: true, saleId: "dev-sale", docNo: "FMG-TAXINV-2569-00042" };
}

export default function DevSellPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ขายรถ (preview)</h1>
        <p className="mt-1 text-ink-soft">FAM-1011/1023 · sample data — เลือกคัน + ลูกค้า → ยืนยัน → บันทึก (mock) · sellerBranchCode=FMG01</p>
      </header>
      <SellForm
        units={UNITS}
        financeCompanies={FINANCE}
        freebieOptions={FREEBIES}
        vatPct={7}
        agingDays={90}
        freebieIsCost
        financeTerms={[12, 18, 24, 30, 36, 42, 48]}
        canSeeMoney
        sellerBranchCode="FMG01"
        action={mockSell}
      />
    </main>
  );
}
