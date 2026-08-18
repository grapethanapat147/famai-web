import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { getThemeConfig } from "@/lib/theme/settings";
import { SettingsView } from "@/components/settings/SettingsView";
import { ThemeSettings } from "@/components/theme/ThemeSettings";
import { updateSettings, updateThemeSettings } from "./actions";

export const metadata = { title: "ตั้งค่าระบบ — Famai Motor Group" };

export default async function SettingsPage() {
  const [settings, user, theme] = await Promise.all([getSettings(), getCurrentUser(), getThemeConfig()]);
  const admin = Boolean(user?.perms.admin);

  return (
    <div className="flex flex-col gap-4">
      <SettingsView settings={settings} canEdit={admin} action={updateSettings} />
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
