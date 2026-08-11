"use client";

import { Modal } from "@/components/ui/Modal";

/** R1: popup ยืนยันก่อนบันทึก/ส่งออกทุกหน้า — "ข้อมูลถูกต้องแล้วใช่ไหม" */
export function ConfirmDialog({
  open,
  title = "ยืนยันข้อมูล",
  message,
  confirmLabel = "ยืนยัน",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-ink-soft">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
