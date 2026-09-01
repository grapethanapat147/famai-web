import { describe, it, expect } from "vitest";
import {
  resolveStatus,
  leaveCovers,
  filterRows,
  statusCounts,
  canViewAttend,
  canEditAttendance,
  bangkokTimestamp,
  validateAttendanceEdit,
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

describe("canEditAttendance", () => {
  it("mirrors canViewAttend (admin/manager/hr)", () => {
    expect(canEditAttendance(["hr"])).toBe(true);
    expect(canEditAttendance(["manager"])).toBe(true);
    expect(canEditAttendance(["sales"])).toBe(false);
  });
});

describe("bangkokTimestamp", () => {
  it("builds a +07:00 ISO timestamp", () => {
    expect(bangkokTimestamp("2026-08-12", "08:20")).toBe("2026-08-12T08:20:00+07:00");
  });
});

describe("validateAttendanceEdit", () => {
  it("accepts valid times; blank check-out is allowed", () => {
    expect(validateAttendanceEdit({ workDate: "2026-08-12", checkIn: "08:20", checkOut: "17:30" })).toEqual({
      ok: true,
      value: { checkIn: "08:20", checkOut: "17:30" },
    });
    expect(validateAttendanceEdit({ workDate: "2026-08-12", checkIn: "08:20", checkOut: "" })).toEqual({
      ok: true,
      value: { checkIn: "08:20", checkOut: "" },
    });
  });
  it.each([
    [{ checkIn: "8:20" }, "เวลาเข้างานไม่ถูกต้อง (HH:MM)"],
    [{ checkIn: "25:00" }, "เวลาเข้างานไม่ถูกต้อง (HH:MM)"],
    [{ checkOut: "9:9" }, "เวลาออกงานไม่ถูกต้อง (HH:MM)"],
    [{ checkOut: "07:00" }, "เวลาออกต้องไม่ก่อนเวลาเข้า"],
    [{ workDate: "12/08/2026" }, "วันที่ไม่ถูกต้อง"],
  ])("rejects %o", (patch, msg) => {
    const base = { workDate: "2026-08-12", checkIn: "08:20", checkOut: "17:30" };
    const r = validateAttendanceEdit({ ...base, ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(msg);
    }
  });
});

function row(over: Partial<AttendRow>): AttendRow {
  return {
    employeeId: "e",
    name: "สมชาย ใจดี",
    position: "เซลล์",
    status: "present",
    checkIn: "2026-08-12T08:20:00Z",
    checkOut: null,
    lateMinutes: null,
    otMinutes: 0,
    selfieUrl: null,
    siteName: null,
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
