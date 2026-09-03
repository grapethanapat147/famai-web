/**
 * จัดการพนักงาน (FAM-1109) — ข้อมูลพนักงาน + เงินเดือน + สร้างบัญชีให้พนักงานใหม่
 * ฟังก์ชันบริสุทธิ์ ทดสอบได้ · ด่านสิทธิ์จริงบังคับซ้ำในทุก server action
 */

import { checkPassword } from "@/lib/auth/password";

export type EmployeeActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type EmployeeRow = {
  id: string;
  userId: string | null;
  fullName: string; // จาก app_user (หรือ "— ยังไม่ผูกบัญชี —")
  username: string | null;
  empCode: string | null;
  position: string | null;
  branchId: string;
  branchName: string;
  hiredAt: string | null;
  resignedAt: string | null;
  baseSalary: number | null; // null = ไม่มีสิทธิ์เห็นเงิน หรือยังไม่ตั้ง
  roleCodes: string[];
};

/** ผู้จัดการข้อมูลพนักงาน — ตรงกับ roles ของเมนู (แอดมิน/ผู้บริหาร/ฝ่ายบุคคล) */
const EMPLOYEE_ROLES = ["admin", "manager", "hr"];
export function canManageEmployees(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return EMPLOYEE_ROLES.some((r) => roles.has(r));
}

/**
 * ผู้สร้างบัญชีผู้ใช้ใหม่ = แอดมินเท่านั้น
 * (ใช้ service_role สร้าง auth user — งานที่ข้าม RLS จึงจำกัดแคบกว่าการแก้ข้อมูลพนักงาน)
 */
export function canCreateAccount(perms: { admin: boolean }): boolean {
  return perms.admin;
}

/** กรองรายชื่อ — ค้นชื่อ/รหัส/ตำแหน่ง + สถานะทำงาน */
export function filterEmployees(
  list: readonly EmployeeRow[],
  opts: { search?: string; status?: "all" | "active" | "resigned"; branchId?: string } = {},
): EmployeeRow[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  const status = opts.status ?? "active";
  return list.filter((e) => {
    if (status === "active" && e.resignedAt) {
      return false;
    }
    if (status === "resigned" && !e.resignedAt) {
      return false;
    }
    if (opts.branchId && opts.branchId !== "all" && e.branchId !== opts.branchId) {
      return false;
    }
    if (q === "") {
      return true;
    }
    return `${e.fullName} ${e.username ?? ""} ${e.empCode ?? ""} ${e.position ?? ""}`.toLowerCase().includes(q);
  });
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function blankToNull(raw: string): string | null {
  const v = raw.trim();
  return v === "" ? null : v;
}

// ── แก้ข้อมูลพนักงาน ─────────────────────────────────────────────────────────

export type EmployeeEditInput = {
  position: string;
  empCode: string;
  branchId: string;
  hiredAt: string;
  resignedAt: string;
  baseSalary: string;
};

export type EmployeeEditValid = {
  position: string | null;
  empCode: string | null;
  branchId: string;
  hiredAt: string | null;
  resignedAt: string | null;
  baseSalary: number | null;
};

/** ตรวจฟอร์มแก้พนักงาน — บริษัทบังคับ · วันที่ถ้ากรอกต้องเป็น ISO · เงินเดือน ≥ 0 · ลาออกต้องไม่ก่อนเริ่มงาน */
export function validateEmployeeEdit(input: EmployeeEditInput): { ok: true; value: EmployeeEditValid } | { ok: false; error: string } {
  if (input.branchId.trim() === "") {
    return { ok: false, error: "เลือกบริษัท" };
  }
  const hiredAt = blankToNull(input.hiredAt);
  if (hiredAt !== null && !ISO_DATE.test(hiredAt)) {
    return { ok: false, error: "วันที่เริ่มงานไม่ถูกต้อง" };
  }
  const resignedAt = blankToNull(input.resignedAt);
  if (resignedAt !== null && !ISO_DATE.test(resignedAt)) {
    return { ok: false, error: "วันที่ลาออกไม่ถูกต้อง" };
  }
  if (hiredAt !== null && resignedAt !== null && resignedAt < hiredAt) {
    return { ok: false, error: "วันที่ลาออกต้องไม่ก่อนวันเริ่มงาน" };
  }

  const salaryRaw = input.baseSalary.trim().replace(/,/g, "");
  let baseSalary: number | null = null;
  if (salaryRaw !== "") {
    const n = Number(salaryRaw);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "เงินเดือนไม่ถูกต้อง" };
    }
    baseSalary = Math.round(n * 100) / 100;
  }

  return {
    ok: true,
    value: {
      position: blankToNull(input.position),
      empCode: blankToNull(input.empCode),
      branchId: input.branchId.trim(),
      hiredAt,
      resignedAt,
      baseSalary,
    },
  };
}

// ── สร้างบัญชีพนักงานใหม่ ────────────────────────────────────────────────────

export type NewAccountInput = {
  fullName: string;
  nickname: string;
  username: string;
  email: string;
  password: string;
  branchId: string;
  roleIds: string[];
  empCode: string;
  position: string;
  hiredAt: string;
  baseSalary: string;
};

export type NewAccountValid = {
  fullName: string;
  nickname: string | null;
  username: string;
  email: string;
  password: string;
  branchId: string;
  roleIds: string[];
  empCode: string | null;
  position: string | null;
  hiredAt: string | null;
  baseSalary: number | null;
};

/** ความยาวรหัสผ่านชั่วคราวขั้นต่ำ (แอดมินตั้งให้ แล้วให้พนักงานเปลี่ยนเองภายหลัง) */
export { MIN_PASSWORD_LENGTH, PASSWORD_RULE_HINT } from "@/lib/auth/password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;

/** ตรวจฟอร์มสร้างบัญชีพนักงานใหม่ — ชื่อ/username/อีเมล/รหัสผ่าน/บริษัท/บทบาท บังคับ */
export function validateNewAccount(input: NewAccountInput): { ok: true; value: NewAccountValid } | { ok: false; error: string } {
  const fullName = input.fullName.trim();
  if (fullName === "") {
    return { ok: false, error: "กรอกชื่อ-นามสกุล" };
  }
  const username = input.username.trim();
  if (username === "") {
    return { ok: false, error: "กรอกชื่อผู้ใช้ (username)" };
  }
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - (ห้ามเว้นวรรค/ภาษาไทย)" };
  }
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "อีเมลไม่ถูกต้อง (ใช้สำหรับเข้าสู่ระบบ)" };
  }
  // นโยบายรหัสผ่านฝั่งแอป (FAM-1136) — แทน Leaked Password Protection ที่ต้องใช้แพ็ก Pro
  const pw = checkPassword(input.password, { email, username, fullName });
  if (!pw.ok) {
    return { ok: false, error: pw.error };
  }
  if (input.branchId.trim() === "") {
    return { ok: false, error: "เลือกบริษัท" };
  }
  if (input.roleIds.length === 0) {
    return { ok: false, error: "เลือกบทบาทอย่างน้อย 1 อย่าง" };
  }

  const hiredAt = blankToNull(input.hiredAt);
  if (hiredAt !== null && !ISO_DATE.test(hiredAt)) {
    return { ok: false, error: "วันที่เริ่มงานไม่ถูกต้อง" };
  }

  const salaryRaw = input.baseSalary.trim().replace(/,/g, "");
  let baseSalary: number | null = null;
  if (salaryRaw !== "") {
    const n = Number(salaryRaw);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "เงินเดือนไม่ถูกต้อง" };
    }
    baseSalary = Math.round(n * 100) / 100;
  }

  return {
    ok: true,
    value: {
      fullName,
      nickname: blankToNull(input.nickname),
      username,
      email,
      password: input.password,
      branchId: input.branchId.trim(),
      roleIds: [...new Set(input.roleIds)],
      empCode: blankToNull(input.empCode),
      position: blankToNull(input.position),
      hiredAt,
      baseSalary,
    },
  };
}
