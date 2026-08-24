"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Chips } from "@/components/ui/Chips";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { parseColors } from "@/lib/models/parse";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { PHOTO_CARD_MAX, PHOTO_FULL_MAX, resizeToWebp, type ModelPhotoResult } from "@/lib/models/image";
import { filterModels, modelCategories, modelSpecLine, sortModels, type AddModelResult, type ModelRow, type ModelSort } from "@/lib/models/rows";

type ViewMode = "grid" | "table";

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
  editAction,
  canManagePhoto = false,
  savePhotoAction,
  categories = DEFAULT_CATEGORIES,
}: {
  rows: ModelRow[];
  canSeeMoney: boolean;
  canAdd: boolean;
  photoBaseUrl: string;
  action: (formData: FormData) => Promise<AddModelResult>;
  editAction?: (formData: FormData) => Promise<AddModelResult>;
  canManagePhoto?: boolean;
  savePhotoAction?: (formData: FormData) => Promise<ModelPhotoResult>;
  categories?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<ModelSort>("name");
  const [photoTarget, setPhotoTarget] = useState<ModelRow | null>(null);
  const [editTarget, setEditTarget] = useState<ModelRow | null>(null);
  const canPhoto = canManagePhoto && !!savePhotoAction;
  const canEdit = canAdd && !!editAction;

  const cats = useMemo(() => modelCategories(rows), [rows]);
  const shown = useMemo(() => sortModels(filterModels(rows, { search, category }), sort), [rows, search, category, sort]);
  const isFiltered = search.trim() !== "" || category !== "all";

  const selectClass = "rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted">{rows.length} รุ่น</p>
          <Chips
            value={view}
            onChange={setView}
            options={[
              { value: "grid", label: "การ์ด" },
              { value: "table", label: "ตาราง" },
            ]}
          />
        </div>
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

      {rows.length > 0 && (
        <div className="mb-4">
          <FilterBar summary={`กำลังดู: ${shown.length} รุ่น`}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="ค้นหารุ่น / รหัส / สี"
              placeholder="ค้นชื่อรุ่น / รหัส / สี"
              className={`${selectClass} w-full sm:w-56`}
            />
            {cats.length > 1 && (
              <Chips
                value={category}
                onChange={setCategory}
                options={[{ value: "all", label: "ทุกประเภท" }, ...cats.map((c) => ({ value: c, label: c }))]}
              />
            )}
            <select aria-label="เรียงลำดับ" value={sort} onChange={(e) => setSort(e.target.value as ModelSort)} className={selectClass}>
              <option value="name">เรียงตามชื่อ</option>
              <option value="price-desc">ราคา มาก→น้อย</option>
              <option value="price-asc">ราคา น้อย→มาก</option>
              <option value="stock-desc">คงเหลือมากสุด</option>
            </select>
          </FilterBar>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState icon="bike" title="ยังไม่มีรุ่นรถ" description="เพิ่มรุ่นรถและสีเพื่อเริ่มจัดแคตตาล็อก" />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="bike"
          title="ไม่พบรุ่นตามเงื่อนไข"
          description="ลองปรับคำค้นหรือประเภท"
          action={isFiltered ? { label: "ล้างตัวกรอง", onClick: () => { setSearch(""); setCategory("all"); } } : undefined}
        />
      ) : view === "grid" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((m) => (
            <ModelCard
              key={m.id}
              m={m}
              photoBaseUrl={photoBaseUrl}
              canSeeMoney={canSeeMoney}
              canPhoto={canPhoto}
              canEdit={canEdit}
              onPhoto={() => setPhotoTarget(m)}
              onEdit={() => setEditTarget(m)}
            />
          ))}
        </ul>
      ) : (
        <ModelTable rows={shown} canSeeMoney={canSeeMoney} canEdit={canEdit} onEdit={setEditTarget} />
      )}

      {canAdd && (
        <AddModelModal open={open} onClose={() => setOpen(false)} action={action} categories={categories} />
      )}

      {canEdit && (
        <EditModelModal model={editTarget} action={editAction!} categories={categories} canSeeMoney={canSeeMoney} onClose={() => setEditTarget(null)} />
      )}

      {canPhoto && (
        <PhotoModal
          model={photoTarget}
          photoBaseUrl={photoBaseUrl}
          saveAction={savePhotoAction!}
          onClose={() => setPhotoTarget(null)}
        />
      )}
    </div>
  );
}

function ColorChips({ colors }: { colors: ModelRow["colors"] }) {
  if (colors.length === 0) {
    return null;
  }
  const shown = colors.slice(0, 4);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((c) => (
        <span key={c.code} className="rounded-full border border-hairline px-2 py-0.5 text-[11px] text-ink-soft">
          {c.name}
        </span>
      ))}
      {colors.length > shown.length && <span className="px-1 py-0.5 text-[11px] text-muted">+{colors.length - shown.length}</span>}
    </div>
  );
}

/** การ์ดแคตตาล็อก (FAM-1092) — รูปด้านบน + ชื่อ/สเปก/สี/สต็อก/ราคา */
function ModelCard({
  m,
  photoBaseUrl,
  canSeeMoney,
  canPhoto,
  canEdit,
  onPhoto,
  onEdit,
}: {
  m: ModelRow;
  photoBaseUrl: string;
  canSeeMoney: boolean;
  canPhoto: boolean;
  canEdit: boolean;
  onPhoto: () => void;
  onEdit: () => void;
}) {
  return (
    <li className="flex flex-col overflow-hidden rounded-[14px] bg-card shadow-[var(--sh-sm)]">
      <div className="relative aspect-[4/3] bg-paper">
        {canPhoto ? (
          <button type="button" onClick={onPhoto} aria-label={`เปลี่ยนรูป ${m.modelName}`} className="group block h-full w-full">
            <BigPhoto photoBaseUrl={photoBaseUrl} path={m.photoPath} label={m.modelName} />
            <span className="absolute inset-x-0 bottom-0 bg-ink/45 py-1 text-center text-[11px] font-medium text-card opacity-0 transition-opacity group-hover:opacity-100">
              เปลี่ยนรูป
            </span>
          </button>
        ) : (
          <BigPhoto photoBaseUrl={photoBaseUrl} path={m.photoPath} label={m.modelName} />
        )}
        <span className="absolute right-2 top-2">
          <StatusBadge variant={m.stockCount > 0 ? "good" : "off"}>คง {m.stockCount}</StatusBadge>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display font-semibold text-ink">{m.modelName}</p>
            <p className="truncate text-xs text-muted">
              {m.code}
              {m.modelTh ? ` · ${m.modelTh}` : ""}
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={`แก้ไข ${m.modelName}`}
              className="-m-2 shrink-0 p-2 text-ink-soft transition-colors hover:text-ink"
            >
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M13.5 4.5l2 2L7 15l-2.5.5L5 13z" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-ink-soft">{modelSpecLine(m)}</p>
        <ColorChips colors={m.colors} />
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-hairline-2 pt-2 text-sm">
          <span className="text-muted">ราคา</span>
          <Money value={m.retail} />
        </div>
        {canSeeMoney && (
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted">ต้นทุน</span>
            <Money value={m.cost} canSee={canSeeMoney} />
          </div>
        )}
      </div>
    </li>
  );
}

/** มุมมองตารางกระชับ (FAM-1092) — รุ่น/ประเภท/สี/คงเหลือ/ราคา (+ต้นทุน/แก้ไข) */
function ModelTable({
  rows,
  canSeeMoney,
  canEdit,
  onEdit,
}: {
  rows: ModelRow[];
  canSeeMoney: boolean;
  canEdit: boolean;
  onEdit: (m: ModelRow) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[12px] bg-card p-1 shadow-[var(--sh-sm)]">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-hairline text-left">
            <th className="px-3 py-2 font-medium text-muted">รุ่น</th>
            <th className="px-3 py-2 font-medium text-muted">ประเภท</th>
            <th className="px-3 py-2 text-right font-medium text-muted">สี</th>
            <th className="px-3 py-2 text-right font-medium text-muted">คงเหลือ</th>
            <th className="px-3 py-2 text-right font-medium text-muted">ราคาขาย</th>
            {canSeeMoney && <th className="px-3 py-2 text-right font-medium text-muted">ต้นทุน</th>}
            {canEdit && <th className="w-10 px-3 py-2" aria-hidden />}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map((m) => (
            <tr key={m.id} className="border-b border-hairline-2 last:border-0 hover:bg-paper-2">
              <td className="px-3 py-2">
                <span className="font-medium text-ink">{m.modelName}</span> <span className="font-mono text-[11px] text-muted">{m.code}</span>
              </td>
              <td className="px-3 py-2 text-ink-soft">{modelSpecLine(m)}</td>
              <td className="px-3 py-2 text-right text-ink-soft">{m.colors.length} สี</td>
              <td className="px-3 py-2 text-right">
                <StatusBadge variant={m.stockCount > 0 ? "good" : "off"}>{m.stockCount}</StatusBadge>
              </td>
              <td className="px-3 py-2 text-right">
                <Money value={m.retail} />
              </td>
              {canSeeMoney && (
                <td className="px-3 py-2 text-right">
                  <Money value={m.cost} canSee={canSeeMoney} />
                </td>
              )}
              {canEdit && (
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => onEdit(m)} className="text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline">
                    แก้ไข
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BigPhoto({ photoBaseUrl, path, label }: { photoBaseUrl: string; path: string | null; label: string }) {
  if (path) {
    return (
      <Image
        src={`${photoBaseUrl}${path}`}
        alt={label}
        fill
        unoptimized
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover"
      />
    );
  }
  return <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-muted">{label.slice(0, 2)}</div>;
}

function PhotoModal({
  model,
  photoBaseUrl,
  saveAction,
  onClose,
}: {
  model: ModelRow | null;
  photoBaseUrl: string;
  saveAction: (formData: FormData) => Promise<ModelPhotoResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !model || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const [cardBlob, fullBlob] = await Promise.all([
        resizeToWebp(file, PHOTO_CARD_MAX),
        resizeToWebp(file, PHOTO_FULL_MAX),
      ]);
      const supabase = createBrowserSupabase();
      const stamp = Date.now();
      const pathCard = `${model.id}/${stamp}-card.webp`;
      const pathFull = `${model.id}/${stamp}-full.webp`;
      const [up1, up2] = await Promise.all([
        supabase.storage.from("model-photo").upload(pathCard, cardBlob, { contentType: "image/webp", upsert: true }),
        supabase.storage.from("model-photo").upload(pathFull, fullBlob, { contentType: "image/webp", upsert: true }),
      ]);
      if (up1.error || up2.error) {
        throw new Error(up1.error?.message ?? up2.error?.message ?? "อัปโหลดไม่สำเร็จ");
      }
      const fd = new FormData();
      fd.set("variant_id", model.id);
      fd.set("path_card", pathCard);
      fd.set("path_full", pathFull);
      fd.set("bytes", String(cardBlob.size));
      const res = await saveAction(fd);
      if (!res.ok) {
        throw new Error(res.error);
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <Modal open={model !== null} onClose={onClose} title={model ? `รูปรุ่น ${model.modelName}` : ""}>
      {model && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-center">
            {model.photoPath ? (
              <Image
                src={`${photoBaseUrl}${model.photoPath}`}
                alt={model.modelName}
                width={200}
                height={200}
                unoptimized
                className="h-[200px] w-[200px] rounded-[12px] object-cover"
              />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-[12px] bg-paper text-2xl font-semibold text-muted">
                {model.modelName.slice(0, 2)}
              </div>
            )}
          </div>
          <p className="text-xs text-muted">
            เลือกรูป (JPG/PNG/WebP) — ระบบย่อเป็น WebP อัตโนมัติ (card {PHOTO_CARD_MAX} + full {PHOTO_FULL_MAX}) ก่อนอัป · ลบพิกัด GPS ให้ในตัว
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onPick}
            disabled={busy}
            className="text-sm text-ink-soft file:mr-3 file:rounded-[8px] file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-medium file:text-card disabled:opacity-50"
          />
          {busy && <StatusBadge variant="warn">กำลังย่อ + อัปโหลด…</StatusBadge>}
          {error && <StatusBadge variant="bad">{error}</StatusBadge>}
        </div>
      )}
    </Modal>
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

function EditModelModal({
  model,
  action,
  categories,
  canSeeMoney,
  onClose,
}: {
  model: ModelRow | null;
  action: (formData: FormData) => Promise<AddModelResult>;
  categories: string[];
  canSeeMoney: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<string | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelTh, setModelTh] = useState("");
  const [category, setCategory] = useState("");
  const [cc, setCc] = useState("");
  const [year, setYear] = useState("");
  const [cost, setCost] = useState("");
  const [retail, setRetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // prefill เมื่อเปิดรุ่นใหม่ (เทียบ id ระหว่าง render — ปลอดภัยกว่า effect)
  if (model && model.id !== current) {
    setCurrent(model.id);
    setModelName(model.modelName);
    setModelTh(model.modelTh ?? "");
    setCategory(model.category ?? categories[0] ?? "");
    setCc(model.cc != null ? String(model.cc) : "");
    setYear(model.year != null ? String(model.year) : "");
    setCost(model.cost != null ? String(model.cost) : "");
    setRetail(model.retail != null ? String(model.retail) : "");
    setError(null);
  }

  const canSubmit = modelName.trim() !== "" && retail.trim() !== "";
  const catOptions = category && !categories.includes(category) ? [category, ...categories] : categories;

  async function submit() {
    if (!model || !canSubmit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("variant_id", model.id);
    fd.set("model_name", modelName.trim());
    fd.set("model_th", modelTh.trim());
    fd.set("category", category);
    fd.set("cc", cc);
    fd.set("model_year", year);
    fd.set("cost", cost);
    fd.set("retail", retail);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={model !== null} onClose={onClose} title={model ? `แก้ไขรุ่น ${model.code}` : ""}>
      {model && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="รหัสรุ่น (แก้ไม่ได้)">
              <input value={model.code} disabled className={`${inputCls} opacity-60`} />
            </Field>
            <Field label="ชื่อรุ่น *">
              <input value={modelName} onChange={(e) => setModelName(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="ชื่อไทย">
            <input value={modelTh} onChange={(e) => setModelTh(e.target.value)} className={inputCls} />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="ประเภท">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {catOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="cc">
              <input value={cc} onChange={(e) => setCc(e.target.value)} inputMode="decimal" className={inputCls} />
            </Field>
            <Field label="ปี (พ.ศ.)">
              <input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" className={inputCls} />
            </Field>
          </div>

          {canSeeMoney && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="ต้นทุน (ก่อน VAT)">
                <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" className={inputCls} />
              </Field>
              <Field label="ราคาขายปลีก *">
                <input value={retail} onChange={(e) => setRetail(e.target.value)} inputMode="numeric" className={inputCls} />
              </Field>
            </div>
          )}

          <p className="text-xs text-muted">แก้ราคา = บันทึกราคาใหม่มีผลวันนี้ (เก็บประวัติราคาเดิมไว้) · สี/รูป แก้จากการ์ดรุ่นแยกต่างหาก</p>

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
              {busy ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
            </button>
          </div>
        </div>
      )}
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
