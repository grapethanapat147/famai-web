import { describe, it, expect } from "vitest";
import type { TypedSupabaseClient } from "@/lib/supabase/client-type";
import { nextDocNo, myBranches, isAdmin } from "@/lib/rpc";

type RpcResult = { data: unknown; error: { message: string } | null };

function fakeClient(impl: (name: string, args?: unknown) => RpcResult): TypedSupabaseClient {
  return {
    rpc: (name: string, args?: unknown) => Promise.resolve(impl(name, args)),
  } as unknown as TypedSupabaseClient;
}

describe("rpc wrappers", () => {
  it("nextDocNo passes p_branch/p_type/p_year and returns the doc no", async () => {
    let captured: { name: string; args?: unknown } | undefined;
    const client = fakeClient((name, args) => {
      captured = { name, args };
      return { data: "FMG-TAXINV-2569-00001", error: null };
    });

    const res = await nextDocNo(client, "branch-1", "TAXINV", 2569);

    expect(captured?.name).toBe("next_doc_no");
    expect(captured?.args).toEqual({ p_branch: "branch-1", p_type: "TAXINV", p_year: 2569 });
    expect(res).toBe("FMG-TAXINV-2569-00001");
  });

  it("throws (with the fn name) when the rpc returns an error", async () => {
    const client = fakeClient(() => ({ data: null, error: { message: "boom" } }));
    await expect(myBranches(client)).rejects.toThrow(/my_branches/);
  });

  it("isAdmin coerces the result to a boolean", async () => {
    expect(await isAdmin(fakeClient(() => ({ data: true, error: null })))).toBe(true);
    expect(await isAdmin(fakeClient(() => ({ data: null, error: null })))).toBe(false);
  });
});
