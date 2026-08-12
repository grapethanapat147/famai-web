"use client";

import { useState, type ReactNode } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  SETTING_FIELDS,
  SETTING_GROUPS,
  formatForInput,
  parseInput,
  type SettingField,
  type SettingsActionResult,
} from "@/lib/settings/fields";
import type { AppSettings } from "@/lib/settings/resolve";

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink tabular disabled:opacity-60";

function initialState(settings: AppSettings): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of SETTING_FIELDS) {
    out[f.key] = formatForInput(f.kind, settings[f.key] as never);
  }
  return out;
}

export function SettingsView({
  settings,
  canEdit,
  action,
}: {
  settings: AppSettings;
  canEdit: boolean;
  action: (formData: FormData) => Promise<SettingsActionResult>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => initialState(settings));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors: Record<string, string> = {};
  for (const f of SETTING_FIELDS) {
    const res = parseInput(f.kind, values[f.key] ?? "");
    if (!res.ok) {
      errors[f.key] = res.error;
    }
  }
  const allValid = Object.keys(errors).length === 0;

  function set(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setSaved(false);
    setError(null);
  }

  async function save() {
    if (!canEdit || !allValid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    for (const f of SETTING_FIELDS) {
      fd.set(f.key, values[f.key] ?? "");
    }
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setSaved(true);
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">เกณฑ์ทั้งหมดที่ระบบใช้ (ทุกหน้าอ่านค่าจากที่นี่)</p>
        {!canEdit && <StatusBadge variant="info">ดูอย่างเดียว — แก้ได้เฉพาะแอดมิน</StatusBadge>}
      </div>

      <div className="flex flex-col gap-5">
        {SETTING_GROUPS.map((group) => (
          <section key={group} className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
            <h2 className="mb-3 font-display font-semibold text-ink">{group}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {SETTING_FIELDS.filter((f) => f.group === group).map((f) => (
                <FieldRow
                  key={f.key}
                  field={f}
                  value={values[f.key] ?? ""}
                  error={errors[f.key]}
                  disabled={!canEdit}
                  onChange={(v) => set(f.key, v)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {canEdit && (
        <div className="sticky bottom-4 mt-5 flex items-center justify-end gap-3 rounded-[12px] bg-card/90 p-3 shadow-[var(--sh-sm)] backdrop-blur">
          {saved && <StatusBadge variant="good">บันทึกแล้ว</StatusBadge>}
          {error && <StatusBadge variant="bad">{error}</StatusBadge>}
          {!allValid && !error && <StatusBadge variant="warn">มีค่าที่ยังไม่ถูกต้อง</StatusBadge>}
          <button
            type="button"
            onClick={save}
            disabled={!allValid || busy}
            className="rounded-[24px] bg-accent px-6 py-2.5 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
          </button>
        </div>
      )}
    </div>
  );
}

function FieldRow({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: SettingField;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  if (field.kind === "bool") {
    const on = value === "true";
    return (
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <Label field={field} />
        <button
          type="button"
          disabled={disabled}
          aria-pressed={on}
          onClick={() => onChange(on ? "false" : "true")}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-accent" : "bg-hairline-2"}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition-transform ${on ? "left-0.5 translate-x-5" : "left-0.5"}`} />
        </button>
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-1">
      <Label field={field} />
      <div className="flex items-center gap-2">
        <input
          type={field.kind === "time" ? "time" : field.kind === "int-list" ? "text" : "text"}
          inputMode={field.kind === "int-list" || field.kind === "time" ? "text" : "decimal"}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} ${error ? "border-accent" : ""}`}
        />
        {field.kind === "percent" && <span className="text-sm text-muted">%</span>}
        {field.unit && field.kind !== "percent" && <span className="whitespace-nowrap text-sm text-muted">{field.unit}</span>}
      </div>
      {error ? (
        <span className="text-xs text-accent">{error}</span>
      ) : field.help ? (
        <span className="text-xs text-muted">{field.help}</span>
      ) : null}
    </label>
  );
}

function Label({ field }: { field: SettingField }): ReactNode {
  return <span className="text-sm text-ink-soft">{field.label}</span>;
}
