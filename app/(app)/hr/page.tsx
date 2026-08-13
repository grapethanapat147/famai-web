import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canApproveLeave, isLeaveStatus, type LeaveRow, type LeaveStatus } from "@/lib/hr/leave";
import { HrView, type MyToday } from "@/components/hr/HrView";
import { clockIn, clockOut, decideLeave, requestLeave } from "./actions";

export const metadata = { title: "ลงเวลาและลา — Famai Motor Group" };

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

export default async function HrPage() {
  const supabase = await createServerSupabase();
  const me = await getCurrentUser();
  const today = todayISO();

  const myEmp = me
    ? (await supabase.from("employee").select("id").eq("user_id", me.id).maybeSingle()).data
    : null;
  const myEmpId = myEmp?.id ?? null;

  const [attRes, leavesRes, employeesRes, usersRes] = await Promise.all([
    myEmpId
      ? supabase.from("attendance").select("check_in, check_out, status").eq("employee_id", myEmpId).eq("work_date", today).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("leave_request").select("id, employee_id, leave_type, date_from, date_to, status, reason").order("date_from", { ascending: false }),
    supabase.from("employee").select("id, user_id"),
    supabase.from("app_user").select("id, full_name"),
  ]);

  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));
  const empUser = new Map((employeesRes.data ?? []).map((e) => [e.id, e.user_id]));

  const leaves: LeaveRow[] = (leavesRes.data ?? []).map((l) => {
    const uid = empUser.get(l.employee_id);
    const status: LeaveStatus = isLeaveStatus(l.status) ? l.status : "รออนุมัติ";
    return {
      id: l.id,
      employeeId: l.employee_id,
      employeeName: (uid && userName.get(uid)) || "พนักงาน",
      leaveType: l.leave_type,
      dateFrom: l.date_from,
      dateTo: l.date_to,
      status,
      reason: l.reason,
      mine: l.employee_id === myEmpId,
    };
  });

  const myToday: MyToday | null = attRes.data
    ? { checkIn: attRes.data.check_in, checkOut: attRes.data.check_out, status: attRes.data.status }
    : myEmpId
      ? { checkIn: null, checkOut: null, status: null }
      : null;

  return (
    <HrView
      hasEmployee={Boolean(myEmpId)}
      myToday={myToday}
      leaves={leaves}
      canApprove={Boolean(me && canApproveLeave(me.perms))}
      today={today}
      clockInAction={clockIn}
      clockOutAction={clockOut}
      requestLeaveAction={requestLeave}
      decideLeaveAction={decideLeave}
    />
  );
}
