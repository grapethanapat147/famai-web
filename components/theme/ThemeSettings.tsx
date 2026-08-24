"use client";

import { useRef, useState, type CSSProperties } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { deriveAccent, isValidHex } from "@/lib/theme/derive";
import { THEME_PRESETS, findPresetByAccent } from "@/lib/theme/presets";
import { FONT_PAIRS, customFontUrl, fontFormat, findFontPair, DEFAULT_FONT_PAIR } from "@/lib/theme/fonts";
import type { ThemeActionResult } from "@/lib/theme/config";

const FONT_EXTS = ["woff2", "ttf", "otf"];

/** หน้าตั้งค่าธีมของร้าน (FAM-1038/1039) — สีเน้น + ฟอนต์ (คู่สำเร็จ/อัปโหลดเอง) + พรีวิวสด → บันทึก app_setting (admin) */
export function ThemeSettings({
  currentAccent,
  currentFontPair = DEFAULT_FONT_PAIR,
  currentCustomFont = "",
  canEdit,
  action,
}: {
  currentAccent: string;
  currentFontPair?: string;
  currentCustomFont?: string;
  canEdit: boolean;
  action?: (formData: FormData) => Promise<ThemeActionResult>;
}) {
  const [selected, setSelected] = useState(currentAccent);
  const [fontPair, setFontPair] = useState(currentFontPair);
  const [customFont, setCustomFont] = useState(currentCustomFont);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const valid = isValidHex(selected);
  const d = deriveAccent(valid ? selected : currentAccent, "light");
  const activePreset = findPresetByAccent(selected);
  const pair = findFontPair(fontPair) ?? findFontPair(DEFAULT_FONT_PAIR)!;
  const dirty =
    selected.toLowerCase() !== currentAccent.toLowerCase() ||
    fontPair !== currentFontPair ||
    customFont !== currentCustomFont;

  function touched() {
    setSaved(false);
    setError(null);
  }

  function pick(hex: string) {
    setSelected(hex);
    touched();
  }

  async function onPickFont(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploading) {
      return;
    }
    const ext = file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase();
    if (!FONT_EXTS.includes(ext)) {
      setUploadError("รองรับเฉพาะ .woff2 .ttf .otf");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createBrowserSupabase();
      const stamp = Date.now();
      const path = `custom/${stamp}.${ext}`;
      const contentType = ext === "ttf" ? "font/ttf" : ext === "otf" ? "font/otf" : "font/woff2";
      const { error: upErr } = await supabase.storage.from("brand-font").upload(path, file, { contentType, upsert: true });
      if (upErr) {
        throw new Error(upErr.message);
      }
      setCustomFont(path);
      touched();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "อัปโหลดฟอนต์ไม่สำเร็จ");
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  function clearFont() {
    setCustomFont("");
    touched();
  }

  async function save() {
    if (!action || !valid || busy || !dirty) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("accent", selected);
    fd.set("font_pair", fontPair);
    fd.set("custom_font", customFont);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setSaved(true);
    } else {
      setError(res.error);
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const customActive = Boolean(customFont && supabaseUrl);
  const previewDisplay = customActive ? `'fm-custom-preview', ${pair.display}` : pair.display;
  const previewVars = {
    "--accent": d.accent,
    "--accent-hover": d.hover,
    "--accent-deep": d.deep,
    "--accent-wash": d.wash,
    "--f-display": previewDisplay,
    "--f-body": pair.body,
  } as CSSProperties;

  return (
    <section className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
      {/* @font-face พรีวิวฟอนต์อัปโหลด (client) — แยก family กันชนกับ fm-custom ตัวจริงที่ ThemeStyle ฉีด */}
      {customActive && (
        <style
          dangerouslySetInnerHTML={{
            __html: `@font-face{font-family:'fm-custom-preview';src:url('${customFontUrl(supabaseUrl, customFont)}') format('${fontFormat(customFont)}');font-display:swap;}`,
          }}
        />
      )}

      <h2 className="mb-1 font-display font-semibold text-ink">รูปลักษณ์ (ธีมของร้าน)</h2>
      <p className="mb-4 text-sm text-muted">
        สีเน้นและแบบอักษรของทั้งร้าน — {canEdit ? "เลือกแล้วกดบันทึก มีผลทุกเครื่อง" : "เฉพาะผู้ดูแลระบบ (admin) แก้ได้"}
      </p>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">ธีมสำเร็จรูป (สีเน้น)</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {THEME_PRESETS.map((p) => {
          const on = selected.toLowerCase() === p.accent.toLowerCase();
          return (
            <button
              key={p.id}
              type="button"
              disabled={!canEdit}
              onClick={() => pick(p.accent)}
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-[12px] border px-3 py-2 text-sm transition-colors disabled:opacity-60 ${
                on ? "border-ink bg-card" : "border-hairline bg-card"
              }`}
            >
              <span className="h-5 w-5 rounded-full" style={{ background: p.accent }} aria-hidden />
              <span className={on ? "text-ink" : "text-ink-soft"}>{p.name}</span>
            </button>
          );
        })}
      </div>

      {canEdit && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted">สีเอง</span>
          <input
            type="color"
            value={valid ? selected : "#E60012"}
            onChange={(e) => pick(e.target.value.toUpperCase())}
            className="h-9 w-12 cursor-pointer rounded-[6px] border border-hairline bg-card"
            aria-label="เลือกสีเน้น"
          />
          <input
            value={selected}
            onChange={(e) => pick(e.target.value)}
            placeholder="#RRGGBB"
            className="w-28 rounded-[8px] border border-hairline bg-card px-3 py-2 font-mono text-base text-ink outline-none focus:border-ink"
          />
          {!valid && <span className="text-xs text-accent">รูปแบบต้องเป็น #RRGGBB</span>}
          {valid && activePreset && <span className="text-xs text-muted">= {activePreset.name}</span>}
        </div>
      )}

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">แบบอักษร</p>
      <div className="mb-3 flex flex-col gap-2">
        {FONT_PAIRS.map((f) => {
          const on = fontPair === f.id;
          return (
            <button
              key={f.id}
              type="button"
              disabled={!canEdit}
              onClick={() => {
                setFontPair(f.id);
                touched();
              }}
              aria-pressed={on}
              className={`flex items-start gap-3 rounded-[12px] border px-3 py-2 text-left transition-colors disabled:opacity-60 ${
                on ? "border-ink bg-card" : "border-hairline bg-card"
              }`}
            >
              <span
                className={`mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full border ${on ? "border-accent" : "border-hairline"}`}
                aria-hidden
              >
                {on && <span className="h-2 w-2 rounded-full bg-accent" />}
              </span>
              <span>
                <span className="block text-sm text-ink">{f.name}</span>
                <span className="block text-xs text-muted">{f.note}</span>
              </span>
            </button>
          );
        })}
      </div>

      {canEdit && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted">ฟอนต์หัวข้อเอง</span>
          <input
            ref={fileRef}
            type="file"
            accept=".woff2,.ttf,.otf,font/woff2,font/ttf,font/otf"
            onChange={onPickFont}
            className="hidden"
            aria-label="อัปโหลดไฟล์ฟอนต์"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink-soft transition-colors hover:border-ink disabled:opacity-60"
          >
            {uploading ? "กำลังอัปโหลด…" : "อัปโหลดฟอนต์ (.woff2 / .ttf / .otf)"}
          </button>
          {customFont && (
            <span className="flex items-center gap-2 text-xs text-muted">
              <span className="max-w-[160px] truncate font-mono">{customFont.replace(/^custom\//, "")}</span>
              <button type="button" onClick={clearFont} className="text-accent hover:underline">
                ลบ
              </button>
            </span>
          )}
          {uploadError && <span className="text-xs text-accent">{uploadError}</span>}
        </div>
      )}
      {customActive && <p className="mb-4 -mt-1 text-xs text-muted">ฟอนต์อัปโหลดใช้กับหัวข้อ · เนื้อความ/ตัวเลขคงฟอนต์เดิมเพื่อความคมของตัวเลข</p>}

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">ตัวอย่างสด</p>
      <div
        style={previewVars}
        className="mb-4 flex flex-col gap-3 rounded-[12px] border border-hairline bg-paper p-4"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          <span className="font-display text-lg font-semibold text-ink" style={{ fontFamily: "var(--f-display)" }}>
            Famai Motor Group · ยามาฮ่า
          </span>
        </div>
        <p className="text-sm text-ink-soft" style={{ fontFamily: "var(--f-body)" }}>
          ยอดขายเดือนนี้ 1,240,500 บาท · 18 คัน
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-[24px] bg-accent px-4 py-2 text-sm font-medium text-card">บันทึกการขาย</span>
          <span className="rounded-full bg-[var(--accent-wash)] px-2 py-0.5 text-xs font-medium" style={{ color: d.deep }}>
            +8%
          </span>
          <span className="text-sm font-medium" style={{ color: d.accent }}>
            ลิงก์เน้น →
          </span>
        </div>
      </div>

      {saved && (
        <div className="mb-3">
          <StatusBadge variant="good">บันทึกธีมแล้ว — ทั้งร้านเปลี่ยนแล้ว</StatusBadge>
        </div>
      )}
      {error && (
        <div className="mb-3">
          <StatusBadge variant="bad">{error}</StatusBadge>
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={!valid || busy || !dirty}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกธีม"}
          </button>
        </div>
      )}
    </section>
  );
}
