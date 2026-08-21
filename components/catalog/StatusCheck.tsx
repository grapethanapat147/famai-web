"use client";

import { useState } from "react";
import Link from "next/link";
import { createPublicSupabase } from "@/lib/supabase/public";

type Found = {
  found: true;
  status: string;
  model: string;
  model_th: string;
  color: string;
  plate: string | null;
  delivered_at: string | null;
  customer: { name: string; phone: string };
  shop: { name: string; phone: string };
};
type StatusResult = { found: false } | Found;

export function StatusCheck() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<StatusResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const t = token.trim().toUpperCase();
    if (t.length < 8 || busy) {
      return;
    }
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const supabase = createPublicSupabase();
      const { data, error } = await supabase.rpc("order_status", { p_token: t });
      if (error) {
        throw new Error(error.message);
      }
      setRes(data as StatusResult);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-hairline bg-card">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
            <span className="font-display text-lg font-semibold">Famai Motor Group</span>
          </div>
          <Link href="/catalog" className="text-sm font-medium text-accent hover:underline">
            ← ดูแคตตาล็อก
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-10 lg:px-6">
        <h1 className="font-display text-[clamp(1.5rem,5vw,2rem)] font-semibold leading-tight">เช็กสถานะซื้อรถ</h1>
        <p className="mt-1 text-ink-soft">กรอกรหัสติดตามที่ได้รับจากร้าน เพื่อดูสถานะการดำเนินการ</p>

        <form onSubmit={check} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="รหัสติดตาม (เช่น A1B2C3D4E5F6)"
            className="w-full rounded-[10px] border border-hairline bg-card px-4 py-3 font-mono tracking-wider text-ink outline-none focus:border-ink"
            aria-label="รหัสติดตาม"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={token.trim().length < 8 || busy}
            className="shrink-0 rounded-[24px] bg-accent px-6 py-3 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "กำลังตรวจ…" : "เช็กสถานะ"}
          </button>
        </form>

        {err && (
          <div className="mt-4 rounded-[12px] border border-accent/30 bg-[var(--accent-wash)] p-4 text-sm text-accent-deep">
            {err}
          </div>
        )}

        {res && !res.found && (
          <div className="mt-4 rounded-[12px] bg-card p-6 text-center shadow-[var(--sh-sm)]">
            <p className="font-display font-semibold text-ink">ไม่พบรหัสนี้</p>
            <p className="mt-1 text-sm text-muted">ตรวจสอบรหัสอีกครั้ง หรือกรุณาติดต่อร้าน</p>
          </div>
        )}

        {res && res.found && (
          <div className="mt-4 flex flex-col gap-4 rounded-[12px] bg-card p-6 shadow-[var(--sh-sm)]">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">สถานะปัจจุบัน</p>
              <p className="mt-1 font-display text-2xl font-semibold leading-tight text-accent">{res.status}</p>
            </div>
            <dl className="flex flex-col gap-2 border-t border-hairline-2 pt-4 text-sm">
              <Row label="รุ่นรถ">{res.model_th || res.model}{res.color ? ` · ${res.color}` : ""}</Row>
              {res.plate && <Row label="ทะเบียน">{res.plate}</Row>}
              {res.delivered_at && <Row label="ส่งมอบเมื่อ">{new Date(res.delivered_at).toLocaleDateString("th-TH")}</Row>}
              <Row label="ลูกค้า">
                คุณ{res.customer.name} · {res.customer.phone}
              </Row>
            </dl>
            <div className="rounded-[10px] bg-paper-2 p-3 text-sm text-ink-soft">
              สอบถามเพิ่มเติม: <span className="font-medium text-ink">{res.shop.name}</span>
              {res.shop.phone ? ` · ${res.shop.phone}` : ""}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}
