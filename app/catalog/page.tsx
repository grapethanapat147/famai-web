import type { Metadata } from "next";
import { createPublicSupabase } from "@/lib/supabase/public";
import { CatalogView } from "@/components/catalog/CatalogView";
import type { CatalogModel } from "@/lib/catalog/model";

const CATALOG_TITLE = "แคตตาล็อกรถจักรยานยนต์ Yamaha — Famai Motor Group";
const CATALOG_DESC = "ดูรุ่น ราคา สี และรุ่นที่มีจำหน่ายของ Yamaha ที่ Famai Motor Group — สอบถามและจองได้ที่ร้าน";

export const metadata: Metadata = {
  title: CATALOG_TITLE,
  description: CATALOG_DESC,
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: CATALOG_TITLE,
    description: CATALOG_DESC,
    url: "/catalog",
    siteName: "Famai Motor Group",
    locale: "th_TH",
    type: "website",
  },
  twitter: { card: "summary", title: CATALOG_TITLE, description: CATALOG_DESC },
};

// อ่าน pub.model สด ๆ (สาธารณะ ไม่ต้องล็อกอิน) · revalidate เป็นช่วงเพื่อลดโหลด/ให้ CDN cache ได้
export const revalidate = 300;

export default async function CatalogPage() {
  const supabase = createPublicSupabase();
  const { data } = await supabase.from("model").select("*").order("cat").order("retail", { ascending: true });
  const models = (data ?? []) as CatalogModel[];

  return <CatalogView models={models} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} />;
}
