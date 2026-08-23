import { describe, expect, it } from "vitest";
import {
  canManagePlate,
  phaseVariant,
  plateAgeDays,
  platePhase,
  plateWaitingSince,
  validateDltRequest,
  validatePlateReceived,
} from "@/lib/registration/plate";

describe("canManagePlate", () => {
  it("allows admin/manager/acct, denies others", () => {
    expect(canManagePlate(["acct"])).toBe(true);
    expect(canManagePlate(["manager"])).toBe(true);
    expect(canManagePlate(["admin"])).toBe(true);
    expect(canManagePlate(["sales"])).toBe(false);
    expect(canManagePlate(["stock", "tech"])).toBe(false);
    expect(canManagePlate([])).toBe(false);
  });
});

describe("platePhase", () => {
  it("ได้ป้ายแล้ว when plate exists or stage past รอทะเบียน", () => {
    expect(platePhase({ stage: "รอทะเบียน", plateNo: "1กก1234", dltRequestNo: "x" })).toBe("ได้ป้ายแล้ว");
    expect(platePhase({ stage: "ป้ายขาว", plateNo: null, dltRequestNo: null })).toBe("ได้ป้ายแล้ว");
    expect(platePhase({ stage: "ส่งมอบแล้ว", plateNo: null, dltRequestNo: null })).toBe("ได้ป้ายแล้ว");
  });
  it("รอเล่มทะเบียน when submitted (has request no) but no plate", () => {
    expect(platePhase({ stage: "รอทะเบียน", plateNo: null, dltRequestNo: "6512345" })).toBe("รอเล่มทะเบียน");
  });
  it("รอยื่นขนส่ง when nothing submitted yet", () => {
    expect(platePhase({ stage: "รอทะเบียน", plateNo: null, dltRequestNo: null })).toBe("รอยื่นขนส่ง");
  });
});

describe("plateWaitingSince", () => {
  it("prefers dlt submitted, then approved, then sold", () => {
    expect(plateWaitingSince({ dltSubmittedAt: "2026-08-11", approvedAt: "2026-08-05", soldAt: "2026-08-01" })).toBe("2026-08-11");
    expect(plateWaitingSince({ dltSubmittedAt: null, approvedAt: "2026-08-05", soldAt: "2026-08-01" })).toBe("2026-08-05");
    expect(plateWaitingSince({ dltSubmittedAt: null, approvedAt: null, soldAt: "2026-08-01" })).toBe("2026-08-01");
  });
});

describe("plateAgeDays", () => {
  it("counts whole days, never negative, bad input → 0", () => {
    expect(plateAgeDays("2026-08-11", "2026-08-23")).toBe(12);
    expect(plateAgeDays("2026-08-23", "2026-08-23")).toBe(0);
    expect(plateAgeDays("2026-08-25", "2026-08-23")).toBe(0); // future → clamp 0
    expect(plateAgeDays("not-a-date", "2026-08-23")).toBe(0);
  });
});

describe("phaseVariant", () => {
  it("green when done, red when aged, else phase colour", () => {
    expect(phaseVariant("ได้ป้ายแล้ว", 99, 10)).toBe("good");
    expect(phaseVariant("รอเล่มทะเบียน", 12, 10)).toBe("bad");
    expect(phaseVariant("รอเล่มทะเบียน", 3, 10)).toBe("warn");
    expect(phaseVariant("รอยื่นขนส่ง", 3, 10)).toBe("info");
  });
});

describe("validateDltRequest", () => {
  it("requires a request number", () => {
    expect(validateDltRequest("6512345")).toEqual({ ok: true, value: "6512345" });
    expect(validateDltRequest("  ")).toEqual({ ok: false, error: "กรอกเลขคำขอ" });
  });
});

describe("validatePlateReceived", () => {
  it("requires plate, book optional (blank → null)", () => {
    expect(validatePlateReceived("1กก 1234 ปทุมธานี", "ปท-1")).toEqual({ ok: true, value: { plateNo: "1กก 1234 ปทุมธานี", bookNo: "ปท-1" } });
    expect(validatePlateReceived("1กก 1234", "  ")).toEqual({ ok: true, value: { plateNo: "1กก 1234", bookNo: null } });
    expect(validatePlateReceived("", "x")).toEqual({ ok: false, error: "กรอกเลขทะเบียน" });
  });
});
