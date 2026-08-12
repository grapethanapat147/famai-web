import { describe, it, expect } from "vitest";
import { filterUsers, diffIds, selfLockout, canManageUsers, type UserRow } from "@/lib/users/users";

function u(over: Partial<UserRow>): UserRow {
  return {
    id: "u",
    username: "user1",
    fullName: "สมชาย ใจดี",
    nickname: null,
    allBranch: false,
    isActive: true,
    roleCodes: ["sales"],
    roleIds: ["r-sales"],
    branchIds: ["b1"],
    ...over,
  };
}

describe("filterUsers", () => {
  const list = [
    u({ id: "1", fullName: "สมชาย", username: "somchai", roleCodes: ["sales"], isActive: true }),
    u({ id: "2", fullName: "มานี", username: "manee", roleCodes: ["acct"], isActive: false }),
  ];

  it("filters by status", () => {
    expect(filterUsers(list, { status: "active" }).map((x) => x.id)).toEqual(["1"]);
    expect(filterUsers(list, { status: "inactive" }).map((x) => x.id)).toEqual(["2"]);
  });

  it("filters by role code and search", () => {
    expect(filterUsers(list, { roleCode: "acct" }).map((x) => x.id)).toEqual(["2"]);
    expect(filterUsers(list, { search: "somchai" }).map((x) => x.id)).toEqual(["1"]);
    expect(filterUsers(list, { search: "มานี" }).map((x) => x.id)).toEqual(["2"]);
  });
});

describe("diffIds", () => {
  it("computes additions and removals", () => {
    expect(diffIds(["a", "b"], ["b", "c"])).toEqual({ toAdd: ["c"], toRemove: ["a"] });
    expect(diffIds([], ["x"])).toEqual({ toAdd: ["x"], toRemove: [] });
    expect(diffIds(["x"], ["x"])).toEqual({ toAdd: [], toRemove: [] });
  });
});

describe("selfLockout guard", () => {
  it("blocks removing own admin role or deactivating self", () => {
    expect(selfLockout(true, ["manager"], true)).toMatch(/แอดมิน/);
    expect(selfLockout(true, ["admin"], false)).toMatch(/ปิดใช้งาน/);
    expect(selfLockout(true, ["admin"], true)).toBeNull();
  });

  it("never blocks when editing another user", () => {
    expect(selfLockout(false, ["sales"], false)).toBeNull();
  });
});

describe("canManageUsers", () => {
  it("is admin-only", () => {
    expect(canManageUsers(["admin"])).toBe(true);
    expect(canManageUsers(["manager"])).toBe(false);
    expect(canManageUsers(["acct", "hr"])).toBe(false);
  });
});
