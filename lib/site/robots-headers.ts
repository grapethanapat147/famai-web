/**
 * สวิตช์ noindex — FAM-1131 · fixlist ข้อ 22
 *
 * เดิม vercel.json ตั้ง X-Robots-Tag: noindex ให้ทุกหน้า ซึ่ง "ชนะ" robots.txt ที่อุตส่าห์เปิด /catalog ไว้
 * → แคตตาล็อกไม่มีวันติด Google แม้จะเปิดตัวแล้ว และไม่มีใครรู้เพราะไม่ขึ้น error
 *
 * ตอนนี้ header มาจาก next.config (อ่าน env ตอน build ได้) — ตั้ง CATALOG_PUBLIC=true บน Vercel
 * เมื่อพร้อมเปิดแคตตาล็อก แล้วหน้า /catalog, sitemap, robots จะพ้น noindex ส่วนหลังบ้านยังปิดเหมือนเดิม
 */

export type HeaderRule = { source: string; headers: { key: string; value: string }[] };

export const NOINDEX = { key: "X-Robots-Tag", value: "noindex, nofollow" };
export const NO_REFERRER = { key: "Referrer-Policy", value: "no-referrer" };

/** path ที่ให้ index ได้เมื่อเปิดสวิตช์ — แคตตาล็อก + ไฟล์ที่ search engine ใช้ */
export const PUBLIC_PATH_PATTERN = "catalog|sitemap.xml|robots.txt";

export function robotsHeaderRules(catalogPublic: boolean): HeaderRule[] {
  if (!catalogPublic) {
    return [{ source: "/(.*)", headers: [NOINDEX, NO_REFERRER] }];
  }
  return [
    { source: `/((?!${PUBLIC_PATH_PATTERN}).*)`, headers: [NOINDEX] },
    { source: "/(.*)", headers: [NO_REFERRER] },
  ];
}

/** จำลองการจับคู่ source ของ Next (path-to-regexp) แบบพอใช้สำหรับเทส */
export function sourceMatches(source: string, path: string): boolean {
  return new RegExp(`^${source}$`).test(path);
}
