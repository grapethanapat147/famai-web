/**
 * ย่อรูปรถฝั่งเครื่องก่อนอัป (migration 13: quality ดีแต่ประหยัดพื้นที่)
 * - แปลงเป็น WebP บน canvas → ลบ EXIF/GPS ในตัว, ไฟล์เล็ก
 * - อัปสองชั้น: card 640 (แกลเลอรี/กริด) · full 1600 (หน้ารายละเอียด)
 */

export const PHOTO_CARD_MAX = 640;
export const PHOTO_FULL_MAX = 1600;
export const PHOTO_QUALITY = 0.82;

/** คำนวณขนาดปลายทางแบบคงสัดส่วน ไม่ขยายเกินต้นฉบับ (fit within max×max) — ฟังก์ชันบริสุทธิ์ */
export function fitDimensions(width: number, height: number, max: number): { w: number; h: number } {
  if (width <= 0 || height <= 0) {
    return { w: 0, h: 0 };
  }
  const scale = Math.min(1, max / Math.max(width, height));
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
}

/** ผู้มีสิทธิ์จัดการรูปรุ่นรถ = admin/manager (ตรงกับ is_manager() ใน RLS ของ bucket) */
const PHOTO_ROLES = ["admin", "manager"];

export function canUploadModelPhoto(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return PHOTO_ROLES.some((r) => roles.has(r));
}

export type ModelPhotoResult = { ok: true } | { ok: false; error: string };

/** ย่อรูปเป็น WebP บน canvas (client เท่านั้น) — ปรับขนาด fit max×max + คุณภาพ 0.82 */
export async function resizeToWebp(file: File, max: number, quality = PHOTO_QUALITY): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { w, h } = fitDimensions(bitmap.width, bitmap.height, max);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("แปลงรูปไม่สำเร็จ");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("แปลงรูปไม่สำเร็จ"))), "image/webp", quality);
  });
}
