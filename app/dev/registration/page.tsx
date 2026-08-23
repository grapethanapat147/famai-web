"use client";

import { RegistrationView } from "@/components/registration/RegistrationView";
import type { PlateActionResult, PlateRow } from "@/lib/registration/plate";

/** พรีวิวคิวงานทะเบียน (FAM-1100) — sample data · /registration จริงต่อ DB (registration + registration_event) */

const QUEUE: PlateRow[] = [
  {
    regId: "r1",
    saleId: "s1",
    vehicle: "XMAX 300 · น้ำเงิน",
    frameNo: "MH3SG576111027060",
    customerName: "นายวีระ โปร่งนุช",
    branch: "ฟ้าใหม่มอเตอร์ (สนญ.)",
    stage: "รอทะเบียน",
    phase: "รอเล่มทะเบียน",
    ageDays: 12,
    dltRequestNo: "6512345",
    dltSubmittedAt: "2026-08-11",
    plateNo: null,
    bookNo: null,
  },
  {
    regId: "r2",
    saleId: "s2",
    vehicle: "NMAX · ดำ-เทา",
    frameNo: "MLEUE364111399878",
    customerName: "มานี รักษ์ดี",
    branch: "ฟ้าใหม่มอเตอร์ (สาขา 2)",
    stage: "รอทะเบียน",
    phase: "รอยื่นขนส่ง",
    ageDays: 5,
    dltRequestNo: null,
    dltSubmittedAt: null,
    plateNo: null,
    bookNo: null,
  },
  {
    regId: "r3",
    saleId: "s3",
    vehicle: "FINN · ฟ้า",
    frameNo: "MLHNC5310M5100001",
    customerName: "ประเสริฐ มั่งมี",
    branch: "ฟ้าใหม่มอเตอร์ (สนญ.)",
    stage: "ป้ายขาว",
    phase: "ได้ป้ายแล้ว",
    ageDays: 2,
    dltRequestNo: "6511001",
    dltSubmittedAt: "2026-08-15",
    plateNo: "1กก 1234 ปทุมธานี",
    bookNo: "ปท-00123",
  },
];

async function mockOk(): Promise<PlateActionResult> {
  return { ok: true };
}

export default function DevRegistrationPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">งานทะเบียน (preview)</h1>
        <p className="mt-1 text-ink-soft">FAM-1100 · sample data — คิวป้าย เรียงตามค้างนาน + บันทึกเลขคำขอ / รับเล่ม (mock)</p>
      </header>
      <RegistrationView queue={QUEUE} recordSubmissionAction={mockOk} recordPlateAction={mockOk} />
    </main>
  );
}
