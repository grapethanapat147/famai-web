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
  const [companyRes, branchRes, siteRes] = await Promise.all([
    supabase.from("company").select("id, code, name, tax_id, address, phone").order("code"),
    supabase
      .from("branch")
      .select("id, code, name, tax_id, address, phone, require_selfie")
      .eq("is_active", true)
      .order("code"),
    supabase.from("branch_site").select("branch_id").eq("is_active", true),
  ]);
  const siteCountByBranch = new Map<string, number>();
  for (const s of siteRes.data ?? []) {
    siteCountByBranch.set(s.branch_id, (siteCountByBranch.get(s.branch_id) ?? 0) + 1);
  }
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
    siteCount: siteCountByBranch.get(r.id) ?? 0,
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
