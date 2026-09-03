/**
 * ไฟล์แนบ (บิลรับรถ / ใบเสร็จค่าใช้จ่าย / ใบทะเบียน …) — FAM-1134 · fixlist ข้อ 09
 * ฟังก์ชันบริสุทธิ์: ตรวจไฟล์ · สร้าง path · สิทธิ์ · จัดกลุ่ม — ใช้ทั้ง client (feedback สด) และ server (บังคับจริง)
 */

export type AttachmentActionResult = { ok: true; url?: string; message?: string } | { ok: false; error: string };

/** bucket ส่วนตัว (public=false — เข้าถึงผ่าน signed URL เท่านั้น) */
export const ATTACHMENT_BUCKET = "attachments";

/** ขนาดสูงสุดต่อไฟล์ — ตรงกับ file_size_limit ของ bucket (migration 37) */
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export const ATTACHMENT_MIME: readonly string[] = ["image/webp", "image/jpeg", "image/png", "application/pdf"];

/** รูปที่อัปจะถูกย่อเป็น webp ด้านยาวสุดเท่านี้ (PDF ส่งตามเดิม) */
export const ATTACHMENT_IMAGE_MAX = 1600;

/** ตารางที่แนบไฟล์ได้ + ชนิดที่เลือกได้ + ใครแนบได้ (ตรงกับสิทธิ์ของหน้านั้น) */
export const OWNER_TABLES = {
  expense: { label: "ค่าใช้จ่าย", kinds: ["ใบเสร็จ", "ใบกำกับภาษี", "อื่นๆ"], roles: ["admin", "manager", "acct"] },
  motorcycle_unit: { label: "รถ", kinds: ["บิลรับรถ", "ใบทะเบียน", "รูปรถ", "อื่นๆ"], roles: ["admin", "manager", "stock"] },
} as const;

export type OwnerTable = keyof typeof OWNER_TABLES;

export function isOwnerTable(v: string): v is OwnerTable {
  return v in OWNER_TABLES;
}

export function canAttach(ownerTable: OwnerTable, roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return OWNER_TABLES[ownerTable].roles.some((r) => roles.has(r));
}

export function kindsFor(ownerTable: OwnerTable): readonly string[] {
  return OWNER_TABLES[ownerTable].kinds;
}

export type AttachmentRow = {
  id: string;
  ownerTable: OwnerTable;
  ownerId: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  kind: string | null;
  uploadedAt: string; // ISO
  uploadedByName: string | null;
  uploadedBy: string | null;
};

export type FileMeta = { name: string; type: string; size: number };

/** ตรวจไฟล์ก่อนอัป — ชนิดและขนาดตรงกับที่ bucket ยอมรับ (ไม่งั้น storage จะปฏิเสธด้วยข้อความอ่านไม่ออก) */
export function validateAttachmentFile(f: FileMeta): { ok: true } | { ok: false; error: string } {
  if (!ATTACHMENT_MIME.includes(f.type)) {
    return { ok: false, error: "รับเฉพาะรูป (JPG/PNG/WebP) หรือ PDF" };
  }
  if (f.size <= 0) {
    return { ok: false, error: "ไฟล์ว่าง" };
  }
  if (f.size > ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: `ไฟล์ใหญ่เกิน ${formatBytes(ATTACHMENT_MAX_BYTES)} (ไฟล์นี้ ${formatBytes(f.size)})` };
  }
  return { ok: true };
}

/** ชื่อไฟล์ที่ปลอดภัยสำหรับ path ใน storage — เก็บนามสกุล ตัดอักขระแปลก ตัดยาว */
export function safeFileName(name: string): string {
  const leaf = name.split(/[\\/]/).pop() ?? "";
  const trimmed = leaf.trim().replace(/\s+/g, "-");
  const dot = trimmed.lastIndexOf(".");
  const base = (dot > 0 ? trimmed.slice(0, dot) : trimmed).replace(/[^\p{L}\p{M}\p{N}_-]/gu, "").slice(0, 60) || "file";
  const ext = (dot > 0 ? trimmed.slice(dot + 1) : "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return ext ? `${base}.${ext}` : base;
}

/** path ใน bucket — จัดกลุ่มตามเจ้าของ เพื่อให้ตรวจได้ว่าไฟล์ผูกกับแถวไหน และไม่ชนกัน */
export function attachmentObjectPath(ownerTable: OwnerTable, ownerId: string, stampMs: number, fileName: string): string {
  return `${ownerTable}/${ownerId}/${stampMs}-${safeFileName(fileName)}`;
}

/** path ต้องอยู่ใต้โฟลเดอร์ของเจ้าของนั้น — กันเอา path ของแถวอื่นมาผูก */
export function pathBelongsTo(path: string, ownerTable: OwnerTable, ownerId: string): boolean {
  return path.startsWith(`${ownerTable}/${ownerId}/`) && !path.includes("..");
}

export function isImageMime(mime: string | null): boolean {
  return Boolean(mime && mime.startsWith("image/"));
}

export function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(0)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** จัดกลุ่มไฟล์แนบตามแถวเจ้าของ (ใหม่สุดก่อน) */
export function groupByOwner(rows: readonly AttachmentRow[]): Map<string, AttachmentRow[]> {
  const map = new Map<string, AttachmentRow[]>();
  const sorted = [...rows].sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : a.uploadedAt > b.uploadedAt ? -1 : 0));
  for (const r of sorted) {
    const list = map.get(r.ownerId) ?? [];
    list.push(r);
    map.set(r.ownerId, list);
  }
  return map;
}
