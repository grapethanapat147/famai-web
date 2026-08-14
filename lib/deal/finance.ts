/**
 * สเตตแมชชีนงานสินเชื่อ (finance_case) — ฟังก์ชันบริสุทธิ์ ทดสอบได้
 * ส่งเรื่อง → ยื่นเอกสาร → รอผล → [อนุมัติแล้ว | ปฏิเสธ | ติดตามต่อ] · ปฏิเสธ → ยื่นใหม่/ยกเลิก
 */

export type FinanceStatus =
  | "ส่งเรื่อง"
  | "ยื่นเอกสาร"
  | "รอผล"
  | "ติดตามต่อ"
  | "อนุมัติแล้ว"
  | "ปฏิเสธ"
  | "ยกเลิก";

export const FIN_STATUSES: readonly FinanceStatus[] = [
  "ส่งเรื่อง",
  "ยื่นเอกสาร",
  "รอผล",
  "ติดตามต่อ",
  "อนุมัติแล้ว",
  "ปฏิเสธ",
  "ยกเลิก",
];

const FIN_TRANSITIONS: Record<FinanceStatus, readonly FinanceStatus[]> = {
  ส่งเรื่อง: ["ยื่นเอกสาร", "ยกเลิก"],
  ยื่นเอกสาร: ["รอผล", "ยกเลิก"],
  รอผล: ["อนุมัติแล้ว", "ปฏิเสธ", "ติดตามต่อ"],
  ติดตามต่อ: ["อนุมัติแล้ว", "ปฏิเสธ", "รอผล"],
  อนุมัติแล้ว: [],
  ปฏิเสธ: ["ส่งเรื่อง", "ยกเลิก"], // ยื่นใหม่ / ยกเลิก
  ยกเลิก: [],
};

export function isFinanceStatus(v: string): v is FinanceStatus {
  return (FIN_STATUSES as readonly string[]).includes(v);
}

export function finNext(status: FinanceStatus): FinanceStatus[] {
  return [...FIN_TRANSITIONS[status]];
}

export function canFinanceTransition(from: FinanceStatus, to: FinanceStatus): boolean {
  return FIN_TRANSITIONS[from].includes(to);
}

export function isFinanceTerminal(status: FinanceStatus): boolean {
  return FIN_TRANSITIONS[status].length === 0;
}

export type BadgeVariant = "good" | "warn" | "bad" | "info" | "off";
export function financeStatusVariant(status: FinanceStatus): BadgeVariant {
  switch (status) {
    case "อนุมัติแล้ว":
      return "good";
    case "ปฏิเสธ":
      return "bad";
    case "ยกเลิก":
      return "off";
    case "ส่งเรื่อง":
      return "info";
    default:
      return "warn";
  }
}

/** ป้ายปุ่มสำหรับการเปลี่ยนสถานะ (สื่อความชัดกว่าชื่อสถานะดิบ) */
export function financeActionLabel(to: FinanceStatus): string {
  switch (to) {
    case "ส่งเรื่อง":
      return "ยื่นใหม่";
    case "อนุมัติแล้ว":
      return "อนุมัติ";
    case "ปฏิเสธ":
      return "ปฏิเสธ";
    case "ยกเลิก":
      return "ยกเลิกเคส";
    default:
      return `ไป: ${to}`;
  }
}

/** ผู้มีสิทธิ์จัดการงานสินเชื่อ (บันทึกผลจากธนาคาร) — การเงิน/ผู้บริหาร */
const FINANCE_ROLES = ["admin", "manager", "acct"];
export function canManageFinance(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return FINANCE_ROLES.some((r) => roles.has(r));
}
