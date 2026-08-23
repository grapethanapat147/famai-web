import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/auth/money";
import { getActiveBranches } from "@/lib/reference/cache";
import { getSetting } from "@/lib/settings";
import { canReceiveStock, type RecvVariant } from "@/lib/recv/recv";
import { RecvForm } from "@/components/recv/RecvForm";
import { receiveUnit } from "./actions";

export const metadata = { title: "รับรถเข้าสต๊อก — Famai Motor Group" };

export default async function RecvPage() {
  const user = await getCurrentUser();
  if (!user || !canReceiveStock(user.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        รับรถเข้าสต๊อกได้เฉพาะผู้ดูแล / ผู้บริหาร / ฝ่ายสต๊อก
      </p>
    );
  }

  const supabase = await createServerSupabase();
  const [variantsRes, colorsRes, branches, vatPct, see] = await Promise.all([
    supabase.from("model_variant").select("id, code, model_name, model_th").order("model_name"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    getActiveBranches(),
    getSetting("vat_pct"),
    canSeeMoney(),
  ]);

  const colorsByVariant = new Map<string, { code: string; name: string }[]>();
  for (const c of colorsRes.data ?? []) {
    const list = colorsByVariant.get(c.variant_id) ?? [];
    list.push({ code: c.color_code, name: c.color_name });
    colorsByVariant.set(c.variant_id, list);
  }

  const variants: RecvVariant[] = (variantsRes.data ?? []).map((v) => ({
    id: v.id,
    code: v.code,
    modelName: v.model_name,
    modelTh: v.model_th,
    colors: (colorsByVariant.get(v.id) ?? []).slice().sort((a, b) => a.code.localeCompare(b.code)),
  }));

  const defaultBranchId = user.branchIds[0] ?? branches[0]?.id ?? "";

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">รับรถเข้าสต๊อก</h1>
        <p className="mt-1 text-ink-soft">บันทึกรถทีละคัน — เลือกรุ่น/สี/สาขา แล้วกรอกเลขเครื่อง/เลขตัวถัง</p>
      </header>
      <RecvForm
        variants={variants}
        branches={branches.map((b) => ({ id: b.id, code: b.code, name: b.name }))}
        defaultBranchId={defaultBranchId}
        vatPct={vatPct}
        canSeeMoney={see}
        action={receiveUnit}
      />
    </div>
  );
}
