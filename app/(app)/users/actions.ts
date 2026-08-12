"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { diffIds, selfLockout, type UsersActionResult } from "@/lib/users/users";

function parseIds(formData: FormData, key: string): string[] {
  try {
    const parsed = JSON.parse(String(formData.get(key) ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * แก้สิทธิ์ผู้ใช้ (role/สาขา/เห็นทุกสาขา/เปิดใช้งาน) — เฉพาะ admin (ตรงกับ RLS)
 * กันแอดมินล็อกตัวเอง · sync แบบเพิ่มก่อนลบทีหลัง (กันช่วงว่างสิทธิ์)
 */
export async function updateUserAccess(formData: FormData): Promise<UsersActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!me.perms.admin) {
    return { ok: false, error: "จัดการบัญชีผู้ใช้ได้เฉพาะแอดมิน" };
  }

  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) {
    return { ok: false, error: "ไม่พบผู้ใช้" };
  }
  const roleIds = parseIds(formData, "role_ids");
  const branchIds = parseIds(formData, "branch_ids");
  const allBranch = String(formData.get("all_branch") ?? "false") === "true";
  const isActive = String(formData.get("is_active") ?? "true") === "true";

  const supabase = await createServerSupabase();

  // ตรวจ id ที่ส่งมาว่ามีจริง + map เป็น code เพื่อกันล็อกตัวเอง
  const [rolesRes, branchesRes] = await Promise.all([
    supabase.from("role").select("id, code"),
    supabase.from("branch").select("id"),
  ]);
  const roleById = new Map((rolesRes.data ?? []).map((r) => [r.id, r.code]));
  const validBranch = new Set((branchesRes.data ?? []).map((b) => b.id));
  const targetRoleIds = roleIds.filter((id) => roleById.has(id));
  const targetBranchIds = branchIds.filter((id) => validBranch.has(id));
  const targetRoleCodes = targetRoleIds.map((id) => roleById.get(id) as string);

  const lockErr = selfLockout(userId === me.id, targetRoleCodes, isActive);
  if (lockErr) {
    return { ok: false, error: lockErr };
  }

  const { error: userError } = await supabase
    .from("app_user")
    .update({ all_branch: allBranch, is_active: isActive })
    .eq("id", userId);
  if (userError) {
    return { ok: false, error: "อัปเดตข้อมูลผู้ใช้ไม่สำเร็จ" };
  }

  // sync roles (เพิ่มก่อน ลบทีหลัง)
  const { data: curRoles } = await supabase.from("app_user_role").select("role_id").eq("user_id", userId);
  const roleDiff = diffIds((curRoles ?? []).map((r) => r.role_id), targetRoleIds);
  if (roleDiff.toAdd.length) {
    const { error } = await supabase.from("app_user_role").insert(roleDiff.toAdd.map((role_id) => ({ user_id: userId, role_id })));
    if (error) {
      return { ok: false, error: "เพิ่มสิทธิ์ไม่สำเร็จ" };
    }
  }
  for (const roleId of roleDiff.toRemove) {
    await supabase.from("app_user_role").delete().eq("user_id", userId).eq("role_id", roleId);
  }

  // sync branches
  const { data: curBranches } = await supabase.from("app_user_branch").select("branch_id").eq("user_id", userId);
  const branchDiff = diffIds((curBranches ?? []).map((b) => b.branch_id), targetBranchIds);
  if (branchDiff.toAdd.length) {
    const { error } = await supabase.from("app_user_branch").insert(branchDiff.toAdd.map((branch_id) => ({ user_id: userId, branch_id })));
    if (error) {
      return { ok: false, error: "เพิ่มสาขาไม่สำเร็จ" };
    }
  }
  for (const branchId of branchDiff.toRemove) {
    await supabase.from("app_user_branch").delete().eq("user_id", userId).eq("branch_id", branchId);
  }

  revalidatePath("/users");
  return { ok: true };
}
