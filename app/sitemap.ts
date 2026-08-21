import type { MetadataRoute } from "next";
import { createPublicSupabase } from "@/lib/supabase/public";
import { siteBaseUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteBaseUrl();
  const supabase = createPublicSupabase();
  const { data } = await supabase.from("model").select("code");
  const models = (data ?? []) as Array<{ code: string }>;

  return [
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 1 },
    ...models.map((m) => ({
      url: `${base}/catalog/${m.code}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
