import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canViewAttend, resolveStatus, type AttendRow } from "@/lib/attend/attendance";
import { AttendView } from "@/components/attend/AttendView";

export const metadata = { title: "ภาพรวมการเข้างาน — Famai Motor Group" };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AttendPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: dateParam } = await searchParams;
  const today = todayISO();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? (dateParam as string) : today;

  const supabase = await createServerSupabase();
  const me = await getCurrentUser();
  if (!me || !canViewAttend(me.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        ดูภาพรวมการเข้างานได้เฉพาะผู้บริหาร / HR
      </p>
    );
  }

  const [empRes, usersRes, attRes, leaveRes] = await Promise.all([
    supabase.from("employee").select("id, user_id, position").is("resigned_at", null),
    supabase.from("app_user").select("id, full_name"),
    supabase.from("attendance").select("employee_id, check_in, status, late_minutes, ot_minutes").eq("work_date", date),
    supabase
      .from("leave_request")
      .select("employee_id, date_from, date_to")
      .eq("status", "อนุมัติ")
      .lte("date_from", date)
      .gte("date_to", date),
  ]);

  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));
  const attByEmp = new Map((attRes.data ?? []).map((a) => [a.employee_id, a]));
  const onLeave = new Set((leaveRes.data ?? []).map((l) => l.employee_id));
  const isToday = date === today;

  const rows: AttendRow[] = (empRes.data ?? []).map((e) => {
    const att = attByEmp.get(e.id);
    const status = resolveStatus(att?.status ?? null, Boolean(att?.check_in), onLeave.has(e.id), isToday);
    return {
      employeeId: e.id,
      name: (e.user_id && userName.get(e.user_id)) || "พนักงาน",
      position: e.position ?? "—",
      status,
      checkIn: att?.check_in ?? null,
      lateMinutes: att?.late_minutes ?? null,
      otMinutes: att?.ot_minutes ?? 0,
    };
  });

  rows.sort((a, b) => a.name.localeCompare(b.name, "th"));

  return <AttendView rows={rows} date={date} />;
}
