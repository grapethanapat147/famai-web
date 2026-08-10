import { ConnectionBadge } from "@/components/ConnectionBadge";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="rounded-2xl border border-line bg-card p-8 shadow-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1 text-sm font-medium text-white">
          Famai Motor Group
        </span>
        <h1 className="mt-6 text-2xl font-semibold text-ink">ระบบจัดการดีลเลอร์ Yamaha</h1>
        <p className="mt-2 text-ink-2">
          โครง Next.js + Supabase ตั้งต้นแล้ว (FAM-1001) — หน้าจอจริงจะทยอยพอร์ตจากต้นแบบ{" "}
          <code className="rounded bg-bg px-1 text-ink">index.html</code> v1.15
        </p>
        <div className="mt-6">
          <ConnectionBadge />
        </div>
      </div>
    </main>
  );
}
