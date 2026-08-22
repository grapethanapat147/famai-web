import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveBranches } from "@/lib/reference/cache";
import { canManageUsers, type UserRow } from "@/lib/users/users";
import { UsersView, type BranchOption, type RoleOption } from "@/components/users/UsersView";
import { updateUserAccess } from "./actions";

export const metadata = { title: "บัญชีผู้ใช้ — Famai Motor Group" };

export default async function UsersPage() {
  const supabase = await createServerSupabase();
  const me = await getCurrentUser();

  if (!me || !canManageUsers(me.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        จัดการบัญชีผู้ใช้ได้เฉพาะแอดมิน
      </p>
    );
  }

  const [usersRes, rolesRes, userRolesRes, userBranchesRes, branchRows] = await Promise.all([
    supabase.from("app_user").select("id, username, full_name, nickname, all_branch, is_active").order("full_name"),
    supabase.from("role").select("id, code, name"),
    supabase.from("app_user_role").select("user_id, role_id"),
    supabase.from("app_user_branch").select("user_id, branch_id"),
    getActiveBranches(),
  ]);

  const roleCodeById = new Map((rolesRes.data ?? []).map((r) => [r.id, r.code]));

  const rolesByUser = new Map<string, { ids: string[]; codes: string[] }>();
  for (const ur of userRolesRes.data ?? []) {
    const entry = rolesByUser.get(ur.user_id) ?? { ids: [], codes: [] };
    entry.ids.push(ur.role_id);
    const code = roleCodeById.get(ur.role_id);
    if (code) {
      entry.codes.push(code);
    }
    rolesByUser.set(ur.user_id, entry);
  }

  const branchesByUser = new Map<string, string[]>();
  for (const ub of userBranchesRes.data ?? []) {
    const list = branchesByUser.get(ub.user_id) ?? [];
    list.push(ub.branch_id);
    branchesByUser.set(ub.user_id, list);
  }

  const users: UserRow[] = (usersRes.data ?? []).map((u) => {
    const r = rolesByUser.get(u.id) ?? { ids: [], codes: [] };
    return {
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      nickname: u.nickname,
      allBranch: u.all_branch,
      isActive: u.is_active,
      roleCodes: r.codes,
      roleIds: r.ids,
      branchIds: branchesByUser.get(u.id) ?? [],
    };
  });

  const roles: RoleOption[] = (rolesRes.data ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name }));
  const branches: BranchOption[] = branchRows.map((b) => ({ id: b.id, name: b.name }));

  return <UsersView users={users} roles={roles} branches={branches} currentUserId={me.id} action={updateUserAccess} />;
}
