import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/auth/money";
import { getActiveBranches } from "@/lib/reference/cache";
import { canCreateAccount, canManageEmployees, type EmployeeRow } from "@/lib/employees/employees";
import { EmployeesView, type BranchOption, type RoleOption } from "@/components/employees/EmployeesView";
import { createStaffAccount, updateEmployee } from "./actions";

export const metadata = { title: "พนักงาน — Famai Motor Group" };

export default async function EmployeesPage() {
  const me = await getCurrentUser();
  if (!me || !canManageEmployees(me.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        จัดการข้อมูลพนักงานได้เฉพาะผู้ดูแล / ผู้บริหาร / ฝ่ายบุคคล
      </p>
    );
  }

  const supabase = await createServerSupabase();
  const [empRes, usersRes, rolesRes, userRolesRes, branchRows, see] = await Promise.all([
    supabase.from("employee").select("id, user_id, branch_id, emp_code, position, hired_at, resigned_at, base_salary"),
    supabase.from("app_user").select("id, username, full_name"),
    supabase.from("role").select("id, code, name"),
    supabase.from("app_user_role").select("user_id, role_id"),
    getActiveBranches(),
    canSeeMoney(),
  ]);

  const userById = new Map((usersRes.data ?? []).map((u) => [u.id, u]));
  const branchById = new Map(branchRows.map((b) => [b.id, b]));
  const roleCodeById = new Map((rolesRes.data ?? []).map((r) => [r.id, r.code]));

  const rolesByUser = new Map<string, string[]>();
  for (const ur of userRolesRes.data ?? []) {
    const code = roleCodeById.get(ur.role_id);
    if (code) {
      rolesByUser.set(ur.user_id, [...(rolesByUser.get(ur.user_id) ?? []), code]);
    }
  }

  const employees: EmployeeRow[] = (empRes.data ?? [])
    .map((e) => {
      const u = e.user_id ? userById.get(e.user_id) : undefined;
      return {
        id: e.id,
        userId: e.user_id,
        fullName: u?.full_name ?? "— ยังไม่ผูกบัญชี —",
        username: u?.username ?? null,
        empCode: e.emp_code,
        position: e.position,
        branchId: e.branch_id,
        branchName: branchById.get(e.branch_id)?.name ?? "—",
        hiredAt: e.hired_at,
        resignedAt: e.resigned_at,
        // เงินเดือนตัดทิ้งฝั่งเซิร์ฟเวอร์เมื่อไม่มีสิทธิ์เห็นเงิน (ไม่ส่งลง client เลย)
        baseSalary: see && e.base_salary != null ? Number(e.base_salary) : null,
        roleCodes: e.user_id ? (rolesByUser.get(e.user_id) ?? []) : [],
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "th"));

  const roles: RoleOption[] = (rolesRes.data ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name }));
  const branches: BranchOption[] = branchRows.map((b) => ({ id: b.id, name: b.name }));

  return (
    <EmployeesView
      employees={employees}
      branches={branches}
      roles={roles}
      canSeeMoney={see}
      canCreate={canCreateAccount(me.perms)}
      updateAction={updateEmployee}
      createAction={createStaffAccount}
    />
  );
}
