"use client";

import { useState, type CSSProperties } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { deriveAccent, isValidHex } from "@/lib/theme/derive";
import { THEME_PRESETS, findPresetByAccent } from "@/lib/theme/presets";
import type { ThemeActionResult } from "@/lib/theme/config";

/** หน้าตั้งค่าธีมของร้าน (FAM-1038) — preset + สีเน้น guided + พรีวิวสด → บันทึก app_setting (admin) */
export function ThemeSettings({
  currentAccent,
  canEdit,
  action,
}: {
  currentAccent: string;
  canEdit: boolean;
  action?: (formData: FormData) => Promise<ThemeActionResult>;
}) {
  const [selected, setSelected] = useState(currentAccent);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = isValidHex(selected);
  const d = deriveAccent(valid ? selected : currentAccent, "light");
  const activePreset = findPresetByAccent(selected);
  const dirty = selected.toLowerCase() !== currentAccent.toLowerCase();

  function pick(hex: string) {
    setSelected(hex);
    setSaved(false);
    setError(null);
  }

  async function save() {
    if (!action || !valid || busy || !dirty) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("accent", selected);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setSaved(true);
    } else {
      setError(res.error);
    }
  }

  const previewVars = {
    "--accent": d.accent,
    "--accent-hover": d.hover,
    "--accent-deep": d.deep,
    "--accent-wash": d.wash,
  } as CSSProperties;

  return (
    <section className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
      <h2 className="mb-1 font-display font-semibold text-ink">รูปลักษณ์ (ธีมของร้าน)</h2>
      <p className="mb-4 text-sm text-muted">
        สีเน้นของทั้งร้าน — {canEdit ? "เลือกชุดสำเร็จ หรือปรับสีเอง แล้วกดบันทึก" : "เฉพาะผู้ดูแลระบบ (admin) แก้ได้"}
      </p>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">ธีมสำเร็จรูป</p>
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
        <div className="mb-4 flex flex-wrap items-center gap-3">
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
            className="w-28 rounded-[8px] border border-hairline bg-card px-3 py-2 font-mono text-sm text-ink outline-none focus:border-ink"
          />
          {!valid && <span className="text-xs text-accent">รูปแบบต้องเป็น #RRGGBB</span>}
          {valid && activePreset && <span className="text-xs text-muted">= {activePreset.name}</span>}
        </div>
      )}

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">ตัวอย่างสด</p>
      <div style={previewVars} className="mb-4 flex flex-col gap-3 rounded-[12px] border border-hairline bg-paper p-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          <span className="font-display font-semibold text-ink">Famai Motor Group</span>
        </div>
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
          <StatusBadge variant="good">บันทึกธีมแล้ว — ทั้งร้านเปลี่ยนสีแล้ว</StatusBadge>
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
