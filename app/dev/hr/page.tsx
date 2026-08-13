"use client";

import { HrView, type MyToday } from "@/components/hr/HrView";
import type { HrActionResult, LeaveRow } from "@/lib/hr/leave";

/** พรีวิวหน้าลงเวลาและลา (hr) — sample data · มุมมองผู้อนุมัติ */

const MY_TODAY: MyToday = { checkIn: "2026-08-12T01:20:00Z", checkOut: null, status: "ปกติ" };

const LEAVES: LeaveRow[] = [
  { id: "1", employeeId: "me", employeeName: "ฉัน", leaveType: "ลาพักร้อน", dateFrom: "2026-08-20", dateTo: "2026-08-22", status: "รออนุมัติ", reason: "เที่ยวกับครอบครัว", mine: true },
  { id: "2", employeeId: "me", employeeName: "ฉัน", leaveType: "ลาป่วย", dateFrom: "2026-08-05", dateTo: "2026-08-05", status: "อนุมัติ", reason: null, mine: true },
  { id: "3", employeeId: "e2", employeeName: "สมชาย ใจดี", leaveType: "ลากิจ", dateFrom: "2026-08-18", dateTo: "2026-08-18", status: "รออนุมัติ", reason: "ธุระราชการ", mine: false },
  { id: "4", employeeId: "e3", employeeName: "มานี รักษ์ดี", leaveType: "ลาป่วย", dateFrom: "2026-08-02", dateTo: "2026-08-03", status: "ปฏิเสธ", reason: "เอกสารไม่ครบ", mine: false },
];

async function mockClock(): Promise<HrActionResult> {
  return { ok: true };
}
async function mockForm(formData: FormData): Promise<HrActionResult> {
  const decision = String(formData.get("decision") ?? "");
  if (decision === "ปฏิเสธ" && !String(formData.get("reason") ?? "").trim()) {
    return { ok: false, error: "กรุณาระบุเหตุผลที่ไม่อนุมัติ" };
  }
  return { ok: true };
}

export default function DevHrPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ลงเวลาและลา (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — ลงเวลาเข้า/ออก · ขอลา · อนุมัติใบลาที่รออนุมัติ (คลิกใบที่รออนุมัติ)</p>
      </header>
      <HrView
        hasEmployee
        myToday={MY_TODAY}
        leaves={LEAVES}
        canApprove
        today="2026-08-12"
        clockInAction={mockClock}
        clockOutAction={mockClock}
        requestLeaveAction={mockForm}
        decideLeaveAction={mockForm}
      />
    </main>
  );
}
