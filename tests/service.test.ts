import { describe, it, expect } from "vitest";
import {
  SERVICE_STATUSES,
  nextStatuses,
  canTransition,
  isTerminal,
  statusVariant,
  isServiceStatus,
} from "@/lib/service/status";
import { filterJobs, statusCounts, openJobCount, canManageService, type ServiceJob } from "@/lib/service/jobs";

describe("service status machine", () => {
  it("allows only forward/side transitions", () => {
    expect(nextStatuses("รับเข้า")).toEqual(["กำลังซ่อม"]);
    expect(nextStatuses("กำลังซ่อม")).toEqual(["รออะไหล่", "เสร็จ"]);
    expect(nextStatuses("รออะไหล่")).toEqual(["กำลังซ่อม", "เสร็จ"]);
    expect(nextStatuses("เสร็จ")).toEqual(["ส่งมอบแล้ว"]);
  });

  it("blocks illegal jumps and terminal exits", () => {
    expect(canTransition("รับเข้า", "เสร็จ")).toBe(false);
    expect(canTransition("กำลังซ่อม", "เสร็จ")).toBe(true);
    expect(canTransition("ส่งมอบแล้ว", "เสร็จ")).toBe(false);
    expect(isTerminal("ส่งมอบแล้ว")).toBe(true);
    expect(isTerminal("รับเข้า")).toBe(false);
  });

  it("maps each status to a distinct badge variant", () => {
    const variants = SERVICE_STATUSES.map(statusVariant);
    expect(new Set(variants).size).toBe(SERVICE_STATUSES.length);
  });

  it("validates raw status strings", () => {
    expect(isServiceStatus("กำลังซ่อม")).toBe(true);
    expect(isServiceStatus("bogus")).toBe(false);
  });
});

function job(over: Partial<ServiceJob>): ServiceJob {
  return {
    id: "j",
    jobNo: "SVC-1",
    customerName: "สมชาย",
    vehicle: "NMAX",
    engineNo: "E1",
    odometerKm: 1000,
    serviceType: "เช็กระยะ",
    symptom: "",
    status: "รับเข้า",
    technicianName: null,
    checkedInAt: "2026-08-01T09:00:00Z",
    laborCost: 300,
    partsCost: 200,
    total: 500,
    lines: [],
    ...over,
  };
}

describe("filterJobs", () => {
  const jobs = [
    job({ id: "1", jobNo: "SVC-1", status: "กำลังซ่อม", checkedInAt: "2026-08-01T09:00:00Z" }),
    job({ id: "2", jobNo: "SVC-2", customerName: "มานี", vehicle: "Aerox", status: "เสร็จ", checkedInAt: "2026-08-05T09:00:00Z" }),
  ];

  it("filters by status", () => {
    expect(filterJobs(jobs, { status: "เสร็จ" }).map((j) => j.id)).toEqual(["2"]);
    expect(filterJobs(jobs, { status: "all" })).toHaveLength(2);
  });

  it("filters by search across job/customer/vehicle", () => {
    expect(filterJobs(jobs, { search: "aerox" }).map((j) => j.id)).toEqual(["2"]);
    expect(filterJobs(jobs, { search: "มานี" }).map((j) => j.id)).toEqual(["2"]);
  });

  it("filters by fromDate (checked-in on/after)", () => {
    expect(filterJobs(jobs, { fromDate: "2026-08-03" }).map((j) => j.id)).toEqual(["2"]);
  });
});

describe("counts", () => {
  const jobs = [
    job({ status: "รับเข้า" }),
    job({ status: "กำลังซ่อม" }),
    job({ status: "กำลังซ่อม" }),
    job({ status: "ส่งมอบแล้ว" }),
  ];

  it("statusCounts covers all statuses incl. zero", () => {
    const c = statusCounts(jobs);
    expect(c["กำลังซ่อม"]).toBe(2);
    expect(c["รออะไหล่"]).toBe(0);
    expect(Object.keys(c)).toHaveLength(SERVICE_STATUSES.length);
  });

  it("openJobCount excludes delivered jobs", () => {
    expect(openJobCount(jobs)).toBe(3);
  });
});

describe("canManageService", () => {
  it("is true for service roles, false otherwise", () => {
    expect(canManageService(["tech"])).toBe(true);
    expect(canManageService(["stock"])).toBe(true);
    expect(canManageService(["sales"])).toBe(false);
    expect(canManageService(["acct"])).toBe(false);
  });
});
