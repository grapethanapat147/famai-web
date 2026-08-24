"use client";

import { useRef, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { OrgBranch, OrgCompany, OrgInfoActionResult } from "@/lib/org/info";

const fieldCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

/** ชุดช่องกรอกของ 1 บริษัท — module-level กัน react-hooks/static-components */
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

/** ตั้งค่าลงเวลาต่อบริษัท (FAM-1101 P3) — พิกัด geofence + บังคับเซลฟี่ · เก็บเป็นช่องในฟอร์มเดียวกัน */
function AttendanceFields({ prefix, branch, canEdit }: { prefix: string; branch: OrgBranch; canEdit: boolean }) {
  const [lat, setLat] = useState(branch.geoLat);
  const [lng, setLng] = useState(branch.geoLng);
  const [radius, setRadius] = useState(branch.geoRadius);
  const [selfie, setSelfie] = useState(branch.requireSelfie);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  function useHere() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoErr("อุปกรณ์นี้ไม่รองรับ GPS");
      return;
    }
    setLocating(true);
    setGeoErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        if (radius.trim() === "") {
          setRadius("150");
        }
        setLocating(false);
      },
      () => {
        setGeoErr("ขอตำแหน่งไม่สำเร็จ — อนุญาต GPS แล้วลองใหม่");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const geoOn = lat.trim() !== "" && lng.trim() !== "" && radius.trim() !== "";
  return (
    <div className="mt-3 rounded-[10px] border border-hairline-2 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">ลงเวลาเข้า — พิกัด + เซลฟี่</span>
        <StatusBadge variant={geoOn ? "good" : "off"}>{geoOn ? `เปิด geofence · ${radius} ม.` : "ปิด geofence"}</StatusBadge>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">ละติจูด</span>
          <input name={`${prefix}_geo_lat`} value={lat} onChange={(e) => setLat(e.target.value)} disabled={!canEdit} inputMode="decimal" placeholder="13.9403" className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">ลองจิจูด</span>
          <input name={`${prefix}_geo_lng`} value={lng} onChange={(e) => setLng(e.target.value)} disabled={!canEdit} inputMode="decimal" placeholder="100.5422" className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">รัศมี (เมตร)</span>
          <input name={`${prefix}_geo_radius`} value={radius} onChange={(e) => setRadius(e.target.value)} disabled={!canEdit} inputMode="numeric" placeholder="150" className={fieldCls} />
        </label>
      </div>
      {canEdit && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={useHere}
            disabled={locating}
            className="rounded-[20px] border border-hairline px-3 py-1.5 text-xs text-ink-soft transition-transform active:scale-[0.97] hover:text-ink disabled:opacity-50"
          >
            📍 {locating ? "กำลังหาตำแหน่ง…" : "ใช้ตำแหน่งปัจจุบัน"}
          </button>
          {geoErr && <StatusBadge variant="bad">{geoErr}</StatusBadge>}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">ว่างทั้ง 3 ช่อง = ปิด geofence · หาพิกัดจาก Google Maps (คลิกขวาที่ร้าน → คัดลอกพิกัด) หรือกด “ใช้ตำแหน่งปัจจุบัน” ตอนอยู่ที่ร้าน</p>
      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name={`${prefix}_require_selfie`} checked={selfie} onChange={(e) => setSelfie(e.target.checked)} disabled={!canEdit} className="h-4 w-4 accent-[var(--accent)]" />
        🤳 บังคับถ่ายเซลฟี่ตอนลงเวลาเข้า
      </label>
    </div>
  );
}

/**
 * ข้อมูลกิจการ/บริษัท (FAM-1078) — ชื่อ/เลขภาษี/ที่อยู่/เบอร์ ที่ขึ้นหัวเอกสารทุกใบ
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
        <h2 className="font-display font-semibold text-ink">ข้อมูลกิจการ / บริษัท</h2>
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
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">บริษัท {b.code}</p>
            <OrgFields prefix={`branch_${b.id}`} row={b} canEdit={canEdit} />
            <AttendanceFields prefix={`branch_${b.id}`} branch={b} canEdit={canEdit} />
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
