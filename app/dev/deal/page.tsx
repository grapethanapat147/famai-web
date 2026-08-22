"use client";

import { DealView } from "@/components/deal/DealView";
import type { Deal, DealActionResult, ServiceHistory } from "@/lib/deal/deals";

/** พรีวิวหน้าลูกค้าและดีล (deal) — sample data · /deal จริงต่อ DB ผ่าน RLS */

const DEALS: Deal[] = [
  {
    saleId: "1",
    regId: "r1",
    customerId: "c-somchai",
    customerName: "สมชาย ใจดี",
    vehicle: "NMAX · แดง",
    engineNo: "E3X8E-112097",
    payMethod: "finance",
    netPrice: 92000,
    soldAt: "2026-08-11T10:00:00Z",
    customerAddress: null,
    customerTaxId: null,
    stage: "ส่งไฟแนนซ์",
    plateNo: null,
    docNo: "FMG-TAXINV-2569-00001",
    finance: { id: "fc1", companyName: "กรุงศรี ออโต้", status: "รอผล", amount: 84000, rejectReason: null },
  },
  {
    saleId: "2",
    regId: "r2",
    customerId: "c-manee",
    customerName: "มานี รักษ์ดี",
    vehicle: "FINN · ฟ้า",
    engineNo: "E34RE-057401",
    payMethod: "cash",
    netPrice: 46900,
    soldAt: "2026-08-10T09:00:00Z",
    customerAddress: "99 หมู่ 2 ต.ท่าวังทอง อ.เมือง จ.พะเยา 56000",
    customerTaxId: "1560100000001",
    stage: "รอทะเบียน",
    plateNo: null,
    docNo: "FMG-TAXINV-2569-00002",
    finance: null,
  },
  {
    saleId: "3",
    regId: "r3",
    customerId: "c-prasert",
    customerName: "ประเสริฐ มั่งมี",
    vehicle: "XMAX 300 · ดำ",
    engineNo: "EA71E-900233",
    payMethod: "finance",
    netPrice: 189000,
    soldAt: "2026-08-08T14:00:00Z",
    customerAddress: null,
    customerTaxId: null,
    stage: "ส่งไฟแนนซ์",
    plateNo: null,
    docNo: "FMG-TAXINV-2569-00003",
    finance: { id: "fc3", companyName: "ทิสโก้", status: "ปฏิเสธ", amount: 170000, rejectReason: "ประวัติเครดิตไม่ผ่าน" },
  },
  {
    saleId: "4",
    regId: "r4",
    customerId: "c-wipha",
    customerName: "วิภา สุขใจ",
    vehicle: "Aerox · น้ำเงิน",
    engineNo: "E3R8E-771020",
    payMethod: "cash",
    netPrice: 78000,
    soldAt: "2026-08-05T11:00:00Z",
    customerAddress: "12 ถ.ประตูชัย ต.เวียง อ.เมือง จ.พะเยา 56000",
    customerTaxId: "3560100000002",
    stage: "ส่งมอบแล้ว",
    plateNo: "1กก 1234",
    docNo: "FMG-TAXINV-2569-00004",
    finance: null,
  },
  {
    saleId: "5",
    regId: "r5",
    customerId: "c-somchai", // ลูกค้าเดิม (สมชาย) เคยซื้อคันก่อนหน้า → โชว์เป็นประวัติ
    customerName: "สมชาย ใจดี",
    vehicle: "Grand Filano · ขาว",
    engineNo: "E9L2E-004411",
    payMethod: "cash",
    netPrice: 62000,
    soldAt: "2024-03-15T10:00:00Z",
    customerAddress: null,
    customerTaxId: null,
    stage: "ส่งมอบแล้ว",
    plateNo: "2ขข 5678",
    docNo: null,
    finance: null,
  },
];

const SERVICES: ServiceHistory[] = [
  { customerId: "c-somchai", serviceType: "เช็กระยะ 1,000 กม.", checkedInAt: "2024-05-20T09:00:00Z", status: "ส่งมอบแล้ว", total: 520 },
  { customerId: "c-somchai", serviceType: "เปลี่ยนยาง", checkedInAt: "2025-02-10T10:30:00Z", status: "ส่งมอบแล้ว", total: 2400 },
  { customerId: "c-wipha", serviceType: "ซ่อมเบรก", checkedInAt: "2026-07-01T13:00:00Z", status: "เสร็จ", total: 880 },
];

async function mockAdvance(formData: FormData): Promise<DealActionResult> {
  const to = String(formData.get("to"));
  return { ok: true, message: `เลื่อนไป ${to}` };
}

async function mockFinance(formData: FormData): Promise<DealActionResult> {
  const to = String(formData.get("to"));
  if (to === "ปฏิเสธ" && !String(formData.get("reason")).trim()) {
    return { ok: false, error: "กรุณาระบุเหตุผลที่ปฏิเสธ" };
  }
  return { ok: true };
}

async function mockVoid(formData: FormData): Promise<DealActionResult> {
  if (!String(formData.get("reason")).trim()) {
    return { ok: false, error: "กรุณาระบุเหตุผลที่ยกเลิก" };
  }
  return { ok: true, message: "ยกเลิกดีลแล้ว" };
}

export default function DevDealPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ลูกค้าและดีล (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — กดดีลเพื่อดูแถบขั้น + เลื่อนขั้น · จัดการงานสินเชื่อ (รอผล→อนุมัติ/ปฏิเสธ · ปฏิเสธ→ยื่นใหม่) · ลูกค้าเท (ยกเลิกดีล)</p>
      </header>
      <DealView
        deals={DEALS}
        services={SERVICES}
        seller={{
          shopName: "Famai Motor Group",
          branchName: "พะเยา",
          address: "123 ถ.พหลโยธิน ต.เวียง อ.เมือง จ.พะเยา 56000",
          phone: "054-000-000",
          taxId: "0123456789012",
          sellerName: "เดโม พนักงานขาย",
        }}
        vatPct={7}
        canManage
        action={mockAdvance}
        canManageFinance
        financeAction={mockFinance}
        canVoid
        voidAction={mockVoid}
      />
    </main>
  );
}
