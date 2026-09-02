import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/auth/money";
import { getActiveBranches, getCompaniesCached } from "@/lib/reference/cache";
import { getSettings } from "@/lib/settings";
import {
  canClosePayroll,
  canViewPayroll,
  computePayslip,
  isPeriodLocked,
  isPeriodStatus,
  monthRange,
  type PayslipRow,
  type PeriodStatus,
} from "@/lib/payroll/payroll";
import { updatePayrollPeriod } from "./actions";
import { PayrollView, type PayoutInfo } from "@/components/payroll/PayrollView";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";

export const metadata = { title: "เงินเดือนและ OT — Famai Motor Group" };

function currentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(new Date());
}

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "") ? (monthParam as string) : currentMonth();
  const { start, end } = monthRange(month);

  const supabase = await createServerSupabase();
  const me = await getCurrentUser();
  if (!me || !canViewPayroll(me.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        ดูเงินเดือนได้เฉพาะผู้บริหาร / HR / บัญชี
      </p>
    );
  }

  const see = await canSeeMoney();
  const settings = await getSettings(); // แคชข้ามรีเควสต์ (FAM-1108) — เดิมใช้ getSettingsWith ที่ query สดทุกครั้ง

  const [empRes, usersRes, attRes, salesRes, branches, orgCompanies, periodRes] = await Promise.all([
    supabase.from("employee").select("id, user_id, position, base_salary, ssn_no, bank_code, bank_account").is("resigned_at", null),
    supabase.from("app_user").select("id, full_name"),
    supabase.from("attendance").select("employee_id, ot_minutes").gte("work_date", start).lte("work_date", end),
    supabase.from("sale").select("salesperson_id, gross_profit").is("voided_at", null).gte("sold_at", start).lte("sold_at", end),
    getActiveBranches(),
    getCompaniesCached(),
    supabase
      .from("payroll_period")
      .select("id, status")
      .is("branch_id", null)
      .eq("period_start", start)
      .eq("period_end", end)
      .maybeSingle(),
  ]);

  const period = periodRes.data ?? null;
  const periodStatus: PeriodStatus | null = period && isPeriodStatus(period.status) ? period.status : null;
  // งวดที่ปิดแล้วอ่านจากภาพนิ่ง — ไม่คำนวณใหม่ ไม่งั้นแก้บันทึกเวลาย้อนหลังแล้วยอดขยับ (fixlist ข้อ 08)
  const snapRes = isPeriodLocked(periodStatus) && period
    ? await supabase
        .from("payslip")
        .select("employee_id, employee_name, position, base, ot_minutes, ot_amount, commission_base, commission, ssn, net")
        .eq("period_id", period.id)
    : null;

  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));

  const otByEmp = new Map<string, number>();
  for (const a of attRes.data ?? []) {
    otByEmp.set(a.employee_id, (otByEmp.get(a.employee_id) ?? 0) + (a.ot_minutes ?? 0));
  }
  const gpByUser = new Map<string, number>();
  for (const s of salesRes.data ?? []) {
    if (s.salesperson_id) {
      gpByUser.set(s.salesperson_id, (gpByUser.get(s.salesperson_id) ?? 0) + Number(s.gross_profit ?? 0));
    }
  }

  const frozenRows: PayslipRow[] | null = snapRes?.data
    ? snapRes.data
        .map((s) => ({
          employeeId: s.employee_id,
          name: s.employee_name,
          position: s.position ?? "—",
          otMinutes: Number(s.ot_minutes ?? 0),
          commissionBase: Number(s.commission_base ?? 0),
          base: Number(s.base ?? 0),
          otAmount: Number(s.ot_amount ?? 0),
          commission: Number(s.commission ?? 0),
          gross: Number(s.base ?? 0) + Number(s.ot_amount ?? 0) + Number(s.commission ?? 0),
          ssn: Number(s.ssn ?? 0),
          net: Number(s.net ?? 0),
        }))
        .sort((a, b) => b.net - a.net)
    : null;

  const liveRows: PayslipRow[] = (empRes.data ?? [])
    .map((e) => {
      const otMinutes = otByEmp.get(e.id) ?? 0;
      const commissionBase = e.user_id ? (gpByUser.get(e.user_id) ?? 0) : 0;
      const slip = computePayslip({
        baseSalary: Number(e.base_salary ?? 0),
        otMinutes,
        commissionBase,
        otRate: settings.ot_rate,
        commissionPct: settings.commission_pct,
        ssnPct: settings.ssn_pct,
        ssnCap: settings.ssn_cap,
      });
      return {
        employeeId: e.id,
        name: (e.user_id && userName.get(e.user_id)) || "พนักงาน",
        position: e.position ?? "—",
        otMinutes,
        commissionBase,
        ...slip,
      };
    })
    .sort((a, b) => b.net - a.net);

  const rows = frozenRows ?? liveRows;

  // ข้อมูลนำส่งประกันสังคม + โอนเงินเดือน (FAM-1124 · fixlist ข้อ 13/14) — ข้อมูลอ่อนไหว ส่งเฉพาะคนที่ดูเงินได้
  const empExtra = new Map(
    (empRes.data ?? []).map((e) => [e.id, { ssnNo: e.ssn_no ?? null, bankCode: e.bank_code ?? null, bankAccount: e.bank_account ?? null }]),
  );
  const payoutInfo: PayoutInfo[] = see
    ? rows.map((r) => ({
        employeeId: r.employeeId,
        ssnNo: empExtra.get(r.employeeId)?.ssnNo ?? null,
        bankCode: empExtra.get(r.employeeId)?.bankCode ?? null,
        bankAccount: empExtra.get(r.employeeId)?.bankAccount ?? null,
      }))
    : [];

  // ไม่มีสิทธิ์เห็นเงิน → ไม่ส่งตัวเลขเงินเดือนไป client เลย
  const safeRows: PayslipRow[] = see
    ? rows
    : rows.map((r) => ({ ...r, base: 0, otAmount: 0, commission: 0, gross: 0, ssn: 0, net: 0, commissionBase: 0 }));

  const userBranch = branches.find((b) => me.branchIds.includes(b.id)) ?? branches[0] ?? null;
  const org = userBranch?.company_id
    ? orgCompanies.find((c) => c.id === userBranch.company_id) ?? null
    : null;
  const seller: QuoteSeller = {
    shopName: org?.name ?? "Famai Motor Group",
    branchName: userBranch?.name ?? "สำนักงานใหญ่",
    address: userBranch?.address ?? org?.address ?? null,
    phone: userBranch?.phone ?? org?.phone ?? null,
    taxId: userBranch?.tax_id ?? org?.tax_id ?? null,
    sellerName: me.fullName ?? "",
  };

  return (
    <PayrollView
      rows={safeRows}
      month={month}
      seller={seller}
      canSeeMoney={see}
      periodStatus={periodStatus}
      canClose={canClosePayroll(me.roleCodes)}
      periodAction={updatePayrollPeriod}
      payoutInfo={payoutInfo}
    />
  );
}
