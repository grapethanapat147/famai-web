import { ConnectionBadge } from "@/components/ConnectionBadge";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="rounded-[16px] bg-card p-8 shadow-[0_8px_24px_rgba(22,24,29,0.10)]">
        <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-sm font-medium text-card">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          Famai Motor Group
        </span>
        <h1 className="mt-6 font-display text-[28px] font-semibold leading-tight text-ink">
          ระบบจัดการดีลเลอร์ Yamaha
        </h1>
        <p className="mt-2 text-ink-soft">
          โครง Next.js + Supabase ตั้งต้นแล้ว — หน้าจอจริงจะทยอยพอร์ตจากต้นแบบ{" "}
          <code className="rounded bg-paper-2 px-1 font-mono text-ink">index.html</code> v1.15
        </p>
        <div className="mt-6">
          <ConnectionBadge />
        </div>
      </div>
    </main>
  );
}
