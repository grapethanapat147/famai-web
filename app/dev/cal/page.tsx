"use client";

import { CalendarView } from "@/components/calendar/CalendarView";
import type { CalEvent } from "@/lib/calendar/events";

/** พรีวิวหน้าปฏิทิน (cal) — sample data · /cal จริงรวมจาก DB (read-only) */

const EVENTS: CalEvent[] = [
  { date: "2026-08-03", type: "company", title: "ประชุมทีมขายประจำเดือน", subtitle: "ประชุม" },
  { date: "2026-08-12", type: "company", title: "อบรมพนักงานใหม่", subtitle: "อีเวนท์" },
  { date: "2026-08-12", type: "reg", title: "ครบกำหนดจดทะเบียน", subtitle: "1กก 1234" },
  { date: "2026-08-12", type: "service", title: "เช็กระยะ 1,000 กม.", subtitle: "สมชาย ใจดี" },
  { date: "2026-08-18", type: "leave", title: "สมชาย ใจดี — ลา", subtitle: "ลากิจ" },
  { date: "2026-08-20", type: "leave", title: "มานี รักษ์ดี — ลา", subtitle: "ลาพักร้อน" },
  { date: "2026-08-21", type: "leave", title: "มานี รักษ์ดี — ลา", subtitle: "ลาพักร้อน" },
  { date: "2026-08-22", type: "leave", title: "มานี รักษ์ดี — ลา", subtitle: "ลาพักร้อน" },
  { date: "2026-08-25", type: "reg", title: "ครบกำหนดจดทะเบียน", subtitle: "รอทะเบียน" },
  { date: "2026-08-28", type: "service", title: "เช็กระยะ 4,000 กม.", subtitle: "วิภา สุขใจ" },
  { date: "2026-08-31", type: "company", title: "ปิดยอดสิ้นเดือน", subtitle: "อื่นๆ" },
];

export default function DevCalPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ปฏิทิน (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — บริษัท / ลา / จดทะเบียน / เช็กระยะ · กดวันเพื่อดูรายละเอียด</p>
      </header>
      <CalendarView events={EVENTS} month="2026-08" today="2026-08-12" />
    </main>
  );
}
