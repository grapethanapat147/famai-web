import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveBranches } from "@/lib/reference/cache";
import { canManageTransfer, type Transfer, type TransferStatus } from "@/lib/transfer/transfers";
import { TransferView, type TransferBranch, type TransferUnit } from "@/components/transfer/TransferView";
import { cancelTransfer, receiveTransfer, requestTransfer } from "./actions";

export const metadata = { title: "โอนย้ายบริษัท — Famai Motor Group" };

const KNOWN_STATUS = new Set<TransferStatus>(["in_transit", "received", "cancelled"]);

export default async function TransferPage() {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser();

  const { data: transferRows } = await supabase
    .from("unit_transfer")
    .select("id, unit_id, from_branch, to_branch, requested_at, received_at, status, note")
    .order("requested_at", { ascending: false });
  const transfersRaw = transferRows ?? [];
  const unitIds = [...new Set(transfersRaw.map((t) => t.unit_id))];

  const [unitsRes, availRes, variantsRes, colorsRes, branchRows] = await Promise.all([
    unitIds.length
      ? supabase.from("motorcycle_unit").select("id, variant_id, color_code, engine_no").in("id", unitIds)
      : Promise.resolve({ data: [] }),
    supabase.from("motorcycle_unit").select("id, variant_id, color_code, engine_no, branch_id").eq("status", "available"),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    getActiveBranches(),
  ]);

  const variantName = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const colorName = new Map((colorsRes.data ?? []).map((c) => [`${c.variant_id}:${c.color_code}`, c.color_name]));
  const branchName = new Map(branchRows.map((b) => [b.id, b.name]));
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]));

  function vehicleOf(u: { variant_id: string; color_code: string } | undefined): string {
    if (!u) {
      return "รถโอน (ดูรายละเอียดได้เมื่อรับเข้าบริษัท)";
    }
    const model = variantName.get(u.variant_id);
    const color = colorName.get(`${u.variant_id}:${u.color_code}`);
    return model ? `${model}${color ? ` · ${color}` : ""}` : "—";
  }

  const transfers: Transfer[] = transfersRaw.map((t) => {
    const unit = unitMap.get(t.unit_id);
    const status: TransferStatus = KNOWN_STATUS.has(t.status as TransferStatus) ? (t.status as TransferStatus) : "in_transit";
    return {
      id: t.id,
      unitId: t.unit_id,
      vehicle: vehicleOf(unit),
      engineNo: unit?.engine_no ?? "—",
      fromBranchId: t.from_branch,
      fromBranch: branchName.get(t.from_branch) ?? "—",
      toBranchId: t.to_branch,
      toBranch: branchName.get(t.to_branch) ?? "—",
      status,
      requestedAt: t.requested_at,
      receivedAt: t.received_at,
      note: t.note,
    };
  });

  // นิติบุคคลของแต่ละบริษัท — ใช้ปิดปลายทางข้ามบริษัทตั้งแต่ในฟอร์ม (FAM-1129 · บรีฟ R1 B1)
  const companyOf = new Map(branchRows.map((b) => [b.id, b.company_id ?? null]));

  const units: TransferUnit[] = (availRes.data ?? []).map((u) => ({
    id: u.id,
    vehicle: vehicleOf(u),
    engineNo: u.engine_no,
    branchName: branchName.get(u.branch_id) ?? "—",
    branchId: u.branch_id,
    companyId: companyOf.get(u.branch_id) ?? null,
  }));

  const branches: TransferBranch[] = branchRows.map((b) => ({ id: b.id, name: b.name, companyId: companyOf.get(b.id) ?? null }));

  const allBranchIds = branches.map((b) => b.id);
  const myBranchIds = user?.allBranch ? allBranchIds : (user?.branchIds ?? []);

  return (
    <TransferView
      transfers={transfers}
      units={units}
      branches={branches}
      myBranchIds={myBranchIds}
      canManage={canManageTransfer(user?.roleCodes ?? [])}
      requestAction={requestTransfer}
      receiveAction={receiveTransfer}
      cancelAction={cancelTransfer}
    />
  );
}
