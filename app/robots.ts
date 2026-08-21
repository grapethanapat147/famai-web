import type { MetadataRoute } from "next";
import { siteBaseUrl } from "@/lib/site";

// เปิดให้ index เฉพาะหน้าสาธารณะ (แคตตาล็อก) · ที่เหลือเป็นแอดมิน/เครื่องมือส่วนตัว
export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  return {
    rules: { userAgent: "*", allow: "/catalog", disallow: "/" },
    sitemap: `${base}/sitemap.xml`,
  };
}
