"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import {
  ATTACHMENT_BUCKET,
  canAttach,
  isOwnerTable,
  kindsFor,
  pathBelongsTo,
  validateAttachmentFile,
  type AttachmentActionResult,
} from "@/lib/attachments/attachments";

/** หน้าที่ต้องรีเฟรชเมื่อไฟล์แนบเปลี่ยน — แยกตามตารางเจ้าของ */
const PATHS: Record<string, string[]> = {
  expense: ["/expense"],
  motorcycle_unit: ["/stock", "/recv"],
};

/**
 * ผูกไฟล์ที่อัปขึ้น storage แล้วกับแถวเจ้าของ (FAM-1134 · fixlist ข้อ 09)
 * client อัปไฟล์เข้า bucket ก่อน (เหมือนเซลฟี่ลงเวลา) แล้วส่ง path มา — ที่นี่ตรวจสิทธิ์ + ตรวจว่า path อยู่ใต้โฟลเดอร์ของแถวนั้นจริง
 */
export async function addAttachment(formData: FormData): Promise<AttachmentActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }

  const ownerTable = String(formData.get("owner_table") ?? "").trim();
  const ownerId = String(formData.get("owner_id") ?? "").trim();
  const filePath = String(formData.get("file_path") ?? "").trim();
  const fileName = String(formData.get("file_name") ?? "").trim();
  const mimeType = String(formData.get("mime_type") ?? "").trim();
  const sizeBytes = Number(formData.get("size_bytes"));
  const kind = String(formData.get("kind") ?? "").trim();

  if (!isOwnerTable(ownerTable)) {
    return { ok: false, error: "แนบไฟล์กับรายการชนิดนี้ไม่ได้" };
  }
  if (!canAttach(ownerTable, user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์แนบไฟล์กับรายการนี้" };
  }
  if (!ownerId || !filePath || !fileName) {
    return { ok: false, error: "ข้อมูลไฟล์ไม่ครบ" };
  }
  if (!pathBelongsTo(filePath, ownerTable, ownerId)) {
    return { ok: false, error: "ตำแหน่งไฟล์ไม่ตรงกับรายการ" };
  }
  const check = validateAttachmentFile({ name: fileName, type: mimeType, size: sizeBytes });
  if (!check.ok) {
    return { ok: false, error: check.error };
  }
  if (!kindsFor(ownerTable).includes(kind)) {
    return { ok: false, error: "เลือกชนิดไฟล์แนบ" };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("attachment").insert({
    owner_table: ownerTable,
    owner_id: ownerId,
    file_path: filePath,
    file_name: fileName,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    kind,
    uploaded_by: user.id,
  });
  if (error) {
    return { ok: false, error: "บันทึกไฟล์แนบไม่สำเร็จ (สิทธิ์ไม่พอ หรือฐานข้อมูลผิดพลาด)" };
  }

  for (const p of PATHS[ownerTable] ?? []) {
    revalidatePath(p);
  }
  return { ok: true, message: "แนบไฟล์แล้ว" };
}

/** ลบไฟล์แนบ — ลบ object ใน storage แล้วค่อยลบแถว (RLS/นโยบาย storage: เจ้าของไฟล์หรือแอดมินเท่านั้น) */
export async function removeAttachment(formData: FormData): Promise<AttachmentActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  const id = String(formData.get("attachment_id") ?? "").trim();
  if (!id) {
    return { ok: false, error: "ไม่พบไฟล์แนบ" };
  }

  const supabase = await createServerSupabase();
  const { data: row } = await supabase.from("attachment").select("id, owner_table, file_path, uploaded_by").eq("id", id).maybeSingle();
  if (!row) {
    return { ok: false, error: "ไม่พบไฟล์แนบ" };
  }
  if (row.uploaded_by !== user.id && !user.perms.admin) {
    return { ok: false, error: "ลบได้เฉพาะไฟล์ที่ตัวเองแนบ หรือผู้ดูแลระบบ" };
  }

  const { error: storageError } = await supabase.storage.from(ATTACHMENT_BUCKET).remove([row.file_path]);
  if (storageError) {
    return { ok: false, error: "ลบไฟล์ใน storage ไม่สำเร็จ — ลองใหม่อีกครั้ง" };
  }
  const { error } = await supabase.from("attachment").delete().eq("id", id);
  if (error) {
    return { ok: false, error: "ลบรายการไฟล์แนบไม่สำเร็จ" };
  }

  for (const p of PATHS[row.owner_table] ?? []) {
    revalidatePath(p);
  }
  return { ok: true, message: "ลบไฟล์แนบแล้ว" };
}

/** ลิงก์เปิดไฟล์ชั่วคราว (bucket เป็นส่วนตัว) — สร้างตอนกดเปิดเท่านั้น ไม่ฝังลิงก์ยาว ๆ ในหน้า */
export async function attachmentUrl(formData: FormData): Promise<AttachmentActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  const id = String(formData.get("attachment_id") ?? "").trim();
  const supabase = await createServerSupabase();
  const { data: row } = await supabase.from("attachment").select("file_path").eq("id", id).maybeSingle();
  if (!row) {
    return { ok: false, error: "ไม่พบไฟล์แนบ" };
  }
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(row.file_path, 300);
  if (error || !data?.signedUrl) {
    return { ok: false, error: "เปิดไฟล์ไม่สำเร็จ — ลองใหม่อีกครั้ง" };
  }
  return { ok: true, url: data.signedUrl };
}
