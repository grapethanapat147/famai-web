import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/auth/money";
import { getActiveBranches, getCompaniesCached } from "@/lib/reference/cache";
import { getSettings } from "@/lib/settings";
import { canViewPayroll, computePayslip, monthRange, type PayslipRow } from "@/lib/payroll/payroll";
import { PayrollView } from "@/components/payroll/PayrollView";
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

  const [empRes, usersRes, attRes, salesRes, branches, orgCompanies] = await Promise.all([
    supabase.from("employee").select("id, user_id, position, base_salary").is("resigned_at", null),
    supabase.from("app_user").select("id, full_name"),
    supabase.from("attendance").select("employee_id, ot_minutes").gte("work_date", start).lte("work_date", end),
    supabase.from("sale").select("salesperson_id, gross_profit").is("voided_at", null).gte("sold_at", start).lte("sold_at", end),
    getActiveBranches(),
    getCompaniesCached(),
  ]);

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

  const rows: PayslipRow[] = (empRes.data ?? [])
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

  return <PayrollView rows={safeRows} month={month} seller={seller} canSeeMoney={see} />;
}
