"use client";

import { SupportCapture } from "@/components/support/SupportCapture";

/** พรีวิวปุ่มแคปหน้าจอส่งซัพพอร์ต (FAM-1106) — ของจริงอยู่บนแถบบน (TopBar) ทุกหน้า */
export default function DevSupportPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-semibold text-ink">แคปหน้าจอ (preview)</h1>
          <p className="mt-1 text-ink-soft">FAM-1106 · กดปุ่มกล้อง → แคปหน้าที่เห็น → พรีวิว/ดาวน์โหลด/คัดลอก/แชร์</p>
        </div>
        <SupportCapture />
      </header>

      <div className="flex flex-col gap-4">
        <div className="rounded-[12px] bg-card p-5 shadow-[var(--sh-sm)]">
          <h2 className="mb-2 font-display font-semibold text-ink">เนื้อหาตัวอย่างสำหรับแคป</h2>
          <p className="text-ink-soft">ปุ่มกล้องนี้อยู่บนแถบบนของทุกหน้า (ข้างปุ่มธีม) — พนักงานกดเพื่อแคปหน้าจอที่มีปัญหาแล้วส่งให้ทีมช่วยดู</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
            <p className="text-[11px] uppercase tracking-wider text-muted">ยอดขายเดือนนี้</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">18 คัน</p>
          </div>
          <div className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
            <p className="text-[11px] uppercase tracking-wider text-muted">มูลค่าสต๊อก</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">739,800 ฿</p>
          </div>
        </div>
      </div>
    </main>
  );
}
