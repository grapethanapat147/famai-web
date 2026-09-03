import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

/**
 * เทสความปลอดภัยกับฐานข้อมูลจริง (FAM-1133 · fixlist ข้อ 20 / security-checklist)
 * - รันเฉพาะ RUN_INTEGRATION=1 (ปกติ skip — ไม่ยิงเน็ต ไม่พังใน CI ที่ยังไม่ตั้ง secret)
 * - บัญชีทดสอบจาก TEST_LOGINS (ดู .env.test.local.example) · ข้อมูลทดสอบสร้างด้วย service role แล้วลบทิ้งเอง
 * - ทุกแถวที่สร้างมีคำว่า TEST- ในเลขเครื่อง/ชื่อ เผื่อลบไม่ทัน (ล้มกลางทาง) จะตามเก็บได้
 *
 * รัน:  RUN_INTEGRATION=1 npx vitest run tests/integration
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
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const RUN = process.env.RUN_INTEGRATION === "1";

type Login = { label: string; email: string; password: string; role?: string; allBranch?: boolean };
let logins: Login[] = [];
try {
  logins = JSON.parse(process.env.TEST_LOGINS ?? "[]");
} catch {
  logins = [];
}
const byRole = (role: string) => logins.find((l) => l.role === role);
const seller = byRole("sales") ?? byRole("manager");
const tech = byRole("tech");
const admin = byRole("admin");

const anonOpts = { auth: { persistSession: false, autoRefreshToken: false } };

async function signIn(login: Login): Promise<SupabaseClient> {
  const sb = createClient(URL, KEY, anonOpts);
  const { error } = await sb.auth.signInWithPassword({ email: login.email, password: login.password });
  if (error) throw new Error(`ล็อกอิน ${login.label} ไม่ได้: ${error.message}`);
  return sb;
}

/** service role — ข้าม RLS ใช้สร้าง/ลบข้อมูลทดสอบเท่านั้น */
function service(): SupabaseClient {
  return createClient(URL, SERVICE, anonOpts);
}

/** สร้างรถทดสอบ 1 คันในบริษัทที่บัญชีนี้เข้าถึงได้ · คืน id */
async function createTestUnit(forLogin: Login): Promise<{ unitId: string; branchId: string }> {
  const svc = service();
  const { data: authUser } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const uid = authUser?.users.find((u) => u.email === forLogin.email)?.id;
  if (!uid) throw new Error(`ไม่พบ auth user ของ ${forLogin.email}`);

  const { data: ub } = await svc.from("app_user_branch").select("branch_id").eq("user_id", uid).limit(1).maybeSingle();
  const { data: anyBranch } = await svc.from("branch").select("id").eq("is_active", true).limit(1).maybeSingle();
  const branchId = ub?.branch_id ?? anyBranch?.id;
  if (!branchId) throw new Error("ไม่พบบริษัทสำหรับสร้างรถทดสอบ");

  const { data: color } = await svc.from("model_color").select("variant_id, color_code").limit(1).maybeSingle();
  const { data: variant } = await svc.from("model_variant").select("id, code").eq("id", color?.variant_id ?? "").maybeSingle();
  if (!color || !variant) throw new Error("ไม่พบรุ่น/สีสำหรับสร้างรถทดสอบ");

  const stamp = Date.now();
  const { data: unit, error } = await svc
    .from("motorcycle_unit")
    .insert({
      branch_id: branchId,
      variant_id: variant.id,
      color_code: color.color_code,
      sku: `${variant.code}${color.color_code}`,
      engine_no: `TEST-E-${stamp}`,
      frame_no: `TEST-F-${stamp}`,
      status: "available",
      received_at: new Date().toISOString().slice(0, 10),
      cost: 1000,
      cost_vat: 70,
      retail: 1500,
      note: "รถทดสอบอัตโนมัติ (security.test.ts) — ลบทิ้งได้",
    })
    .select("id")
    .single();
  if (error || !unit) throw new Error(`สร้างรถทดสอบไม่ได้: ${error?.message}`);
  return { unitId: unit.id, branchId };
}

/** ลบทุกอย่างที่ sell_unit สร้างจากรถทดสอบ แล้วลบรถ + ลูกค้าทดสอบ (เรียงตาม FK ลูกก่อนแม่) */
async function cleanupUnit(unitId: string) {
  const svc = service();
  const { data: sales } = await svc.from("sale").select("id, customer_id").eq("unit_id", unitId);
  for (const s of sales ?? []) {
    await svc.from("document").delete().eq("sale_id", s.id);
    const { data: recs } = await svc.from("receivable").select("id").eq("sale_id", s.id);
    for (const r of recs ?? []) await svc.from("receipt_payment").delete().eq("receivable_id", r.id);
    await svc.from("receivable").delete().eq("sale_id", s.id);
    const { data: cases } = await svc.from("finance_case").select("id").eq("sale_id", s.id);
    for (const c of cases ?? []) await svc.from("finance_case_event").delete().eq("case_id", c.id);
    await svc.from("finance_case").delete().eq("sale_id", s.id);
    const { data: regs } = await svc.from("registration").select("id").eq("sale_id", s.id);
    for (const r of regs ?? []) {
      await svc.from("registration_step").delete().eq("registration_id", r.id);
      await svc.from("registration_event").delete().eq("registration_id", r.id);
    }
    await svc.from("registration").delete().eq("sale_id", s.id);
    await svc.from("follow_up_task").delete().eq("sale_id", s.id);
    await svc.from("sale_freebie").delete().eq("sale_id", s.id);
    await svc.from("sale").delete().eq("id", s.id);
    if (s.customer_id) {
      await svc.from("service_reminder").delete().eq("customer_id", s.customer_id);
      await svc.from("follow_up_task").delete().eq("customer_id", s.customer_id);
      await svc.from("lead_stage_history").delete().eq("customer_id", s.customer_id);
      await svc.from("customer").delete().eq("id", s.customer_id).like("full_name", "TEST-%");
    }
  }
  await svc.from("service_reminder").delete().eq("unit_id", unitId);
  await svc.from("motorcycle_unit").delete().eq("id", unitId);
}

function sellArgs(unitId: string) {
  return {
    p_unit_id: unitId,
    p_customer_name: `TEST-ลูกค้าทดสอบ ${Date.now()}`,
    p_customer_phone: "",
    p_pay_method: "cash",
    p_list_price: 1500,
    p_discount: 0,
    p_freebie_cost: 0,
    p_down_payment: null,
    p_term_months: null,
    p_finance_id: null,
    p_note: "security.test.ts",
    p_customer_id: null,
  };
}

// ── anon: ตารางจริงปิด · pub เปิดอ่านอย่างเดียว ─────────────────────────────────
describe.skipIf(!RUN)("anon boundary", () => {
  it("anon อ่าน pub.model ได้ (แคตตาล็อกสาธารณะ) แต่เขียนไม่ได้", async () => {
    const pub = createClient(URL, KEY, { ...anonOpts, db: { schema: "pub" } });
    const { error: readErr } = await pub.from("model").select("code").limit(1);
    expect(readErr).toBeNull();
    const { error: writeErr } = await pub.from("model").insert({ code: "TEST-X" });
    expect(writeErr).not.toBeNull();
  });
});

// ── สิทธิ์: ช่างกดขายรถต้องถูกปฏิเสธ (ด่านอยู่ใน RPC ไม่ใช่ที่ปุ่ม) ─────────────────
describe.skipIf(!RUN || !tech || !SERVICE)("ช่างกดขายรถ", () => {
  let unitId = "";
  beforeAll(async () => {
    ({ unitId } = await createTestUnit(tech!));
  });
  afterAll(async () => {
    if (unitId) await cleanupUnit(unitId);
  });

  it("sell_unit ปฏิเสธด้วยข้อความไม่มีสิทธิ์ และรถยังพร้อมขายเหมือนเดิม", async () => {
    const sb = await signIn(tech!);
    const { error } = await sb.rpc("sell_unit", sellArgs(unitId));
    expect(error).not.toBeNull();
    expect(error?.message ?? "").toContain("ไม่มีสิทธิ์");
    const { data: after } = await service().from("motorcycle_unit").select("status").eq("id", unitId).single();
    expect(after?.status).toBe("available");
    await sb.auth.signOut();
  });
});

// ── กันขายซ้ำ: คันเดียวกัน 2 คำขอพร้อมกัน → สำเร็จ 1 ล้มเหลว 1 ────────────────────
describe.skipIf(!RUN || !seller || !SERVICE)("ขายคันเดียวกันพร้อมกัน", () => {
  let unitId = "";
  beforeAll(async () => {
    ({ unitId } = await createTestUnit(seller!));
  });
  afterAll(async () => {
    if (unitId) await cleanupUnit(unitId);
  });

  it("สำเร็จเพียงคำขอเดียว อีกคำขอถูกปฏิเสธ และมีบิลขายแค่ใบเดียว", async () => {
    const [a, b] = await Promise.all([signIn(seller!), signIn(seller!)]);
    const results = await Promise.all([a.rpc("sell_unit", sellArgs(unitId)), b.rpc("sell_unit", sellArgs(unitId))]);
    const ok = results.filter((r) => !r.error).length;
    const failed = results.filter((r) => r.error).length;
    expect(ok, "ต้องสำเร็จ 1").toBe(1);
    expect(failed, "ต้องล้มเหลว 1").toBe(1);
    const { data: sales } = await service().from("sale").select("id").eq("unit_id", unitId);
    expect(sales?.length).toBe(1);
    const { data: unit } = await service().from("motorcycle_unit").select("status").eq("id", unitId).single();
    expect(unit?.status).toBe("sold");
    await Promise.all([a.auth.signOut(), b.auth.signOut()]);
  });
});

// ── เลขเอกสารพร้อมกัน → ไม่ซ้ำ ──────────────────────────────────────────────────
describe.skipIf(!RUN || !seller || !SERVICE)("เลขเอกสารพร้อมกัน", () => {
  afterAll(async () => {
    await service().from("doc_counter").delete().eq("doc_type", "TEST");
  });

  it("ขอ next_doc_no 5 ครั้งพร้อมกัน ได้เลขไม่ซ้ำ", async () => {
    const sb = await signIn(seller!);
    const { data: b } = await sb.from("branch").select("id").limit(1).maybeSingle();
    expect(b?.id).toBeTruthy();
    const calls = Array.from({ length: 5 }, () => sb.rpc("next_doc_no", { p_branch: b!.id, p_type: "TEST", p_year: 2569 }));
    const results = await Promise.all(calls);
    for (const r of results) expect(r.error).toBeNull();
    const nos = results.map((r) => String(r.data));
    expect(new Set(nos).size).toBe(5);
    await sb.auth.signOut();
  });
});

// ── ทุกการแก้ไข → audit_log (ต้องมีบัญชี admin เพราะ RLS ให้แอดมินอ่านเท่านั้น) ───────
describe.skipIf(!RUN || !admin || !SERVICE)("audit_log", () => {
  let unitId = "";
  beforeAll(async () => {
    ({ unitId } = await createTestUnit(admin!));
  });
  afterAll(async () => {
    if (unitId) await cleanupUnit(unitId);
  });

  it("แก้ note ของรถ → มีแถว UPDATE ที่บันทึกค่าใหม่และผู้แก้", async () => {
    const sb = await signIn(admin!);
    const note = `TEST-audit ${Date.now()}`;
    const { error } = await sb.from("motorcycle_unit").update({ note }).eq("id", unitId);
    expect(error).toBeNull();
    const { data: rows } = await sb
      .from("audit_log")
      .select("action, actor, after")
      .eq("row_id", unitId)
      .eq("action", "UPDATE")
      .order("at", { ascending: false })
      .limit(1);
    expect(rows?.length).toBe(1);
    expect(rows?.[0].actor).toBeTruthy();
    expect(JSON.stringify(rows?.[0].after)).toContain(note);
    await sb.auth.signOut();
  });
});
