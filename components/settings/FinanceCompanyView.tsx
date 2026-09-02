"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { OrgInfoActionResult } from "@/lib/org/info";

/**
 * ข้อมูลผู้เสียภาษีของบริษัทไฟแนนซ์ (FAM-1126 · fixlist ข้อ 11)
 * ใบกำกับภาษี "ยอดจัด" ออกในนามไฟแนนซ์ จึงต้องมีชื่อ/ที่อยู่/เลขผู้เสียภาษีของเขาบนเอกสาร
 * ไม่กรอกเลขผู้เสียภาษี = ออกใบกำกับยอดจัดไม่ได้ (ระบบกันไว้ที่หน้าบัญชี)
 */

export type FinanceCompanyInfo = {
  id: string;
  name: string;
  taxId: string;
  address: string;
  phone: string;
};

const fieldCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink disabled:opacity-60";

export function FinanceCompanyView({
  companies,
  canEdit,
  action,
}: {
  companies: FinanceCompanyInfo[];
  canEdit: boolean;
  action: (formData: FormData) => Promise<OrgInfoActionResult>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const missing = companies.filter((c) => c.taxId.trim() === "");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    fd.set("finance_ids", companies.map((c) => c.id).join(","));
    const res = await action(fd);
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: res.message ?? "บันทึกแล้ว" } : { ok: false, text: res.error });
    if (res.ok) {
      router.refresh();
    }
  }

  if (companies.length === 0) {
    return null;
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-3xl rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display font-semibold text-ink">บริษัทไฟแนนซ์</h2>
          <p className="mt-0.5 text-xs text-muted">
            ใช้เป็นข้อมูล “ผู้ซื้อ” บนใบกำกับภาษียอดจัด — ไม่กรอกเลขผู้เสียภาษี จะออกใบกำกับยอดจัดไม่ได้
          </p>
        </div>
        {missing.length > 0 && <StatusBadge variant="warn">ยังไม่มีเลขผู้เสียภาษี {missing.length} บริษัท</StatusBadge>}
      </div>

      <div className="flex flex-col gap-4">
        {companies.map((c) => (
          <div key={c.id} className="rounded-[10px] border border-hairline-2 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink">{c.name}</span>
              {c.taxId.trim() === "" && <StatusBadge variant="warn">ยังไม่มีเลขผู้เสียภาษี</StatusBadge>}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">เลขผู้เสียภาษี (13 หลัก)</span>
                <input name={`fin_${c.id}_tax_id`} defaultValue={c.taxId} disabled={!canEdit} inputMode="numeric" placeholder="0105xxxxxxxxx" className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-muted">ที่อยู่</span>
                <input name={`fin_${c.id}_address`} defaultValue={c.address} disabled={!canEdit} className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted">โทรศัพท์</span>
                <input name={`fin_${c.id}_phone`} defaultValue={c.phone} disabled={!canEdit} inputMode="tel" className={fieldCls} />
              </label>
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกข้อมูลไฟแนนซ์"}
          </button>
          {msg && <StatusBadge variant={msg.ok ? "good" : "bad"}>{msg.text}</StatusBadge>}
        </div>
      )}
    </form>
  );
}
