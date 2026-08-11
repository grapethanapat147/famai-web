import { describe, it, expect } from "vitest";
import { combinePerms, NO_PERMS } from "@/lib/auth/permissions";

describe("combinePerms", () => {
  it("fails closed with no roles", () => {
    expect(combinePerms([])).toEqual(NO_PERMS);
  });

  it("ORs perms across multiple roles", () => {
    const perms = combinePerms([
      { perms: { money: false, allBranch: false, approve: false, admin: false } }, // sales
      { perms: { money: true, allBranch: true, approve: false, admin: false } }, // acct
    ]);
    expect(perms).toEqual({ money: true, allBranch: true, approve: false, admin: false });
  });

  it("admin role grants admin only where set", () => {
    const perms = combinePerms([{ perms: { money: true, allBranch: true, approve: true, admin: true } }]);
    expect(perms.admin).toBe(true);
  });

  it("ignores null/partial perms", () => {
    expect(combinePerms([{ perms: null }])).toEqual(NO_PERMS);
    expect(combinePerms([{ perms: { money: true } }])).toEqual({ ...NO_PERMS, money: true });
  });
});
