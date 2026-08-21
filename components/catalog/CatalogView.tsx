"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatBaht } from "@/lib/format";
import { availabilityMeta, catalogPhotoUrl, type CatalogModel } from "@/lib/catalog/model";

const DOT = { good: "bg-pos", warn: "bg-attn", off: "bg-muted" } as const;

export function CatalogView({ models, supabaseUrl }: { models: CatalogModel[]; supabaseUrl: string }) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  const cats = useMemo(() => {
    const set = new Set<string>();
    for (const m of models) {
      if (m.cat) {
        set.add(m.cat);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, "th"));
  }, [models]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return models.filter((m) => {
      if (cat !== "all" && m.cat !== cat) {
        return false;
      }
      if (needle && !`${m.model} ${m.model_th}`.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
  }, [models, cat, q]);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-hairline bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
            <span className="font-display text-lg font-semibold">Famai Motor Group</span>
          </div>
          <Link href="/status" className="text-sm font-medium text-accent hover:underline">
            เช็กสถานะซื้อรถ →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        <div className="mb-6">
          <h1 className="font-display text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-tight">
            แคตตาล็อกรถจักรยานยนต์ Yamaha
          </h1>
          <p className="mt-1 text-ink-soft">เลือกดูรุ่น ราคา และสีที่มีจำหน่าย · สอบถาม/จองที่ร้านได้เลย</p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {[{ value: "all", label: "ทุกประเภท" }, ...cats.map((c) => ({ value: c, label: c }))].map((o) => {
              const on = cat === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setCat(o.value)}
                  aria-pressed={on}
                  className={`rounded-full px-3 py-1.5 text-sm transition active:scale-95 ${
                    on ? "bg-ink text-card" : "border border-hairline bg-card text-ink-soft hover:border-ink/40 hover:text-ink"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นชื่อรุ่น"
            className="w-full rounded-[10px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink sm:w-56"
            aria-label="ค้นหารุ่น"
          />
        </div>

        {shown.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-hairline p-10 text-center text-muted">
            ไม่พบรุ่นที่ค้นหา
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((m) => {
              const photo = catalogPhotoUrl(supabaseUrl, m);
              const av = availabilityMeta(m.availability);
              return (
                <Link
                  key={m.code}
                  href={`/catalog/${m.code}`}
                  className="group flex flex-col overflow-hidden rounded-[14px] bg-card shadow-[var(--sh-sm)] transition-shadow hover:shadow-[var(--sh-md)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-paper-2">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={m.model_th || m.model}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-3xl font-display font-semibold text-muted/40">
                        {(m.model_th || m.model).slice(0, 2)}
                      </div>
                    )}
                    <span
                      className={`absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-medium text-ink-soft backdrop-blur`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${DOT[av.variant]}`} aria-hidden />
                      {av.label}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <h2 className="font-display font-semibold leading-tight text-ink">{m.model_th || m.model}</h2>
                    <p className="text-xs text-muted">
                      {[m.cat, m.cc ? `${m.cc} ซีซี` : null, m.year ? `ปี ${m.year}` : null].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold tabular text-ink">
                      {m.retail != null ? formatBaht(m.retail) : "สอบถามราคา"}
                    </p>
                    {m.colors && m.colors.length > 0 && (
                      <p className="mt-auto pt-2 text-xs text-muted">{m.colors.length} สี</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted lg:px-6">
          Famai Motor Group · ตัวแทนจำหน่าย Yamaha · ราคาอาจเปลี่ยนแปลง สอบถามที่ร้าน
        </div>
      </footer>
    </div>
  );
}
