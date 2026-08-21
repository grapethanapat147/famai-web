import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/automation/cron-auth";
import { nowParts } from "@/lib/automation/clock";
import { dueReminders, type RemRow } from "@/lib/automation/service";
import { serviceReminderDigest } from "@/lib/line/message";
import { pushLineText } from "@/lib/line/notify";

export const dynamic = "force-dynamic";

/**
 * Cron: เตือนลูกค้าถึงกำหนดเช็กระยะ (service_reminder ที่ due แล้วและยังไม่เคยเตือน) — E10
 * Authorization: Bearer <CRON_SECRET> · ?preview=1 = ดูข้อความไม่ส่ง/ไม่เขียน
 * ส่ง LINE สำเร็จ → mark notified_at (กันเตือนซ้ำทุกวัน) · ส่งไม่ได้/ไม่ตั้งค่า → ไม่ mark (ลองใหม่รอบหน้า)
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const [remRes, custRes, unitsRes, variantsRes] = await Promise.all([
    supabase.from("service_reminder").select("id, customer_id, unit_id, target_km, due_date, notified_at"),
    supabase.from("customer").select("id, full_name"),
    supabase.from("motorcycle_unit").select("id, variant_id"),
    supabase.from("model_variant").select("id, model_name"),
  ]);

  const custMap = new Map((custRes.data ?? []).map((c) => [c.id, c.full_name]));
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u.variant_id]));
  const variantMap = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));

  const rows: RemRow[] = (remRes.data ?? []).map((r) => {
    const variantId = r.unit_id ? unitMap.get(r.unit_id) : undefined;
    return {
      id: r.id,
      customerName: custMap.get(r.customer_id) ?? "—",
      model: variantId ? (variantMap.get(variantId) ?? null) : null,
      targetKm: r.target_km,
      dueDate: r.due_date,
      notified: r.notified_at != null,
    };
  });

  const { today, label } = nowParts(new Date());
  const due = dueReminders(rows, today);
  const message = serviceReminderDigest(due, label);

  if (req.nextUrl.searchParams.get("preview") === "1") {
    return NextResponse.json({ dueCount: due.length, message });
  }

  if (!message) {
    return NextResponse.json({ dueCount: 0, notify: { sent: false, reason: "nothing-to-report" }, marked: 0 });
  }

  const notify = await pushLineText(message);
  let marked = 0;
  if (notify.sent) {
    const ids = due.map((r) => r.id);
    const { error } = await supabase.from("service_reminder").update({ notified_at: new Date().toISOString() }).in("id", ids);
    marked = error ? 0 : ids.length;
  }
  return NextResponse.json({ dueCount: due.length, notify, marked });
}
