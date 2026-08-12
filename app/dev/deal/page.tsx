"use client";

import { DealView } from "@/components/deal/DealView";
import type { Deal, DealActionResult } from "@/lib/deal/deals";

/** พรีวิวหน้าลูกค้าและดีล (deal) — sample data · /deal จริงต่อ DB ผ่าน RLS */

const DEALS: Deal[] = [
  {
    saleId: "1",
    regId: "r1",
    customerName: "สมชาย ใจดี",
    vehicle: "NMAX · แดง",
    engineNo: "E3X8E-112097",
    payMethod: "finance",
    netPrice: 92000,
    soldAt: "2026-08-11T10:00:00Z",
    stage: "ส่งไฟแนนซ์",
    plateNo: null,
    finance: { companyName: "กรุงศรี ออโต้", status: "รอผล", amount: 84000, rejectReason: null },
  },
  {
    saleId: "2",
    regId: "r2",
    customerName: "มานี รักษ์ดี",
    vehicle: "FINN · ฟ้า",
    engineNo: "E34RE-057401",
    payMethod: "cash",
    netPrice: 46900,
    soldAt: "2026-08-10T09:00:00Z",
    stage: "รอทะเบียน",
    plateNo: null,
    finance: null,
  },
  {
    saleId: "3",
    regId: "r3",
    customerName: "ประเสริฐ มั่งมี",
    vehicle: "XMAX 300 · ดำ",
    engineNo: "EA71E-900233",
    payMethod: "finance",
    netPrice: 189000,
    soldAt: "2026-08-08T14:00:00Z",
    stage: "ส่งไฟแนนซ์",
    plateNo: null,
    finance: { companyName: "ทิสโก้", status: "ปฏิเสธ", amount: 170000, rejectReason: "ประวัติเครดิตไม่ผ่าน" },
  },
  {
    saleId: "4",
    regId: "r4",
    customerName: "วิภา สุขใจ",
    vehicle: "Aerox · น้ำเงิน",
    engineNo: "E3R8E-771020",
    payMethod: "cash",
    netPrice: 78000,
    soldAt: "2026-08-05T11:00:00Z",
    stage: "ส่งมอบแล้ว",
    plateNo: "1กก 1234",
    finance: null,
  },
];

async function mockAdvance(formData: FormData): Promise<DealActionResult> {
  const to = String(formData.get("to"));
  return { ok: true, message: `เลื่อนไป ${to}` };
}

export default function DevDealPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ลูกค้าและดีล (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — กดดีลเพื่อดูแถบขั้น + เลื่อนขั้น (เงินสด 4 ขั้น · เงินผ่อน 6 ขั้น · ตกราง=ไฟแนนซ์ปฏิเสธ)</p>
      </header>
      <DealView deals={DEALS} canManage action={mockAdvance} />
    </main>
  );
}
