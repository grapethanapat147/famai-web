import "server-only";

import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { combinePerms, type PermSet } from "@/lib/auth/permissions";

export type { Perm, PermSet } from "@/lib/auth/permissions";

export type CurrentUser = {
  id: string;
  username: string;
  fullName: string;
  nickname: string | null;
  allBranch: boolean;
  roleCodes: string[];
  perms: PermSet;
  branchIds: string[];
};

/**
 * ผู้ใช้ปัจจุบัน + สิทธิ์ (role/branch/perms) — memoized ต่อ render
 * ตรวจ JWT จริงด้วย auth.getUser() (ไม่ใช่แค่ getSession อ่าน cookie)
 * unknown/ไม่มี role → perms ว่าง (fail closed) · ผู้ใช้ inactive → null
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: appUser } = await supabase
    .from("app_user")
    .select("id, username, full_name, nickname, all_branch, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (!appUser || !appUser.is_active) return null;

  const { data: userRoleRows } = await supabase
    .from("app_user_role")
    .select("role_id")
    .eq("user_id", user.id);
  const roleIds = (userRoleRows ?? []).map((r) => r.role_id);

  const { data: roleRows } = roleIds.length
    ? await supabase.from("role").select("code, perms").in("id", roleIds)
    : { data: [] };
  const roles = roleRows ?? [];

  const { data: branchRows } = await supabase
    .from("app_user_branch")
    .select("branch_id")
    .eq("user_id", user.id);

  return {
    id: appUser.id,
    username: appUser.username,
    fullName: appUser.full_name,
    nickname: appUser.nickname,
    allBranch: appUser.all_branch,
    roleCodes: roles.map((r) => r.code),
    perms: combinePerms(roles),
    branchIds: (branchRows ?? []).map((r) => r.branch_id),
  };
});
