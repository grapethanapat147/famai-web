import { describe, expect, it } from "vitest";
import {
  canClosePayroll,
  isPeriodLocked,
  isPeriodStatus,
  PERIOD_STATUSES,
  periodStatusVariant,
  validatePeriodAction,
} from "@/lib/payroll/payroll";

describe("สถานะงวดเงินเดือน (fixlist ข้อ 08)", () => {
  it("รู้จักเฉพาะสถานะจริงใน DB", () => {
    expect(PERIOD_STATUSES).toEqual(["ร่าง", "ปิดงวดแล้ว", "จ่ายแล้ว"]);
    expect(isPeriodStatus("ปิดงวดแล้ว")).toBe(true);
    expect(isPeriodStatus("ล็อก")).toBe(false);
  });

  it("ล็อก = ปิดงวดแล้ว หรือ จ่ายแล้ว (ร่าง/ยังไม่มีงวด = ยังคำนวณสด)", () => {
    expect(isPeriodLocked("ปิดงวดแล้ว")).toBe(true);
    expect(isPeriodLocked("จ่ายแล้ว")).toBe(true);
    expect(isPeriodLocked("ร่าง")).toBe(false);
    expect(isPeriodLocked(null)).toBe(false);
  });

  it("ทุกสถานะมีสีป้าย", () => {
    expect(PERIOD_STATUSES.every((s) => typeof periodStatusVariant(s) === "string")).toBe(true);
    expect(periodStatusVariant(null)).toBe("warn");
  });
});

describe("validatePeriodAction", () => {
  it("ร่าง (หรือยังไม่มีงวด) → ปิดงวดได้", () => {
    expect(validatePeriodAction(null, "close")).toEqual({ ok: true, value: "ปิดงวดแล้ว" });
    expect(validatePeriodAction("ร่าง", "close")).toEqual({ ok: true, value: "ปิดงวดแล้ว" });
  });

  it("ปิดซ้ำไม่ได้ · ต้องปิดก่อนจึงทำจ่ายได้", () => {
    expect(validatePeriodAction("ปิดงวดแล้ว", "close")).toEqual({ ok: false, error: "งวดนี้ปิดไปแล้ว" });
    expect(validatePeriodAction("ร่าง", "pay")).toEqual({ ok: false, error: "ต้องปิดงวดก่อนจึงทำจ่ายได้" });
    expect(validatePeriodAction("ปิดงวดแล้ว", "pay")).toEqual({ ok: true, value: "จ่ายแล้ว" });
  });

  it("เปิดงวดใหม่ได้เฉพาะตอนยังไม่จ่าย — จ่ายเงินไปแล้วย้อนไม่ได้", () => {
    expect(validatePeriodAction("ปิดงวดแล้ว", "reopen")).toEqual({ ok: true, value: "ร่าง" });
    expect(validatePeriodAction("จ่ายแล้ว", "reopen")).toEqual({ ok: false, error: "จ่ายเงินไปแล้ว เปิดงวดใหม่ไม่ได้" });
    expect(validatePeriodAction("ร่าง", "reopen")).toEqual({ ok: false, error: "งวดนี้ยังไม่ได้ปิด" });
    expect(validatePeriodAction("จ่ายแล้ว", "pay")).toEqual({ ok: false, error: "งวดนี้ทำจ่ายแล้ว" });
  });
});

describe("canClosePayroll", () => {
  it("แคบกว่าคนที่ดูเงินเดือนได้ — HR/บัญชี ดูได้แต่ล็อกยอดเองไม่ได้", () => {
    expect(canClosePayroll(["admin"])).toBe(true);
    expect(canClosePayroll(["manager"])).toBe(true);
    expect(canClosePayroll(["hr"])).toBe(false);
    expect(canClosePayroll(["acct"])).toBe(false);
  });
});
