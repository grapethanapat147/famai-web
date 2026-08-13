"use client";

import { AttendView } from "@/components/attend/AttendView";
import type { AttendRow } from "@/lib/attend/attendance";

/** พรีวิวหน้าภาพรวมการเข้างาน (attend) — sample data · /attend จริงต่อ DB ผ่าน RLS (read-only) */

const ROWS: AttendRow[] = [
  { employeeId: "1", name: "สมชาย ใจดี", position: "เซลล์", status: "present", checkIn: "2026-08-12T01:20:00Z", lateMinutes: null, otMinutes: 0 },
  { employeeId: "2", name: "มานี รักษ์ดี", position: "บัญชี", status: "late", checkIn: "2026-08-12T02:05:00Z", lateMinutes: 35, otMinutes: 0 },
  { employeeId: "3", name: "วิภา สุขใจ", position: "สต๊อก", status: "leave", checkIn: null, lateMinutes: null, otMinutes: 0 },
  { employeeId: "4", name: "ประเสริฐ มั่งมี", position: "ช่าง", status: "present", checkIn: "2026-08-12T01:10:00Z", lateMinutes: null, otMinutes: 90 },
  { employeeId: "5", name: "วิชัย ช่างเก่ง", position: "ช่าง", status: "pending", checkIn: null, lateMinutes: null, otMinutes: 0 },
  { employeeId: "6", name: "อรุณี ขยันงาน", position: "เซลล์", status: "absent", checkIn: null, lateMinutes: null, otMinutes: 0 },
];

export default function DevAttendPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ภาพรวมการเข้างาน (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — ใครมาแล้ว/สาย/ลา/ขาด/ยังไม่มา · กดสถานะเพื่อกรอง</p>
      </header>
      <AttendView rows={ROWS} date="2026-08-12" />
    </main>
  );
}
