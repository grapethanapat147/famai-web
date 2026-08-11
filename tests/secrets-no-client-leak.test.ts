import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out = out.concat(walk(p));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Security gate (spec §8.3 / handoff §7): service_role key ต้องไม่หลุดไป client bundle
 * ตรวจแบบ static ว่าไฟล์ที่เข้าถึงได้จาก client ไม่มีการอ้าง SERVICE_ROLE
 */
describe("secrets never reach the client bundle", () => {
  const clientReachable = [...walk("app"), ...walk("components"), "lib/supabase/browser.ts"];

  it("no client-reachable file references SUPABASE_SERVICE_ROLE_KEY", () => {
    for (const file of clientReachable) {
      const src = readFileSync(file, "utf8");
      expect(src.includes("SERVICE_ROLE"), `${file} must not reference SERVICE_ROLE`).toBe(false);
    }
  });
});
