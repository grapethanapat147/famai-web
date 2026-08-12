"use client";

import { UsersView, type BranchOption, type RoleOption } from "@/components/users/UsersView";
import type { UserRow, UsersActionResult } from "@/lib/users/users";

/** พรีวิวหน้าบัญชีผู้ใช้ (users) — sample data · admin เท่านั้น (RLS) */

const ROLES: RoleOption[] = [
  { id: "r-admin", code: "admin", name: "ผู้ดูแลระบบ" },
  { id: "r-manager", code: "manager", name: "ผู้บริหาร" },
  { id: "r-sales", code: "sales", name: "เซลล์" },
  { id: "r-stock", code: "stock", name: "สต๊อก" },
  { id: "r-acct", code: "acct", name: "บัญชี" },
  { id: "r-hr", code: "hr", name: "ฝ่ายบุคคล" },
  { id: "r-tech", code: "tech", name: "ช่าง" },
];

const BRANCHES: BranchOption[] = [
  { id: "b1", name: "Famai Motor Group" },
  { id: "b2", name: "Famai Motor" },
  { id: "b3", name: "Famai Chonburi" },
];

const USERS: UserRow[] = [
  { id: "me", username: "admin", fullName: "อดิศร (เจ้าของ)", nickname: "บอส", allBranch: true, isActive: true, roleCodes: ["admin"], roleIds: ["r-admin"], branchIds: [] },
  { id: "u2", username: "somchai", fullName: "สมชาย ใจดี", nickname: null, allBranch: false, isActive: true, roleCodes: ["sales"], roleIds: ["r-sales"], branchIds: ["b1"] },
  { id: "u3", username: "manee", fullName: "มานี รักษ์ดี", nickname: "นี", allBranch: false, isActive: true, roleCodes: ["acct"], roleIds: ["r-acct"], branchIds: ["b1", "b2"] },
  { id: "u4", username: "wichai", fullName: "วิชัย ช่างเก่ง", nickname: null, allBranch: false, isActive: false, roleCodes: ["tech"], roleIds: ["r-tech"], branchIds: ["b3"] },
];

async function mockSave(): Promise<UsersActionResult> {
  return { ok: true };
}

export default function DevUsersPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">บัญชีผู้ใช้ (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — กดผู้ใช้เพื่อแก้บทบาท/สาขา (บัญชี &ldquo;คุณ&rdquo; ถอดสิทธิ์ตัวเองไม่ได้)</p>
      </header>
      <UsersView users={USERS} roles={ROLES} branches={BRANCHES} currentUserId="me" action={mockSave} />
    </main>
  );
}
