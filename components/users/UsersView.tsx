"use client";

import { useState } from "react";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { filterUsers, type UserRow, type UsersActionResult } from "@/lib/users/users";

export type RoleOption = { id: string; code: string; name: string };
export type BranchOption = { id: string; name: string };

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export function UsersView({
  users,
  roles,
  branches,
  currentUserId,
  action,
}: {
  users: UserRow[];
  roles: RoleOption[];
  branches: BranchOption[];
  currentUserId: string;
  action: (formData: FormData) => Promise<UsersActionResult>;
}) {
  const [search, setSearch] = useState("");
  const [roleCode, setRoleCode] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("active");
  const [selected, setSelected] = useState<UserRow | null>(null);

  const roleName = new Map(roles.map((r) => [r.code, r.name]));
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const rows = filterUsers(users, { search, roleCode, status });

  const isFiltered = search.trim() !== "" || roleCode !== "all" || status !== "all";
  function resetFilters() {
    setSearch("");
    setRoleCode("all");
    setStatus("all");
  }

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "ชื่อ / ผู้ใช้",
      primary: true,
      render: (u) => (
        <span>
          {u.fullName}
          {u.nickname ? ` (${u.nickname})` : ""}
          {u.id === currentUserId && <span className="ml-1 rounded-full bg-ink px-1.5 py-0.5 text-[10px] text-card">คุณ</span>}
          <span className="ml-1 font-mono text-xs text-muted">@{u.username}</span>
        </span>
      ),
    },
    {
      key: "roles",
      header: "บทบาท",
      render: (u) => (
        <span className="flex flex-wrap gap-1">
          {u.roleCodes.length === 0 ? (
            <span className="text-muted">—</span>
          ) : (
            u.roleCodes.map((c) => (
              <span key={c} className="rounded-full border border-hairline px-1.5 py-0.5 text-[11px] text-ink-soft">
                {roleName.get(c) ?? c}
              </span>
            ))
          )}
        </span>
      ),
    },
    {
      key: "branch",
      header: "บริษัท",
      render: (u) =>
        u.allBranch ? (
          <StatusBadge variant="info">ทุกบริษัท</StatusBadge>
        ) : (
          <span className="text-ink-soft">{u.branchIds.map((id) => branchName.get(id) ?? id).join(", ") || "—"}</span>
        ),
    },
    {
      key: "active",
      header: "สถานะ",
      render: (u) => (u.isActive ? <StatusBadge variant="good">ใช้งาน</StatusBadge> : <StatusBadge variant="off">ปิดใช้งาน</StatusBadge>),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} คน`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาชื่อ / ชื่อผู้ใช้"
            placeholder="ค้นชื่อ / ชื่อผู้ใช้"
            className={`${selectClass} w-full sm:w-52`}
          />
          <select aria-label="กรองตามบทบาท" value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className={selectClass}>
            <option value="all">ทุกบทบาท</option>
            {roles.map((r) => (
              <option key={r.id} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
          <Chips
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "ใช้งาน" },
              { value: "inactive", label: "ปิดใช้งาน" },
              { value: "all", label: "ทั้งหมด" },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        onRowClick={setSelected}
        empty={
          users.length > 0 ? (
            <EmptyState
              icon="key"
              title="ไม่พบผู้ใช้ตามเงื่อนไข"
              description="ลองปรับคำค้น บทบาท หรือสถานะ (เริ่มต้นแสดงเฉพาะที่ใช้งานอยู่)"
              action={isFiltered ? { label: "ล้างตัวกรอง", onClick: resetFilters } : undefined}
            />
          ) : (
            <EmptyState
              icon="key"
              title="ยังไม่มีผู้ใช้"
              description="เพิ่มบัญชีผู้ใช้เพื่อกำหนดบทบาทและสิทธิ์การเข้าถึง"
            />
          )
        }
      />

      <EditUserDrawer
        user={selected}
        roles={roles}
        branches={branches}
        isSelf={selected?.id === currentUserId}
        action={action}
        onClose={() => setSelected(null)}
        onSaved={() => setSelected(null)}
      />
    </div>
  );
}

function EditUserDrawer({
  user,
  roles,
  branches,
  isSelf,
  action,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  roles: RoleOption[];
  branches: BranchOption[];
  isSelf: boolean;
  action: (formData: FormData) => Promise<UsersActionResult>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [allBranch, setAllBranch] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  if (user && user.id !== current) {
    setCurrent(user.id);
    setRoleIds(user.roleIds);
    setBranchIds(user.branchIds);
    setAllBranch(user.allBranch);
    setIsActive(user.isActive);
    setError(null);
  }

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function save() {
    if (!user || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("user_id", user.id);
    fd.set("role_ids", JSON.stringify(roleIds));
    fd.set("branch_ids", JSON.stringify(branchIds));
    fd.set("all_branch", allBranch ? "true" : "false");
    fd.set("is_active", isActive ? "true" : "false");
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      onSaved();
    } else {
      setError(res.error);
    }
  }

  return (
    <Drawer open={user !== null} onClose={onClose} title={user ? `${user.fullName} · @${user.username}` : ""}>
      {user && (
        <div className="flex flex-col gap-4 text-sm">
          {isSelf && <StatusBadge variant="warn">นี่คือบัญชีของคุณ — ถอดสิทธิ์แอดมิน/ปิดใช้งานตัวเองไม่ได้</StatusBadge>}

          <ToggleRow label="เปิดใช้งานบัญชี" on={isActive} onToggle={() => setIsActive((v) => !v)} />
          <ToggleRow label="เห็นทุกบริษัท (ผู้บริหาร/แอดมิน)" on={allBranch} onToggle={() => setAllBranch((v) => !v)} />

          <div>
            <p className="mb-2 font-medium text-ink">บทบาท</p>
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => {
                const on = roleIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoleIds((prev) => toggle(prev, r.id))}
                    className={`rounded-full px-3 py-1.5 text-sm ${on ? "bg-ink text-card" : "border border-hairline bg-card text-ink-soft"}`}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={allBranch ? "opacity-50" : ""}>
            <p className="mb-2 font-medium text-ink">บริษัทที่เข้าถึง {allBranch && <span className="text-xs text-muted">(ข้ามเพราะเห็นทุกบริษัท)</span>}</p>
            <div className="flex flex-wrap gap-1.5">
              {branches.map((b) => {
                const on = branchIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={allBranch}
                    onClick={() => setBranchIds((prev) => toggle(prev, b.id))}
                    className={`rounded-full px-3 py-1.5 text-sm disabled:cursor-not-allowed ${on ? "bg-ink text-card" : "border border-hairline bg-card text-ink-soft"}`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <StatusBadge variant="bad">{error}</StatusBadge>}

          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="rounded-[24px] bg-accent py-3 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกสิทธิ์"}
          </button>
        </div>
      )}
    </Drawer>
  );
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-soft">{label}</span>
      <button
        type="button"
        aria-pressed={on}
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-hairline-2"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card transition-transform ${on ? "left-0.5 translate-x-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}
