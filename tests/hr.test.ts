import { describe, it, expect } from "vitest";
import { formatOt, hhmmToMinutes, lateMinutes, isLate, otMinutes, workMinutes } from "@/lib/hr/time";
import { leaveDays, usedLeaveDays, filterLeaves, canApproveLeave, isLeaveType, type LeaveRow } from "@/lib/hr/leave";

describe("time helpers", () => {
  it("hhmmToMinutes parses HH:MM", () => {
    expect(hhmmToMinutes("08:30")).toBe(510);
    expect(hhmmToMinutes("bad")).toBe(0);
  });

  it("lateMinutes = minutes past work_start, clamped at 0", () => {
    expect(lateMinutes("09:05", "08:30")).toBe(35);
    expect(lateMinutes("08:15", "08:30")).toBe(0);
    expect(isLate("09:00", "08:30")).toBe(true);
    expect(isLate("08:30", "08:30")).toBe(false);
  });

  it("workMinutes = out − in, clamped", () => {
    expect(workMinutes("08:30", "17:30")).toBe(540);
    expect(workMinutes("17:30", "08:30")).toBe(0);
  });
});

function leave(over: Partial<LeaveRow>): LeaveRow {
  return {
    id: "l",
    employeeId: "e1",
    employeeName: "สมชาย",
    leaveType: "ลาป่วย",
    dateFrom: "2026-08-10",
    dateTo: "2026-08-10",
    status: "รออนุมัติ",
    reason: null,
    mine: true,
    ...over,
  };
}

describe("leaveDays", () => {
  it("counts inclusive days", () => {
    expect(leaveDays("2026-08-10", "2026-08-10")).toBe(1);
    expect(leaveDays("2026-08-10", "2026-08-12")).toBe(3);
    expect(leaveDays("2026-08-12", "2026-08-10")).toBe(0); // to ก่อน from
  });
});

describe("usedLeaveDays", () => {
  it("sums approved days of the given type only", () => {
    const leaves = [
      leave({ leaveType: "ลาพักร้อน", status: "อนุมัติ", dateFrom: "2026-08-01", dateTo: "2026-08-03" }), // 3
      leave({ leaveType: "ลาพักร้อน", status: "รออนุมัติ", dateFrom: "2026-08-10", dateTo: "2026-08-11" }), // ไม่นับ
      leave({ leaveType: "ลาป่วย", status: "อนุมัติ", dateFrom: "2026-08-05", dateTo: "2026-08-05" }),
    ];
    expect(usedLeaveDays(leaves, "ลาพักร้อน")).toBe(3);
    expect(usedLeaveDays(leaves, "ลาป่วย")).toBe(1);
  });
});

describe("filterLeaves", () => {
  const leaves = [
    leave({ id: "1", status: "รออนุมัติ", mine: true }),
    leave({ id: "2", status: "อนุมัติ", mine: false }),
  ];

  it("filters by scope and status", () => {
    expect(filterLeaves(leaves, { scope: "mine" }).map((l) => l.id)).toEqual(["1"]);
    expect(filterLeaves(leaves, { scope: "pending" }).map((l) => l.id)).toEqual(["1"]);
    expect(filterLeaves(leaves, { status: "อนุมัติ" }).map((l) => l.id)).toEqual(["2"]);
  });
});

describe("gates", () => {
  it("canApproveLeave needs approve perm; isLeaveType validates", () => {
    expect(canApproveLeave({ approve: true })).toBe(true);
    expect(canApproveLeave({ approve: false })).toBe(false);
    expect(isLeaveType("ลาป่วย")).toBe(true);
    expect(isLeaveType("bogus")).toBe(false);
  });
});

describe("otMinutes (fixlist ข้อ 04)", () => {
  const END = "17:30";

  it("อยู่เกินเวลาเลิกงาน นับเป็นช่วงละ 30 นาที (ปัดลง)", () => {
    expect(otMinutes("08:30", "19:30", END)).toBe(120);
    expect(otMinutes("08:30", "19:20", END)).toBe(90);
    expect(otMinutes("08:30", "18:00", END)).toBe(30);
  });

  it("อยู่เกินไม่ถึงหนึ่งช่วง = ไม่ใช่ OT", () => {
    expect(otMinutes("08:30", "17:40", END)).toBe(0);
    expect(otMinutes("08:30", "17:30", END)).toBe(0);
    expect(otMinutes("08:30", "16:00", END)).toBe(0);
  });

  it("เข้ากะหลังเวลาเลิกงาน นับ OT จากเวลาเข้า ไม่ใช่ทั้งกะ", () => {
    expect(otMinutes("18:00", "20:00", END)).toBe(120);
    expect(otMinutes("18:00", "18:20", END)).toBe(0);
  });

  it("ปรับความยาวช่วงได้", () => {
    expect(otMinutes("08:30", "18:15", END, 15)).toBe(45);
    expect(otMinutes("08:30", "18:15", END, 60)).toBe(0);
  });
});

describe("formatOt", () => {
  it("อ่านง่ายเป็นชั่วโมง/นาที", () => {
    expect(formatOt(0)).toBe("0 น.");
    expect(formatOt(45)).toBe("45 น.");
    expect(formatOt(90)).toBe("1 ชม. 30 น.");
    expect(formatOt(120)).toBe("2 ชม.");
  });
});
