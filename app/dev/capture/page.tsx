"use client";

import { useState } from "react";
import { CaptureButton } from "@/components/capture/CaptureButton";
import { elementToPngDataUrl } from "@/lib/capture/image";

/** พรีวิว/ทดสอบปุ่มแคปเป็นรูป (FAM-1040) — sample card + probe ยืนยัน pipeline จริง (ไม่ต้องล็อกอิน) */
export default function DevCapturePage() {
  const [probe, setProbe] = useState<string>("");
  const [img, setImg] = useState<string>("");

  async function runProbe() {
    const el = document.querySelector<HTMLElement>('[data-capture="ใบเทียบราคา (ตัวอย่าง)"]');
    if (!el) {
      setProbe("no target");
      return;
    }
    try {
      setProbe("กำลังแคป…");
      const t0 = performance.now();
      const dataUrl = await elementToPngDataUrl(el, { pixelRatio: 2, background: "#ffffff" });
      const ms = Math.round(performance.now() - t0);
      const im = new Image();
      im.onload = () => setProbe(`bytes:${dataUrl.length} ${im.naturalWidth}x${im.naturalHeight} ${ms}ms`);
      im.src = dataUrl;
      setImg(dataUrl);
    } catch (err) {
      setProbe(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ปุ่มแคปเป็นรูป (preview)</h1>
        <p className="mt-1 text-ink-soft">การ์ดตัวอย่างมี data-capture · ปุ่มจริงอยู่มุมขวา · โหมดลูกค้าจริงปุ่มอยู่แถบบน</p>
      </header>

      {/* แถบจำลองโหมดลูกค้า */}
      <div className="mb-6 flex items-center justify-between gap-3 rounded-[8px] border border-hairline bg-[var(--accent-wash)] px-4 py-2 text-sm text-accent-deep">
        <span>โหมดลูกค้า (จำลอง)</span>
        <CaptureButton />
      </div>

      {/* การ์ดตัวอย่างที่จะถูกแคป */}
      <div
        data-capture="ใบเทียบราคา (ตัวอย่าง)"
        className="mb-6 rounded-[12px] bg-card p-5 shadow-[var(--sh-sm)]"
      >
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">ใบเทียบราคา · ยามาฮ่า</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-[8px] border border-hairline p-3">
            <p className="font-medium text-ink">NMAX 155</p>
            <p className="text-ink-soft">ราคา 89,900 บาท</p>
            <p className="text-ink-soft">ดาวน์ 9,000 · ผ่อน 2,650 ×36</p>
          </div>
          <div className="rounded-[8px] border border-hairline p-3">
            <p className="font-medium text-ink">Aerox 155</p>
            <p className="text-ink-soft">ราคา 74,300 บาท</p>
            <p className="text-ink-soft">ดาวน์ 7,500 · ผ่อน 2,180 ×36</p>
          </div>
        </div>
        <span className="mt-3 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-card">โปรเดือนนี้</span>
      </div>

      <button
        type="button"
        onClick={runProbe}
        className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft"
      >
        ทดสอบ toPng (probe)
      </button>
      {probe && <p data-testid="probe" className="mt-3 font-mono text-xs text-ink">{probe}</p>}
      {img && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="ผลลัพธ์แคป" className="mt-3 w-full max-w-sm rounded-[8px] border border-hairline" />
      )}
    </main>
  );
}
