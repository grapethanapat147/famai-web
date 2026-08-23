"use client";

import { useState } from "react";
import { HrView, type MyToday } from "@/components/hr/HrView";
import type { HrActionResult, LeaveRow } from "@/lib/hr/leave";

/** พรีวิวหน้าลงเวลาและลา (hr) — sample data · มุมมองผู้อนุมัติ */

const MY_TODAY: MyToday = { checkIn: null, checkOut: null, status: null };

const LEAVES: LeaveRow[] = [
  { id: "1", employeeId: "me", employeeName: "ฉัน", leaveType: "ลาพักร้อน", dateFrom: "2026-08-20", dateTo: "2026-08-22", status: "รออนุมัติ", reason: "เที่ยวกับครอบครัว", mine: true },
  { id: "2", employeeId: "me", employeeName: "ฉัน", leaveType: "ลาป่วย", dateFrom: "2026-08-05", dateTo: "2026-08-05", status: "อนุมัติ", reason: null, mine: true },
  { id: "3", employeeId: "e2", employeeName: "สมชาย ใจดี", leaveType: "ลากิจ", dateFrom: "2026-08-18", dateTo: "2026-08-18", status: "รออนุมัติ", reason: "ธุระราชการ", mine: false },
  { id: "4", employeeId: "e3", employeeName: "มานี รักษ์ดี", leaveType: "ลาป่วย", dateFrom: "2026-08-02", dateTo: "2026-08-03", status: "ปฏิเสธ", reason: "เอกสารไม่ครบ", mine: false },
];

async function mockClock(): Promise<HrActionResult> {
  return { ok: true };
}
async function mockClockIn(formData: FormData): Promise<HrActionResult> {
  // จำลอง geofence: ถ้ามีพิกัดถือว่าผ่าน (ของจริงเซิร์ฟเวอร์เช็กระยะ)
  if (!formData.get("lat")) {
    return { ok: false, error: "ต้องเปิดตำแหน่ง (GPS) เพื่อลงเวลา" };
  }
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
  const [linked, setLinked] = useState(true);
  const mockLink: () => Promise<HrActionResult> = async () => {
    setLinked(true); // จำลอง revalidate: หลังเชื่อมสำเร็จ การ์ดเปลี่ยนเป็นลงเวลาได้
    return { ok: true, message: "เชื่อมข้อมูลพนักงานแล้ว" };
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ลงเวลาและลา (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — ลงเวลาเข้า/ออก · ขอลา · อนุมัติใบลา · FAM-1086 เชื่อมบัญชีกับข้อมูลพนักงาน</p>
        <button
          type="button"
          onClick={() => setLinked((v) => !v)}
          className="mt-3 rounded-full border border-hairline px-3 py-1.5 text-sm text-ink-soft"
        >
          จำลองสถานะ: {linked ? "ผูกพนักงานแล้ว" : "ยังไม่ผูกพนักงาน"} (กดสลับ)
        </button>
      </header>
      <HrView
        hasEmployee={linked}
        myToday={linked ? MY_TODAY : null}
        leaves={LEAVES}
        canApprove
        today="2026-08-12"
        geofence={{ radiusM: 150 }}
        requireSelfie
        employeeId="dev-emp"
        clockInAction={mockClockIn}
        clockOutAction={mockClock}
        linkEmployeeAction={mockLink}
        requestLeaveAction={mockForm}
        decideLeaveAction={mockForm}
      />
    </main>
  );
}
