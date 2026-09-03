import { describe, expect, it } from "vitest";
import {
  canCreateAccount,
  canManageEmployees,
  filterEmployees,
  validateEmployeeEdit,
  validateNewAccount,
  MIN_PASSWORD_LENGTH,
  type EmployeeEditInput,
  type EmployeeRow,
  type NewAccountInput,
} from "@/lib/employees/employees";

function emp(over: Partial<EmployeeRow>): EmployeeRow {
  return {
    id: "e1",
    userId: "u1",
    fullName: "สมชาย ใจดี",
    username: "somchai",
    empCode: "EMP001",
    position: "ที่ปรึกษาการขาย",
    branchId: "b1",
    branchName: "Famai Motor Group",
    hiredAt: "2026-01-15",
    resignedAt: null,
    baseSalary: 18000,
    roleCodes: ["sales"],
    ...over,
  };
}

describe("canManageEmployees", () => {
  it("อนุญาต admin/manager/hr · ปฏิเสธที่เหลือ", () => {
    expect(canManageEmployees(["hr"])).toBe(true);
    expect(canManageEmployees(["manager"])).toBe(true);
    expect(canManageEmployees(["admin"])).toBe(true);
    expect(canManageEmployees(["acct"])).toBe(false);
    expect(canManageEmployees(["sales", "tech"])).toBe(false);
    expect(canManageEmployees([])).toBe(false);
  });
});

describe("canCreateAccount (แคบกว่า — service_role)", () => {
  it("เฉพาะแอดมิน", () => {
    expect(canCreateAccount({ admin: true })).toBe(true);
    expect(canCreateAccount({ admin: false })).toBe(false);
  });
});

describe("filterEmployees", () => {
  const list = [
    emp({ id: "1", fullName: "สมชาย ใจดี", empCode: "EMP001", branchId: "b1" }),
    emp({ id: "2", fullName: "มานี รักษ์ดี", empCode: "EMP002", position: "ฝ่ายบัญชี", branchId: "b2" }),
    emp({ id: "3", fullName: "วิชัย ลาออก", empCode: "EMP003", resignedAt: "2026-06-30", branchId: "b1" }),
  ];

  it("ดีฟอลต์ซ่อนคนลาออก", () => {
    expect(filterEmployees(list).map((e) => e.id)).toEqual(["1", "2"]);
  });
  it("ดูเฉพาะคนลาออก / ทั้งหมด", () => {
    expect(filterEmployees(list, { status: "resigned" }).map((e) => e.id)).toEqual(["3"]);
    expect(filterEmployees(list, { status: "all" })).toHaveLength(3);
  });
  it("ค้นชื่อ/รหัส/ตำแหน่ง", () => {
    expect(filterEmployees(list, { search: "มานี" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterEmployees(list, { search: "emp002" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterEmployees(list, { search: "บัญชี" }).map((e) => e.id)).toEqual(["2"]);
  });
  it("กรองตามบริษัท", () => {
    expect(filterEmployees(list, { branchId: "b2" }).map((e) => e.id)).toEqual(["2"]);
    expect(filterEmployees(list, { branchId: "all" })).toHaveLength(2);
  });
});

describe("validateEmployeeEdit", () => {
  const base: EmployeeEditInput = {
    position: "ที่ปรึกษาการขาย",
    empCode: "EMP001",
    branchId: "b1",
    hiredAt: "2026-01-15",
    resignedAt: "",
    baseSalary: "18000",
  };

  it("รับค่าปกติ + แปลงเลข", () => {
    const r = validateEmployeeEdit(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.baseSalary).toBe(18000);
      expect(r.value.resignedAt).toBeNull();
      expect(r.value.position).toBe("ที่ปรึกษาการขาย");
    }
  });

  it("ช่องว่าง → null (ยังไม่ตั้ง)", () => {
    const r = validateEmployeeEdit({ ...base, position: "", empCode: "  ", hiredAt: "", baseSalary: "" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({ position: null, empCode: null, hiredAt: null, baseSalary: null });
    }
  });

  it("รับเงินเดือนที่มีคอมมา", () => {
    const r = validateEmployeeEdit({ ...base, baseSalary: "18,500" });
    expect(r.ok && r.value.baseSalary).toBe(18500);
  });

  it.each([
    [{ branchId: "" }, "เลือกบริษัท"],
    [{ hiredAt: "15/01/2026" }, "วันที่เริ่มงานไม่ถูกต้อง"],
    [{ resignedAt: "bad" }, "วันที่ลาออกไม่ถูกต้อง"],
    [{ resignedAt: "2025-12-31" }, "วันที่ลาออกต้องไม่ก่อนวันเริ่มงาน"],
    [{ baseSalary: "-1" }, "เงินเดือนไม่ถูกต้อง"],
    [{ baseSalary: "abc" }, "เงินเดือนไม่ถูกต้อง"],
  ])("ปฏิเสธ %o", (patch, error) => {
    const r = validateEmployeeEdit({ ...base, ...(patch as Partial<EmployeeEditInput>) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(error);
    }
  });
});

describe("validateNewAccount", () => {
  const base: NewAccountInput = {
    fullName: "สมหญิง ตั้งใจ",
    nickname: "หญิง",
    username: "somying",
    email: "Somying@Famai.local",
    password: "Rk7#mvqTza", // ผ่านนโยบายรหัสผ่าน (FAM-1136)
    branchId: "b1",
    roleIds: ["r-sales"],
    empCode: "EMP010",
    position: "ที่ปรึกษาการขาย",
    hiredAt: "2026-08-24",
    baseSalary: "15000",
  };

  it("รับค่าปกติ + normalize อีเมลเป็นตัวเล็ก", () => {
    const r = validateNewAccount(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.email).toBe("somying@famai.local");
      expect(r.value.nickname).toBe("หญิง");
      expect(r.value.baseSalary).toBe(15000);
    }
  });

  it("ตัด roleId ซ้ำ", () => {
    const r = validateNewAccount({ ...base, roleIds: ["r-sales", "r-sales", "r-stock"] });
    expect(r.ok && r.value.roleIds).toEqual(["r-sales", "r-stock"]);
  });

  it("ช่องไม่บังคับว่างได้", () => {
    const r = validateNewAccount({ ...base, nickname: "", empCode: "", position: "", hiredAt: "", baseSalary: "" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({ nickname: null, empCode: null, position: null, hiredAt: null, baseSalary: null });
    }
  });

  it.each([
    [{ fullName: "  " }, "กรอกชื่อ-นามสกุล"],
    [{ username: "" }, "กรอกชื่อผู้ใช้ (username)"],
    [{ username: "สมหญิง" }, "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - (ห้ามเว้นวรรค/ภาษาไทย)"],
    [{ username: "som ying" }, "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - (ห้ามเว้นวรรค/ภาษาไทย)"],
    [{ email: "not-an-email" }, "อีเมลไม่ถูกต้อง (ใช้สำหรับเข้าสู่ระบบ)"],
    [{ password: "123" }, `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัว`],
    [{ password: "Password12!" }, "รหัสผ่านนี้ติดอันดับรหัสที่คนใช้บ่อยที่สุด — เปลี่ยนเป็นอย่างอื่น"],
    [{ password: "Somying#2569" }, 'รหัสผ่านห้ามมีชื่อหรืออีเมลของผู้ใช้ ("somying") อยู่ข้างใน'],
    [{ branchId: "" }, "เลือกบริษัท"],
    [{ roleIds: [] }, "เลือกบทบาทอย่างน้อย 1 อย่าง"],
    [{ hiredAt: "24/08/2026" }, "วันที่เริ่มงานไม่ถูกต้อง"],
    [{ baseSalary: "-5" }, "เงินเดือนไม่ถูกต้อง"],
  ])("ปฏิเสธ %o", (patch, error) => {
    const r = validateNewAccount({ ...base, ...(patch as Partial<NewAccountInput>) });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(error);
    }
  });
});
