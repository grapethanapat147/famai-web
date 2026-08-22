"use client";

import { useRef, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { OrgBranch, OrgCompany, OrgInfoActionResult } from "@/lib/org/info";

const fieldCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

/** ชุดช่องกรอกของ 1 หน่วย (บริษัท/สาขา) — module-level กัน react-hooks/static-components */
function OrgFields({ prefix, row, canEdit }: { prefix: string; row: OrgCompany; canEdit: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">ชื่อที่แสดง</span>
        <input name={`${prefix}_name`} defaultValue={row.name} disabled={!canEdit} className={fieldCls} aria-label="ชื่อที่แสดง" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">เลขประจำตัวผู้เสียภาษี</span>
        <input
          name={`${prefix}_tax_id`}
          defaultValue={row.taxId}
          disabled={!canEdit}
          inputMode="numeric"
          placeholder="13 หลัก"
          className={fieldCls}
          aria-label="เลขประจำตัวผู้เสียภาษี"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="text-muted">ที่อยู่</span>
        <textarea name={`${prefix}_address`} defaultValue={row.address} disabled={!canEdit} rows={2} className={fieldCls} aria-label="ที่อยู่" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">เบอร์โทร</span>
        <input name={`${prefix}_phone`} defaultValue={row.phone} disabled={!canEdit} className={fieldCls} aria-label="เบอร์โทร" />
      </label>
    </div>
  );
}

/**
 * ข้อมูลกิจการ/สาขา (FAM-1078) — ชื่อ/เลขภาษี/ที่อยู่/เบอร์ ที่ขึ้นหัวเอกสารทุกใบ
 * (ใบเสนอราคา/ใบขาย/ใบสั่งซ่อม/สลิป/ใบกำกับภาษี ดึงจาก branch โดยมี company เป็น fallback)
 * แก้ได้เฉพาะ admin — ตรงกับสิทธิ์ของ action ฝั่ง server
 */
export function CompanyInfoView({
  company,
  branches,
  canEdit,
  action,
}: {
  company: OrgCompany;
  branches: OrgBranch[];
  canEdit: boolean;
  action?: (formData: FormData) => Promise<OrgInfoActionResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!action || busy || !formRef.current) {
      return;
    }
    setBusy(true);
    setSaved(false);
    setError(null);
    const res = await action(new FormData(formRef.current));
    setBusy(false);
    if (res.ok) {
      setSaved(true);
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)] sm:p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-ink">ข้อมูลกิจการ / สาขา</h2>
        {!canEdit && <span className="text-xs text-muted">ดูได้อย่างเดียว — แก้ได้เฉพาะผู้ดูแลระบบ</span>}
      </div>
      <p className="mb-4 text-sm text-muted">
        ข้อมูลนี้ขึ้นบนหัวเอกสารทุกใบ (ใบเสนอราคา/ใบขาย/ใบสั่งซ่อม/สลิป/ใบกำกับภาษี) — เติมเลขภาษี+ที่อยู่ให้ครบก่อนออกใบกำกับภาษีจริง
      </p>

      <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5">
        <input type="hidden" name="company_id" value={company.id} />
        <input type="hidden" name="branch_ids" value={branches.map((b) => b.id).join(",")} />

        <section>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
            บริษัท (นิติบุคคล) · {company.code}
          </p>
          <OrgFields prefix="company" row={company} canEdit={canEdit} />
        </section>

        {branches.map((b) => (
          <section key={b.id} className="border-t border-hairline-2 pt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">สาขา {b.code}</p>
            <OrgFields prefix={`branch_${b.id}`} row={b} canEdit={canEdit} />
          </section>
        ))}

        {canEdit && (
          <div className="flex flex-wrap items-center gap-3 border-t border-hairline-2 pt-4">
            <button
              type="submit"
              disabled={busy}
              className="rounded-[24px] bg-ink px-5 py-2 text-sm font-medium text-card transition-transform active:scale-[0.97] disabled:opacity-50"
            >
              {busy ? "กำลังบันทึก…" : "บันทึกข้อมูลกิจการ"}
            </button>
            {saved && <StatusBadge variant="good">บันทึกแล้ว</StatusBadge>}
            {error && <StatusBadge variant="bad">{error}</StatusBadge>}
          </div>
        )}
      </form>
    </div>
  );
}
