import { describe, it, expect } from "vitest";
import {
  FIN_STATUSES,
  finNext,
  canFinanceTransition,
  isFinanceTerminal,
  isFinanceStatus,
  financeStatusVariant,
  financeActionLabel,
  canManageFinance,
} from "@/lib/deal/finance";

describe("finance state machine", () => {
  it("walks the submit→result path", () => {
    expect(finNext("ส่งเรื่อง")).toEqual(["ยื่นเอกสาร", "ยกเลิก"]);
    expect(finNext("รอผล")).toEqual(["อนุมัติแล้ว", "ปฏิเสธ", "ติดตามต่อ"]);
  });

  it("allows resubmit + cancel from rejected; terminal states have no next", () => {
    expect(finNext("ปฏิเสธ")).toEqual(["ส่งเรื่อง", "ยกเลิก"]);
    expect(isFinanceTerminal("อนุมัติแล้ว")).toBe(true);
    expect(isFinanceTerminal("ยกเลิก")).toBe(true);
    expect(isFinanceTerminal("รอผล")).toBe(false);
  });

  it("blocks illegal transitions", () => {
    expect(canFinanceTransition("ส่งเรื่อง", "อนุมัติแล้ว")).toBe(false);
    expect(canFinanceTransition("รอผล", "อนุมัติแล้ว")).toBe(true);
    expect(canFinanceTransition("อนุมัติแล้ว", "ปฏิเสธ")).toBe(false);
  });

  it("validates raw status + distinct variants for terminal states", () => {
    expect(isFinanceStatus("รอผล")).toBe(true);
    expect(isFinanceStatus("bogus")).toBe(false);
    expect(financeStatusVariant("อนุมัติแล้ว")).toBe("good");
    expect(financeStatusVariant("ปฏิเสธ")).toBe("bad");
    expect(FIN_STATUSES).toContain("ติดตามต่อ");
  });

  it("action labels read clearly", () => {
    expect(financeActionLabel("ส่งเรื่อง")).toBe("ยื่นใหม่");
    expect(financeActionLabel("อนุมัติแล้ว")).toBe("อนุมัติ");
    expect(financeActionLabel("ยื่นเอกสาร")).toBe("ไป: ยื่นเอกสาร");
  });
});

describe("canManageFinance", () => {
  it("gates to finance/management roles", () => {
    expect(canManageFinance(["acct"])).toBe(true);
    expect(canManageFinance(["manager"])).toBe(true);
    expect(canManageFinance(["sales"])).toBe(false);
    expect(canManageFinance(["stock"])).toBe(false);
  });
});
