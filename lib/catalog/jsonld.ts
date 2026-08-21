/** Structured data (schema.org) สำหรับหน้าสาธารณะ — pure เพื่อเทสได้ (E11 SEO) */
import { catalogPhotoUrl, type CatalogModel } from "@/lib/catalog/model";

const AVAIL_SCHEMA: Record<string, string> = {
  ready: "https://schema.org/InStock",
  low: "https://schema.org/LimitedAvailability",
  out: "https://schema.org/OutOfStock",
};

function trimBase(base: string): string {
  return base.replace(/\/$/, "");
}

/** Product + Offer (ราคา/ความพร้อม) สำหรับหน้ารายละเอียดรุ่น → rich result ราคา/สต๊อก */
export function productJsonLd(base: string, supabaseUrl: string, m: CatalogModel): Record<string, unknown> {
  const b = trimBase(base);
  const name = m.model_th || m.model;
  const image = catalogPhotoUrl(supabaseUrl, m) ?? `${b}/catalog/${m.code}/opengraph-image`;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image,
    sku: m.code,
    brand: { "@type": "Brand", name: "Yamaha" },
    url: `${b}/catalog/${m.code}`,
  };
  if (m.cat) {
    jsonLd.category = m.cat;
  }
  if (m.retail != null) {
    jsonLd.offers = {
      "@type": "Offer",
      price: m.retail,
      priceCurrency: "THB",
      availability: AVAIL_SCHEMA[m.availability] ?? "https://schema.org/InStock",
      url: `${b}/catalog/${m.code}`,
      seller: { "@type": "Organization", name: "Famai Motor Group" },
    };
  }
  return jsonLd;
}

/** เส้นทาง แคตตาล็อก → รุ่น (breadcrumb rich result) */
export function breadcrumbJsonLd(base: string, m: CatalogModel): Record<string, unknown> {
  const b = trimBase(base);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "แคตตาล็อก", item: `${b}/catalog` },
      { "@type": "ListItem", position: 2, name: m.model_th || m.model, item: `${b}/catalog/${m.code}` },
    ],
  };
}

/** รายการรุ่นในหน้าแคตตาล็อก (ItemList) — ช่วยให้ Google เข้าใจโครงหน้า */
export function catalogItemListJsonLd(
  base: string,
  models: Array<Pick<CatalogModel, "code" | "model" | "model_th">>,
): Record<string, unknown> {
  const b = trimBase(base);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: models.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.model_th || m.model,
      url: `${b}/catalog/${m.code}`,
    })),
  };
}
