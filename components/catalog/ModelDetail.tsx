"use client";

import { useState } from "react";
import Link from "next/link";
import { formatBaht } from "@/lib/format";
import { availabilityMeta, galleryImages, type CatalogModel } from "@/lib/catalog/model";

const DOT = { good: "bg-pos", warn: "bg-attn", off: "bg-muted" } as const;

export function ModelDetail({ model, supabaseUrl }: { model: CatalogModel; supabaseUrl: string }) {
  const images = galleryImages(supabaseUrl, model);
  const [idx, setIdx] = useState(0);
  const main = images[idx];
  const av = availabilityMeta(model.availability);
  const name = model.model_th || model.model;
  const specs = [model.cat, model.cc ? `${model.cc} ซีซี` : null, model.year ? `ปี ${model.year}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-hairline bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
            <span className="font-display text-lg font-semibold">Famai Motor Group</span>
          </div>
          <Link href="/catalog" className="text-sm font-medium text-accent hover:underline">
            ← แคตตาล็อก
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* แกลเลอรี */}
          <div>
            <div className="overflow-hidden rounded-[16px] bg-paper-2">
              <div className="aspect-[4/3]">
                {main ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={main.full} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-6xl font-display font-semibold text-muted/40">
                    {name.slice(0, 2)}
                  </div>
                )}
              </div>
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((im, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIdx(i)}
                    aria-label={`รูปที่ ${i + 1}`}
                    aria-pressed={i === idx}
                    className={`h-16 w-16 overflow-hidden rounded-[10px] border-2 transition-colors ${
                      i === idx ? "border-accent" : "border-hairline hover:border-ink/40"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.thumb} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ข้อมูล */}
          <div className="flex flex-col gap-4">
            <div>
              {model.cat && <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{model.cat}</p>}
              <h1 className="mt-0.5 font-display text-[clamp(1.5rem,4vw,2rem)] font-semibold leading-tight">{name}</h1>
              {specs && <p className="mt-1 text-sm text-muted">{specs}</p>}
            </div>

            <div className="flex items-center gap-3">
              <span className="font-display text-[28px] font-semibold tabular text-ink">
                {model.retail != null ? formatBaht(model.retail) : "สอบถามราคา"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-xs font-medium text-ink-soft">
                <span className={`h-1.5 w-1.5 rounded-full ${DOT[av.variant]}`} aria-hidden />
                {av.label}
              </span>
            </div>

            {model.colors && model.colors.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">สีที่มี ({model.colors.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {model.colors.map((c) => (
                    <span key={c.code} className="rounded-full border border-hairline bg-card px-3 py-1 text-sm text-ink-soft">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
              <p className="font-display font-semibold text-ink">สนใจรุ่นนี้?</p>
              <p className="mt-1 text-sm text-muted">สอบถามข้อมูล ทดลองขับ หรือจองได้ที่ร้าน · ราคาอาจเปลี่ยนแปลง</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/catalog"
                  className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft transition-colors hover:border-ink"
                >
                  ดูรุ่นอื่น
                </Link>
                <Link href="/status" className="rounded-[24px] bg-accent px-4 py-2 text-sm font-medium text-card">
                  เช็กสถานะซื้อรถ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
