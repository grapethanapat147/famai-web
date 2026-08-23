import { describe, expect, it } from "vitest";
import { branchGeofence, formatDistanceM, haversineMeters, validateGeoConfig, withinGeofence } from "@/lib/hr/geo";

describe("haversineMeters", () => {
  it("is 0 for the same point", () => {
    expect(haversineMeters(13.75, 100.5, 13.75, 100.5)).toBe(0);
  });
  it("~111 m for 0.001° of latitude", () => {
    const d = haversineMeters(13.75, 100.5, 13.751, 100.5);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });
  it("is symmetric", () => {
    const ab = haversineMeters(13.75, 100.5, 13.76, 100.52);
    const ba = haversineMeters(13.76, 100.52, 13.75, 100.5);
    expect(ab).toBeCloseTo(ba, 6);
  });
});

describe("withinGeofence", () => {
  it("true inside or on the radius, false outside", () => {
    expect(withinGeofence(40, 50)).toBe(true);
    expect(withinGeofence(50, 50)).toBe(true);
    expect(withinGeofence(51, 50)).toBe(false);
  });
});

describe("formatDistanceM", () => {
  it("metres under 1 km, km above", () => {
    expect(formatDistanceM(45)).toBe("45 ม.");
    expect(formatDistanceM(1200)).toBe("1.2 กม.");
    expect(formatDistanceM(15000)).toBe("15 กม.");
  });
});

describe("branchGeofence", () => {
  it("returns config when fully set", () => {
    expect(branchGeofence({ geo_lat: 13.75, geo_lng: 100.5, geo_radius_m: 100 })).toEqual({ lat: 13.75, lng: 100.5, radiusM: 100 });
  });
  it("null when any part missing or radius ≤ 0", () => {
    expect(branchGeofence({ geo_lat: 13.75, geo_lng: null, geo_radius_m: 100 })).toBeNull();
    expect(branchGeofence({ geo_lat: 13.75, geo_lng: 100.5, geo_radius_m: 0 })).toBeNull();
    expect(branchGeofence({ geo_lat: null, geo_lng: null, geo_radius_m: null })).toBeNull();
  });
});

describe("validateGeoConfig", () => {
  it("all blank → disabled (nulls)", () => {
    expect(validateGeoConfig("", "", "")).toEqual({ ok: true, value: { lat: null, lng: null, radiusM: null } });
  });
  it("accepts valid coords + radius", () => {
    expect(validateGeoConfig("13.75", "100.5", "120")).toEqual({ ok: true, value: { lat: 13.75, lng: 100.5, radiusM: 120 } });
  });
  it.each([
    ["91", "100.5", "100", "ละติจูดไม่ถูกต้อง (-90 ถึง 90)"],
    ["13.75", "181", "100", "ลองจิจูดไม่ถูกต้อง (-180 ถึง 180)"],
    ["13.75", "100.5", "0", "รัศมีต้องมากกว่า 0 (เมตร)"],
  ])("rejects %s,%s,%s", (lat, lng, r, msg) => {
    const res = validateGeoConfig(lat, lng, r);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe(msg);
    }
  });
});
