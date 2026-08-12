import { describe, it, expect } from "vitest";
import {
  directionOf,
  filterTransfers,
  transferCounts,
  sameCompany,
  statusVariant,
  canManageTransfer,
  TRANSFER_STATUS_LABEL,
  type Transfer,
} from "@/lib/transfer/transfers";

function tr(over: Partial<Transfer>): Transfer {
  return {
    id: "t",
    unitId: "u",
    vehicle: "NMAX",
    engineNo: "E1",
    fromBranchId: "b1",
    fromBranch: "สาขา 1",
    toBranchId: "b2",
    toBranch: "สาขา 2",
    status: "in_transit",
    requestedAt: "2026-08-10T00:00:00Z",
    receivedAt: null,
    note: null,
    ...over,
  };
}

describe("direction relative to my branches", () => {
  it("in = destination mine, out = source mine, both = both", () => {
    expect(directionOf(tr({}), ["b2"])).toBe("in");
    expect(directionOf(tr({}), ["b1"])).toBe("out");
    expect(directionOf(tr({}), ["b1", "b2"])).toBe("both");
    expect(directionOf(tr({}), ["b9"])).toBe("other");
  });
});

describe("filterTransfers", () => {
  const list = [
    tr({ id: "1", fromBranchId: "b1", toBranchId: "b2", status: "in_transit" }), // out for b1, in for b2
    tr({ id: "2", fromBranchId: "b3", toBranchId: "b1", status: "received", vehicle: "Aerox" }), // in for b1
  ];

  it("filters by status", () => {
    expect(filterTransfers(list, { status: "received" }).map((t) => t.id)).toEqual(["2"]);
  });

  it("direction in/out relative to my branch b1", () => {
    expect(filterTransfers(list, { direction: "out", myBranchIds: ["b1"] }).map((t) => t.id)).toEqual(["1"]);
    expect(filterTransfers(list, { direction: "in", myBranchIds: ["b1"] }).map((t) => t.id)).toEqual(["2"]);
  });

  it("search matches vehicle/engine/branch", () => {
    expect(filterTransfers(list, { search: "aerox" }).map((t) => t.id)).toEqual(["2"]);
  });
});

describe("transferCounts", () => {
  it("inTransit total and incoming (in_transit + destination mine)", () => {
    const list = [
      tr({ toBranchId: "b1", status: "in_transit" }), // incoming to b1
      tr({ toBranchId: "b9", fromBranchId: "b1", status: "in_transit" }), // outgoing from b1
      tr({ toBranchId: "b1", status: "received" }), // not counted
    ];
    const c = transferCounts(list, ["b1"]);
    expect(c.inTransit).toBe(2);
    expect(c.incoming).toBe(1);
  });
});

describe("sameCompany (R1 B1)", () => {
  it("blocks only when both known and different", () => {
    expect(sameCompany("c1", "c2")).toBe(false);
    expect(sameCompany("c1", "c1")).toBe(true);
    expect(sameCompany(null, "c2")).toBe(true); // ยังไม่มีข้อมูลบริษัท → อนุญาต
    expect(sameCompany(undefined, undefined)).toBe(true);
  });
});

describe("labels + gate", () => {
  it("status labels and variants exist", () => {
    expect(TRANSFER_STATUS_LABEL.in_transit).toBe("กำลังโอน");
    expect(statusVariant("received")).toBe("good");
  });

  it("canManageTransfer gates to stock roles", () => {
    expect(canManageTransfer(["stock"])).toBe(true);
    expect(canManageTransfer(["manager"])).toBe(true);
    expect(canManageTransfer(["sales"])).toBe(false);
    expect(canManageTransfer(["acct"])).toBe(false);
  });
});
