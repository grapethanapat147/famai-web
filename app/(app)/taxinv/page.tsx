import { AccountingPage } from "@/app/(app)/acct/page";

export const metadata = { title: "ใบกำกับภาษี — Famai Motor Group" };

/**
 * หน้าใบกำกับภาษี (FAM-1112) — ใช้ข้อมูล/สิทธิ์ชุดเดียวกับหน้าบัญชี
 * ต่างแค่เปิดมาที่แท็บ "ใบกำกับภาษี" เลย (ไม่ต้องกดกรองเอง)
 */
export default async function TaxInvoicePage() {
  return <AccountingPage initialDocType="TAXINV" />;
}
