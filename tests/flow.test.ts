import { describe, it, expect } from "vitest";
import { FLOWS, isRoleCode, roleLabel, stepInvolvesRole, flowInvolvesRole } from "@/lib/flow/flows";
import { ALL_MENU_KEYS } from "@/lib/nav/menu";

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
