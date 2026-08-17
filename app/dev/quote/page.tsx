"use client";

import { QuoteView, type QuoteFinanceCo, type QuoteVehicle } from "@/components/quote/QuoteView";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";
import type { QuoteActionResult, SavedQuote } from "@/lib/quote/quotes";

/** พรีวิวหน้าใบเสนอราคา (quote) — sample data · /quote จริงต่อ DB ผ่าน RLS */

const QUOTES: SavedQuote[] = [
  {
    id: "1",
    docNo: "FMG-QUOTE-2569-00007",
    customerName: "สมชาย ใจดี",
    customerPhone: "081-234-5678",
    quoteDate: "2026-08-11",
    validUntil: "2026-08-25",
    optionCount: 2,
    createdByName: "เอ",
    options: [
      { slot: 1, variantId: "v2", price: 92000, financeId: "krungsri", down: 10000 },
      { slot: 2, variantId: "v4", price: 78000, financeId: "tisco", down: 8000 },
    ],
  },
  {
    id: "2",
    docNo: "FMG-QUOTE-2569-00006",
    customerName: "มานี รักษ์ดี",
    customerPhone: "",
    quoteDate: "2026-08-05",
    validUntil: "2026-08-10",
    optionCount: 1,
    createdByName: "บี",
    options: [{ slot: 1, variantId: "v1", price: 46900, financeId: "", down: 0 }],
  },
];

const VEHICLES: QuoteVehicle[] = [
  { variantId: "v1", code: "B6FU00", name: "FINN ล้อแม็ก", retail: 46900 },
  { variantId: "v2", code: "BTF200", name: "NMAX สแตนดาร์ด", retail: 92000 },
  { variantId: "v3", code: "DR9200", name: "XMAX 300", retail: 189000 },
  { variantId: "v4", code: "B3RE00", name: "Aerox", retail: 78000 },
];

const FINANCE: QuoteFinanceCo[] = [
  { id: "krungsri", name: "กรุงศรี ออโต้", ratePct: 1.35, rateTiers: { "12": 1.19, "24": 1.35, "48": 1.59 } },
  { id: "thanachart", name: "ธนชาต", ratePct: 1.48 },
  { id: "tisco", name: "ทิสโก้", ratePct: 1.42 },
];

const SELLER: QuoteSeller = {
  shopName: "Famai Motor Group",
  branchName: "ปากช่อง",
  address: "123 ถ.มิตรภาพ ต.ปากช่อง อ.ปากช่อง จ.นครราชสีมา 30130",
  phone: "044-123-456",
  taxId: "0305xxxxxxxxx",
  sellerName: "เอ พนักงานขาย",
};

async function mockCreate(formData: FormData): Promise<QuoteActionResult> {
  const name = String(formData.get("customer_name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "กรอกชื่อลูกค้า" };
  }
  return { ok: true, docNo: "FMG-QUOTE-2569-00008" };
}

async function mockUpdate(formData: FormData): Promise<QuoteActionResult> {
  const name = String(formData.get("customer_name") ?? "").trim();
  if (!name) {
    return { ok: false, error: "กรอกชื่อลูกค้า" };
  }
  return { ok: true, id: String(formData.get("quote_id") ?? ""), docNo: "FMG-QUOTE-2569-00007" };
}

async function mockDelete(): Promise<QuoteActionResult> {
  return { ok: true };
}

export default function DevQuotePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6 print:hidden">
        <h1 className="font-display text-[28px] font-semibold text-ink">ใบเสนอราคา (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — สร้างใหม่ หรือคลิกใบที่บันทึกไว้เพื่อดู/แก้/ทำสำเนา/ลบ</p>
      </header>
      <QuoteView
        quotes={QUOTES}
        vehicles={VEHICLES}
        financeCompanies={FINANCE}
        financeTerms={[12, 18, 24, 36, 48]}
        today="2026-08-12"
        seller={SELLER}
        canManage
        action={mockCreate}
        updateAction={mockUpdate}
        deleteAction={mockDelete}
      />
    </main>
  );
}
