import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * ยืนยันการแยกชั้น client/server ของ Supabase:
 * - server.ts / admin.ts ต้องมี guard `server-only`
 * - browser.ts ต้องใช้ publishable key, ไม่มี server-only, ไม่แตะ service_role
 */
describe("supabase client separation", () => {
  it("server + admin clients are guarded with 'server-only'", () => {
    expect(readFileSync("lib/supabase/server.ts", "utf8")).toContain("server-only");
    expect(readFileSync("lib/supabase/admin.ts", "utf8")).toContain("server-only");
  });

  it("admin client uses the service_role key", () => {
    expect(readFileSync("lib/supabase/admin.ts", "utf8")).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("browser client uses the publishable key and no server-only guard", () => {
    const src = readFileSync("lib/supabase/browser.ts", "utf8");
    expect(src).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(src.includes("server-only")).toBe(false);
    expect(src.includes("SERVICE_ROLE")).toBe(false);
  });
});
