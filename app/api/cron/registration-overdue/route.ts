import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/automation/cron-auth";
import { nowParts } from "@/lib/automation/clock";
import { overdueRegistrations, type RegRow } from "@/lib/automation/registration";
import { registrationOverdueDigest } from "@/lib/line/message";
import { pushLineText } from "@/lib/line/notify";

export const dynamic = "force-dynamic";

/**
 * Cron: แจ้งเตือนทะเบียนเกินกำหนด (ยังไม่ได้ป้าย + เลย due_at) — E10
 * Authorization: Bearer <CRON_SECRET> · ?preview=1 = ดูข้อความไม่ส่งจริง · อ่านอย่างเดียว
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const [regRes, salesRes, custRes, unitsRes, variantsRes, branchesRes] = await Promise.all([
    supabase.from("registration").select("sale_id, branch_id, stage, due_at, plate_received_at"),
    supabase.from("sale").select("id, customer_id, unit_id"),
    supabase.from("customer").select("id, full_name"),
    supabase.from("motorcycle_unit").select("id, variant_id"),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("branch").select("id, name"),
  ]);

  const saleMap = new Map((salesRes.data ?? []).map((s) => [s.id, s]));
  const custMap = new Map((custRes.data ?? []).map((c) => [c.id, c.full_name]));
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u.variant_id]));
  const variantMap = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const branchMap = new Map((branchesRes.data ?? []).map((b) => [b.id, b.name]));

  const rows: RegRow[] = (regRes.data ?? []).map((g) => {
    const sale = saleMap.get(g.sale_id);
    const variantId = sale ? unitMap.get(sale.unit_id) : undefined;
    return {
      customerName: (sale ? custMap.get(sale.customer_id) : null) ?? "—",
      model: variantId ? (variantMap.get(variantId) ?? null) : null,
      branchName: branchMap.get(g.branch_id) ?? "?",
      stage: g.stage,
      dueAt: g.due_at,
      plateReceived: g.plate_received_at != null,
    };
  });

  const { today, label } = nowParts(new Date());
  const overdue = overdueRegistrations(rows, today);
  const message = registrationOverdueDigest(overdue, label);

  if (req.nextUrl.searchParams.get("preview") === "1") {
    return NextResponse.json({ overdueCount: overdue.length, message });
  }

  const notify = message ? await pushLineText(message) : { sent: false, reason: "nothing-to-report" };
  return NextResponse.json({ overdueCount: overdue.length, notify });
}
