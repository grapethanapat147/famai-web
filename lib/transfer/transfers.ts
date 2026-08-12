/**
 * โครงข้อมูล + ตรรกะโอนย้ายรถระหว่างสาขา (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * unit_transfer มองเห็นได้ทั้งสาขาต้นทางและปลายทาง (RLS §5)
 */

export type TransferActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type TransferStatus = "in_transit" | "received" | "cancelled";

export const TRANSFER_STATUS_LABEL: Record<TransferStatus, string> = {
  in_transit: "กำลังโอน",
  received: "รับแล้ว",
  cancelled: "ยกเลิก",
};

export type BadgeVariant = "good" | "warn" | "bad" | "info" | "off";

export function statusVariant(status: TransferStatus): BadgeVariant {
  switch (status) {
    case "in_transit":
      return "warn";
    case "received":
      return "good";
    case "cancelled":
      return "off";
  }
}

export type Transfer = {
  id: string;
  unitId: string;
  vehicle: string;
  engineNo: string;
  fromBranchId: string;
  fromBranch: string;
  toBranchId: string;
  toBranch: string;
  status: TransferStatus;
  requestedAt: string;
  receivedAt: string | null;
  note: string | null;
};

export type Direction = "in" | "out" | "both" | "other";

/** ทิศเทียบกับสาขาของฉัน — เข้า (ปลายทางฉัน) / ออก (ต้นทางฉัน) */
export function directionOf(
  t: Pick<Transfer, "fromBranchId" | "toBranchId">,
  myBranchIds: readonly string[],
): Direction {
  const mine = new Set(myBranchIds);
  const isIn = mine.has(t.toBranchId);
  const isOut = mine.has(t.fromBranchId);
  if (isIn && isOut) {
    return "both";
  }
  if (isIn) {
    return "in";
  }
  if (isOut) {
    return "out";
  }
  return "other";
}

export function filterTransfers(
  list: readonly Transfer[],
  opts: { status?: TransferStatus | "all"; direction?: Direction | "all"; search?: string; myBranchIds?: readonly string[] } = {},
): Transfer[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  const mine = opts.myBranchIds ?? [];
  return list.filter((t) => {
    if (opts.status && opts.status !== "all" && t.status !== opts.status) {
      return false;
    }
    if (opts.direction && opts.direction !== "all") {
      const d = directionOf(t, mine);
      const match = opts.direction === "in" ? d === "in" || d === "both" : opts.direction === "out" ? d === "out" || d === "both" : d === opts.direction;
      if (!match) {
        return false;
      }
    }
    if (q && !`${t.vehicle} ${t.engineNo} ${t.fromBranch} ${t.toBranch}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

/** ตัวนับหัวหน้า: กำลังโอนทั้งหมด · รอรับ (กำลังโอน + ปลายทางฉัน) */
export function transferCounts(
  list: readonly Transfer[],
  myBranchIds: readonly string[],
): { inTransit: number; incoming: number } {
  let inTransit = 0;
  let incoming = 0;
  for (const t of list) {
    if (t.status !== "in_transit") {
      continue;
    }
    inTransit += 1;
    const d = directionOf(t, myBranchIds);
    if (d === "in" || d === "both") {
      incoming += 1;
    }
  }
  return { inTransit, incoming };
}

/**
 * อยู่บริษัทเดียวกันหรือไม่ (R1 B1: โอนข้ามบริษัทไม่ได้ ต้องเปิดการขาย)
 * null ฝั่งใดฝั่งหนึ่ง = ยังไม่มีข้อมูลบริษัท (migration 16 ยังไม่ apply) → อนุญาต (ระบุไม่ได้)
 */
export function sameCompany(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) {
    return true;
  }
  return a === b;
}

/** ผู้มีสิทธิ์โอนย้าย — ตรงกับ roles ของเมนู transfer */
const TRANSFER_ROLES = ["admin", "manager", "stock"];

export function canManageTransfer(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return TRANSFER_ROLES.some((r) => roles.has(r));
}
