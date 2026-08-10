/** สิทธิ์ 4 ชนิดจริงในฐานข้อมูล (role.perms, migration 08) — ไม่มี editBack ใน DB */
export type Perm = "money" | "allBranch" | "approve" | "admin";

export type PermSet = Record<Perm, boolean>;

export const ALL_PERMS: readonly Perm[] = ["money", "allBranch", "approve", "admin"];

/** fail closed — ค่าเริ่มต้นคือไม่มีสิทธิ์อะไรเลย */
export const NO_PERMS: PermSet = { money: false, allBranch: false, approve: false, admin: false };

/** รวมสิทธิ์จากหลายบทบาทแบบ OR (ผู้ใช้มีได้หลาย role) */
export function combinePerms(roles: ReadonlyArray<{ perms: Partial<PermSet> | null }>): PermSet {
  const out: PermSet = { ...NO_PERMS };
  for (const role of roles) {
    for (const perm of ALL_PERMS) {
      if (role.perms?.[perm]) out[perm] = true;
    }
  }
  return out;
}
