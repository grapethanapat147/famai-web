import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { getThemeConfig } from "@/lib/theme/settings";
import { createServerSupabase } from "@/lib/supabase/server";
import { SettingsView } from "@/components/settings/SettingsView";
import { ThemeSettings } from "@/components/theme/ThemeSettings";
import { CompanyInfoView } from "@/components/settings/CompanyInfoView";
import type { OrgBranch, OrgCompany } from "@/lib/org/info";
import { updateOrgInfo, updateSettings, updateThemeSettings } from "./actions";

export const metadata = { title: "ตั้งค่าระบบ — Famai Motor Group" };

export default async function SettingsPage() {
  const [settings, user, theme] = await Promise.all([getSettings(), getCurrentUser(), getThemeConfig()]);
  const admin = Boolean(user?.perms.admin);

  const supabase = await createServerSupabase();
  const [companyRes, branchRes] = await Promise.all([
    supabase.from("company").select("id, code, name, tax_id, address, phone").order("code"),
    supabase
      .from("branch")
      .select("id, code, name, tax_id, address, phone, geo_lat, geo_lng, geo_radius_m, require_selfie")
      .eq("is_active", true)
      .order("code"),
  ]);
  const toOrg = (r: { id: string; code: string; name: string; tax_id: string | null; address: string | null; phone: string | null }): OrgCompany => ({
    id: r.id,
    code: r.code,
    name: r.name,
    taxId: r.tax_id ?? "",
    address: r.address ?? "",
    phone: r.phone ?? "",
  });
  const company = (companyRes.data ?? []).map(toOrg)[0] ?? null;
  const branches: OrgBranch[] = (branchRes.data ?? []).map((r) => ({
    ...toOrg(r),
    geoLat: r.geo_lat != null ? String(r.geo_lat) : "",
    geoLng: r.geo_lng != null ? String(r.geo_lng) : "",
    geoRadius: r.geo_radius_m != null ? String(r.geo_radius_m) : "",
    requireSelfie: Boolean(r.require_selfie),
  }));

  return (
    <div className="flex flex-col gap-4">
      <SettingsView settings={settings} canEdit={admin} action={updateSettings} />
      {company && (
        <CompanyInfoView company={company} branches={branches} canEdit={admin} action={updateOrgInfo} />
      )}
      <div className="mx-auto w-full max-w-3xl">
        <ThemeSettings
          currentAccent={theme.accent}
          currentFontPair={theme.fontPair}
          currentCustomFont={theme.customFont}
          canEdit={admin}
          action={updateThemeSettings}
        />
      </div>
    </div>
  );
}
