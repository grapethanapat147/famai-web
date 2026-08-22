"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchHit } from "@/app/api/search/route";

type Page = { title: string; href: string };

/**
 * ค้นหาทั่วเว็บ (FAM-1081) — ปุ่มบนแถบบน + Cmd/Ctrl+K → แผงค้นหา
 * หน้า/เมนู (ฝั่ง client) + รถ/ลูกค้า (ผ่าน /api/search ตาม RLS) · ลูกศรเลือก · Enter ไป · Esc ปิด
 */
export function SearchLauncher({ pages }: { pages: Page[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K เปิด-ปิด
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ล็อกสกอลล์ + โฟกัสช่องค้นหาเมื่อเปิด
  useEffect(() => {
    if (!open) {
      return;
    }
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = "";
      cancelAnimationFrame(id);
    };
  }, [open]);

  // ค้นข้อมูล (debounce) — รถ/ลูกค้า จาก API · setState อยู่ใน callback (ไม่ sync ใน effect)
  useEffect(() => {
    const term = q.trim();
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setHits([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json().catch(() => ({ results: [] }));
        setHits(Array.isArray(data.results) ? data.results : []);
      } catch {
        /* ยกเลิก/พลาด — ไม่ต้องทำอะไร */
      } finally {
        setLoading(false);
      }
    }, term.length < 2 ? 0 : 220);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const pageHits: SearchHit[] =
    q.trim().length >= 1
      ? pages
          .filter((p) => p.title.toLowerCase().includes(q.trim().toLowerCase()))
          .slice(0, 5)
          .map((p) => ({ type: "หน้า", label: p.title, sub: p.href, href: p.href }))
      : [];
  const all = [...pageHits, ...hits];

  function close() {
    setOpen(false);
    setQ("");
    setHits([]);
  }
  function go(hit: SearchHit | undefined) {
    if (!hit) {
      return;
    }
    close();
    router.push(hit.href);
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, all.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(all[active]);
    } else if (e.key === "Escape") {
      close();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="ค้นหา"
        title="ค้นหา (⌘K)"
        className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-card hover:text-ink"
      >
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="9" cy="9" r="5.5" />
          <path d="m17 17-3.5-3.5" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="ค้นหา">
          <button type="button" aria-label="ปิด" className="absolute inset-0 bg-ink/40" onClick={close} />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[16px] bg-card shadow-[var(--sh-lg)]">
            <div className="flex items-center gap-2 border-b border-hairline px-4">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
                <circle cx="9" cy="9" r="5.5" />
                <path d="m17 17-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="ค้นหารถ · ลูกค้า · หน้า…"
                aria-label="ช่องค้นหา"
                className="flex-1 bg-transparent py-3.5 text-base text-ink outline-none placeholder:text-muted"
              />
              <kbd className="hidden rounded-[6px] border border-hairline px-1.5 py-0.5 text-[11px] text-muted sm:block">Esc</kbd>
            </div>

            <div className="max-h-[55vh] overflow-y-auto py-2">
              {q.trim().length < 2 && pageHits.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted">พิมพ์เพื่อค้นหารถ (เลขเครื่อง/รุ่น) · ลูกค้า (ชื่อ/เบอร์) · หรือหน้าจอ</p>
              )}
              {q.trim().length >= 2 && all.length === 0 && !loading && (
                <p className="px-4 py-6 text-center text-sm text-muted">ไม่พบ “{q.trim()}”</p>
              )}
              {loading && all.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">กำลังค้นหา…</p>}

              <ul>
                {all.map((hit, i) => (
                  <li key={`${hit.href}-${i}`}>
                    <button
                      type="button"
                      onClick={() => go(hit)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${i === active ? "bg-paper-2" : ""}`}
                    >
                      <span className="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted">{hit.type}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{hit.label}</span>
                        {hit.sub && <span className="block truncate text-xs text-muted">{hit.sub}</span>}
                      </span>
                      <span className="shrink-0 text-muted" aria-hidden>
                        ↵
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
