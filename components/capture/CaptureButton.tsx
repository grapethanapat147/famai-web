"use client";

import { useState } from "react";
import { captureFilename } from "@/lib/capture/filename";
import { elementToPngDataUrl } from "@/lib/capture/image";

type Target = { el: HTMLElement; label: string };

/** พื้นที่ที่ mark ไว้ให้แคป (customer-safe) ในหน้าปัจจุบัน */
function scanTargets(): Target[] {
  if (typeof document === "undefined") {
    return [];
  }
  return [...document.querySelectorAll<HTMLElement>("[data-capture]")].map((el) => ({
    el,
    label: el.getAttribute("data-capture")?.trim() || "รูป",
  }));
}

function paperBg(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
  return v || "#ffffff";
}

/**
 * ปุ่มแคปหน้าจอเฉพาะจุด (FAM-1040) — โผล่ในโหมดลูกค้า
 * แคป element ที่ mark `data-capture` เป็น PNG → แชร์ (LINE ฯลฯ) ถ้าได้ ไม่งั้นดาวน์โหลด
 * โหลด html-to-image แบบ dynamic เฉพาะตอนกด (ไม่ถ่วง bundle)
 */
export function CaptureButton() {
  const [busy, setBusy] = useState(false);
  const [choices, setChoices] = useState<Target[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function capture(target: Target) {
    setChoices(null);
    setBusy(true);
    try {
      const dataUrl = await elementToPngDataUrl(target.el, { pixelRatio: 2, background: paperBg() });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], captureFilename(target.label, new Date()), { type: "image/png" });

      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: target.label });
        flash("แชร์รูปแล้ว");
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
        flash("บันทึกรูปแล้ว");
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        flash("แคปไม่สำเร็จ ลองใหม่อีกครั้ง");
      }
    } finally {
      setBusy(false);
    }
  }

  function onClick() {
    if (busy) {
      return;
    }
    const targets = scanTargets();
    if (targets.length === 0) {
      flash("หน้านี้ยังไม่มีพื้นที่ให้แคป");
      return;
    }
    if (targets.length === 1) {
      void capture(targets[0]);
      return;
    }
    setChoices(targets);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/40 px-2.5 py-0.5 text-xs font-medium disabled:opacity-60"
        title="แคปพื้นที่นี้เป็นรูปให้ลูกค้า"
      >
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6.5 4.5 7.6 3h4.8l1.1 1.5H16A1.5 1.5 0 0 1 17.5 6v8A1.5 1.5 0 0 1 16 15.5H4A1.5 1.5 0 0 1 2.5 14V6A1.5 1.5 0 0 1 4 4.5z" />
          <circle cx="10" cy="10" r="2.75" />
        </svg>
        {busy ? "กำลังแคป…" : "แคปเป็นรูป"}
      </button>

      {choices && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="ปิด" onClick={() => setChoices(null)} />
          <div className="absolute right-0 z-50 mt-1 min-w-[180px] rounded-[12px] border border-hairline bg-card p-1 shadow-[var(--sh-md)]">
            <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted">เลือกพื้นที่</p>
            {choices.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => void capture(t)}
                className="block w-full truncate rounded-[8px] px-2 py-1.5 text-left text-sm text-ink hover:bg-paper"
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      {toast && (
        <div className="absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-[8px] bg-dark px-2.5 py-1 text-xs text-card shadow-[var(--sh-md)]">
          {toast}
        </div>
      )}
    </div>
  );
}
