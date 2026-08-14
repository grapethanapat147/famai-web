import { createServerSupabase } from "@/lib/supabase/server";
import { expandLeave, type CalEvent } from "@/lib/calendar/events";
import { CalendarView } from "@/components/calendar/CalendarView";

export const metadata = { title: "ปฏิทิน — Famai Motor Group" };

const DAY = 86_400_000;
function isoUTC(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function bangkokMonth(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(new Date());
}
function bangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? (monthParam as string) : bangkokMonth();
  const [year, mon] = month.split("-").map(Number);
  const start = isoUTC(Date.UTC(year, mon - 1, 1) - 7 * DAY);
  const end = isoUTC(Date.UTC(year, mon, 0) + 7 * DAY);

  const supabase = await createServerSupabase();

  const [eventsRes, leavesRes, regsRes, remindersRes, employeesRes, usersRes, customersRes] = await Promise.all([
    supabase.from("company_event").select("event_date, event_type, title").gte("event_date", start).lte("event_date", end),
    supabase.from("leave_request").select("employee_id, leave_type, date_from, date_to").eq("status", "อนุมัติ").lte("date_from", end).gte("date_to", start),
    supabase.from("registration").select("plate_no, due_at").not("due_at", "is", null).gte("due_at", start).lte("due_at", end),
    supabase.from("service_reminder").select("customer_id, target_km, due_date").not("due_date", "is", null).gte("due_date", start).lte("due_date", end),
    supabase.from("employee").select("id, user_id"),
    supabase.from("app_user").select("id, full_name"),
    supabase.from("customer").select("id, full_name"),
  ]);

  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));
  const empUser = new Map((employeesRes.data ?? []).map((e) => [e.id, e.user_id]));
  const customerName = new Map((customersRes.data ?? []).map((c) => [c.id, c.full_name]));

  const events: CalEvent[] = [];

  for (const e of eventsRes.data ?? []) {
    events.push({ date: e.event_date, type: "company", title: e.title, subtitle: e.event_type });
  }

  for (const l of leavesRes.data ?? []) {
    const uid = empUser.get(l.employee_id);
    const name = (uid && userName.get(uid)) || "พนักงาน";
    for (const date of expandLeave(l.date_from, l.date_to, start, end)) {
      events.push({ date, type: "leave", title: `${name} — ลา`, subtitle: l.leave_type });
    }
  }

  for (const r of regsRes.data ?? []) {
    if (r.due_at) {
      events.push({ date: r.due_at, type: "reg", title: "ครบกำหนดจดทะเบียน", subtitle: r.plate_no ?? "รอทะเบียน" });
    }
  }

  for (const s of remindersRes.data ?? []) {
    if (s.due_date) {
      const cust = (s.customer_id && customerName.get(s.customer_id)) || "ลูกค้า";
      events.push({ date: s.due_date, type: "service", title: `เช็กระยะ ${s.target_km.toLocaleString("en-US")} กม.`, subtitle: cust });
    }
  }

  return <CalendarView events={events} month={month} today={bangkokToday()} />;
}
