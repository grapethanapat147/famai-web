"use client";

import { useState } from "react";
import { WholesaleView } from "@/components/wholesale/WholesaleView";
import {
  validateWholesaleCompany,
  validateWholesaleOrder,
  type WholesaleActionResult,
  type WholesaleCompany,
  type WholesaleLineInput,
  type WholesaleOrderRow,
  type WholesaleUnit,
} from "@/lib/wholesale/wholesale";

/** พรีวิวหน้าขายส่ง B2B (wholesale) — sample data · ใช้ validate ตัวจริงให้ error ตรงกับของจริง */

const COMPANIES: WholesaleCompany[] = [
  { id: "w1", name: "ร้านมอเตอร์ไซค์รังสิต", taxId: "0105556789012", address: "รังสิต ปทุมธานี", phone: "021234567", contactName: "คุณเอก", creditDays: 30, isActive: true },
  { id: "w2", name: "ลำลูกกามอเตอร์", taxId: null, address: null, phone: "0899999999", contactName: null, creditDays: 0, isActive: true },
  { id: "w3", name: "ร้านเก่า (ปิดใช้)", taxId: null, address: null, phone: null, contactName: null, creditDays: 0, isActive: false },
];

const UNITS: WholesaleUnit[] = [
  { id: "u1", branchId: "b1", branchName: "ปทุมธานี", model: "NMAX 155", color: "แดง", engineNo: "E-1001", frameNo: "MH3RG5710N100001", cost: 50_000, retail: 62_000 },
  { id: "u2", branchId: "b1", branchName: "ปทุมธานี", model: "Aerox 155", color: "น้ำเงิน", engineNo: "E-1002", frameNo: "MH3RG5710N100002", cost: 48_000, retail: 59_000 },
  { id: "u3", branchId: "b1", branchName: "ปทุมธานี", model: "XMAX 300", color: "ดำ", engineNo: "E-1003", frameNo: "MH3RG5710N100003", cost: 130_000, retail: 158_000 },
  { id: "u4", branchId: "b2", branchName: "รังสิต", model: "NMAX 155", color: "เทา", engineNo: "E-2001", frameNo: "MH3RG5710N200001", cost: 50_000, retail: 62_000 },
];

const ORDERS: WholesaleOrderRow[] = [
  { id: "o1", orderNo: "FMG-WHOLESALE-2569-00002", companyName: "ร้านมอเตอร์ไซค์รังสิต", soldAt: "2026-09-01", units: 3, total: 171_000, gross: 15_000, salespersonName: "สมชาย ใจดี", taxInvoiceNo: "FMG-TAXINV-2569-00007", voided: false },
  { id: "o2", orderNo: "FMG-WHOLESALE-2569-00001", companyName: "ลำลูกกามอเตอร์", soldAt: "2026-08-25", units: 1, total: 59_000, gross: 11_000, salespersonName: "มานี รักษ์ดี", taxInvoiceNo: null, voided: false },
];

async function mockDoc(): Promise<WholesaleActionResult> {
  return { ok: true, message: "ออกใบกำกับแล้ว — FMG-TAXINV-2569-00010" };
}

export default function DevWholesalePage() {
  const [orders, setOrders] = useState(ORDERS);
  const [companies, setCompanies] = useState(COMPANIES);

  const mockSell: (formData: FormData) => Promise<WholesaleActionResult> = async (formData) => {
    const lines = JSON.parse(String(formData.get("lines") ?? "[]")) as WholesaleLineInput[];
    const parsed = validateWholesaleOrder({ companyId: String(formData.get("company_id") ?? ""), lines }, UNITS);
    if (!parsed.ok) {
      return parsed;
    }
    const total = parsed.value.lines.reduce((s, l) => s + l.price, 0);
    const no = `FMG-WHOLESALE-2569-${String(orders.length + 3).padStart(5, "0")}`;
    setOrders((prev) => [
      {
        id: no,
        orderNo: no,
        companyName: companies.find((c) => c.id === parsed.value.companyId)?.name ?? "—",
        soldAt: "2026-09-02",
        units: parsed.value.lines.length,
        total,
        gross: null,
        salespersonName: "ฉัน",
        taxInvoiceNo: null,
        voided: false,
      },
      ...prev,
    ]);
    return { ok: true, orderNo: no, message: `บันทึกขายส่งแล้ว — ${no}` };
  };

  const mockVoid: (formData: FormData) => Promise<WholesaleActionResult> = async (formData) => {
    const id = String(formData.get("order_id") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();
    if (reason === "") {
      return { ok: false, error: "ระบุเหตุผลที่ยกเลิก" };
    }
    const o = orders.find((x) => x.id === id);
    if (o?.taxInvoiceNo) {
      return { ok: false, error: "บิลนี้ออกเอกสารไปแล้ว — ยกเลิกเอกสารก่อนจึงยกเลิกบิลได้" };
    }
    setOrders((prev) => prev.map((x) => (x.id === id ? { ...x, voided: true } : x)));
    return { ok: true, message: `ยกเลิก ${o?.orderNo} แล้ว — คืนรถเข้าสต๊อก ${o?.units ?? 0} คัน` };
  };

  const mockCompany: (formData: FormData) => Promise<WholesaleActionResult> = async (formData) => {
    const parsed = validateWholesaleCompany({
      name: String(formData.get("name") ?? ""),
      taxId: String(formData.get("tax_id") ?? ""),
      address: String(formData.get("address") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      contactName: String(formData.get("contact_name") ?? ""),
      creditDays: String(formData.get("credit_days") ?? ""),
    });
    if (!parsed.ok) {
      return parsed;
    }
    const id = String(formData.get("company_id") ?? "");
    const next: WholesaleCompany = {
      id: id || `new-${companies.length + 1}`,
      isActive: String(formData.get("is_active") ?? "true") !== "false",
      ...parsed.value,
    };
    setCompanies((prev) => (id ? prev.map((c) => (c.id === id ? next : c)) : [...prev, next]));
    return { ok: true, message: id ? "บันทึกร้านค้าแล้ว" : "เพิ่มร้านค้าแล้ว" };
  };

  return (
    <WholesaleView
      orders={orders}
      companies={companies}
      units={UNITS}
      canSell
      canManageCompanies
      canSeeMoney
      sellAction={mockSell}
      companyAction={mockCompany}
      docAction={mockDoc}
      voidAction={mockVoid}
    />
  );
}
