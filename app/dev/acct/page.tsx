"use client";

import { AcctView } from "@/components/acct/AcctView";
import type { AcctActionResult, DocDetail, IssuableSale } from "@/lib/acct/documents";

/** พรีวิวหน้าบัญชี (FAM-1102) — sample data · /acct จริงต่อ DB (document + next_doc_no) */

const DOCS: DocDetail[] = [
  {
    id: "d1",
    docType: "RECEIPT",
    docNo: "FMG-RECEIPT-2569-00001",
    date: "2026-08-23T00:00:00Z",
    seller: { name: "บริษัท ฟ้าใหม่มอเตอร์ จำกัด", address: "1/6-7 หมู่ 2 ถ.ติวานนท์ ต.บ้านกลาง อ.เมืองปทุมธานี จ.ปทุมธานี 12000", taxId: "0135548009531", phone: "086-332-8509" },
    buyer: { name: "นายวีระ โปร่งนุช", address: "64/5 ซ.อนามัยงามเจริญ 31 แขวงท่าข้าม เขตบางขุนเทียน กรุงเทพฯ 10150", taxId: null, phone: null },
    base: 100467.29,
    vat: 7032.71,
    total: 107500,
    vehicle: "NMAX · ดำ-เทา",
    engineNo: "G3V5E-0865055",
    frameNo: "MH3SG576111027060",
    voided: false,
  },
  {
    id: "d2",
    docType: "RECEIPT",
    docNo: "FMG-RECEIPT-2569-00002",
    date: "2026-08-22T00:00:00Z",
    seller: { name: "บริษัท ฟ้าใหม่มอเตอร์ จำกัด", address: "1/6-7 หมู่ 2 ถ.ติวานนท์ ปทุมธานี 12000", taxId: "0135548009531", phone: "086-332-8509" },
    buyer: { name: "มานี รักษ์ดี", address: "99 หมู่ 2 พะเยา", taxId: "1560100000001", phone: "089-111-2222" },
    base: 43831.78,
    vat: 3068.22,
    total: 46900,
    vehicle: "FINN · ฟ้า",
    engineNo: "E34RE-057401",
    frameNo: "MLEUE364111399878",
    voided: false,
  },
];

const ISSUABLE: IssuableSale[] = [
  { saleId: "s3", customerName: "ประเสริฐ มั่งมี", vehicle: "XMAX 300 · ดำ", netPrice: 189000, soldAt: "2026-08-20T00:00:00Z", hasReceipt: false },
  { saleId: "s4", customerName: "วิภา สุขใจ", vehicle: "Aerox · น้ำเงิน", netPrice: 78000, soldAt: "2026-08-18T00:00:00Z", hasReceipt: false },
];

async function mockIssue(formData: FormData): Promise<AcctActionResult> {
  if (!String(formData.get("sale_id") ?? "").trim()) {
    return { ok: false, error: "เลือกการขายก่อน" };
  }
  return { ok: true, docNo: "FMG-RECEIPT-2569-00003" };
}

export default function DevAcctPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">บัญชี (preview)</h1>
        <p className="mt-1 text-ink-soft">FAM-1102 · sample data — list เอกสาร + ออกใบเสร็จ (mock) + พิมพ์</p>
      </header>
      <AcctView docs={DOCS} issuable={ISSUABLE} issueReceiptAction={mockIssue} />
    </main>
  );
}
