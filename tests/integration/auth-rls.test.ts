import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

/**
 * Integration test ของ auth + RLS กับฐานข้อมูลจริง
 * - รันเฉพาะเมื่อสั่ง RUN_INTEGRATION=1 (ปกติ `npm test` จะ skip → ไม่ยิงเน็ต/ไม่พังใน CI)
 * - test account อ่านจาก `.env.test.local` (gitignored) — ผู้ช่วยไม่อ่าน/ไม่พิมพ์ค่ารหัส
 *
 * วิธีรัน:
 *   1) สร้าง .env.test.local จาก .env.test.local.example แล้วใส่ email/password จริง
 *   2) RUN_INTEGRATION=1 npx vitest run tests/integration/auth-rls.test.ts
 */

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env.test.local");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const RUN = process.env.RUN_INTEGRATION === "1";

type Login = {
  label: string;
  email: string;
  password: string;
  expectUnits?: number; // จำนวนคันที่ควรเห็น (RLS)
  allBranch?: boolean; // true=เห็นหลายสาขา, false=สาขาเดียว
};

let logins: Login[] = [];
try {
  logins = JSON.parse(process.env.TEST_LOGINS ?? "[]");
} catch {
  logins = [];
}

describe.skipIf(!RUN)("anon boundary (no login)", () => {
  it("อ่านตารางจริงไม่ได้ (RLS)", async () => {
    const sb = createClient(URL, KEY);
    const { data, error } = await sb.from("motorcycle_unit").select("id").limit(1);
    expect(Boolean(error) || (data?.length ?? 0) === 0).toBe(true);
  });
});

describe.skipIf(!RUN || logins.length === 0)("auth + RLS (real login)", () => {
  for (const login of logins) {
    it(`${login.label}: ล็อกอินได้ + เห็นรถตามสิทธิ์สาขา`, async () => {
      const sb = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

      const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
        email: login.email,
        password: login.password,
      });
      expect(authErr, `ล็อกอิน ${login.label} ควรสำเร็จ`).toBeNull();
      expect(auth.user).toBeTruthy();

      const { data: units, error } = await sb.from("motorcycle_unit").select("id, branch_id");
      expect(error).toBeNull();
      const count = units?.length ?? 0;

      if (typeof login.expectUnits === "number") {
        expect(count, `${login.label} ควรเห็น ${login.expectUnits} คัน (RLS)`).toBe(login.expectUnits);
      } else {
        expect(count).toBeGreaterThan(0);
      }

      const branches = new Set((units ?? []).map((u) => u.branch_id));
      if (login.allBranch === true) expect(branches.size, "ควรเห็นหลายสาขา").toBeGreaterThan(1);
      if (login.allBranch === false) expect(branches.size, "ควรเห็นสาขาเดียว").toBe(1);

      await sb.auth.signOut();
    });
  }
});
