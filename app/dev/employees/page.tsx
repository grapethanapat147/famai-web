"use client";

import { EmployeesView } from "@/components/employees/EmployeesView";
import { validateEmployeeEdit, validateNewAccount, type EmployeeActionResult, type EmployeeRow } from "@/lib/employees/employees";

/** พรีวิวหน้าพนักงาน (FAM-1109) — sample data · /employees จริงต่อ DB + สร้าง auth user ผ่าน service_role */

const EMPLOYEES: EmployeeRow[] = [
  {
    id: "e1",
    userId: "u1",
    fullName: "สมชาย ใจดี",
    username: "somchai",
    empCode: "EMP001",
    position: "ที่ปรึกษาการขาย",
    branchId: "b1",
    branchName: "Famai Motor Group",
    hiredAt: "2025-03-01",
    resignedAt: null,
    baseSalary: 18000,
    roleCodes: ["sales"],
  },
  {
    id: "e2",
    userId: "u2",
    fullName: "มานี รักษ์ดี",
    username: "manee",
    empCode: "EMP002",
    position: "ฝ่ายบัญชี",
    branchId: "b2",
    branchName: "Famai Motor",
    hiredAt: "2024-11-15",
    resignedAt: null,
    baseSalary: null, // ยังไม่ตั้งเงินเดือน — โชว์ป้ายเตือน
    roleCodes: ["acct"],
  },
  {
    id: "e3",
    userId: "u3",
    fullName: "ประเสริฐ มั่งมี",
    username: "prasert",
    empCode: "EMP003",
    position: "ช่างเทคนิค",
    branchId: "b1",
    branchName: "Famai Motor Group",
    hiredAt: "2025-06-01",
    resignedAt: null,
    baseSalary: 16500,
    roleCodes: ["tech"],
  },
  {
    id: "e4",
    userId: "u4",
    fullName: "วิชัย ลาจาก",
    username: "wichai",
    empCode: "EMP004",
    position: "ฝ่ายสต๊อก",
    branchId: "b1",
    branchName: "Famai Motor Group",
    hiredAt: "2024-02-01",
    resignedAt: "2026-05-31",
    baseSalary: 15000,
    roleCodes: ["stock"],
  },
];

const BRANCHES = [
  { id: "b1", name: "Famai Motor Group" },
  { id: "b2", name: "Famai Motor" },
  { id: "b3", name: "Famai Center Group" },
];

const ROLES = [
  { id: "r1", code: "sales", name: "เซลล์" },
  { id: "r2", code: "stock", name: "สต๊อก" },
  { id: "r3", code: "acct", name: "บัญชี" },
  { id: "r4", code: "tech", name: "ช่าง" },
  { id: "r5", code: "hr", name: "ฝ่ายบุคคล" },
  { id: "r6", code: "manager", name: "ผู้บริหาร" },
];

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** mock ที่ใช้ validator ตัวจริง — พรีวิวจึงเตือนเหมือนของจริง (ต่างแค่ไม่เขียน DB) */
async function mockUpdate(fd: FormData): Promise<EmployeeActionResult> {
  const r = validateEmployeeEdit({
    position: s(fd, "position"),
    empCode: s(fd, "emp_code"),
    branchId: s(fd, "branch_id"),
    hiredAt: s(fd, "hired_at"),
    resignedAt: s(fd, "resigned_at"),
    baseSalary: s(fd, "base_salary"),
  });
  return r.ok ? { ok: true, message: "บันทึกข้อมูลพนักงานแล้ว (ตัวอย่าง)" } : { ok: false, error: r.error };
}

async function mockCreate(fd: FormData): Promise<EmployeeActionResult> {
  let roleIds: string[] = [];
  try {
    const parsed = JSON.parse(s(fd, "role_ids"));
    roleIds = Array.isArray(parsed) ? parsed : [];
  } catch {
    roleIds = [];
  }
  const r = validateNewAccount({
    fullName: s(fd, "full_name"),
    nickname: s(fd, "nickname"),
    username: s(fd, "username"),
    email: s(fd, "email"),
    password: s(fd, "password"),
    branchId: s(fd, "branch_id"),
    roleIds,
    empCode: s(fd, "emp_code"),
    position: s(fd, "position"),
    hiredAt: s(fd, "hired_at"),
    baseSalary: s(fd, "base_salary"),
  });
  return r.ok
    ? { ok: true, message: `สร้างบัญชีให้ ${r.value.fullName} แล้ว — แจ้งอีเมล + รหัสผ่านชั่วคราวให้พนักงานเปลี่ยนเอง (ตัวอย่าง)` }
    : { ok: false, error: r.error };
}

export default function DevEmployeesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">พนักงาน (preview)</h1>
        <p className="mt-1 text-ink-soft">FAM-1109 · sample — แก้ตำแหน่ง/เงินเดือน + เพิ่มพนักงานใหม่ (mock, ของจริงสร้าง auth user)</p>
      </header>
      <EmployeesView
        employees={EMPLOYEES}
        branches={BRANCHES}
        roles={ROLES}
        canSeeMoney
        canCreate
        updateAction={mockUpdate}
        createAction={mockCreate}
      />
    </main>
  );
}
