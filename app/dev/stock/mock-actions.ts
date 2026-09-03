"use server";

import type { AttachmentActionResult } from "@/lib/attachments/attachments";

/**
 * mock action สำหรับพรีวิว /dev/stock — หน้านี้เป็น server component (อ่าน ?unit= จาก searchParams)
 * จึงส่งฟังก์ชันธรรมดาเข้า client component ไม่ได้ ต้องเป็น server action (ไฟล์ "use server")
 */
export async function mockAddAttachment(): Promise<AttachmentActionResult> {
  return { ok: true, message: "แนบไฟล์แล้ว (พรีวิว)" };
}
export async function mockRemoveAttachment(): Promise<AttachmentActionResult> {
  return { ok: true, message: "ลบแล้ว (พรีวิว)" };
}
export async function mockAttachmentUrl(): Promise<AttachmentActionResult> {
  return { ok: true, url: "about:blank" };
}
