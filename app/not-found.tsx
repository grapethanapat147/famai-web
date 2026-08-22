import Link from "next/link";

export const metadata = { title: "ไม่พบหน้า — Famai Motor Group" };

/** 404 ทั้งแอป (เรียกจาก notFound(): เมนูที่ไม่รู้จัก + รหัสแคตตาล็อกที่ไม่มี) */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[16px] bg-card p-6 text-center shadow-[var(--sh-md)]">
        <span className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          Famai Motor Group
        </span>
        <p className="mt-5 font-display text-[40px] font-semibold leading-none text-ink">404</p>
        <p className="mt-2 text-sm text-ink-soft">ไม่พบหน้าที่ต้องการ — อาจถูกย้าย หรือลิงก์ไม่ถูกต้อง</p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-2 rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.97]"
        >
          กลับหน้าหลัก
          <span className="text-accent" aria-hidden>
            →
          </span>
        </Link>
      </div>
    </main>
  );
}
