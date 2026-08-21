import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPublicSupabase } from "@/lib/supabase/public";
import { ModelDetail } from "@/components/catalog/ModelDetail";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/catalog/jsonld";
import { siteBaseUrl } from "@/lib/site";
import type { CatalogModel } from "@/lib/catalog/model";

export const revalidate = 300;

async function getModel(code: string): Promise<CatalogModel | null> {
  const supabase = createPublicSupabase();
  const { data } = await supabase.from("model").select("*").eq("code", code).maybeSingle();
  return (data as CatalogModel | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const m = await getModel(code);
  if (!m) {
    return { title: "ไม่พบรุ่น — Famai Motor Group" };
  }
  const name = m.model_th || m.model;
  const title = `${name} — Yamaha · Famai Motor Group`;
  const description = `${name}${m.cc ? ` ${m.cc} ซีซี` : ""}${m.retail != null ? ` ราคา ${m.retail.toLocaleString("th-TH")} บาท` : ""} — ดูรายละเอียด สี และราคาที่ Famai Motor Group`;
  const url = `/catalog/${code}`;

  // og:image มาจาก opengraph-image.tsx (การ์ดแบรนด์ generate) โดยอัตโนมัติ
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Famai Motor Group", locale: "th_TH", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ModelPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const model = await getModel(code);
  if (!model) {
    notFound();
  }
  const base = siteBaseUrl();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return (
    <>
      <JsonLd data={productJsonLd(base, supabaseUrl, model)} />
      <JsonLd data={breadcrumbJsonLd(base, model)} />
      <ModelDetail model={model} supabaseUrl={supabaseUrl} />
    </>
  );
}
