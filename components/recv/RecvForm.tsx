"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Chips } from "@/components/ui/Chips";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { computeCostVat, deriveSku, type RecvActionResult, type RecvBranch, type RecvVariant } from "@/lib/recv/recv";

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink tabular";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RecvForm({
  variants,
  branches,
  defaultBranchId,
  vatPct,
  canSeeMoney,
  action,
}: {
  variants: RecvVariant[];
  branches: RecvBranch[];
  defaultBranchId: string;
  vatPct: number;
  canSeeMoney: boolean;
  action?: (formData: FormData) => Promise<RecvActionResult>;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [variantId, setVariantId] = useState("");
  const [colorCode, setColorCode] = useState("");
  const [unitKind, setUnitKind] = useState<"ใหม่" | "มือสอง">("ใหม่");
  const [engineNo, setEngineNo] = useState("");
  const [frameNo, setFrameNo] = useState("");
  const [receivedAt, setReceivedAt] = useState(todayISO());
  const [retail, setRetail] = useState("");
  const [cost, setCost] = useState("");
  const [costVat, setCostVat] = useState("");
  const [costVatTouched, setCostVatTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<HTMLInputElement>(null);

  const variant = variants.find((v) => v.id === variantId) ?? null;
  const colors = variant?.colors ?? [];
  const color = colors.find((c) => c.code === colorCode) ?? null;
  const sku = variant && color ? deriveSku(variant.code, color.code) : "";

  // VAT ต้นทุน — auto จาก cost × vat% จนกว่าผู้ใช้จะแก้เอง
  const suggestedCostVat = useMemo(() => {
    const c = Number(cost.replace(/,/g, ""));
    return Number.isFinite(c) && c > 0 ? computeCostVat(c, vatPct) : 0;
  }, [cost, vatPct]);
  const effectiveCostVat = costVatTouched ? costVat : suggestedCostVat ? String(suggestedCostVat) : "";

  const frameWarn = frameNo.trim() !== "" && frameNo.trim().length !== 17;
  const ready = branchId !== "" && variantId !== "" && colorCode !== "" && engineNo.trim() !== "" && frameNo.trim() !== "" && receivedAt !== "";

  function selectVariant(id: string) {
    setVariantId(id);
    setColorCode("");
    setSaved(null);
    setError(null);
  }

  async function submit() {
    if (!ready || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    if (!action) {
      setBusy(false);
      setSaved(engineNo.trim());
      return;
    }
    const fd = new FormData();
    fd.set("branch_id", branchId);
    fd.set("variant_id", variantId);
    fd.set("color_code", colorCode);
    fd.set("unit_kind", unitKind);
    fd.set("engine_no", engineNo.trim());
    fd.set("frame_no", frameNo.trim());
    fd.set("received_at", receivedAt);
    fd.set("retail", retail.trim());
    if (canSeeMoney) {
      fd.set("cost", cost.trim());
      fd.set("cost_vat", effectiveCostVat.trim());
    }
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setSaved(res.engineNo);
      // รับต่อเนื่อง — เคลียร์เลขเครื่อง/ตัวถัง เก็บบริษัท/รุ่น/สีไว้
      setEngineNo("");
      setFrameNo("");
      requestAnimationFrame(() => engineRef.current?.focus());
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="บริษัท *">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="วันที่รับ *">
            <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="รุ่นรถ *">
            <select value={variantId} onChange={(e) => selectVariant(e.target.value)} className={inputCls}>
              <option value="">— เลือกรุ่น —</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.modelTh || v.modelName} ({v.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="สี *">
            <select value={colorCode} onChange={(e) => setColorCode(e.target.value)} disabled={!variant} className={`${inputCls} disabled:opacity-50`}>
              <option value="">{variant ? "— เลือกสี —" : "เลือกรุ่นก่อน"}</option>
              {colors.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="ประเภทรถ" full>
          <Chips
            value={unitKind}
            onChange={(val) => setUnitKind(val)}
            options={[
              { value: "ใหม่", label: "รถใหม่" },
              { value: "มือสอง", label: "รถมือสอง" },
            ]}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="เลขเครื่อง *">
            <input ref={engineRef} value={engineNo} onChange={(e) => setEngineNo(e.target.value)} placeholder="เช่น E34RE-057401" className={`${inputCls} font-mono`} />
          </Field>
          <Field label="เลขตัวถัง *">
            <input value={frameNo} onChange={(e) => setFrameNo(e.target.value)} placeholder="17 หลัก" className={`${inputCls} font-mono`} />
          </Field>
        </div>
        {frameWarn && <StatusBadge variant="warn">เลขตัวถังปกติ 17 หลัก (ตอนนี้ {frameNo.trim().length} หลัก) — ตรวจสอบอีกครั้ง</StatusBadge>}

        <Field label="ราคาขาย (retail) — เว้นว่าง = รอกำหนดราคา" full>
          <input type="number" inputMode="numeric" value={retail} onChange={(e) => setRetail(e.target.value)} placeholder="บาท" className={inputCls} />
        </Field>

        {canSeeMoney && (
          <div className="grid grid-cols-2 gap-3 rounded-[12px] border border-hairline bg-paper-2 p-3">
            <Field label="ต้นทุน (ก่อน VAT)">
              <input type="number" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="เว้นว่าง = รอกำหนด" className={inputCls} />
            </Field>
            <Field label="VAT ต้นทุน (auto)">
              <input type="number" inputMode="numeric" value={effectiveCostVat} onChange={(e) => { setCostVat(e.target.value); setCostVatTouched(true); }} placeholder="0" className={inputCls} />
            </Field>
            <p className="col-span-2 text-[11px] leading-relaxed text-muted">VAT คิดอัตโนมัติจากต้นทุน × {vatPct}% (แก้เองได้) · ต้นทุนเห็นเฉพาะผู้มีสิทธิ์การเงิน</p>
          </div>
        )}

        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => setConfirmOpen(true)}
          className="mt-2 rounded-[24px] bg-accent py-3 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? "กำลังบันทึก…" : "รับรถเข้าสต๊อก"}
        </button>
        {saved && <StatusBadge variant="good">รับรถเข้าสต๊อกแล้ว — เลขเครื่อง {saved} · พร้อมรับคันถัดไป</StatusBadge>}
        {error && <StatusBadge variant="bad">{error}</StatusBadge>}
      </div>

      <aside className="h-max rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)] lg:sticky lg:top-20">
        <h2 className="mb-3 font-display font-semibold text-ink">สรุปรายการ</h2>
        {!variant ? (
          <p className="py-8 text-center text-sm leading-relaxed text-muted">
            เลือกรุ่นและสี
            <br />
            เพื่อดูสรุป
          </p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <Row label="รุ่น" value={variant.modelTh || variant.modelName} />
            <Row label="สี" value={color?.name ?? "—"} />
            <Row label="รหัสสินค้า" value={sku || "—"} mono />
            <Row label="บริษัท" value={branches.find((b) => b.id === branchId)?.name ?? "—"} />
            <Row label="ประเภท" value={unitKind === "ใหม่" ? "รถใหม่" : "รถมือสอง"} />
            <div className="my-1 border-t border-hairline-2" />
            <Row label="เลขเครื่อง" value={engineNo.trim() || "—"} mono />
            <Row label="เลขตัวถัง" value={frameNo.trim() || "—"} mono />
            <Row label="ราคาขาย" value={retail.trim() ? `฿${Number(retail).toLocaleString("en-US")}` : "รอกำหนด"} />
          </div>
        )}
      </aside>

      <ConfirmDialog
        open={confirmOpen}
        message={`ยืนยันรับรถเข้าสต๊อก ${variant ? `${variant.modelTh || variant.modelName} · ${color?.name ?? ""}` : ""} เลขเครื่อง ${engineNo.trim()} — ข้อมูลถูกต้องแล้วใช่ไหม?`}
        confirmLabel="ยืนยันรับรถ"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void submit();
        }}
      />
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-ink-soft ${full ? "col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`text-ink-soft ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
