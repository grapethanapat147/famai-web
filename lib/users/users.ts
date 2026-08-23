/**
 * โครงข้อมูล + ตรรกะจัดการบัญชีผู้ใช้/สิทธิ์ (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * แก้ role/บริษัท = เขียน app_user_role / app_user_branch (RLS: admin เท่านั้น)
 */

export type UsersActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type UserRow = {
  id: string;
  username: string;
  fullName: string;
  nickname: string | null;
  allBranch: boolean;
  isActive: boolean;
  roleCodes: string[];
  roleIds: string[];
  branchIds: string[];
};

export function filterUsers(
  list: readonly UserRow[],
  opts: { search?: string; roleCode?: string; status?: "all" | "active" | "inactive" } = {},
): UserRow[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  return list.filter((u) => {
    if (opts.status === "active" && !u.isActive) {
      return false;
    }
    if (opts.status === "inactive" && u.isActive) {
      return false;
    }
    if (opts.roleCode && opts.roleCode !== "all" && !u.roleCodes.includes(opts.roleCode)) {
      return false;
    }
    if (q && !`${u.fullName} ${u.username} ${u.nickname ?? ""}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

/** ส่วนต่างของชุด id — สำหรับ sync แบบ "เพิ่มก่อน ลบทีหลัง" (กันช่วงว่างสิทธิ์) */
export function diffIds(
  current: readonly string[],
  target: readonly string[],
): { toAdd: string[]; toRemove: string[] } {
  const cur = new Set(current);
  const tgt = new Set(target);
  return {
    toAdd: [...tgt].filter((id) => !cur.has(id)),
    toRemove: [...cur].filter((id) => !tgt.has(id)),
  };
}

/**
 * กันแอดมินล็อกตัวเองออก — ถ้าแก้บัญชีตัวเองต้องคงสิทธิ์ admin + active ไว้
 * คืนข้อความ error หรือ null ถ้าโอเค
 */
export function selfLockout(isSelf: boolean, targetRoleCodes: readonly string[], targetActive: boolean): string | null {
  if (!isSelf) {
    return null;
  }
  if (!targetRoleCodes.includes("admin")) {
    return "ห้ามถอดสิทธิ์แอดมินของตัวเอง";
  }
  if (!targetActive) {
    return "ห้ามปิดใช้งานบัญชีตัวเอง";
  }
  return null;
}

/** ผู้มีสิทธิ์จัดการบัญชีผู้ใช้ = admin เท่านั้น (ตรงกับ RLS + เมนู) */
export function canManageUsers(roleCodes: readonly string[]): boolean {
  return roleCodes.includes("admin");
}
