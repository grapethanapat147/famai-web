"use client";

import { useRef, useState, type ReactNode } from "react";
import { Chips } from "@/components/ui/Chips";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { resizeToWebp } from "@/lib/models/image";
import { SELFIE_BUCKET, SELFIE_MAX, selfieObjectPath } from "@/lib/hr/selfie";
import {
  LEAVE_STATUS_VARIANT,
  LEAVE_TYPES,
  filterLeaves,
  leaveDays,
  type HrActionResult,
  type LeaveRow,
  type LeaveStatus,
} from "@/lib/hr/leave";

export type MyToday = { checkIn: string | null; checkOut: string | null; status: string | null };

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";

function timeOf(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function HrView({
  hasEmployee,
  myToday,
  leaves,
  canApprove,
  today,
  geofence,
  requireSelfie,
  employeeId,
  clockInAction,
  clockOutAction,
  linkEmployeeAction,
  requestLeaveAction,
  decideLeaveAction,
}: {
  hasEmployee: boolean;
  myToday: MyToday | null;
  leaves: LeaveRow[];
  canApprove: boolean;
  today: string;
  geofence: { radiusM: number } | null;
  requireSelfie: boolean;
  employeeId: string | null;
  clockInAction: (formData: FormData) => Promise<HrActionResult>;
  clockOutAction: () => Promise<HrActionResult>;
  linkEmployeeAction: () => Promise<HrActionResult>;
  requestLeaveAction: (formData: FormData) => Promise<HrActionResult>;
  decideLeaveAction: (formData: FormData) => Promise<HrActionResult>;
}) {
  const [scope, setScope] = useState<"mine" | "pending" | "all">("mine");
  const [asking, setAsking] = useState(false);
  const [deciding, setDeciding] = useState<LeaveRow | null>(null);

  const pendingCount = leaves.filter((l) => l.status === "รออนุมัติ").length;
  const shown = filterLeaves(leaves, { scope });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <ClockCard
        hasEmployee={hasEmployee}
        myToday={myToday}
        today={today}
        geofence={geofence}
        requireSelfie={requireSelfie}
        employeeId={employeeId}
        clockInAction={clockInAction}
        clockOutAction={clockOutAction}
        linkEmployeeAction={linkEmployeeAction}
      />

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Chips
            value={scope}
            onChange={setScope}
            options={[
              { value: "mine", label: "ใบลาของฉัน" },
              ...(canApprove ? [{ value: "pending" as const, label: `รออนุมัติ${pendingCount ? ` (${pendingCount})` : ""}` }] : []),
              { value: "all", label: "ทั้งหมด" },
            ]}
          />
          <button
            type="button"
            onClick={() => setAsking(true)}
            disabled={!hasEmployee}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            + ขอลา
          </button>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon="clock"
            title="ไม่มีใบลาในมุมมองนี้"
            description={scope === "mine" ? "ยังไม่เคยขอลา — กดปุ่มด้านล่างเพื่อยื่นใบลาแรก" : "ลองสลับมุมมอง หรือรอใบลาใหม่เข้ามา"}
            action={hasEmployee && scope === "mine" ? { label: "+ ขอลา", onClick: () => setAsking(true) } : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((l) => {
              const clickable = canApprove && l.status === "รออนุมัติ";
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && setDeciding(l)}
                    className={`flex w-full items-center justify-between gap-3 rounded-[12px] bg-card p-3 text-left shadow-[var(--sh-sm)] ${clickable ? "hover:border-ink" : "cursor-default"}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {l.leaveType} · {leaveDays(l.dateFrom, l.dateTo)} วัน
                        {!l.mine && <span className="ml-1 text-sm text-muted">— {l.employeeName}</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {formatThaiDate(l.dateFrom)}
                        {l.dateTo !== l.dateFrom ? ` – ${formatThaiDate(l.dateTo)}` : ""}
                        {l.reason ? ` · ${l.reason}` : ""}
                      </p>
                    </div>
                    <StatusBadge variant={LEAVE_STATUS_VARIANT[l.status]}>{l.status}</StatusBadge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {hasEmployee && <AskLeaveModal open={asking} today={today} action={requestLeaveAction} onClose={() => setAsking(false)} />}
      {canApprove && (
        <DecideDrawer leave={deciding} action={decideLeaveAction} onClose={() => setDeciding(null)} onDone={() => setDeciding(null)} />
      )}
    </div>
  );
}

/** ขอพิกัดปัจจุบันจากเบราว์เซอร์ (โพรมิสครอบ getCurrentPosition) */
function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("no-geo"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 });
  });
}

function ClockCard({
  hasEmployee,
  myToday,
  today,
  geofence,
  requireSelfie,
  employeeId,
  clockInAction,
  clockOutAction,
  linkEmployeeAction,
}: {
  hasEmployee: boolean;
  myToday: MyToday | null;
  today: string;
  geofence: { radiusM: number } | null;
  requireSelfie: boolean;
  employeeId: string | null;
  clockInAction: (formData: FormData) => Promise<HrActionResult>;
  clockOutAction: () => Promise<HrActionResult>;
  linkEmployeeAction: () => Promise<HrActionResult>;
}) {
  const selfieInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"" | "locating" | "selfie" | "saving">("");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<HrActionResult>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await action();
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  // ปุ่มลงเวลาเข้า — ต้องถ่ายเซลฟี่ → เปิดกล้องก่อน · ไม่งั้นทำต่อเลย
  function onClockInClick() {
    if (busy) return;
    setError(null);
    if (requireSelfie) {
      selfieInput.current?.click();
    } else {
      void doClockIn(null);
    }
  }

  function onSelfiePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (selfieInput.current) {
      selfieInput.current.value = "";
    }
    if (file) {
      void doClockIn(file);
    }
  }

  // ประกอบ: (GPS ถ้ามี geofence) + (อัปโหลดเซลฟี่ถ้ามีไฟล์) → ลงเวลา
  async function doClockIn(selfieFile: File | null) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();

    if (geofence) {
      setPhase("locating");
      try {
        const pos = await getPosition();
        fd.set("lat", String(pos.coords.latitude));
        fd.set("lng", String(pos.coords.longitude));
      } catch {
        setPhase("");
        setBusy(false);
        setError("ต้องเปิดตำแหน่ง (GPS) เพื่อลงเวลา — อนุญาตการเข้าถึงตำแหน่งแล้วลองใหม่");
        return;
      }
    }

    if (selfieFile) {
      setPhase("selfie");
      try {
        const blob = await resizeToWebp(selfieFile, SELFIE_MAX);
        const path = selfieObjectPath(employeeId ?? "unknown", today, Date.now());
        const supabase = createBrowserSupabase();
        const up = await supabase.storage.from(SELFIE_BUCKET).upload(path, blob, { contentType: "image/webp", upsert: true });
        if (up.error) {
          throw new Error(up.error.message);
        }
        fd.set("selfie_path", path);
      } catch {
        setPhase("");
        setBusy(false);
        setError("อัปโหลดเซลฟี่ไม่สำเร็จ — ลองใหม่อีกครั้ง");
        return;
      }
    }

    setPhase("saving");
    const res = await clockInAction(fd);
    setPhase("");
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
    }
  }

  const checkedIn = Boolean(myToday?.checkIn);
  const checkedOut = Boolean(myToday?.checkOut);
  const clockInLabel =
    phase === "locating" ? "กำลังหาตำแหน่ง…" : phase === "selfie" ? "กำลังอัปโหลดเซลฟี่…" : phase === "saving" ? "กำลังลงเวลา…" : "ลงเวลาเข้า";

  return (
    <section className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display font-semibold text-ink">ลงเวลาวันนี้</h2>
        <span className="text-sm text-muted">{formatThaiDate(today)}</span>
      </div>

      {!hasEmployee ? (
        <div className="flex flex-col gap-3">
          <StatusBadge variant="info">บัญชีนี้ยังไม่ผูกกับข้อมูลพนักงาน</StatusBadge>
          <p className="text-sm leading-relaxed text-muted">
            เชื่อมบัญชีของคุณกับข้อมูลพนักงานเพื่อเริ่มลงเวลาเข้า–ออกและขอลา — ฝ่ายบุคคลกำหนดตำแหน่ง/เงินเดือนเพิ่มเติมได้ภายหลัง
          </p>
          {error && <StatusBadge variant="bad">{error}</StatusBadge>}
          <button
            type="button"
            disabled={busy}
            onClick={() => run(linkEmployeeAction)}
            className="self-start rounded-[24px] bg-accent px-5 py-2.5 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังเชื่อม…" : "เชื่อมบัญชีกับข้อมูลพนักงาน"}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-6 text-sm">
            <div>
              <p className="text-muted">เข้างาน</p>
              <p className="tabular font-semibold text-ink">{timeOf(myToday?.checkIn ?? null)}</p>
              {myToday?.status === "สาย" && <StatusBadge variant="warn">สาย</StatusBadge>}
            </div>
            <div>
              <p className="text-muted">ออกงาน</p>
              <p className="tabular font-semibold text-ink">{timeOf(myToday?.checkOut ?? null)}</p>
            </div>
          </div>

          {(geofence || requireSelfie) && !checkedIn && (
            <div className="mb-3 flex flex-wrap gap-2">
              {geofence && <StatusBadge variant="info">📍 ต้องอยู่ในรัศมี {geofence.radiusM} ม. จากร้าน</StatusBadge>}
              {requireSelfie && <StatusBadge variant="info">🤳 ต้องถ่ายเซลฟี่ยืนยัน</StatusBadge>}
            </div>
          )}

          {error && <div className="mb-3"><StatusBadge variant="bad">{error}</StatusBadge></div>}

          <input ref={selfieInput} type="file" accept="image/*" capture="user" onChange={onSelfiePicked} className="hidden" aria-hidden />

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || checkedIn}
              onClick={onClockInClick}
              className="flex-1 rounded-[24px] bg-accent py-3 text-sm font-medium text-card disabled:opacity-50"
            >
              {clockInLabel}
            </button>
            <button
              type="button"
              disabled={busy || !checkedIn || checkedOut}
              onClick={() => run(clockOutAction)}
              className="flex-1 rounded-[24px] border border-hairline py-3 text-sm font-medium text-ink disabled:opacity-50"
            >
              ลงเวลาออก
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function AskLeaveModal({
  open,
  today,
  action,
  onClose,
}: {
  open: boolean;
  today: string;
  action: (formData: FormData) => Promise<HrActionResult>;
  onClose: () => void;
}) {
  const [leaveType, setLeaveType] = useState<string>(LEAVE_TYPES[0]);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = leaveDays(from, to);
  const canSubmit = days >= 1;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("leave_type", leaveType);
    fd.set("date_from", from);
    fd.set("date_to", to);
    fd.set("reason", reason);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setReason("");
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="ขอลา">
      <div className="flex flex-col gap-3">
        <Field label="ประเภทการลา">
          <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className={inputCls}>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ตั้งแต่">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </Field>
          <Field label="ถึง">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <p className="text-xs text-muted">{days >= 1 ? `รวม ${days} วัน` : "ช่วงวันที่ไม่ถูกต้อง"}</p>
        <Field label="เหตุผล (ถ้ามี)">
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
        </Field>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังส่ง…" : "ส่งใบลา"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DecideDrawer({
  leave,
  action,
  onClose,
  onDone,
}: {
  leave: LeaveRow | null;
  action: (formData: FormData) => Promise<HrActionResult>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  if (leave && leave.id !== current) {
    setCurrent(leave.id);
    setReason("");
    setError(null);
  }

  async function decide(decision: LeaveStatus) {
    if (!leave || busy) return;
    if (decision === "ปฏิเสธ" && !reason.trim()) {
      setError("กรุณาระบุเหตุผลที่ไม่อนุมัติ");
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("leave_id", leave.id);
    fd.set("decision", decision);
    fd.set("reason", reason);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) onDone();
    else setError(res.error);
  }

  return (
    <Drawer open={leave !== null} onClose={onClose} title={leave ? `ใบลา — ${leave.employeeName}` : ""}>
      {leave && (
        <div className="flex flex-col gap-4 text-sm">
          <dl className="flex flex-col gap-2">
            <Row label="ประเภท">{leave.leaveType}</Row>
            <Row label="ช่วง">
              {formatThaiDate(leave.dateFrom)}
              {leave.dateTo !== leave.dateFrom ? ` – ${formatThaiDate(leave.dateTo)}` : ""} ({leaveDays(leave.dateFrom, leave.dateTo)} วัน)
            </Row>
            {leave.reason && <Row label="เหตุผล">{leave.reason}</Row>}
          </dl>

          <Field label="เหตุผล (จำเป็นเมื่อไม่อนุมัติ)">
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
          </Field>

          {error && <StatusBadge variant="bad">{error}</StatusBadge>}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("อนุมัติ")}
              className="flex-1 rounded-[24px] bg-accent py-3 text-sm font-medium text-card disabled:opacity-50"
            >
              อนุมัติ
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decide("ปฏิเสธ")}
              className="flex-1 rounded-[24px] border border-hairline py-3 text-sm font-medium text-accent disabled:opacity-50"
            >
              ไม่อนุมัติ
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
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
