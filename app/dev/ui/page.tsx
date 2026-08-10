import { UiKitDemo } from "@/components/dev/UiKitDemo";

/** โชว์เคสคอมโพเนนต์ (FAM-1003) — หน้านี้ไว้ตรวจ/อ้างอิงระหว่างพัฒนา ไม่อยู่ในเมนู */
export const metadata = { title: "UI Kit — Famai (dev)" };

export default function UiKitPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">UI Kit</h1>
        <p className="mt-1 text-ink-soft">คอมโพเนนต์หลัก (FAM-1003) ตาม docs/04 design system</p>
      </header>
      <UiKitDemo />
    </main>
  );
}
