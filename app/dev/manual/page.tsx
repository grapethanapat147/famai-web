import Link from "next/link";
import { MANUAL_BOOKS, MANUAL_EDITION } from "@/lib/manual/manual";

/** สารบัญคู่มือ (preview) — เปิดอ่านทีละเล่มหรือสั่งพิมพ์เป็น PDF เองก็ได้ (FAM-1138) */
export default function DevManualIndexPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">คู่มือการใช้งาน</h1>
        <p className="mt-1 text-ink-soft">
          {MANUAL_BOOKS.length} เล่ม · {MANUAL_EDITION} — เนื้อหาผูกกับเมนูและผังกระบวนการจริงในระบบ
        </p>
        <p className="mt-1 text-sm text-muted">
          ไฟล์ PDF ที่สร้างไว้แล้วอยู่ที่ <code className="font-mono">docs/manual/</code> · สร้างใหม่ด้วย{" "}
          <code className="font-mono">node tools/manual/build.js</code>
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {MANUAL_BOOKS.map((b) => (
          <li key={b.key}>
            <Link
              href={`/dev/manual/${b.key}`}
              className="flex items-center justify-between gap-3 rounded-[10px] border border-hairline bg-card px-4 py-3 shadow-[var(--sh-sm)]"
            >
              <span>
                <span className="block font-semibold text-ink">{b.title}</span>
                <span className="block text-sm text-ink-soft">{b.subtitle}</span>
              </span>
              <span className="font-mono text-xs text-muted">{b.file}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
