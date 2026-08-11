"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { parseColors } from "@/lib/models/parse";
import type { AddModelResult, ModelRow } from "@/lib/models/rows";

export type { AddModelResult } from "@/lib/models/rows";

const DEFAULT_CATEGORIES = ["Automatic", "Sport", "Moped", "Big Bike"];

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";

export function ModelsView({
  rows,
  canSeeMoney,
  canAdd,
  photoBaseUrl,
  action,
  categories = DEFAULT_CATEGORIES,
}: {
  rows: ModelRow[];
  canSeeMoney: boolean;
  canAdd: boolean;
  photoBaseUrl: string;
  action: (formData: FormData) => Promise<AddModelResult>;
  categories?: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{rows.length} รุ่น</p>
        {canAdd && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.99]"
          >
            + เพิ่มรุ่น
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
          ยังไม่มีรุ่นรถ (หรือยังไม่ได้ล็อกอิน)
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((m) => (
            <li key={m.id} className="flex gap-3 rounded-[12px] bg-card p-3 shadow-[var(--sh-sm)]">
              <Thumb photoBaseUrl={photoBaseUrl} path={m.photoPath} label={m.modelName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold text-ink">{m.modelName}</p>
                    <p className="truncate text-xs text-muted">
                      {m.code}
                      {m.modelTh ? ` · ${m.modelTh}` : ""}
                    </p>
                  </div>
                  <StatusBadge variant={m.stockCount > 0 ? "good" : "off"}>{m.stockCount} คัน</StatusBadge>
                </div>

                <p className="mt-1 text-xs text-ink-soft">
                  {[m.category, m.cc != null ? `${m.cc} cc` : null, m.year ? `ปี ${m.year}` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>

                {m.colors.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.colors.map((c) => (
                      <span
                        key={c.code}
                        className="rounded-full border border-hairline px-2 py-0.5 text-[11px] text-ink-soft"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between gap-3 border-t border-hairline-2 pt-2 text-sm">
                  <span className="text-muted">ราคาขาย</span>
                  <Money value={m.retail} />
                </div>
                {canSeeMoney && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">ต้นทุน</span>
                    <Money value={m.cost} canSee={canSeeMoney} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <AddModelModal open={open} onClose={() => setOpen(false)} action={action} categories={categories} />
      )}
    </div>
  );
}

function Thumb({ photoBaseUrl, path, label }: { photoBaseUrl: string; path: string | null; label: string }) {
  if (path) {
    return (
      <Image
        src={`${photoBaseUrl}${path}`}
        alt={label}
        width={72}
        height={72}
        unoptimized
        className="h-[72px] w-[72px] shrink-0 rounded-[8px] object-cover"
      />
    );
  }
  return (
    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[8px] bg-paper text-lg font-semibold text-muted">
      {label.slice(0, 2)}
    </div>
  );
}

function AddModelModal({
  open,
  onClose,
  action,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  action: (formData: FormData) => Promise<AddModelResult>;
  categories: string[];
}) {
  const [code, setCode] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelTh, setModelTh] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [cc, setCc] = useState("");
  const [year, setYear] = useState("");
  const [colors, setColors] = useState("");
  const [cost, setCost] = useState("");
  const [retail, setRetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedColors = parseColors(colors);
  const canSubmit = code.trim() !== "" && modelName.trim() !== "" && parsedColors.length > 0 && retail.trim() !== "";

  function reset() {
    setCode("");
    setModelName("");
    setModelTh("");
    setCategory(categories[0] ?? "");
    setCc("");
    setYear("");
    setColors("");
    setCost("");
    setRetail("");
    setError(null);
  }

  async function submit() {
    if (!canSubmit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("code", code.trim());
    fd.set("model_name", modelName.trim());
    fd.set("model_th", modelTh.trim());
    fd.set("category", category);
    fd.set("cc", cc);
    fd.set("model_year", year);
    fd.set("colors", JSON.stringify(parsedColors));
    fd.set("cost", cost);
    fd.set("retail", retail);

    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      reset();
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มรุ่นรถ">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="รหัสรุ่น *">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="BTF200" className={inputCls} />
          </Field>
          <Field label="ชื่อรุ่น *">
            <input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="NMAX" className={inputCls} />
          </Field>
        </div>

        <Field label="ชื่อไทย">
          <input value={modelTh} onChange={(e) => setModelTh(e.target.value)} placeholder="เอ็นแม็กซ์ สแตนดาร์ด" className={inputCls} />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="ประเภท">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="cc">
            <input value={cc} onChange={(e) => setCc(e.target.value)} inputMode="decimal" placeholder="155" className={inputCls} />
          </Field>
          <Field label="ปี (พ.ศ.)">
            <input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="2569" className={inputCls} />
          </Field>
        </div>

        <Field label="สี * — ทีละบรรทัด รูปแบบ รหัส:ชื่อ (เช่น 010A:ดำ)">
          <textarea
            value={colors}
            onChange={(e) => setColors(e.target.value)}
            rows={3}
            placeholder={"010A:ดำ\n010B:แดง"}
            className={inputCls}
          />
          {parsedColors.length > 0 && (
            <span className="mt-1 text-xs text-muted">{parsedColors.length} สี: {parsedColors.map((c) => c.name).join(", ")}</span>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ต้นทุน (ก่อน VAT)">
            <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" placeholder="40800" className={inputCls} />
          </Field>
          <Field label="ราคาขายปลีก *">
            <input value={retail} onChange={(e) => setRetail(e.target.value)} inputMode="numeric" placeholder="46900" className={inputCls} />
          </Field>
        </div>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกรุ่น"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink-soft">
      {label}
      {children}
    </label>
  );
}
