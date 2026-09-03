import type { TypedSupabaseClient } from "@/lib/supabase/client-type";
import { groupByOwner, isOwnerTable, type AttachmentRow, type OwnerTable } from "@/lib/attachments/attachments";

/**
 * โหลดไฟล์แนบของแถวหลายแถวในคำสั่งเดียว แล้วจัดกลุ่มตามเจ้าของ (server เท่านั้น)
 * ไม่สร้าง signed URL ที่นี่ — ลิงก์เปิดไฟล์สร้างตอนกด (attachmentUrl) เพราะหน้าหนึ่งมีได้หลายร้อยแถว
 */
export async function loadAttachments(
  supabase: TypedSupabaseClient,
  ownerTable: OwnerTable,
  ownerIds: readonly string[],
): Promise<Map<string, AttachmentRow[]>> {
  if (ownerIds.length === 0) {
    return new Map();
  }
  const [{ data: rows }, { data: users }] = await Promise.all([
    supabase
      .from("attachment")
      .select("id, owner_table, owner_id, file_path, file_name, mime_type, size_bytes, kind, uploaded_by, uploaded_at")
      .eq("owner_table", ownerTable)
      .in("owner_id", [...ownerIds]),
    supabase.from("app_user").select("id, full_name"),
  ]);
  const name = new Map((users ?? []).map((u) => [u.id, u.full_name]));
  const list: AttachmentRow[] = (rows ?? [])
    .filter((r) => isOwnerTable(r.owner_table))
    .map((r) => ({
      id: r.id,
      ownerTable: r.owner_table as OwnerTable,
      ownerId: r.owner_id,
      fileName: r.file_name,
      filePath: r.file_path,
      mimeType: r.mime_type,
      sizeBytes: r.size_bytes != null ? Number(r.size_bytes) : null,
      kind: r.kind,
      uploadedAt: r.uploaded_at,
      uploadedBy: r.uploaded_by,
      uploadedByName: (r.uploaded_by && name.get(r.uploaded_by)) || null,
    }));
  return groupByOwner(list);
}
