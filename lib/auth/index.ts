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

  // ทั้ง 4 query ไม่ขึ้นต่อกัน (คีย์ด้วย user.id / role เป็นตารางเล็ก) → ยิงขนานลด round-trip ทุกหน้า
  const [appUserRes, userRoleRes, branchRes, allRolesRes] = await Promise.all([
    supabase.from("app_user").select("id, username, full_name, nickname, all_branch, is_active").eq("id", user.id).maybeSingle(),
    supabase.from("app_user_role").select("role_id").eq("user_id", user.id),
    supabase.from("app_user_branch").select("branch_id").eq("user_id", user.id),
    supabase.from("role").select("id, code, perms"),
  ]);

  const appUser = appUserRes.data;
  if (!appUser || !appUser.is_active) return null;

  const roleIds = new Set((userRoleRes.data ?? []).map((r) => r.role_id));
  const roles = (allRolesRes.data ?? []).filter((r) => roleIds.has(r.id));
  const branchRows = branchRes.data;

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
