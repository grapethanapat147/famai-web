import { describe, it, expect } from "vitest";
import { FLOWS, ROLE_COLOR, isRoleCode, roleColor, roleLabel, stepInvolvesRole, flowInvolvesRole, visibleSteps } from "@/lib/flow/flows";
import { ALL_MENU_KEYS } from "@/lib/nav/menu";

const saleFlow = FLOWS.find((f) => f.key === "sale")!;

describe("visibleSteps", () => {
  it("returns all steps (with original index) when onlyMine is off", () => {
    const all = visibleSteps(saleFlow, ["sales"], false);
    expect(all).toHaveLength(saleFlow.steps.length);
    expect(all.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("keeps only my steps (original numbers preserved) when onlyMine is on", () => {
    // ขายมอเตอร์ไซค์: sales อยู่ในขั้น เสนอราคา(1) เปิดการขาย(2) ส่งมอบ(5)
    const mine = visibleSteps(saleFlow, ["sales"], true);
    expect(mine.map((s) => s.index)).toEqual([1, 2, 5]);
  });
  it("admin sees every step even with onlyMine (ดูแลทุกงาน)", () => {
    expect(visibleSteps(saleFlow, ["admin"], true).map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("roleColor", () => {
  it("maps known roles to their color, falls back for unknown", () => {
    expect(roleColor("sales")).toBe(ROLE_COLOR.sales);
    expect(roleColor("nope")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("FLOWS data integrity", () => {
  it("every step has at least one valid role", () => {
    for (const flow of FLOWS) {
      expect(flow.steps.length).toBeGreaterThan(0);
      for (const step of flow.steps) {
        expect(step.roles.length).toBeGreaterThan(0);
        for (const r of step.roles) {
          expect(isRoleCode(r)).toBe(true);
        }
      }
    }
  });

  it("every step.screen references a real menu key", () => {
    for (const flow of FLOWS) {
      for (const step of flow.steps) {
        if (step.screen) {
          expect(ALL_MENU_KEYS).toContain(step.screen);
        }
      }
    }
  });

  it("flow keys are unique", () => {
    const keys = FLOWS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("role helpers", () => {
  it("roleLabel maps known codes, passes through unknown", () => {
    expect(roleLabel("sales")).toBe("เซลล์");
    expect(roleLabel("bogus")).toBe("bogus");
  });

  it("stepInvolvesRole matches by role; admin sees all", () => {
    const step = { title: "x", roles: ["stock" as const, "tech" as const] };
    expect(stepInvolvesRole(step, ["stock"])).toBe(true);
    expect(stepInvolvesRole(step, ["sales"])).toBe(false);
    expect(stepInvolvesRole(step, ["admin"])).toBe(true); // admin = ทุกขั้น
  });

  it("flowInvolvesRole is true when any step matches", () => {
    const saleFlow = FLOWS.find((f) => f.key === "sale")!;
    expect(flowInvolvesRole(saleFlow, ["sales"])).toBe(true);
    expect(flowInvolvesRole(saleFlow, ["hr"])).toBe(false); // ไม่มีขั้นของ HR ในการขาย
  });
});
