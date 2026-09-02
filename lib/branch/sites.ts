/**
 * สาขา / จุดลงเวลา (FAM-1113) — ตาราง `branch_site` (migration 12) ที่มีอยู่ในฐานข้อมูลแล้ว
 * 1 บริษัท (branch) มีได้หลายสาขา/จุด · แต่ละจุดมีพิกัด + รัศมี ใช้ตรวจตอนพนักงานลงเวลา
 *
 * ทำไมใช้ branch_site แทน branch.geo_* (FAM-1101):
 *   branch.geo_* ตั้งได้จุดเดียวต่อบริษัท — ร้านที่มีหลายหน้าร้าน/โกดังจะครอบไม่พอ
 *   branch_site ออกแบบไว้รองรับหลายจุดตั้งแต่แรก จึงเป็นบ้านที่ถูกต้องของ "สาขา"
 */

import { haversineMeters } from "@/lib/hr/geo";

export type SiteActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type SiteKind = "main" | "sub" | "other";

export const SITE_KIND_LABEL: Record<SiteKind, string> = {
  main: "สาขาหลัก",
  sub: "สาขาย่อย",
  other: "จุดอื่นๆ",
};

export function isSiteKind(v: string): v is SiteKind {
  return v === "main" || v === "sub" || v === "other";
}

export type SiteRow = {
  id: string;
  branchId: string;
  branchName: string;
  name: string;
  kind: SiteKind;
  lat: number;
  lng: number;
  radiusM: number;
  isActive: boolean;
};

/** ขอบเขตรัศมีที่ DB ยอมรับ (check constraint ใน migration 12) */
export const RADIUS_MIN = 50;
export const RADIUS_MAX = 2000;

/** ผู้จัดการสาขา/จุดลงเวลา — ตรงกับ RLS branch_site_write (is_manager) */
const SITE_ROLES = ["admin", "manager"];
export function canManageSites(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return SITE_ROLES.some((r) => roles.has(r));
}

export type SiteInput = {
  branchId: string;
  name: string;
  kind: string;
  lat: string;
  lng: string;
  radius: string;
};

export type SiteValid = {
  branchId: string;
  name: string;
  kind: SiteKind;
  lat: number;
  lng: number;
  radiusM: number;
};

/** ตรวจฟอร์มสาขา — ชื่อ/บริษัท/พิกัดบังคับ · รัศมีต้องอยู่ในช่วงที่ DB ยอมรับ */
export function validateSite(input: SiteInput): { ok: true; value: SiteValid } | { ok: false; error: string } {
  if (input.branchId.trim() === "") {
    return { ok: false, error: "เลือกบริษัท" };
  }
  const name = input.name.trim();
  if (name === "") {
    return { ok: false, error: "กรอกชื่อสาขา" };
  }
  const kind = input.kind.trim();
  if (!isSiteKind(kind)) {
    return { ok: false, error: "ประเภทสาขาไม่ถูกต้อง" };
  }
  const lat = Number(input.lat);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { ok: false, error: "ละติจูดไม่ถูกต้อง (-90 ถึง 90)" };
  }
  const lng = Number(input.lng);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { ok: false, error: "ลองจิจูดไม่ถูกต้อง (-180 ถึง 180)" };
  }
  const radiusM = Math.round(Number(input.radius));
  if (!Number.isFinite(radiusM) || radiusM < RADIUS_MIN || radiusM > RADIUS_MAX) {
    return { ok: false, error: `รัศมีต้องอยู่ระหว่าง ${RADIUS_MIN}–${RADIUS_MAX} เมตร` };
  }
  return { ok: true, value: { branchId: input.branchId.trim(), name, kind, lat, lng, radiusM } };
}

export type NearestSite = { site: SiteRow; distanceM: number; inside: boolean };

/**
 * จุดที่ใกล้ที่สุดจากพิกัดที่ส่งมา (เฉพาะจุดที่เปิดใช้งานของบริษัทนั้น)
 * คืน null เมื่อบริษัทยังไม่มีจุด — ผู้เรียกตัดสินเองว่าจะปล่อยผ่านหรือใช้ geofence สำรอง
 */
export function nearestSite(sites: readonly SiteRow[], branchId: string, lat: number, lng: number): NearestSite | null {
  const candidates = sites.filter((s) => s.branchId === branchId && s.isActive);
  if (candidates.length === 0) {
    return null;
  }
  let best: NearestSite | null = null;
  for (const site of candidates) {
    const distanceM = Math.round(haversineMeters(lat, lng, site.lat, site.lng));
    if (!best || distanceM < best.distanceM) {
      best = { site, distanceM, inside: distanceM <= site.radiusM };
    }
  }
  return best;
}

/** นับจุดที่เปิดใช้งานต่อบริษัท — ใช้โชว์ว่าบริษัทไหนยังไม่ได้ปักหมุด */
export function activeSiteCount(sites: readonly SiteRow[], branchId: string): number {
  return sites.filter((s) => s.branchId === branchId && s.isActive).length;
}

/** บริษัทที่ยังมีพิกัดเก่าใน branch.geo_* ค้างอยู่ (FAM-1101) แต่ยังไม่มีจุดใน branch_site */
export type LegacyGeoBranch = { id: string; name: string; lat: number; lng: number; radiusM: number };

export function legacyGeoBranches(
  branches: readonly { id: string; name: string; geoLat: number | null; geoLng: number | null; geoRadiusM: number | null }[],
  sites: readonly SiteRow[],
): LegacyGeoBranch[] {
  const withSites = new Set(sites.map((s) => s.branchId));
  const out: LegacyGeoBranch[] = [];
  for (const b of branches) {
    if (withSites.has(b.id) || b.geoLat == null || b.geoLng == null || b.geoRadiusM == null) {
      continue;
    }
    out.push({ id: b.id, name: b.name, lat: b.geoLat, lng: b.geoLng, radiusM: b.geoRadiusM });
  }
  return out;
}
