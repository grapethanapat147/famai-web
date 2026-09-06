"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ACCENT_STYLE_ID,
  STORAGE_KEYS,
  TEXT_SIZES,
  accentOverrideCss,
  buildAccentPref,
  normalizeTextSize,
  type TextSizeId,
} from "@/lib/theme/display";
import { THEME_PRESETS } from "@/lib/theme/presets";

/**
 * แผง "ปรับการแสดงผล" ของเครื่องนี้ (FAM-1153) — ขนาดตัวอักษร 4 ระดับ + สีเน้นของตัวเอง
 *
 * เก็บใน localStorage ของเครื่อง ไม่กระทบคนอื่นและไม่แตะฐานข้อมูล
 * (ธีมของร้านที่แอดมินตั้งไว้ยังเป็นค่าตั้งต้น — ที่นี่แค่ทับเฉพาะเครื่องนี้ กด "ใช้สีของร้าน" เพื่อเลิกทับ)
 *
 * ตัวแผงต้องแขวนใต้ <body> ด้วย portal เพราะแถบบนมี backdrop-blur
 * ซึ่งทำให้ลูกที่ position:fixed ยึดกับแถบบนแทนหน้าจอ (บทเรียนจาก FAM-1142)
 */
export function DisplayMenu() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<TextSizeId>("md");
  const [accentHex, setAccentHex] = useState<string | null>(null);

  /** อ่านค่าที่เครื่องนี้เก็บไว้ตอนกดเปิด (ก่อนหน้านั้นสคริปต์ก่อน paint จัดการหน้าตาไปแล้ว) */
  function openMenu() {
    setSize(normalizeTextSize(localStorage.getItem(STORAGE_KEYS.textSize), localStorage.getItem(STORAGE_KEYS.legacyDensity)));
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.accent);
      setAccentHex(raw ? (JSON.parse(raw)?.hex ?? null) : null);
    } catch {
      setAccentHex(null);
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function applySize(next: TextSizeId) {
    setSize(next);
    localStorage.setItem(STORAGE_KEYS.textSize, next);
    localStorage.removeItem(STORAGE_KEYS.legacyDensity); // ของเดิมไม่ใช้แล้ว
    const el = document.documentElement;
    if (next === "md") {
      el.removeAttribute("data-text-size");
    } else {
      el.setAttribute("data-text-size", next);
    }
  }

  function applyAccent(hex: string | null) {
    const existing = document.getElementById(ACCENT_STYLE_ID);
    existing?.remove();
    if (hex === null) {
      localStorage.removeItem(STORAGE_KEYS.accent);
      setAccentHex(null);
      return;
    }
    const pref = buildAccentPref(hex);
    if (!pref) {
      return;
    }
    localStorage.setItem(STORAGE_KEYS.accent, JSON.stringify(pref));
    const style = document.createElement("style");
    style.id = ACCENT_STYLE_ID;
    style.textContent = accentOverrideCss(pref);
    document.head.appendChild(style);
    setAccentHex(hex);
  }

  const btn = "grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-card hover:text-ink";

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={btn}
        aria-label="ปรับการแสดงผล"
        title="ปรับการแสดงผล (ขนาดตัวอักษร · สี)"
        aria-expanded={open}
      >
        {/* Aa — สัญลักษณ์สากลของการปรับขนาดตัวอักษร */}
        <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden>
          <text x="0" y="15.5" fontSize="13.5" fontWeight="700" fontFamily="inherit">A</text>
          <text x="10.5" y="15.5" fontSize="9.5" fontWeight="600" fontFamily="inherit">a</text>
        </svg>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <button type="button" aria-label="ปิด" className="absolute inset-0" onClick={() => setOpen(false)} />
            <div
              role="dialog"
              aria-label="ปรับการแสดงผล"
              className="absolute right-3 top-[56px] w-[268px] rounded-[14px] bg-card p-4 shadow-[var(--sh-lg)] sm:right-4"
            >
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">ขนาดตัวอักษร</p>
              <div className="mb-4 flex gap-1.5">
                {TEXT_SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => applySize(s.id)}
                    aria-pressed={size === s.id}
                    className={`flex-1 rounded-[10px] border px-1 py-2 text-center transition-colors ${
                      size === s.id ? "border-accent bg-[var(--accent-wash)] text-accent-deep" : "border-hairline text-ink-soft"
                    }`}
                  >
                    <span className="block leading-none" style={{ fontSize: `${s.rootPx - 4}px` }}>
                      Aa
                    </span>
                    <span className="mt-1 block text-[10px]">{s.label}</span>
                  </button>
                ))}
              </div>

              <p className="mb-2 text-xs uppercase tracking-wide text-muted">สีเน้น (เฉพาะเครื่องนี้)</p>
              <div className="flex flex-wrap gap-2">
                {THEME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyAccent(p.accent)}
                    title={p.name}
                    aria-label={p.name}
                    aria-pressed={accentHex?.toLowerCase() === p.accent.toLowerCase()}
                    className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-[var(--card)] transition-shadow ${
                      accentHex?.toLowerCase() === p.accent.toLowerCase() ? "ring-2 ring-ink" : "ring-1 ring-hairline"
                    }`}
                    style={{ background: p.accent }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => applyAccent(null)}
                className="mt-3 w-full rounded-[10px] border border-hairline py-2 text-sm text-ink-soft"
              >
                ใช้สีของร้าน
              </button>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                ค่าที่ตั้งที่นี่เก็บไว้ในเครื่องนี้เท่านั้น ไม่กระทบเพื่อนร่วมงาน
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
