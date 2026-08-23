"use client";

import { useState } from "react";
import { toBlob } from "html-to-image";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supportContextLines, supportFileName, type SupportInfo } from "@/lib/support/context";

type Shot = { url: string; blob: Blob; info: SupportInfo };

/**
 * ปุ่มแคปหน้าจอส่งซัพพอร์ต (FAM-1106) — แคปหน้าที่เห็น → พรีวิว → ดาวน์โหลด/คัดลอก/แชร์
 * แนบเฉพาะข้อมูลบริบทที่ไม่ลับ (หน้า/เวลา/จอ/เบราว์เซอร์) + ข้อความที่ผู้ใช้พิมพ์เอง
 */
export function SupportCapture() {
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<Shot | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function capture() {
    if (busy) {
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const blob = await toBlob(document.body, {
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
        pixelRatio: Math.min(2, window.devicePixelRatio || 1),
        cacheBust: true,
        // ข้ามปุ่มที่ทำเครื่องหมาย data-no-capture (ปุ่มนี้เอง)
        filter: (node) => !(node instanceof Element && node.getAttribute("data-no-capture") === "true"),
      });
      if (!blob) {
        throw new Error("no blob");
      }
      const info: SupportInfo = {
        path: window.location.pathname,
        atISO: new Date().toISOString(),
        width: window.innerWidth,
        height: window.innerHeight,
        ua: navigator.userAgent,
      };
      setNote("");
      setShot({ url: URL.createObjectURL(blob), blob, info });
    } catch {
      setMsg("แคปหน้าจอไม่สำเร็จ — ลองใหม่ หรือใช้แคปหน้าจอของเครื่อง");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    if (shot) {
      URL.revokeObjectURL(shot.url);
    }
    setShot(null);
    setMsg(null);
  }

  function download() {
    if (!shot) {
      return;
    }
    const a = document.createElement("a");
    a.href = shot.url;
    a.download = supportFileName(shot.info.path, shot.info.atISO);
    a.click();
    setMsg("ดาวน์โหลดรูปแล้ว — แนบส่งซัพพอร์ตได้เลย");
  }

  async function copyImage() {
    if (!shot) {
      return;
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": shot.blob })]);
      setMsg("คัดลอกรูปแล้ว — วางในแชท/LINE ได้เลย");
    } catch {
      setMsg("เบราว์เซอร์นี้คัดลอกรูปไม่ได้ — กดดาวน์โหลดแทน");
    }
  }

  async function copyContext() {
    if (!shot) {
      return;
    }
    try {
      await navigator.clipboard.writeText(supportContextLines({ ...shot.info, note }).join("\n"));
      setMsg("คัดลอกข้อมูลแล้ว");
    } catch {
      setMsg("คัดลอกไม่ได้");
    }
  }

  async function share() {
    if (!shot) {
      return;
    }
    const file = new File([shot.blob], supportFileName(shot.info.path, shot.info.atISO), { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "แจ้งปัญหา Famai", text: supportContextLines({ ...shot.info, note }).join("\n") });
      }
    } catch {
      /* ผู้ใช้ยกเลิก / ไม่รองรับ — เงียบไว้ */
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.canShare === "function";
  const btnOutline = "rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft transition-transform active:scale-[0.97] hover:text-ink";

  return (
    <>
      <button
        type="button"
        data-no-capture="true"
        onClick={capture}
        disabled={busy}
        aria-label="แคปหน้าจอส่งซัพพอร์ต"
        title="แคปหน้าจอส่งซัพพอร์ต"
        className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-card hover:text-ink disabled:opacity-50"
      >
        {busy ? (
          <svg viewBox="0 0 20 20" width="16" height="16" className="animate-spin" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path d="M10 2.5a7.5 7.5 0 1 0 7.5 7.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 6l1.2-2h5.6L14 6h2a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 4 6z" />
            <circle cx="10" cy="10.5" r="2.75" />
          </svg>
        )}
      </button>

      {shot && (
        <Modal open onClose={close} title="แคปหน้าจอส่งซัพพอร์ต" size="lg">
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob object URL, next/image ไม่รองรับ */}
            <img src={shot.url} alt="ภาพหน้าจอที่แคป" className="max-h-[45vh] w-full rounded-[10px] border border-hairline object-contain" />
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              อธิบายปัญหา (ถ้ามี)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น กดบันทึกแล้วขึ้น error"
                className="rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <div className="rounded-[8px] bg-paper-2 p-2.5 text-[11px] leading-relaxed text-muted">
              {supportContextLines({ ...shot.info, note }).map((l) => (
                <div key={l}>{l}</div>
              ))}
            </div>
            {msg && <StatusBadge variant="good">{msg}</StatusBadge>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={copyContext} className={btnOutline}>
                คัดลอกข้อมูล
              </button>
              <button type="button" onClick={copyImage} className={btnOutline}>
                คัดลอกรูป
              </button>
              {canShare && (
                <button type="button" onClick={share} className={btnOutline}>
                  แชร์
                </button>
              )}
              <button
                type="button"
                onClick={download}
                className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card transition-transform active:scale-[0.98]"
              >
                ดาวน์โหลดรูป
              </button>
            </div>
          </div>
        </Modal>
      )}

      {msg && !shot && (
        <div data-no-capture="true" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <StatusBadge variant="bad">{msg}</StatusBadge>
        </div>
      )}
    </>
  );
}
