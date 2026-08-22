"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * ตัวกันข้อผิดพลาดของ subtree ทั้งแอป (ยกเว้น root layout — ดู global-error.tsx)
 * ไม่โชว์รายละเอียด error ให้ผู้ใช้ · log ไว้ debug + โชว์ digest เป็นรหัสอ้างอิง
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[16px] bg-card p-6 text-center shadow-[var(--sh-md)]">
        <span className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <span className="h-2 w-2 rounded-full bg-attn" aria-hidden />
          Famai Motor Group
        </span>
        <p className="mt-5 font-display text-[22px] font-semibold leading-tight text-ink">เกิดข้อผิดพลาด</p>
        <p className="mt-2 text-sm text-ink-soft">ระบบมีปัญหาชั่วคราว ลองใหม่อีกครั้ง — หากยังไม่หาย แจ้งผู้ดูแลระบบ</p>
        {error.digest && <p className="mt-1 font-mono text-[11px] text-muted">รหัสอ้างอิง: {error.digest}</p>}
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.97]"
          >
            ลองใหม่
          </button>
          <Link
            href="/"
            className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft transition-transform active:scale-[0.97]"
          >
            หน้าหลัก
          </Link>
        </div>
      </div>
    </main>
  );
}
