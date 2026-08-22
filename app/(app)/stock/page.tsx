import { createServerSupabase } from "@/lib/supabase/server";
import { canSeeMoney } from "@/lib/auth/money";
import { getBranchesCached } from "@/lib/reference/cache";
import { getSetting } from "@/lib/settings";
import { stripMoneyFields } from "@/lib/auth/strip-money";
import { computeAgeDays, type StockStatus, type StockUnit } from "@/lib/stock/units";
import { StockView } from "@/components/stock/StockView";

export const metadata = { title: "สต๊อกรถ — Famai Motor Group" };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function StockPage({ searchParams }: { searchParams: Promise<{ unit?: string }> }) {
  const { unit: initialUnitId } = await searchParams;
  const supabase = await createServerSupabase();

  // RLS คัดให้เห็นเฉพาะสาขาตัวเอง (เว้น allBranch) — ตารางอ้างอิงเล็ก join ในแอป (Relationships ว่างใน types)
  const [unitsRes, variantsRes, colorsRes, branches] = await Promise.all([
    supabase
      .from("motorcycle_unit")
      .select("id, branch_id, variant_id, color_code, engine_no, frame_no, status, received_at, cost, retail, photo_url")
      .order("received_at", { ascending: true }),
    supabase.from("model_variant").select("id, code, model_name"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    getBranchesCached(),
  ]);

  const variants = new Map((variantsRes.data ?? []).map((v) => [v.id, v]));
  const colors = new Map((colorsRes.data ?? []).map((c) => [`${c.variant_id}:${c.color_code}`, c.color_name]));
  const branchMap = new Map(branches.map((b) => [b.id, b]));

  const today = todayISO();
  const units: StockUnit[] = (unitsRes.data ?? []).map((u) => {
    const v = variants.get(u.variant_id);
    const b = branchMap.get(u.branch_id);
    return {
      id: u.id,
      modelCode: v?.code ?? "?",
      modelName: v?.model_name ?? "?",
      colorCode: u.color_code,
      colorName: colors.get(`${u.variant_id}:${u.color_code}`) ?? u.color_code,
      engineNo: u.engine_no,
      frameNo: u.frame_no,
      status: u.status as StockStatus,
      receivedAt: u.received_at,
      ageDays: computeAgeDays(u.received_at, today),
      branchCode: b?.code ?? "?",
      branchName: b?.name ?? "?",
      photoUrl: u.photo_url,
      cost: u.cost,
      retail: u.retail,
    };
  });

  const see = await canSeeMoney();
  const agingDays = await getSetting("aging_days");
  // ตัดต้นทุนออกฝั่งเซิร์ฟเวอร์ถ้าไม่มีสิทธิ์ — ไม่ส่งค่า cost ไป client เลย
  const safeUnits = stripMoneyFields(units, see, ["cost"]) as StockUnit[];

  return <StockView units={safeUnits} canSeeMoney={see} agingDays={agingDays} initialUnitId={initialUnitId} />;
}
