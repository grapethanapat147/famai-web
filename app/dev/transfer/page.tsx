"use client";

import { TransferView, type TransferBranch, type TransferUnit } from "@/components/transfer/TransferView";
import type { Transfer, TransferActionResult } from "@/lib/transfer/transfers";

/** พรีวิวหน้าโอนย้ายสาขา (transfer) — sample data · มุมมองสาขา b1 (FMG01) */

const MY_BRANCHES = ["b1"];

const TRANSFERS: Transfer[] = [
  {
    id: "1",
    unitId: "u1",
    vehicle: "NMAX สแตนดาร์ด · แดง",
    engineNo: "E3X8E-112097",
    fromBranchId: "b2",
    fromBranch: "Famai Motor",
    toBranchId: "b1",
    toBranch: "Famai Motor Group",
    status: "in_transit",
    requestedAt: "2026-08-11T09:00:00Z",
    receivedAt: null,
    note: "ลูกค้าจองที่ FMG01",
  }, // ขาเข้า → มีปุ่มรับ
  {
    id: "2",
    unitId: "u2",
    vehicle: "FINN ล้อแม็ก · ฟ้า",
    engineNo: "E34RE-057401",
    fromBranchId: "b1",
    fromBranch: "Famai Motor Group",
    toBranchId: "b3",
    toBranch: "Famai Chonburi",
    status: "in_transit",
    requestedAt: "2026-08-10T13:00:00Z",
    receivedAt: null,
    note: null,
  }, // ขาออก → มีปุ่มยกเลิก
  {
    id: "3",
    unitId: "u3",
    vehicle: "XMAX 300 · ดำ",
    engineNo: "EA71E-900233",
    fromBranchId: "b2",
    fromBranch: "Famai Motor",
    toBranchId: "b1",
    toBranch: "Famai Motor Group",
    status: "received",
    requestedAt: "2026-08-05T10:00:00Z",
    receivedAt: "2026-08-07T14:00:00Z",
    note: null,
  },
];

const UNITS: TransferUnit[] = [
  { id: "a1", vehicle: "Aerox · น้ำเงิน", engineNo: "E3R8E-771020", branchName: "Famai Motor Group" },
  { id: "a2", vehicle: "Grand Filano · ขาว", engineNo: "E3P4E-220145", branchName: "Famai Motor Group" },
];

const BRANCHES: TransferBranch[] = [
  { id: "b1", name: "Famai Motor Group" },
  { id: "b2", name: "Famai Motor" },
  { id: "b3", name: "Famai Chonburi" },
];

async function mockAction(): Promise<TransferActionResult> {
  return { ok: true };
}

export default function DevTransferPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">โอนย้ายสาขา (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — มุมมองสาขา FMG01 (ขาเข้ามีปุ่ม &ldquo;รับรถ&rdquo; · ขาออกมีปุ่ม &ldquo;ยกเลิก&rdquo;)</p>
      </header>
      <TransferView
        transfers={TRANSFERS}
        units={UNITS}
        branches={BRANCHES}
        myBranchIds={MY_BRANCHES}
        canManage
        requestAction={mockAction}
        receiveAction={mockAction}
        cancelAction={mockAction}
      />
    </main>
  );
}
