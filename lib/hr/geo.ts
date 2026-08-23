/**
 * ลงเวลาแบบตรวจพิกัด (FAM-1101) — คำนวณระยะห่าง + ตรวจ geofence (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 */

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** ระยะห่างระหว่าง 2 พิกัด (เมตร) ตามสูตร haversine */
export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** อยู่ในรัศมีที่อนุญาตหรือไม่ */
export function withinGeofence(distanceM: number, radiusM: number): boolean {
  return distanceM <= radiusM;
}

/** ระยะห่างเป็นข้อความ เช่น "45 ม." หรือ "1.2 กม." */
export function formatDistanceM(m: number): string {
  if (m < 1000) {
    return `${Math.round(m)} ม.`;
  }
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} กม.`;
}

export type Geofence = { lat: number; lng: number; radiusM: number };

/** อ่าน geofence ของบริษัท — ตั้งครบ (lat/lng/รัศมี > 0) จึงเปิดใช้ · ไม่ครบ = ปิด (ลงเวลาได้ตามเดิม) */
export function branchGeofence(b: { geo_lat: number | null; geo_lng: number | null; geo_radius_m: number | null }): Geofence | null {
  if (b.geo_lat == null || b.geo_lng == null || !b.geo_radius_m || b.geo_radius_m <= 0) {
    return null;
  }
  return { lat: b.geo_lat, lng: b.geo_lng, radiusM: b.geo_radius_m };
}

/** ตรวจฟอร์มตั้งค่า geofence (ตั้งค่าระบบ) — ว่างทั้งหมด = ปิด · ไม่งั้นต้องครบและอยู่ในช่วง */
export function validateGeoConfig(
  lat: string,
  lng: string,
  radius: string,
): { ok: true; value: { lat: number | null; lng: number | null; radiusM: number | null } } | { ok: false; error: string } {
  if (lat.trim() === "" && lng.trim() === "" && radius.trim() === "") {
    return { ok: true, value: { lat: null, lng: null, radiusM: null } };
  }
  const la = Number(lat);
  const ln = Number(lng);
  const r = Number(radius);
  if (!Number.isFinite(la) || la < -90 || la > 90) {
    return { ok: false, error: "ละติจูดไม่ถูกต้อง (-90 ถึง 90)" };
  }
  if (!Number.isFinite(ln) || ln < -180 || ln > 180) {
    return { ok: false, error: "ลองจิจูดไม่ถูกต้อง (-180 ถึง 180)" };
  }
  if (!Number.isFinite(r) || r <= 0) {
    return { ok: false, error: "รัศมีต้องมากกว่า 0 (เมตร)" };
  }
  return { ok: true, value: { lat: la, lng: ln, radiusM: Math.round(r) } };
}
