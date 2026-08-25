"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import {
  canCreateAccount,
  canManageEmployees,
  validateEmployeeEdit,
  validateNewAccount,
  type EmployeeActionResult,
} from "@/lib/employees/employees";

/**
 * ล้าง auth user + ข้อมูลที่เพิ่งสร้าง เมื่อขั้นถัดไปล้มกลางทาง
 * กันบัญชีค้างที่ล็อกอินได้แต่ไม่มีสิทธิ์/ไม่มีระเบียนพนักงาน
 */
async function rollbackNewAccount(
  admin: ReturnType<typeof createAdminSupabase>,
  authUserId: string,
  error: string,
): Promise<EmployeeActionResult> {
  await admin.from("app_user_role").delete().eq("user_id", authUserId);
  await admin.from("app_user_branch").delete().eq("user_id", authUserId);
  await admin.from("app_user").delete().eq("id", authUserId);
  await admin.auth.admin.deleteUser(authUserId);
  return { ok: false, error };
}

function parseRoleIds(formData: FormData): string[] {
  try {
    const parsed = JSON.parse(String(formData.get("role_ids") ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * แก้ข้อมูลพนักงาน (FAM-1109) — ตำแหน่ง/รหัสพนักงาน/บริษัท/วันเริ่ม-ลาออก/เงินเดือน
 * ด่านสิทธิ์ admin/manager/hr · เงินเดือนเขียนได้เฉพาะผู้มีสิทธิ์เห็นเงิน (money) — คนอื่นแก้ช่องอื่นได้แต่ไม่แตะเงิน
 * RLS employee (branch-scoped) คุมอีกชั้นว่าแก้ได้เฉพาะบริษัทที่เข้าถึงได้
 */
export async function updateEmployee(formData: FormData): Promise<EmployeeActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageEmployees(me.roleCodes)) {
    return { ok: false, error: "จัดการข้อมูลพนักงานได้เฉพาะผู้ดูแล / ผู้บริหาร / ฝ่ายบุคคล" };
  }

  const employeeId = String(formData.get("employee_id") ?? "").trim();
  if (!employeeId) {
    return { ok: false, error: "ไม่พบพนักงาน" };
  }

  const parsed = validateEmployeeEdit({
    position: String(formData.get("position") ?? ""),
    empCode: String(formData.get("emp_code") ?? ""),
    branchId: String(formData.get("branch_id") ?? ""),
    hiredAt: String(formData.get("hired_at") ?? ""),
    resignedAt: String(formData.get("resigned_at") ?? ""),
    baseSalary: String(formData.get("base_salary") ?? ""),
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const v = parsed.value;

  const patch: {
    position: string | null;
    emp_code: string | null;
    branch_id: string;
    hired_at: string | null;
    resigned_at: string | null;
    base_salary?: number | null;
  } = {
    position: v.position,
    emp_code: v.empCode,
    branch_id: v.branchId,
    hired_at: v.hiredAt,
    resigned_at: v.resignedAt,
  };
  // เงินเดือนเป็นข้อมูลการเงิน — เขียนเฉพาะผู้มีสิทธิ์ (กันคนไม่มีสิทธิ์ส่งค่ามาทับเป็น null)
  if (me.perms.money) {
    patch.base_salary = v.baseSalary;
  }

  const supabase = await createServerSupabase();
  const { data: updated, error } = await supabase.from("employee").update(patch).eq("id", employeeId).select("id");
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "รหัสพนักงานนี้ถูกใช้แล้ว" };
    }
    return { ok: false, error: "บันทึกไม่สำเร็จ — คุณอาจไม่มีสิทธิ์ในบริษัทนี้ ให้ผู้ดูแลตรวจสิทธิ์ที่หน้า บัญชีผู้ใช้" };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, error: "ไม่พบพนักงาน (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }

  revalidatePath("/employees");
  revalidatePath("/payroll");
  return { ok: true, message: "บันทึกข้อมูลพนักงานแล้ว" };
}

/**
 * สร้างบัญชีให้พนักงานใหม่ (FAM-1109) — เฉพาะแอดมิน
 * ทำครบในขั้นเดียว: auth user → app_user → บทบาท/บริษัท → ระเบียนพนักงาน
 * ใช้ service_role (ข้าม RLS) เพราะสร้าง auth user ได้ทางเดียว — จึงล็อกไว้ที่ perms.admin เท่านั้น
 * ล้มกลางทาง = ลบ auth user ที่เพิ่งสร้างทิ้ง (กันบัญชีค้างที่ล็อกอินได้แต่ไม่มีสิทธิ์)
 * รหัสผ่านชั่วคราวถูกใช้ครั้งเดียวตอนสร้าง ไม่ถูกเก็บ/ล็อกที่ใด — แจ้งพนักงานแล้วให้เปลี่ยนเอง
 */
export async function createStaffAccount(formData: FormData): Promise<EmployeeActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canCreateAccount(me.perms)) {
    return { ok: false, error: "สร้างบัญชีผู้ใช้ได้เฉพาะแอดมิน" };
  }

  const parsed = validateNewAccount({
    fullName: String(formData.get("full_name") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    username: String(formData.get("username") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    branchId: String(formData.get("branch_id") ?? ""),
    roleIds: parseRoleIds(formData),
    empCode: String(formData.get("emp_code") ?? ""),
    position: String(formData.get("position") ?? ""),
    hiredAt: String(formData.get("hired_at") ?? ""),
    baseSalary: String(formData.get("base_salary") ?? ""),
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const v = parsed.value;

  // const เพื่อให้ TypeScript คง type ไว้ในโคลเชอร์ rollback ด้านล่าง
  const admin = (() => {
    try {
      return createAdminSupabase();
    } catch {
      return null;
    }
  })();
  if (!admin) {
    return { ok: false, error: "ระบบยังไม่พร้อมสร้างบัญชี — กรุณาแจ้งผู้ดูแลระบบ (ยังไม่ได้ตั้งค่า service key)" };
  }

  // กัน username ซ้ำก่อน (อ่านง่ายกว่าปล่อยให้ชน unique constraint กลางทาง)
  const { data: dupUser } = await admin.from("app_user").select("id").eq("username", v.username).maybeSingle();
  if (dupUser) {
    return { ok: false, error: `ชื่อผู้ใช้ "${v.username}" ถูกใช้แล้ว` };
  }

  const created = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true, // ยืนยันให้เลย — พนักงานล็อกอินได้ทันทีโดยไม่ต้องเช็คอีเมล
  });
  if (created.error || !created.data.user) {
    const msg = created.error?.message ?? "";
    if (/already/i.test(msg)) {
      return { ok: false, error: `อีเมล "${v.email}" ถูกใช้สร้างบัญชีไปแล้ว` };
    }
    return { ok: false, error: "สร้างบัญชีเข้าสู่ระบบไม่สำเร็จ — ตรวจอีเมล/รหัสผ่านแล้วลองใหม่" };
  }
  const authUserId = created.data.user.id;

  const rollback = (error: string) => rollbackNewAccount(admin, authUserId, error);

  const { error: appUserError } = await admin.from("app_user").insert({
    id: authUserId,
    username: v.username,
    full_name: v.fullName,
    nickname: v.nickname,
    all_branch: false, // ให้แอดมินเปิดเองภายหลังที่หน้า บัญชีผู้ใช้
    is_active: true,
  });
  if (appUserError) {
    return rollback(appUserError.code === "23505" ? `ชื่อผู้ใช้ "${v.username}" ถูกใช้แล้ว` : "สร้างข้อมูลผู้ใช้ไม่สำเร็จ");
  }

  const { error: roleError } = await admin
    .from("app_user_role")
    .insert(v.roleIds.map((roleId) => ({ user_id: authUserId, role_id: roleId })));
  if (roleError) {
    return rollback("ตั้งบทบาทไม่สำเร็จ — ตรวจบทบาทที่เลือกแล้วลองใหม่");
  }

  const { error: branchError } = await admin.from("app_user_branch").insert({ user_id: authUserId, branch_id: v.branchId });
  if (branchError) {
    return rollback("ผูกบริษัทไม่สำเร็จ — ตรวจบริษัทที่เลือกแล้วลองใหม่");
  }

  const { error: empError } = await admin.from("employee").insert({
    user_id: authUserId,
    branch_id: v.branchId,
    emp_code: v.empCode,
    position: v.position,
    hired_at: v.hiredAt,
    base_salary: v.baseSalary,
  });
  if (empError) {
    return rollback(empError.code === "23505" ? "รหัสพนักงานนี้ถูกใช้แล้ว" : "สร้างระเบียนพนักงานไม่สำเร็จ");
  }

  revalidatePath("/employees");
  revalidatePath("/users");
  revalidatePath("/attend");
  return { ok: true, message: `สร้างบัญชีให้ ${v.fullName} แล้ว — แจ้งอีเมล + รหัสผ่านชั่วคราวให้พนักงานเปลี่ยนเอง` };
}
