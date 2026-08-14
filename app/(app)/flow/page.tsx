import { getCurrentUser } from "@/lib/auth";
import { FlowView } from "@/components/flow/FlowView";

export const metadata = { title: "ผังกระบวนการ — Famai Motor Group" };

export default async function FlowPage() {
  const user = await getCurrentUser();
  return <FlowView roleCodes={user?.roleCodes ?? []} />;
}
