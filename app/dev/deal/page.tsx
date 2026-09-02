"use client";

import { DealView } from "@/components/deal/DealView";
import type { Deal, DealActionResult, ServiceHistory } from "@/lib/deal/deals";
import type { LeadRow } from "@/lib/deal/lead";

/** พรีวิวหน้าลูกค้าและดีล (deal) — sample data · /deal จริงต่อ DB ผ่าน RLS */

const DEALS: Deal[] = [
  {
    saleId: "1",
    regId: "r1",
    customerId: "c-somchai",
    customerName: "สมชาย ใจดี",
    customerPhone: "081-234-5678",
    vehicle: "NMAX · แดง",
    engineNo: "E3X8E-112097",
    frameNo: "MLERG583XPG200145",
    regNote: null,
    payMethod: "finance",
    netPrice: 92000,
    soldAt: "2026-08-11T10:00:00Z",
    customerAddress: null,
    customerTaxId: null,
    stage: "ส่งไฟแนนซ์",
    plateNo: null,
    docNo: "FMG-TAXINV-2569-00001",
    publicToken: "FMG-1A7K2",
    finance: { id: "fc1", companyName: "กรุงศรี ออโต้", status: "รอผล", amount: 84000, rejectReason: null },
    steps: [],
  },
  {
    saleId: "2",
    regId: "r2",
    customerId: "c-manee",
    customerName: "มานี รักษ์ดี",
    customerPhone: "089-111-2222",
    vehicle: "FINN · ฟ้า",
    engineNo: "E34RE-057401",
    frameNo: "MLEUE364111399878",
    regNote: "นัดรับป้ายขาว 15 ส.ค.",
    payMethod: "cash",
    netPrice: 46900,
    soldAt: "2026-08-10T09:00:00Z",
    customerAddress: "99 หมู่ 2 ต.ท่าวังทอง อ.เมือง จ.พะเยา 56000",
    customerTaxId: "1560100000001",
    stage: "รอทะเบียน",
    plateNo: null,
    docNo: "FMG-TAXINV-2569-00002",
    publicToken: "FMG-2A7K2",
    finance: null,
    steps: [{ stage: "รอทะเบียน", subStatus: "ยื่นขนส่งแล้ว", note: "ยื่น 12 ส.ค.", updatedAt: "2026-08-12T03:00:00Z", updatedByName: "เดโม พนักงาน" }],
  },
  {
    saleId: "3",
    regId: "r3",
    customerId: "c-prasert",
    customerName: "ประเสริฐ มั่งมี",
    customerPhone: null,
    vehicle: "XMAX 300 · ดำ",
    engineNo: "EA71E-900233",
    frameNo: "MLDSG897XPB900233",
    regNote: null,
    payMethod: "finance",
    netPrice: 189000,
    soldAt: "2026-08-08T14:00:00Z",
    customerAddress: null,
    customerTaxId: null,
    stage: "ส่งไฟแนนซ์",
    plateNo: null,
    docNo: "FMG-TAXINV-2569-00003",
    publicToken: "FMG-3A7K2",
    finance: { id: "fc3", companyName: "ทิสโก้", status: "ปฏิเสธ", amount: 170000, rejectReason: "ประวัติเครดิตไม่ผ่าน" },
    steps: [],
  },
  {
    saleId: "4",
    regId: "r4",
    customerId: "c-wipha",
    customerName: "วิภา สุขใจ",
    customerPhone: "086-777-8888",
    vehicle: "Aerox · น้ำเงิน",
    engineNo: "E3R8E-771020",
    frameNo: "MLDRG211XPA771020",
    regNote: "ส่งมอบที่ร้าน",
    payMethod: "cash",
    netPrice: 78000,
    soldAt: "2026-08-05T11:00:00Z",
    customerAddress: "12 ถ.ประตูชัย ต.เวียง อ.เมือง จ.พะเยา 56000",
    customerTaxId: "3560100000002",
    stage: "ส่งมอบแล้ว",
    plateNo: "1กก 1234",
    docNo: "FMG-TAXINV-2569-00004",
    publicToken: "FMG-4A7K2",
    finance: null,
    steps: [],
  },
  {
    saleId: "5",
    regId: "r5",
    customerId: "c-somchai", // ลูกค้าเดิม (สมชาย) เคยซื้อคันก่อนหน้า → โชว์เป็นประวัติ
    customerName: "สมชาย ใจดี",
    customerPhone: "081-234-5678",
    vehicle: "Grand Filano · ขาว",
    engineNo: "E9L2E-004411",
    frameNo: "MLEKG019XPA004411",
    regNote: null,
    payMethod: "cash",
    netPrice: 62000,
    soldAt: "2024-03-15T10:00:00Z",
    customerAddress: null,
    customerTaxId: null,
    stage: "ส่งมอบแล้ว",
    plateNo: "2ขข 5678",
    docNo: null,
    publicToken: "FMG-5A7K2",
    finance: null,
    steps: [],
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

async function mockRevert(formData: FormData): Promise<DealActionResult> {
  return { ok: true, message: `ย้อนไป ${String(formData.get("to"))}` };
}

async function mockAddCustomer(formData: FormData): Promise<DealActionResult> {
  if (!String(formData.get("name")).trim()) {
    return { ok: false, error: "กรอกชื่อลูกค้า" };
  }
  return { ok: true, message: "บันทึกลูกค้าแล้ว" };
}

async function mockStep(formData: FormData): Promise<DealActionResult> {
  return { ok: true, message: `บันทึกขั้น ${String(formData.get("stage"))}` };
}

async function mockCustomer(formData: FormData): Promise<DealActionResult> {
  const tax = String(formData.get("tax_id") ?? "").trim();
  if (tax !== "" && !/^\d{13}$/.test(tax)) {
    return { ok: false, error: "เลขบัตรประชาชน/ผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก" };
  }
  return { ok: true, message: "บันทึกข้อมูลลูกค้าแล้ว" };
}

const LEAD_VARIANTS = [
  { id: "v-nmax", name: "NMAX" },
  { id: "v-finn", name: "FINN" },
  { id: "v-xmax", name: "XMAX 300" },
];

const LEADS: LeadRow[] = [
  { id: "l1", name: "กานดา ทองคำ", phone: "081-111-2222", interestedVariantId: "v-nmax", interestedModel: "NMAX", source: "Facebook", createdAt: "2026-08-22T09:00:00Z" },
  { id: "l2", name: "ธนา วงศ์ไทย", phone: "089-333-4444", interestedVariantId: "v-xmax", interestedModel: "XMAX 300", source: "เดินเข้าร้าน", createdAt: "2026-08-20T13:30:00Z" },
];

export default function DevDealPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ลูกค้าและดีล (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — เพิ่มลูกค้า (ลีด) · กดดีลเพื่อเลื่อน/ย้อนขั้น · จัดการสินเชื่อ · ลูกค้าเท</p>
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
        revertAction={mockRevert}
        leads={LEADS}
        leadVariants={LEAD_VARIANTS}
        addCustomerAction={mockAddCustomer}
        canManageFinance
        financeAction={mockFinance}
        canVoid
        voidAction={mockVoid}
        customerAction={mockCustomer}
        stepAction={mockStep}
      />
    </main>
  );
}
