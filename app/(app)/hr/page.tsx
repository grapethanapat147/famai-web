import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canApproveLeave, isLeaveStatus, type LeaveRow, type LeaveStatus } from "@/lib/hr/leave";
import { branchGeofence } from "@/lib/hr/geo";
import { HrView, type MyToday } from "@/components/hr/HrView";
import { clockIn, clockOut, decideLeave, linkMyEmployee, requestLeave } from "./actions";

export const metadata = { title: "ลงเวลาและลา — Famai Motor Group" };

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

/** วันที่ตัดประวัติใบลา (90 วันย้อนหลัง, เขตเวลาไทย) */
function leaveCutoffISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(Date.now() - 90 * 86_400_000));
}

export default async function HrPage() {
  const supabase = await createServerSupabase();
  const me = await getCurrentUser();
  const today = todayISO();

  // ใบลาที่ยังรออนุมัติ (ทุกอายุ) + ประวัติ 90 วันล่าสุด — หน้าลงเวลาเปิดทุกวัน ไม่ต้องแบกประวัติทั้งบริษัท (FAM-1108)
  const leaveCutoff = leaveCutoffISO();

  // รอบแรกยิงขนานทุก query ที่อิสระ (เดิม waterfall 3 รอบ) — เหลือรอบสองเฉพาะที่ต้องใช้ myEmp
  const [myEmpRes, leavesRes, employeesRes, usersRes] = await Promise.all([
    me
      ? supabase.from("employee").select("id, branch_id").eq("user_id", me.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("leave_request")
      .select("id, employee_id, leave_type, date_from, date_to, status, reason")
      .or(`status.eq.รออนุมัติ,date_from.gte.${leaveCutoff}`)
      .order("date_from", { ascending: false }),
    supabase.from("employee").select("id, user_id"),
    supabase.from("app_user").select("id, full_name"),
  ]);
  const myEmp = myEmpRes.data;
  const myEmpId = myEmp?.id ?? null;

  const [attRes, branchGeoRes] = await Promise.all([
    myEmpId
      ? supabase.from("attendance").select("check_in, check_out, status, ot_minutes").eq("employee_id", myEmpId).eq("work_date", today).maybeSingle()
      : Promise.resolve({ data: null }),
    myEmp?.branch_id
      ? supabase.from("branch").select("geo_lat, geo_lng, geo_radius_m, require_selfie").eq("id", myEmp.branch_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const branchGeo = branchGeoRes.data;
  const fence = branchGeo ? branchGeofence(branchGeo) : null;

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
    ? { checkIn: attRes.data.check_in, checkOut: attRes.data.check_out, status: attRes.data.status, otMinutes: attRes.data.ot_minutes ?? 0 }
    : myEmpId
      ? { checkIn: null, checkOut: null, status: null, otMinutes: 0 }
      : null;

  return (
    <HrView
      hasEmployee={Boolean(myEmpId)}
      myToday={myToday}
      leaves={leaves}
      canApprove={Boolean(me && canApproveLeave(me.perms))}
      today={today}
      geofence={fence ? { radiusM: fence.radiusM } : null}
      requireSelfie={Boolean(branchGeo?.require_selfie)}
      employeeId={myEmpId}
      clockInAction={clockIn}
      clockOutAction={clockOut}
      linkEmployeeAction={linkMyEmployee}
      requestLeaveAction={requestLeave}
      decideLeaveAction={decideLeave}
    />
  );
}
