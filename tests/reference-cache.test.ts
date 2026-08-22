import { beforeEach, describe, expect, it, vi } from "vitest";

// server-only ปล่อยผ่านในเทส · unstable_cache รันฟังก์ชันตรง ๆ (ไม่ต้องมี Next runtime) · revalidateTag เป็น spy
vi.mock("server-only", () => ({}));
const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}));

type TableResult = { data: unknown; error: { message: string } | null };

/** client ปลอม: from(table).select(...).order(...) → ผลลัพธ์ที่กำหนด (await ได้ทั้งมี/ไม่มี .order) */
function fakeClient(byTable: Record<string, TableResult>) {
  return {
    from(table: string) {
      const result = byTable[table] ?? { data: [], error: null };
      const chain: Record<string, unknown> = {
        select: () => chain,
        order: () => Promise.resolve(result),
        then: (res: (v: TableResult) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(result).then(res, rej),
      };
      return chain;
    },
  };
}

let adminResult: Record<string, TableResult>;
let adminThrows: boolean;
let serverResult: Record<string, TableResult>;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: () => {
    if (adminThrows) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY ยังไม่ตั้งค่า");
    }
    return fakeClient(adminResult);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => fakeClient(serverResult),
}));

import {
  REF_TAG,
  getActiveBranches,
  getBranchesCached,
  getCompaniesCached,
  getSettingsCached,
  getThemeConfigCached,
  revalidateReference,
} from "@/lib/reference/cache";
import { SETTING_DEFAULTS } from "@/lib/settings/resolve";

const BRANCHES = [
  { id: "b1", code: "HQ", name: "สำนักงานใหญ่", address: null, phone: null, tax_id: null, company_id: "c1", is_active: true },
  { id: "b2", code: "BR2", name: "สาขา 2", address: null, phone: null, tax_id: null, company_id: "c1", is_active: false },
];
const COMPANIES = [{ id: "c1", code: "FAMAI", name: "Famai", tax_id: null, address: null, phone: null }];

beforeEach(() => {
  revalidateTag.mockClear();
  adminThrows = false;
  adminResult = {
    branch: { data: BRANCHES, error: null },
    company: { data: COMPANIES, error: null },
    app_setting: { data: [{ key: "vat_pct", value: 10 }, { key: "theme_accent", value: "#1B49D6" }], error: null },
  };
  serverResult = {
    branch: { data: [BRANCHES[0]], error: null },
    company: { data: COMPANIES, error: null },
    app_setting: { data: [{ key: "vat_pct", value: 7 }], error: null },
  };
});

describe("reference cache — happy path (service_role)", () => {
  it("getBranchesCached returns every branch from the admin client", async () => {
    expect(await getBranchesCached()).toEqual(BRANCHES);
  });
  it("getActiveBranches keeps only is_active", async () => {
    const active = await getActiveBranches();
    expect(active.map((b) => b.id)).toEqual(["b1"]);
  });
  it("getCompaniesCached returns companies", async () => {
    expect(await getCompaniesCached()).toEqual(COMPANIES);
  });
  it("getSettingsCached resolves rows over the seeded defaults", async () => {
    expect((await getSettingsCached()).vat_pct).toBe(10);
  });
  it("getThemeConfigCached parses the accent", async () => {
    expect((await getThemeConfigCached()).accent).toBe("#1B49D6");
  });
});

describe("reference cache — resilient fallback (no/failed service_role)", () => {
  it("falls back to the session client when the admin client throws", async () => {
    adminThrows = true;
    expect(await getBranchesCached()).toEqual([BRANCHES[0]]);
    expect((await getSettingsCached()).vat_pct).toBe(7);
  });
  it("falls back when the admin query errors", async () => {
    adminResult.branch = { data: null, error: { message: "boom" } };
    expect(await getBranchesCached()).toEqual([BRANCHES[0]]);
  });
  it("returns seeded defaults when both admin and session reads fail", async () => {
    adminThrows = true;
    serverResult.app_setting = { data: null, error: { message: "down" } };
    expect(await getSettingsCached()).toEqual(SETTING_DEFAULTS);
  });
});

describe("revalidateReference", () => {
  it("purges each tag with the Next 16 two-arg form (profile 'max')", () => {
    revalidateReference(REF_TAG.branches, REF_TAG.companies);
    expect(revalidateTag).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenNthCalledWith(1, "ref:branches", "max");
    expect(revalidateTag).toHaveBeenNthCalledWith(2, "ref:companies", "max");
  });
});
