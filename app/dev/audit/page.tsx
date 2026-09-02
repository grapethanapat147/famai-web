"use client";

import { AuditView } from "@/components/audit/AuditView";
import type { AuditRow } from "@/lib/audit/log";

/** พรีวิวหน้าประวัติการแก้ไข (audit) — sample data */

const ROWS: AuditRow[] = [
  {
    id: 5, at: "2026-09-02T09:12:00Z", actorName: "สมชาย ใจดี", tableName: "sale", rowId: "s-1042", action: "UPDATE",
    before: { net_price: 62000, discount: 0 }, after: { net_price: 58000, discount: 4000 },
  },
  {
    id: 4, at: "2026-09-02T08:40:00Z", actorName: "มานี รักษ์ดี", tableName: "registration", rowId: "r-880", action: "UPDATE",
    before: { stage: "รอทะเบียน", plate_no: null }, after: { stage: "ป้ายขาว", plate_no: "1กก 1234" },
  },
  {
    id: 3, at: "2026-09-01T16:05:00Z", actorName: "สมชาย ใจดี", tableName: "receivable", rowId: "ar-77", action: "INSERT",
    before: null, after: { kind: "finance", amount_due: 55000, due_at: "2026-10-01" },
  },
  {
    id: 2, at: "2026-08-30T11:20:00Z", actorName: "ประเสริฐ มั่งมี", tableName: "app_user", rowId: "u-9", action: "INSERT",
    before: null, after: { full_name: "พนักงานใหม่", is_active: true },
  },
  {
    id: 1, at: "2026-08-28T14:02:00Z", actorName: "ระบบ", tableName: "motorcycle_unit", rowId: "u-231", action: "DELETE",
    before: { engine_no: "E-9911", status: "available" }, after: null,
  },
];

export default function DevAuditPage() {
  return <AuditView rows={ROWS} limit={300} />;
}
