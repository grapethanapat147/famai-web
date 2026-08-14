import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageImport } from "@/lib/import/units";
import { ImportView } from "@/components/import/ImportView";
import { importUnits } from "./actions";

export const metadata = { title: "นำเข้าข้อมูล — Famai Motor Group" };

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user || !canManageImport(user.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        นำเข้าข้อมูลได้เฉพาะผู้ดูแล / ผู้บริหาร / สต๊อก
      </p>
    );
  }

  const supabase = await createServerSupabase();
  const [variantsRes, branchesRes] = await Promise.all([
    supabase.from("model_variant").select("code, model_name"),
    supabase.from("branch").select("code"),
  ]);

  const variantNames: Record<string, string> = {};
  for (const v of variantsRes.data ?? []) {
    variantNames[v.code] = v.model_name;
  }
  const branchCodes = (branchesRes.data ?? []).map((b) => b.code);

  return <ImportView variantNames={variantNames} branchCodes={branchCodes} canImport action={importUnits} />;
}
