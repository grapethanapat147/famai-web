"use client";

import { PartsView } from "@/components/parts/PartsView";
import type { FreebieRow, PartRow, PartsActionResult } from "@/lib/parts/stock";
import type { PartsTab } from "@/lib/parts/tabs";

/** พรีวิวหน้าอะไหล่และของแถม (parts) — sample data · แสดงทั้ง 3 แท็บแบบ admin */

const PARTS: PartRow[] = [
  { id: "1", code: "P-OIL10", name: "น้ำมันเครื่อง Yamalube 10W-40", qtyOnHand: 3, minQty: 8, price: 220, cost: 150 },
  { id: "2", code: "P-BRKF", name: "ผ้าเบรกหน้า NMAX", qtyOnHand: 42, minQty: 10, price: 380, cost: 240 },
  { id: "3", code: "P-PLUG", name: "หัวเทียน NGK", qtyOnHand: 6, minQty: 6, price: 95, cost: 55 },
  { id: "4", code: "P-BELT", name: "สายพาน Aerox", qtyOnHand: 15, minQty: 5, price: 850, cost: 610 },
];

const FREEBIES: FreebieRow[] = [
  { id: "f1", name: "หมวกกันน็อก", qtyOnHand: 4, minQty: 10, cost: 450 },
  { id: "f2", name: "ผ้าคลุมรถ", qtyOnHand: 30, minQty: 10, cost: 120 },
  { id: "f3", name: "น้ำมันเครื่อง (แถม)", qtyOnHand: 22, minQty: 8, cost: 180 },
];

const ALL_TABS: PartsTab[] = ["stock", "issue", "gifts"];

async function mockIssue(formData: FormData): Promise<PartsActionResult> {
  const id = String(formData.get("part_id"));
  const qty = Number(formData.get("qty"));
  const part = PARTS.find((p) => p.id === id);
  if (!part) {
    return { ok: false, error: "ไม่พบอะไหล่" };
  }
  if (qty > part.qtyOnHand) {
    return { ok: false, error: `สต๊อกไม่พอ — เหลือ ${part.qtyOnHand}` };
  }
  return { ok: true };
}

async function mockUpdateFreebie(): Promise<PartsActionResult> {
  return { ok: true };
}

async function mockOk(): Promise<PartsActionResult> {
  return { ok: true };
}

export default function DevPartsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">อะไหล่และของแถม (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — แสดงทั้ง 3 แท็บแบบ admin (R1: แก้ราคาของแถมในแท็บ &ldquo;ของแถม&rdquo;)</p>
      </header>
      <PartsView
        allowedTabs={ALL_TABS}
        parts={PARTS}
        freebies={FREEBIES}
        canSeeMoney
        canManageParts
        issuePartAction={mockIssue}
        updateFreebieAction={mockUpdateFreebie}
        addPartAction={mockOk}
        updatePartAction={mockOk}
        receivePartAction={mockOk}
      />
    </main>
  );
}
