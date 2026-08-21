import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/automation/cron-auth";
import { computeAgeDays } from "@/lib/stock/units";
import { agedUnits, type DashUnit } from "@/lib/dashboard/stats";
import { agedStockDigest } from "@/lib/line/message";
import { pushLineText } from "@/lib/line/notify";

export const dynamic = "force-dynamic";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/**
 * Cron: แจ้งเตือนรถค้างสต๊อกเกินเกณฑ์ (E10) — เรียกด้วย Authorization: Bearer <CRON_SECRET>
 * ?preview=1 = ดูข้อความที่จะส่งโดยไม่ส่งจริง (สำหรับทดสอบ)
 * อ่านอย่างเดียว (ไม่เขียน DB) · ส่งเข้า LINE ถ้าตั้งค่า token/ปลายทางไว้
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const [unitsRes, branchesRes, variantsRes, settingRes] = await Promise.all([
    supabase.from("motorcycle_unit").select("branch_id, variant_id, status, received_at"),
    supabase.from("branch").select("id, code, name"),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("app_setting").select("value").eq("key", "aging_days").maybeSingle(),
  ]);

  const branchMap = new Map((branchesRes.data ?? []).map((b) => [b.id, b]));
  const variantMap = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const agingDays = Number(settingRes.data?.value) || 90;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dateLabel = `${now.getDate()} ${THAI_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  const units: DashUnit[] = (unitsRes.data ?? []).map((u) => {
    const b = branchMap.get(u.branch_id);
    return {
      branchCode: b?.code ?? "?",
      branchName: b?.name ?? "?",
      status: u.status,
      ageDays: computeAgeDays(u.received_at, today),
      model: variantMap.get(u.variant_id) ?? undefined,
    };
  });

  const aged = agedUnits(units, agingDays, 999);
  const message = agedStockDigest(aged, agingDays, dateLabel);

  if (req.nextUrl.searchParams.get("preview") === "1") {
    return NextResponse.json({ agedCount: aged.length, agingDays, message });
  }

  const notify = message ? await pushLineText(message) : { sent: false, reason: "nothing-to-report" };
  return NextResponse.json({ agedCount: aged.length, agingDays, notify });
}
