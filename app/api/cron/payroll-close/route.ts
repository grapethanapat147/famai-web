import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/automation/cron-auth";
import { daysUntilMonthEnd, nowParts, yearMonth } from "@/lib/automation/clock";
import { isMonthClosed, shouldRemindPayroll } from "@/lib/automation/payroll";
import { payrollReminderMessage } from "@/lib/line/message";
import { pushLineText } from "@/lib/line/notify";

export const dynamic = "force-dynamic";

/**
 * Cron: เตือนปิดงวดเงินเดือนช่วงใกล้สิ้นเดือน (ถ้ายังไม่ปิดงวดเดือนนี้) — E10
 * รันได้ทุกวัน แต่จะส่งเฉพาะช่วง window (<= 3 วันก่อนสิ้นเดือน) และเดือนนี้ยังไม่ปิด
 * Authorization: Bearer <CRON_SECRET> · ?preview=1 = ดูสถานะ/ข้อความ ไม่ส่ง
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const { data } = await supabase.from("payroll_period").select("period_end, status");
  const periods = (data ?? []).map((p) => ({ periodEnd: p.period_end, status: p.status }));

  const now = new Date();
  const { label } = nowParts(now);
  const daysLeft = daysUntilMonthEnd(now);
  const closedThisMonth = isMonthClosed(periods, yearMonth(now));
  const remind = shouldRemindPayroll(daysLeft, closedThisMonth);
  const message = remind ? payrollReminderMessage(daysLeft, label) : null;

  if (req.nextUrl.searchParams.get("preview") === "1") {
    return NextResponse.json({ daysLeft, closedThisMonth, wouldRemind: remind, message });
  }

  if (!message) {
    return NextResponse.json({
      remind: false,
      reason: closedThisMonth ? "already-closed" : "out-of-window",
      daysLeft,
    });
  }

  const notify = await pushLineText(message);
  return NextResponse.json({ remind: true, daysLeft, notify });
}
