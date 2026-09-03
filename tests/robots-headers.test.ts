import { describe, expect, it } from "vitest";
import { NOINDEX, robotsHeaderRules, sourceMatches } from "@/lib/site/robots-headers";

function noindexOn(path: string, catalogPublic: boolean): boolean {
  return robotsHeaderRules(catalogPublic).some(
    (r) => r.headers.some((h) => h.key === NOINDEX.key) && sourceMatches(r.source, path),
  );
}

describe("สวิตช์ noindex (fixlist ข้อ 22)", () => {
  it("ยังไม่เปิดตัว: ทุกหน้า noindex รวมแคตตาล็อก (ค่าเริ่มต้นเหมือนเดิม)", () => {
    for (const p of ["/dash", "/catalog", "/catalog/BTF200", "/sitemap.xml", "/login"]) {
      expect(noindexOn(p, false), p).toBe(true);
    }
  });

  it("เปิดตัวแล้ว: แคตตาล็อก/sitemap/robots พ้น noindex · หลังบ้านยังปิด", () => {
    for (const p of ["/catalog", "/catalog/BTF200", "/sitemap.xml", "/robots.txt"]) {
      expect(noindexOn(p, true), p).toBe(false);
    }
    for (const p of ["/", "/dash", "/login", "/status", "/sell", "/api/cron/aged-stock"]) {
      expect(noindexOn(p, true), p).toBe(true);
    }
  });

  it("Referrer-Policy ติดทุกหน้าทั้งสองโหมด", () => {
    for (const on of [true, false]) {
      const rules = robotsHeaderRules(on).filter((r) => r.headers.some((h) => h.key === "Referrer-Policy"));
      expect(rules.some((r) => sourceMatches(r.source, "/catalog"))).toBe(true);
      expect(rules.some((r) => sourceMatches(r.source, "/dash"))).toBe(true);
    }
  });
});
