import { describe, expect, it } from "vitest";
import {
  activeSiteCount,
  canManageSites,
  isSiteKind,
  nearestSite,
  RADIUS_MAX,
  RADIUS_MIN,
  validateSite,
  type SiteInput,
  type SiteRow,
} from "@/lib/branch/sites";

function site(over: Partial<SiteRow>): SiteRow {
  return {
    id: "s1",
    branchId: "b1",
    branchName: "Famai Motor Group",
    name: "สาขาปทุมธานี",
    kind: "main",
    lat: 13.940315,
    lng: 100.5422,
    radiusM: 150,
    isActive: true,
    ...over,
  };
}

describe("canManageSites", () => {
  it("เฉพาะ admin/manager (ตรง RLS branch_site_write = is_manager)", () => {
    expect(canManageSites(["admin"])).toBe(true);
    expect(canManageSites(["manager"])).toBe(true);
    expect(canManageSites(["hr"])).toBe(false);
    expect(canManageSites(["sales", "acct"])).toBe(false);
  });
});

describe("validateSite", () => {
  const base: SiteInput = { branchId: "b1", name: "สาขาปทุมธานี", kind: "main", lat: "13.9403", lng: "100.5422", radius: "150" };

  it("รับค่าปกติ", () => {
    const r = validateSite(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({ name: "สาขาปทุมธานี", kind: "main", radiusM: 150 });
    }
  });

  it.each([
    [{ branchId: "" }, "เลือกบริษัท"],
    [{ name: "  " }, "กรอกชื่อสาขา"],
    [{ kind: "หลัก" }, "ประเภทสาขาไม่ถูกต้อง"],
    [{ lat: "95" }, "ละติจูดไม่ถูกต้อง (-90 ถึง 90)"],
    [{ lng: "200" }, "ลองจิจูดไม่ถูกต้อง (-180 ถึง 180)"],
    [{ radius: "10" }, `รัศมีต้องอยู่ระหว่าง ${RADIUS_MIN}–${RADIUS_MAX} เมตร`],
    [{ radius: "5000" }, `รัศมีต้องอยู่ระหว่าง ${RADIUS_MIN}–${RADIUS_MAX} เมตร`],
  ])("ปฏิเสธ %o", (patch, error) => {
    const r = validateSite({ ...base, ...(patch as Partial<SiteInput>) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(error);
    }
  });
});

describe("nearestSite", () => {
  const sites = [
    site({ id: "a", name: "หน้าร้าน", lat: 13.940315, lng: 100.5422, radiusM: 150 }),
    site({ id: "b", name: "โกดัง", lat: 13.9500, lng: 100.5500, radiusM: 150 }),
    site({ id: "c", name: "ปิดใช้", lat: 13.940315, lng: 100.5422, isActive: false }),
    site({ id: "d", branchId: "b2", name: "คนละบริษัท", lat: 13.940315, lng: 100.5422 }),
  ];

  it("เลือกจุดใกล้สุดของบริษัทนั้น + บอกว่าอยู่ในรัศมีไหม", () => {
    const r = nearestSite(sites, "b1", 13.940315, 100.5422);
    expect(r?.site.id).toBe("a");
    expect(r?.distanceM).toBe(0);
    expect(r?.inside).toBe(true);
  });

  it("อยู่ไกล = นอกรัศมี (แต่ยังบอกจุดใกล้สุด)", () => {
    const r = nearestSite(sites, "b1", 13.9600, 100.5600);
    expect(r?.site.id).toBe("b");
    expect(r?.inside).toBe(false);
    expect(r!.distanceM).toBeGreaterThan(150);
  });

  it("ข้ามจุดที่ปิดใช้งาน + จุดของบริษัทอื่น", () => {
    const onlyClosed = nearestSite([site({ id: "x", isActive: false })], "b1", 13.94, 100.54);
    expect(onlyClosed).toBeNull();
    const otherBranch = nearestSite(sites, "b3", 13.94, 100.54);
    expect(otherBranch).toBeNull();
  });
});

describe("activeSiteCount / isSiteKind", () => {
  it("นับเฉพาะจุดที่เปิดของบริษัทนั้น", () => {
    const sites = [site({ id: "a" }), site({ id: "b", isActive: false }), site({ id: "c", branchId: "b2" })];
    expect(activeSiteCount(sites, "b1")).toBe(1);
    expect(activeSiteCount(sites, "b2")).toBe(1);
    expect(activeSiteCount(sites, "b9")).toBe(0);
  });
  it("รู้จักเฉพาะประเภทจริง", () => {
    expect(isSiteKind("main")).toBe(true);
    expect(isSiteKind("sub")).toBe(true);
    expect(isSiteKind("branch")).toBe(false);
  });
});
