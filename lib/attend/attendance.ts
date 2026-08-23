/**
 * ภาพรวมการเข้างาน (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * สถานะต่อคน/ต่อวัน = คำนวณจาก attendance (ถ้ามี) + ใบลาที่อนุมัติ + วันที่ (วันนี้/อดีต)
 */

export type AttStatus = "present" | "late" | "leave" | "absent" | "pending";

export type BadgeVariant = "good" | "warn" | "bad" | "info" | "off";

export const ATT_META: Record<AttStatus, { label: string; variant: BadgeVariant }> = {
  present: { label: "มาแล้ว", variant: "good" },
  late: { label: "สาย", variant: "warn" },
  leave: { label: "ลา", variant: "info" },
  absent: { label: "ขาด", variant: "bad" },
  pending: { label: "ยังไม่มา", variant: "off" },
};

export const ATT_ORDER: readonly AttStatus[] = ["present", "late", "leave", "absent", "pending"];

const DB_STATUS: Record<string, AttStatus> = { ปกติ: "present", สาย: "late", ลา: "leave", ขาด: "absent" };

/**
 * สถานะสุดท้าย — ถ้ามีแถว attendance ที่ระบุสถานะ ใช้ค่านั้น
 * ไม่งั้น: มีใบลา→ลา · เช็กอินแล้ว→มาแล้ว · วันนี้→ยังไม่มา · อดีต→ขาด
 */
export function resolveStatus(
  dbStatus: string | null,
  hasCheckIn: boolean,
  onLeave: boolean,
  isToday: boolean,
): AttStatus {
  if (dbStatus && DB_STATUS[dbStatus]) {
    return DB_STATUS[dbStatus];
  }
  if (onLeave) {
    return "leave";
  }
  if (hasCheckIn) {
    return "present";
  }
  return isToday ? "pending" : "absent";
}

/** ช่วงวันลาครอบวันที่นี้ไหม (เทียบ ISO date) */
export function leaveCovers(dateFrom: string, dateTo: string, date: string): boolean {
  const d = date.slice(0, 10);
  return dateFrom.slice(0, 10) <= d && d <= dateTo.slice(0, 10);
}

export type AttendRow = {
  employeeId: string;
  name: string;
  position: string;
  status: AttStatus;
  checkIn: string | null; // ISO timestamp หรือ null
  lateMinutes: number | null;
  otMinutes: number;
  selfieUrl: string | null; // signed URL เซลฟี่ตอนลงเวลา (FAM-1101 P3b)
  distanceM: number | null; // ระยะห่างจากจุดร้านตอนลงเวลา (เมตร)
};

export function filterRows(
  rows: readonly AttendRow[],
  opts: { search?: string; status?: AttStatus | "all" } = {},
): AttendRow[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  return rows.filter((r) => {
    if (opts.status && opts.status !== "all" && r.status !== opts.status) {
      return false;
    }
    if (q && !`${r.name} ${r.position}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

/** นับตามสถานะ (ครบทุกสถานะ แม้ 0) */
export function statusCounts(rows: readonly AttendRow[]): Record<AttStatus, number> {
  const counts = Object.fromEntries(ATT_ORDER.map((s) => [s, 0])) as Record<AttStatus, number>;
  for (const r of rows) {
    counts[r.status] += 1;
  }
  return counts;
}

/** ผู้มีสิทธิ์ดูภาพรวมการเข้างาน — ตรงกับ roles ของเมนู attend */
const ATTEND_ROLES = ["admin", "manager", "hr"];

export function canViewAttend(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return ATTEND_ROLES.some((r) => roles.has(r));
}
