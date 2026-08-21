import { describe, it, expect } from "vitest";
import { productJsonLd, breadcrumbJsonLd, catalogItemListJsonLd } from "@/lib/catalog/jsonld";
import type { CatalogModel } from "@/lib/catalog/model";

const base = "https://famai.example.com/";
const sb = "https://proj.supabase.co";

const model = (over: Partial<CatalogModel> = {}): CatalogModel =>
  ({
    code: "BTF200",
    model: "NMAX",
    model_th: "เอ็นแม็กซ์",
    cat: "ออโตเมติก",
    cc: 155,
    year: 2026,
    retail: 92000,
    availability: "ready",
    photo: null,
    photos: null,
    colors: null,
    ...over,
  }) as CatalogModel;

describe("productJsonLd", () => {
  it("builds a Product with Offer (price, THB, InStock) and trims base slash", () => {
    const j = productJsonLd(base, sb, model());
    expect(j["@type"]).toBe("Product");
    expect(j.name).toBe("เอ็นแม็กซ์");
    expect(j.url).toBe("https://famai.example.com/catalog/BTF200");
    expect(j.brand).toEqual({ "@type": "Brand", name: "Yamaha" });
    expect(j.offers).toMatchObject({
      "@type": "Offer",
      price: 92000,
      priceCurrency: "THB",
      availability: "https://schema.org/InStock",
    });
  });
  it("maps availability low → LimitedAvailability", () => {
    const j = productJsonLd(base, sb, model({ availability: "low" }));
    expect((j.offers as Record<string, unknown>).availability).toBe("https://schema.org/LimitedAvailability");
  });
  it("omits offers when retail is null; falls back image to og endpoint", () => {
    const j = productJsonLd(base, sb, model({ retail: null }));
    expect(j.offers).toBeUndefined();
    expect(j.image).toBe("https://famai.example.com/catalog/BTF200/opengraph-image");
  });
  it("uses the real photo url as image when present", () => {
    const j = productJsonLd(base, sb, model({ photos: [{ card: "v/c.webp", full: "v/f.webp" }] }));
    expect(j.image).toBe("https://proj.supabase.co/storage/v1/object/public/model-photo/v/c.webp");
  });
});

describe("breadcrumbJsonLd", () => {
  it("lists แคตตาล็อก → รุ่น", () => {
    const items = breadcrumbJsonLd(base, model()).itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ position: 2, name: "เอ็นแม็กซ์", item: "https://famai.example.com/catalog/BTF200" });
  });
});

describe("catalogItemListJsonLd", () => {
  it("maps models to positioned ListItems", () => {
    const j = catalogItemListJsonLd(base, [model(), model({ code: "B6FU00", model_th: "ฟินน์" })]);
    const items = j.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(1);
    expect(items[1]).toMatchObject({ name: "ฟินน์", url: "https://famai.example.com/catalog/B6FU00" });
  });
});
