"use client";

import { ArView } from "@/components/ar/ArView";
import type { ArActionResult, Receivable } from "@/lib/ar/receivables";

/** พรีวิวหน้าเงินค้างรับ (ar) — sample data · /ar จริงต่อ DB ผ่าน RLS */

const RECEIVABLES: Receivable[] = [
  {
    id: "1",
    kind: "finance",
    payerName: "กรุงศรี ออโต้",
    vehicle: "NMAX · แดง",
    amountDue: 84000,
    amountPaid: 0,
    balance: 84000,
    dueAt: "2026-08-05",
    settledAt: null,
  }, // เกินกำหนด
  {
    id: "2",
    kind: "finance",
    payerName: "ธนชาต",
    vehicle: "XMAX 300 · ดำ",
    amountDue: 170000,
    amountPaid: 0,
    balance: 170000,
    dueAt: "2026-08-25",
    settledAt: null,
  },
  {
    id: "3",
    kind: "customer",
    payerName: "สมชาย ใจดี",
    vehicle: "FINN · ฟ้า",
    amountDue: 46900,
    amountPaid: 20000,
    balance: 26900,
    dueAt: "2026-08-18",
    settledAt: null,
  },
  {
    id: "4",
    kind: "customer",
    payerName: "มานี รักษ์ดี",
    vehicle: "Aerox · น้ำเงิน",
    amountDue: 78000,
    amountPaid: 78000,
    balance: 0,
    dueAt: "2026-08-01",
    settledAt: "2026-08-03",
  }, // ชำระครบ
];

async function mockPay(formData: FormData): Promise<ArActionResult> {
  const amt = Number(formData.get("amount"));
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, error: "จำนวนเงินไม่ถูกต้อง" };
  }
  return { ok: true };
}

export default function DevArPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">เงินค้างรับ (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — กดรายการที่ยังค้างเพื่อลงรับเงิน (เกินกำหนด = แดง)</p>
      </header>
      <ArView receivables={RECEIVABLES} canManage canSeeMoney today="2026-08-12" action={mockPay} />
    </main>
  );
}
