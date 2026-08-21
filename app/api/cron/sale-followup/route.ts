import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/automation/cron-auth";
import { nowParts } from "@/lib/automation/clock";
import { followUpKey, plannedFollowUps, type SaleRow } from "@/lib/automation/followup";
import { pushLineText } from "@/lib/line/notify";

export const dynamic = "force-dynamic";

const DEFAULT_CADENCE = [7, 30, 90];

/**
 * Cron: สร้างงานติดตามหลังขาย (follow_up_task) ต่อการขาย × รอบติดตามที่ถึงกำหนด — E10
 * Authorization: Bearer <CRON_SECRET> · ?preview=1 = ดูรายการที่จะสร้าง ไม่เขียน/ไม่ส่ง
 * idempotent: สร้างเฉพาะ (sale, kind) ที่ยังไม่มี → รันซ้ำไม่เพิ่มงานซ้ำ
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const [salesRes, tasksRes, settingRes] = await Promise.all([
    supabase.from("sale").select("id, branch_id, customer_id, sold_at, voided_at"),
    supabase.from("follow_up_task").select("sale_id, kind"),
    supabase.from("app_setting").select("value").eq("key", "follow_up_cadence").maybeSingle(),
  ]);

  const sales: SaleRow[] = (salesRes.data ?? [])
    .filter((s) => s.voided_at == null)
    .map((s) => ({ id: s.id, branchId: s.branch_id, customerId: s.customer_id, soldAt: s.sold_at }));

  const existing = new Set(
    (tasksRes.data ?? []).filter((t) => t.sale_id != null).map((t) => followUpKey(t.sale_id as string, t.kind)),
  );

  const rawCadence = settingRes.data?.value;
  const cadence = Array.isArray(rawCadence) ? rawCadence.map(Number).filter((n) => n > 0) : DEFAULT_CADENCE;

  const { today, label } = nowParts(new Date());
  const planned = plannedFollowUps(sales, existing, cadence, today);

  if (req.nextUrl.searchParams.get("preview") === "1") {
    return NextResponse.json({ plannedCount: planned.length, cadence, sample: planned.slice(0, 5) });
  }

  if (planned.length === 0) {
    return NextResponse.json({ created: 0, notify: { sent: false, reason: "nothing-to-create" } });
  }

  const { error } = await supabase.from("follow_up_task").insert(planned);
  if (error) {
    return NextResponse.json({ created: 0, error: "insert-failed" }, { status: 500 });
  }
  const notify = await pushLineText(`📋 สร้างงานติดตามหลังขาย ${planned.length} งาน (ณ ${label}) — ดูในหน้า “ติดตาม”`);
  return NextResponse.json({ created: planned.length, notify });
}
