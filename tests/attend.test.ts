import { describe, it, expect } from "vitest";
import {
  resolveStatus,
  leaveCovers,
  filterRows,
  statusCounts,
  canViewAttend,
  ATT_ORDER,
  type AttendRow,
} from "@/lib/attend/attendance";

describe("resolveStatus", () => {
  it("uses the DB status when present", () => {
    expect(resolveStatus("ปกติ", true, false, true)).toBe("present");
    expect(resolveStatus("สาย", true, false, true)).toBe("late");
    expect(resolveStatus("ลา", false, false, true)).toBe("leave");
    expect(resolveStatus("ขาด", false, false, false)).toBe("absent");
  });

  it("derives status when no DB row: leave > checkin > today/pending > absent", () => {
    expect(resolveStatus(null, false, true, true)).toBe("leave");
    expect(resolveStatus(null, true, false, true)).toBe("present");
    expect(resolveStatus(null, false, false, true)).toBe("pending"); // วันนี้ ยังไม่มา
    expect(resolveStatus(null, false, false, false)).toBe("absent"); // อดีต ไม่มีข้อมูล
  });
});

describe("leaveCovers", () => {
  it("checks inclusive date range", () => {
    expect(leaveCovers("2026-08-10", "2026-08-12", "2026-08-11")).toBe(true);
    expect(leaveCovers("2026-08-10", "2026-08-12", "2026-08-10")).toBe(true);
    expect(leaveCovers("2026-08-10", "2026-08-12", "2026-08-13")).toBe(false);
  });
});

function row(over: Partial<AttendRow>): AttendRow {
  return {
    employeeId: "e",
    name: "สมชาย ใจดี",
    position: "เซลล์",
    status: "present",
    checkIn: "2026-08-12T08:20:00Z",
    lateMinutes: null,
    otMinutes: 0,
    selfieUrl: null,
    distanceM: null,
    ...over,
  };
}

describe("filterRows + statusCounts", () => {
  const rows = [
    row({ employeeId: "1", name: "สมชาย", status: "present" }),
    row({ employeeId: "2", name: "มานี", position: "บัญชี", status: "late" }),
    row({ employeeId: "3", name: "วิภา", status: "pending" }),
  ];

  it("filters by status and search", () => {
    expect(filterRows(rows, { status: "late" }).map((r) => r.employeeId)).toEqual(["2"]);
    expect(filterRows(rows, { search: "บัญชี" }).map((r) => r.employeeId)).toEqual(["2"]);
  });

  it("statusCounts covers every status incl. zero", () => {
    const c = statusCounts(rows);
    expect(c.present).toBe(1);
    expect(c.late).toBe(1);
    expect(c.absent).toBe(0);
    expect(Object.keys(c)).toHaveLength(ATT_ORDER.length);
  });
});

describe("canViewAttend", () => {
  it("gates to HR/management roles", () => {
    expect(canViewAttend(["hr"])).toBe(true);
    expect(canViewAttend(["manager"])).toBe(true);
    expect(canViewAttend(["sales"])).toBe(false);
    expect(canViewAttend(["tech"])).toBe(false);
  });
});
