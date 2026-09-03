"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { resizeToWebp } from "@/lib/models/image";
import { formatThaiDate } from "@/lib/format";
import {
  ATTACHMENT_BUCKET,
  ATTACHMENT_IMAGE_MAX,
  attachmentObjectPath,
  formatBytes,
  isImageMime,
  kindsFor,
  validateAttachmentFile,
  type AttachmentActionResult,
  type AttachmentRow,
  type OwnerTable,
} from "@/lib/attachments/attachments";

/**
 * แผงไฟล์แนบของแถวหนึ่ง (ค่าใช้จ่าย / คันรถ) — FAM-1134 · fixlist ข้อ 09
 * อัป: ตรวจไฟล์ → รูปย่อเป็น webp (PDF ส่งตามเดิม) → อัปเข้า bucket จาก client → เรียก action ผูกกับแถว
 * เปิด: ขอ signed URL ตอนกด (bucket ส่วนตัว) · ลบ: เจ้าของไฟล์หรือแอดมิน
 */
export function AttachmentPanel({
  ownerTable,
  ownerId,
  items,
  canManage,
  canDeleteAny = false,
  currentUserId,
  addAction,
  removeAction,
  urlAction,
}: {
  ownerTable: OwnerTable;
  ownerId: string;
  items: AttachmentRow[];
  canManage: boolean;
  canDeleteAny?: boolean;
  currentUserId?: string | null;
  addAction?: (formData: FormData) => Promise<AttachmentActionResult>;
  removeAction?: (formData: FormData) => Promise<AttachmentActionResult>;
  urlAction?: (formData: FormData) => Promise<AttachmentActionResult>;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const kinds = kindsFor(ownerTable);
  const [kind, setKind] = useState<string>(kinds[0]);
  const [busy, setBusy] = useState<"upload" | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    if (!addAction || busy) {
      return;
    }
    const check = validateAttachmentFile({ name: file.name, type: file.type, size: file.size });
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setBusy("upload");
    setError(null);
    try {
      let blob: Blob = file;
      let mime = file.type;
      let name = file.name;
      if (isImageMime(file.type)) {
        blob = await resizeToWebp(file, ATTACHMENT_IMAGE_MAX);
        mime = "image/webp";
        name = name.replace(/\.[^.]+$/, "") + ".webp";
      }
      const path = attachmentObjectPath(ownerTable, ownerId, Date.now(), name);
      const supabase = createBrowserSupabase();
      const up = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, blob, { contentType: mime, upsert: false });
      if (up.error) {
        throw new Error(up.error.message);
      }
      const fd = new FormData();
      fd.set("owner_table", ownerTable);
      fd.set("owner_id", ownerId);
      fd.set("file_path", path);
      fd.set("file_name", name);
      fd.set("mime_type", mime);
      fd.set("size_bytes", String(blob.size));
      fd.set("kind", kind);
      const res = await addAction(fd);
      if (!res.ok) {
        throw new Error(res.error);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ — ลองใหม่อีกครั้ง");
    } finally {
      setBusy(null);
      if (input.current) {
        input.current.value = "";
      }
    }
  }

  async function open(item: AttachmentRow) {
    if (!urlAction || busy) {
      return;
    }
    setBusy(item.id);
    setError(null);
    const fd = new FormData();
    fd.set("attachment_id", item.id);
    const res = await urlAction(fd);
    setBusy(null);
    if (res.ok && res.url) {
      window.open(res.url, "_blank", "noopener");
    } else if (!res.ok) {
      setError(res.error);
    }
  }

  async function remove(item: AttachmentRow) {
    if (!removeAction || busy) {
      return;
    }
    if (!window.confirm(`ลบ "${item.fileName}" ออกจากรายการนี้?`)) {
      return;
    }
    setBusy(item.id);
    setError(null);
    const fd = new FormData();
    fd.set("attachment_id", item.id);
    const res = await removeAction(fd);
    setBusy(null);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-[12px] bg-paper p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">ไฟล์แนบ · {items.length}</p>
        {canManage && addAction && (
          <div className="flex items-center gap-1.5">
            <select
              aria-label="ชนิดไฟล์แนบ"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="rounded-[8px] border border-hairline bg-card px-2 py-1 text-xs text-ink-soft"
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  void upload(f);
                }
              }}
            />
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => input.current?.click()}
              className="rounded-[20px] bg-ink px-3 py-1.5 text-xs font-medium text-card disabled:opacity-50"
            >
              {busy === "upload" ? "กำลังอัป…" : "+ แนบไฟล์"}
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted">{canManage ? "ยังไม่มีไฟล์แนบ — รูปหรือ PDF ไม่เกิน 5 MB" : "ยังไม่มีไฟล์แนบ"}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((it) => {
            const mine = currentUserId != null && it.uploadedBy === currentUserId;
            return (
              <li key={it.id} className="flex items-center justify-between gap-2 border-b border-hairline-2 py-1.5 text-sm last:border-0">
                <button
                  type="button"
                  onClick={() => open(it)}
                  disabled={!urlAction || busy !== null}
                  className="min-w-0 flex-1 truncate text-left text-ink hover:underline disabled:no-underline"
                  title="เปิดไฟล์"
                >
                  {isImageMime(it.mimeType) ? "🖼" : "📄"} {it.fileName}
                  <span className="ml-1.5 text-xs text-muted">
                    {it.kind ? `${it.kind} · ` : ""}
                    {it.sizeBytes != null ? `${formatBytes(it.sizeBytes)} · ` : ""}
                    {formatThaiDate(it.uploadedAt)}
                    {it.uploadedByName ? ` · ${it.uploadedByName}` : ""}
                  </span>
                </button>
                {removeAction && (mine || canDeleteAny) && (
                  <button
                    type="button"
                    onClick={() => remove(it)}
                    disabled={busy !== null}
                    className="shrink-0 text-xs text-accent hover:underline disabled:opacity-50"
                  >
                    ลบ
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <StatusBadge variant="bad">{error}</StatusBadge>}
    </div>
  );
}
