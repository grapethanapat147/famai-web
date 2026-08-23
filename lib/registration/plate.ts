/**
 * คิวงานทะเบียน/ป้าย (FAM-1100) — ติดตามการจดทะเบียนต่อจากดีล (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * ทำงานบนดีลขั้น "รอทะเบียน" (ยังทำอยู่) และ "ป้ายขาว" (ได้ป้ายแล้ว รอส่งมอบ)
 */

export type PlateActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** ขั้นดีลที่เกี่ยวกับงานทะเบียน (คิวหน้านี้ดึงเฉพาะ 2 ขั้นนี้) */
export const PLATE_STAGES = ["รอทะเบียน", "ป้ายขาว"] as const;

/** เกินกี่วันถือว่าค้างนาน (เตือนสีแดง) */
export const PLATE_WARN_DAYS = 10;

const PLATE_ROLES = ["admin", "manager", "acct"];
export function canManagePlate(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return PLATE_ROLES.some((r) => roles.has(r));
}

/** ระยะงานทะเบียน — ยังไม่ยื่น → ยื่นแล้วรอเล่ม → ได้ป้าย */
export type PlatePhase = "รอยื่นขนส่ง" | "รอเล่มทะเบียน" | "ได้ป้ายแล้ว";

export function platePhase(input: { stage: string; plateNo: string | null; dltRequestNo: string | null }): PlatePhase {
  if (input.plateNo || input.stage === "ป้ายขาว" || input.stage === "ส่งมอบแล้ว") {
    return "ได้ป้ายแล้ว";
  }
  return input.dltRequestNo ? "รอเล่มทะเบียน" : "รอยื่นขนส่ง";
}

/** วันเริ่มนับอายุงาน — ยื่นขนส่งแล้วนับจากวันยื่น, ยังไม่ยื่นนับจากวันอนุมัติ (ไม่มี → วันขาย) */
export function plateWaitingSince(input: { dltSubmittedAt: string | null; approvedAt: string | null; soldAt: string }): string {
  return input.dltSubmittedAt || input.approvedAt || input.soldAt;
}

/** จำนวนวันจากวันเริ่มนับถึงวันนี้ (นับเป็นวัน ปัดลง ไม่ติดลบ) */
export function plateAgeDays(waitingSinceISO: string, todayISO: string): number {
  const from = Date.parse(`${waitingSinceISO.slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${todayISO.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return 0;
  }
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

export type PlateBadge = "good" | "warn" | "bad" | "info" | "off";

/** สีป้ายระยะ — ได้ป้ายแล้ว = เขียว · ค้างเกินเกณฑ์ = แดง · รอเล่ม = ส้ม · รอยื่น = ฟ้า */
export function phaseVariant(phase: PlatePhase, ageDays: number, warnDays: number): PlateBadge {
  if (phase === "ได้ป้ายแล้ว") {
    return "good";
  }
  if (ageDays >= warnDays) {
    return "bad";
  }
  return phase === "รอเล่มทะเบียน" ? "warn" : "info";
}

/** ตรวจเลขคำขอจดทะเบียน (ยื่นกรมขนส่ง) — บังคับกรอก */
export function validateDltRequest(requestNo: string): { ok: true; value: string } | { ok: false; error: string } {
  const v = requestNo.trim();
  if (v === "") {
    return { ok: false, error: "กรอกเลขคำขอ" };
  }
  return { ok: true, value: v };
}

/** ตรวจการรับเล่ม/ป้าย — เลขทะเบียนบังคับ, เลขเล่มไม่บังคับ */
export function validatePlateReceived(
  plateNo: string,
  bookNo: string,
): { ok: true; value: { plateNo: string; bookNo: string | null } } | { ok: false; error: string } {
  const p = plateNo.trim();
  if (p === "") {
    return { ok: false, error: "กรอกเลขทะเบียน" };
  }
  const b = bookNo.trim();
  return { ok: true, value: { plateNo: p, bookNo: b === "" ? null : b } };
}

/** พนักงานสำหรับดรอปดาวน์ "ผู้ส่งมอบ" */
export type StaffOption = { id: string; name: string };

/** ตรวจฟอร์มส่งมอบ (FAM-1105) — วันที่บังคับ (ISO), สถานที่/ผู้ส่งมอบ ไม่บังคับ (ว่าง → null) */
export function validateDelivery(input: {
  deliveredAt: string;
  place: string;
  deliveredBy: string;
}): { ok: true; value: { deliveredAt: string; place: string | null; deliveredBy: string | null } } | { ok: false; error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deliveredAt)) {
    return { ok: false, error: "วันที่ส่งมอบไม่ถูกต้อง" };
  }
  const place = input.place.trim();
  const by = input.deliveredBy.trim();
  return { ok: true, value: { deliveredAt: input.deliveredAt, place: place === "" ? null : place, deliveredBy: by === "" ? null : by } };
}

/** แถวในคิวทะเบียน (ประกอบฝั่งเซิร์ฟเวอร์แล้วส่งให้ view) */
export type PlateRow = {
  regId: string;
  saleId: string;
  vehicle: string;
  frameNo: string;
  customerName: string;
  branch: string;
  stage: string;
  phase: PlatePhase;
  ageDays: number;
  dltRequestNo: string | null;
  dltSubmittedAt: string | null;
  plateNo: string | null;
  bookNo: string | null;
};
