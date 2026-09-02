import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canViewAuditLog, type AuditRow } from "@/lib/audit/log";
import { AuditView } from "@/components/audit/AuditView";

export const metadata = { title: "ประวัติการแก้ไข — Famai Motor Group" };

/** audit_log โตไม่มีเพดาน — ดึงแค่ล่าสุด ไม่ใช่ทั้งตาราง (บทเรียนเดียวกับหน้าใบงานซ่อม) */
const LIMIT = 300;

export default async function AuditPage() {
  const me = await getCurrentUser();
  if (!me || !canViewAuditLog(me.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        ดูประวัติการแก้ไขได้เฉพาะผู้ดูแลระบบ
      </p>
    );
  }

  const supabase = await createServerSupabase();
  const [logRes, usersRes] = await Promise.all([
    supabase
      .from("audit_log")
      .select("id, at, actor, table_name, row_id, action, before, after")
      .order("at", { ascending: false })
      .limit(LIMIT),
    supabase.from("app_user").select("id, full_name"),
  ]);

  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));
  const rows: AuditRow[] = (logRes.data ?? []).map((r) => ({
    id: Number(r.id),
    at: r.at,
    actorName: (r.actor && userName.get(r.actor)) || "ระบบ",
    tableName: r.table_name,
    rowId: r.row_id,
    action: r.action,
    before: (r.before as Record<string, unknown> | null) ?? null,
    after: (r.after as Record<string, unknown> | null) ?? null,
  }));

  return <AuditView rows={rows} limit={LIMIT} />;
}
