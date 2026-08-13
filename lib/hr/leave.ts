/**
 * ตรรกะใบลา (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 */

export type HrActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type LeaveType = "ลาป่วย" | "ลากิจ" | "ลาพักร้อน";
export const LEAVE_TYPES: readonly LeaveType[] = ["ลาป่วย", "ลากิจ", "ลาพักร้อน"];

export type LeaveStatus = "รออนุมัติ" | "อนุมัติ" | "ปฏิเสธ";

export type BadgeVariant = "good" | "warn" | "bad" | "info" | "off";
export const LEAVE_STATUS_VARIANT: Record<LeaveStatus, BadgeVariant> = {
  รออนุมัติ: "warn",
  อนุมัติ: "good",
  ปฏิเสธ: "bad",
};

export function isLeaveStatus(v: string): v is LeaveStatus {
  return v === "รออนุมัติ" || v === "อนุมัติ" || v === "ปฏิเสธ";
}
export function isLeaveType(v: string): v is LeaveType {
  return (LEAVE_TYPES as readonly string[]).includes(v);
}

/** จำนวนวันลา (นับรวมวันเริ่ม–สิ้นสุด) — ใช้ Date.UTC เลี่ยง bug timezone */
export function leaveDays(dateFrom: string, dateTo: string): number {
  const a = parseDate(dateFrom);
  const b = parseDate(dateTo);
  if (a == null || b == null || b < a) {
    return 0;
  }
  return Math.round((b - a) / 86_400_000) + 1;
}

function parseDate(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export type LeaveRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  dateFrom: string;
  dateTo: string;
  status: LeaveStatus;
  reason: string | null;
  mine: boolean;
};

/** วันลาที่ใช้ไปแล้ว (เฉพาะที่อนุมัติ) ของประเภทนั้น — โชว์เทียบโควตา */
export function usedLeaveDays(leaves: readonly LeaveRow[], type: string): number {
  return leaves
    .filter((l) => l.status === "อนุมัติ" && l.leaveType === type)
    .reduce((sum, l) => sum + leaveDays(l.dateFrom, l.dateTo), 0);
}

export function filterLeaves(
  leaves: readonly LeaveRow[],
  opts: { status?: LeaveStatus | "all"; scope?: "all" | "mine" | "pending" } = {},
): LeaveRow[] {
  return leaves.filter((l) => {
    if (opts.status && opts.status !== "all" && l.status !== opts.status) {
      return false;
    }
    if (opts.scope === "mine" && !l.mine) {
      return false;
    }
    if (opts.scope === "pending" && l.status !== "รออนุมัติ") {
      return false;
    }
    return true;
  });
}

/** อนุมัติ/ปฏิเสธใบลาได้ต้องมีสิทธิ์ approve (admin/manager/hr) */
export function canApproveLeave(perms: { approve: boolean }): boolean {
  return perms.approve;
}
