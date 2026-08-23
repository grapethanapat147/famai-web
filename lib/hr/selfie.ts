/**
 * เซลฟี่ยืนยันตอนลงเวลา (FAM-1101 P2) — ค่าคงที่ + ตัวสร้าง path (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 */

/** ด้านยาวสุดของเซลฟี่ (px) — เล็กพอให้อัปเร็ว แต่ยังเห็นหน้าชัด */
export const SELFIE_MAX = 720;

/** bucket ส่วนตัวเก็บเซลฟี่ (public=false) */
export const SELFIE_BUCKET = "attendance-selfie";

/** path ไฟล์เซลฟี่ใน bucket — จัดกลุ่มตามพนักงาน + วันเวลา เพื่อไม่ซ้ำและค้นง่าย */
export function selfieObjectPath(employeeId: string, workDate: string, stampMs: number): string {
  return `${employeeId}/${workDate}-${stampMs}.webp`;
}

/** แปลงผลลัพธ์ createSignedUrls → map path → signed URL (ข้ามตัวที่ error/ไม่มี url) */
export function buildSignedMap(results: ReadonlyArray<{ path?: string | null; signedUrl?: string | null }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of results) {
    if (r.path && r.signedUrl) {
      map.set(r.path, r.signedUrl);
    }
  }
  return map;
}
