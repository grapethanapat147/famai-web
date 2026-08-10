"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Status = "checking" | "ok" | "error" | "unconfigured";

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/**
 * ตรวจการเชื่อมต่อ Supabase ผ่าน public API (`pub.model`) ฝั่ง client เท่านั้น
 * — anon อ่าน pub.model ได้ 200 (docs/06 §10); ถ้าไม่ตั้ง env จะขึ้น "ยังไม่ตั้งค่า"
 */
export function ConnectionBadge() {
  const [status, setStatus] = useState<Status>(configured ? "checking" : "unconfigured");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    if (!configured) return;

    let active = true;
    (async () => {
      try {
        const { error } = await createBrowserSupabase()
          .schema("pub")
          .from("model")
          .select("code")
          .limit(1);
        if (!active) return;
        if (error) {
          setStatus("error");
          setDetail(error.message);
        } else {
          setStatus("ok");
        }
      } catch (e: unknown) {
        if (!active) return;
        setStatus("error");
        setDetail(String(e));
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const view: Record<Status, { dot: string; text: string }> = {
    checking: { dot: "bg-ink-3", text: "กำลังตรวจการเชื่อมต่อ…" },
    ok: { dot: "bg-info", text: "เชื่อมต่อ Supabase (public API) สำเร็จ" },
    error: { dot: "bg-brand", text: `เชื่อมต่อไม่ได้: ${detail}` },
    unconfigured: { dot: "bg-ink-3", text: "ยังไม่ตั้งค่า .env.local (NEXT_PUBLIC_SUPABASE_*)" },
  };

  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-2">
      <span className={`h-2.5 w-2.5 rounded-full ${view[status].dot}`} aria-hidden />
      {view[status].text}
    </span>
  );
}
