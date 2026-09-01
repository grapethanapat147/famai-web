import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveBranches } from "@/lib/reference/cache";
import { canManageSites, isSiteKind, type SiteRow } from "@/lib/branch/sites";
import { SitesView, type SiteBranchOption } from "@/components/sites/SitesView";
import { saveSite } from "./actions";

export const metadata = { title: "สาขา (จุดลงเวลา) — Famai Motor Group" };

export default async function SitesPage() {
  const me = await getCurrentUser();
  if (!me || !canManageSites(me.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        จัดการสาขาได้เฉพาะผู้ดูแล / ผู้บริหาร
      </p>
    );
  }

  const supabase = await createServerSupabase();
  const [sitesRes, branchRows] = await Promise.all([
    supabase.from("branch_site").select("id, branch_id, name, kind, lat, lng, radius_m, is_active").order("name"),
    getActiveBranches(),
  ]);

  const branchName = new Map(branchRows.map((b) => [b.id, b.name]));
  const sites: SiteRow[] = (sitesRes.data ?? []).map((s) => ({
    id: s.id,
    branchId: s.branch_id,
    branchName: branchName.get(s.branch_id) ?? "—",
    name: s.name,
    kind: isSiteKind(s.kind) ? s.kind : "other",
    lat: Number(s.lat),
    lng: Number(s.lng),
    radiusM: Number(s.radius_m),
    isActive: s.is_active,
  }));

  const branches: SiteBranchOption[] = branchRows.map((b) => ({ id: b.id, name: b.name }));

  return <SitesView sites={sites} branches={branches} action={saveSite} />;
}
