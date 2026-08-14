"use client";

import { ServiceView } from "@/components/service/ServiceView";
import type { ServiceActionResult, ServiceJob } from "@/lib/service/jobs";

/** พรีวิวหน้าศูนย์ซ่อม (service) — sample data · /service จริงต่อ DB ผ่าน RLS */

const JOBS: ServiceJob[] = [
  {
    id: "1",
    jobNo: "SVC-2569-0012",
    customerName: "สมชาย ใจดี",
    vehicle: "NMAX · แดง",
    engineNo: "E3X8E-112097",
    odometerKm: 1000,
    serviceType: "เช็กระยะ",
    symptom: "เช็กระยะ 1,000 กม. + เปลี่ยนถ่ายน้ำมันเครื่อง",
    status: "รับเข้า",
    technicianName: null,
    checkedInAt: "2026-08-11T09:10:00Z",
    laborCost: 300,
    partsCost: 220,
    total: 520,
    lines: [
      { id: "l1", kind: "labor", description: "ค่าแรงเช็กระยะ", qty: 1, unitPrice: 300, amount: 300 },
      { id: "l2", kind: "part", description: "น้ำมันเครื่อง Yamalube", qty: 1, unitPrice: 220, amount: 220 },
    ],
  },
  {
    id: "2",
    jobNo: "SVC-2569-0011",
    customerName: "มานี รักษ์ดี",
    vehicle: "Aerox · น้ำเงิน",
    engineNo: "E34RE-057401",
    odometerKm: 8200,
    serviceType: "ซ่อม",
    symptom: "เบรกหน้ามีเสียง",
    status: "กำลังซ่อม",
    technicianName: "ช่างเอก",
    checkedInAt: "2026-08-10T13:30:00Z",
    laborCost: 500,
    partsCost: 380,
    total: 880,
    lines: [
      { id: "l3", kind: "labor", description: "เปลี่ยนผ้าเบรก", qty: 1, unitPrice: 500, amount: 500 },
      { id: "l4", kind: "part", description: "ผ้าเบรกหน้า NMAX", qty: 1, unitPrice: 380, amount: 380 },
    ],
  },
  {
    id: "3",
    jobNo: "SVC-2569-0009",
    customerName: "รถนอก (วอล์กอิน)",
    vehicle: "PCX (รถนอก)",
    engineNo: "JF81E-224100",
    odometerKm: 24500,
    serviceType: "รอเคลม",
    symptom: "รอสายพานเข้า",
    status: "รออะไหล่",
    technicianName: "ช่างบี",
    checkedInAt: "2026-08-08T10:00:00Z",
    laborCost: 400,
    partsCost: 0,
    total: 400,
    lines: [{ id: "l5", kind: "labor", description: "ค่าแรงเปลี่ยนสายพาน", qty: 1, unitPrice: 400, amount: 400 }],
  },
  {
    id: "4",
    jobNo: "SVC-2569-0007",
    customerName: "ประเสริฐ มั่งมี",
    vehicle: "XMAX 300 · ดำ",
    engineNo: "EA71E-900233",
    odometerKm: 4000,
    serviceType: "เช็กระยะ",
    symptom: "เช็กระยะ 4,000 กม.",
    status: "เสร็จ",
    technicianName: "ช่างเอก",
    checkedInAt: "2026-08-07T09:00:00Z",
    laborCost: 350,
    partsCost: 180,
    total: 530,
    lines: [],
  },
];

async function mockAdvance(formData: FormData): Promise<ServiceActionResult> {
  const to = String(formData.get("to"));
  if (to === "ส่งมอบแล้ว") {
    return { ok: true, message: "ส่งมอบแล้ว" };
  }
  return { ok: true };
}

async function mockCreate(formData: FormData): Promise<ServiceActionResult> {
  if (!String(formData.get("unit_id")) && !String(formData.get("engine_no")).trim()) {
    return { ok: false, error: "ระบุรถ" };
  }
  return { ok: true };
}

const CREATE_OPTIONS = {
  customers: [
    { id: "c1", name: "สมชาย ใจดี" },
    { id: "c2", name: "มานี รักษ์ดี" },
  ],
  technicians: [
    { id: "t1", name: "ช่างเอก" },
    { id: "t2", name: "ช่างบี" },
  ],
  units: [
    { id: "u1", label: "NMAX · แดง · E3X8E-112097", engineNo: "E3X8E-112097", frameNo: "MLEUG374100112097" },
    { id: "u2", label: "Aerox · น้ำเงิน · E34RE-057401", engineNo: "E34RE-057401", frameNo: "MLEUE364111399878" },
  ],
};

export default function DevServicePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ศูนย์ซ่อม (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — เปิดใบงานซ่อม · กดใบงานเพื่อดูรายละเอียด + เลื่อนสถานะ (ไป: … →)</p>
      </header>
      <ServiceView jobs={JOBS} canManage action={mockAdvance} createOptions={CREATE_OPTIONS} createAction={mockCreate} />
    </main>
  );
}
