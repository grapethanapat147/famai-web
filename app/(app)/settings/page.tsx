import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { SettingsView } from "@/components/settings/SettingsView";
import { updateSettings } from "./actions";

export const metadata = { title: "ตั้งค่าระบบ — Famai Motor Group" };

export default async function SettingsPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);

  return <SettingsView settings={settings} canEdit={Boolean(user?.perms.admin)} action={updateSettings} />;
}
