"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import {
  filterEmployees,
  MIN_PASSWORD_LENGTH,
  type EmployeeActionResult,
  type EmployeeRow,
} from "@/lib/employees/employees";

export type BranchOption = { id: string; name: string };
export type RoleOption = { id: string; code: string; name: string };

const inputCls = "w-full rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

/** รหัสผ่านชั่วคราวแบบสุ่ม — ให้แอดมินไม่ต้องคิดเอง (เลี่ยงรหัสง่ายอย่าง 12345678) */
function randomPassword(): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map((n) => alphabet[n % alphabet.length]).join("");
}

export function EmployeesView({
  employees,
  branches,
  roles,
  canSeeMoney,
  canCreate,
  updateAction,
  createAction,
}: {
  employees: EmployeeRow[];
  branches: BranchOption[];
  roles: RoleOption[];
  canSeeMoney: boolean;
  canCreate: boolean;
  updateAction: (formData: FormData) => Promise<EmployeeActionResult>;
  createAction: (formData: FormData) => Promise<EmployeeActionResult>;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "resigned" | "all">("active");
  const [branchId, setBranchId] = useState("all");
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () => filterEmployees(employees, { search, status, branchId }),
    [employees, search, status, branchId],
  );
  const activeCount = employees.filter((e) => !e.resignedAt).length;

  const columns: Column<EmployeeRow>[] = [
    {
      key: "name",
      header: "ชื่อ / รหัส",
      primary: true,
      render: (e) => (
        <span>
          {e.fullName}
          {e.empCode ? <span className="ml-1 font-mono text-[11px] text-muted">{e.empCode}</span> : null}
          {e.resignedAt ? <span className="ml-1 text-[11px] text-accent">(ลาออก)</span> : null}
        </span>
      ),
    },
    {
      key: "position",
      header: "ตำแหน่ง / บริษัท",
      render: (e) => (
        <span className="text-ink-soft">
          {e.position ?? "—"} <span className="text-muted">· {e.branchName}</span>
        </span>
      ),
    },
    {
      key: "hired",
      header: "เริ่มงาน",
      render: (e) => <span className="text-ink-soft">{e.hiredAt ? formatThaiDate(e.hiredAt) : "—"}</span>,
    },
    ...(canSeeMoney
      ? [
          {
            key: "salary",
            header: "เงินเดือน",
            align: "right" as const,
            render: (e: EmployeeRow) =>
              e.baseSalary != null ? <Money value={e.baseSalary} /> : <span className="text-xs text-accent">ยังไม่ตั้ง</span>,
          } as Column<EmployeeRow>,
        ]
      : []),
    {
      key: "edit",
      header: "",
      align: "right",
      render: (e) => (
        <button
          type="button"
          onClick={() => setEditing(e)}
          className="rounded-[20px] border border-hairline px-3.5 py-2 text-xs text-ink-soft transition-transform active:scale-[0.97] hover:text-ink"
        >
          แก้ไข
        </button>
      ),
    },
  ];

  const missingSalary = canSeeMoney ? employees.filter((e) => !e.resignedAt && e.baseSalary == null).length : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          พนักงาน {activeCount} คน
          {missingSalary > 0 && <span className="ml-2 text-accent">· ยังไม่ตั้งเงินเดือน {missingSalary} คน</span>}
        </p>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.98]"
          >
            + เพิ่มพนักงานใหม่
          </button>
        )}
      </div>

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} คน`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาชื่อ / รหัส / ตำแหน่ง"
            placeholder="ค้นชื่อ / รหัส / ตำแหน่ง"
            className={`${inputCls} sm:w-56`}
          />
          {branches.length > 1 && (
            <select aria-label="กรองตามบริษัท" value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
              <option value="all">ทุกบริษัท</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <Chips
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "ทำงานอยู่" },
              { value: "resigned", label: "ลาออกแล้ว" },
              { value: "all", label: "ทั้งหมด" },
            ]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        empty={
          <EmptyState
            icon="users"
            title={employees.length ? "ไม่พบพนักงานตามเงื่อนไข" : "ยังไม่มีข้อมูลพนักงาน"}
            description={employees.length ? "ลองปรับคำค้นหรือตัวกรอง" : "กด “เพิ่มพนักงานใหม่” เพื่อสร้างบัญชีและระเบียนพนักงาน"}
            action={employees.length === 0 && canCreate ? { label: "เพิ่มพนักงานใหม่", onClick: () => setCreating(true) } : undefined}
          />
        }
      />

      {editing && (
        <EditEmployeeModal
          key={editing.id}
          employee={editing}
          branches={branches}
          canSeeMoney={canSeeMoney}
          action={updateAction}
          onClose={() => setEditing(null)}
        />
      )}
      {creating && (
        <CreateStaffModal branches={branches} roles={roles} action={createAction} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ink-soft">
      {label}
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

function EditEmployeeModal({
  employee,
  branches,
  canSeeMoney,
  action,
  onClose,
}: {
  employee: EmployeeRow;
  branches: BranchOption[];
  canSeeMoney: boolean;
  action: (formData: FormData) => Promise<EmployeeActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [position, setPosition] = useState(employee.position ?? "");
  const [empCode, setEmpCode] = useState(employee.empCode ?? "");
  const [branchId, setBranchId] = useState(employee.branchId);
  const [hiredAt, setHiredAt] = useState(employee.hiredAt ?? "");
  const [resignedAt, setResignedAt] = useState(employee.resignedAt ?? "");
  const [baseSalary, setBaseSalary] = useState(employee.baseSalary != null ? String(employee.baseSalary) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("employee_id", employee.id);
    fd.set("position", position);
    fd.set("emp_code", empCode);
    fd.set("branch_id", branchId);
    fd.set("hired_at", hiredAt);
    fd.set("resigned_at", resignedAt);
    fd.set("base_salary", baseSalary);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open onClose={onClose} title={`แก้ไข — ${employee.fullName}`} size="lg">
      <div className="flex flex-col gap-3">
        {employee.username && (
          <p className="text-xs text-muted">
            บัญชี <span className="font-mono">{employee.username}</span>
            {employee.roleCodes.length > 0 && ` · ${employee.roleCodes.join(", ")}`}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ตำแหน่ง">
            <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="เช่น ที่ปรึกษาการขาย" className={inputCls} />
          </Field>
          <Field label="รหัสพนักงาน">
            <input value={empCode} onChange={(e) => setEmpCode(e.target.value)} placeholder="เช่น EMP001" className={inputCls} />
          </Field>
          <Field label="บริษัท">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          {canSeeMoney && (
            <Field label="เงินเดือน (บาท/เดือน)" hint="ใช้คำนวณในหน้า เงินเดือนและ OT">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="เช่น 18000"
                className={inputCls}
              />
            </Field>
          )}
          <Field label="วันที่เริ่มงาน">
            <input type="date" value={hiredAt} onChange={(e) => setHiredAt(e.target.value)} className={inputCls} />
          </Field>
          <Field label="วันที่ลาออก" hint="กรอกเมื่อพนักงานลาออก — จะหลุดจากรายชื่อที่ทำงานอยู่">
            <input type="date" value={resignedAt} onChange={(e) => setResignedAt(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CreateStaffModal({
  branches,
  roles,
  action,
  onClose,
}: {
  branches: BranchOption[];
  roles: RoleOption[];
  action: (formData: FormData) => Promise<EmployeeActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [empCode, setEmpCode] = useState("");
  const [position, setPosition] = useState("");
  const [hiredAt, setHiredAt] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const toggleRole = (id: string) => setRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("full_name", fullName);
    fd.set("nickname", nickname);
    fd.set("username", username);
    fd.set("email", email);
    fd.set("password", password);
    fd.set("branch_id", branchId);
    fd.set("role_ids", JSON.stringify(roleIds));
    fd.set("emp_code", empCode);
    fd.set("position", position);
    fd.set("hired_at", hiredAt);
    fd.set("base_salary", baseSalary);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setDone(res.message ?? "สร้างบัญชีแล้ว");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  if (done) {
    return (
      <Modal open onClose={onClose} title="สร้างบัญชีสำเร็จ" size="lg">
        <div className="flex flex-col gap-3">
          <StatusBadge variant="good">{done}</StatusBadge>
          <div className="rounded-[10px] bg-paper-2 p-3 text-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">แจ้งข้อมูลนี้ให้พนักงาน</p>
            <p className="text-ink">
              อีเมล: <span className="font-mono">{email}</span>
            </p>
            <p className="text-ink">
              รหัสผ่านชั่วคราว: <span className="font-mono">{password}</span>
            </p>
            <p className="mt-2 text-xs text-muted">ปิดหน้าต่างนี้แล้วจะไม่แสดงรหัสผ่านอีก — คัดลอกเก็บไว้ก่อนปิด</p>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="rounded-[24px] bg-ink px-5 py-2 text-sm font-medium text-card">
              เสร็จสิ้น
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="เพิ่มพนักงานใหม่" size="lg">
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">บัญชีเข้าสู่ระบบ</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ชื่อ-นามสกุล *">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="เช่น สมหญิง ตั้งใจ" className={inputCls} />
            </Field>
            <Field label="ชื่อเล่น">
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="เช่น หญิง" className={inputCls} />
            </Field>
            <Field label="ชื่อผู้ใช้ (username) *" hint="a-z 0-9 . _ - เท่านั้น">
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="เช่น somying" className={`${inputCls} font-mono`} />
            </Field>
            <Field label="อีเมล (ใช้ล็อกอิน) *">
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="เช่น somying@famai.local"
                className={`${inputCls} font-mono`}
              />
            </Field>
          </div>
          <Field label={`รหัสผ่านชั่วคราว * (อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัว)`} hint="แจ้งพนักงานแล้วให้เปลี่ยนเองภายหลัง">
            <div className="flex gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ตั้งรหัส หรือกดสุ่ม"
                className={`${inputCls} font-mono`}
              />
              <button
                type="button"
                onClick={() => setPassword(randomPassword())}
                className="shrink-0 rounded-[8px] border border-hairline px-3 py-2 text-xs text-ink-soft transition-colors hover:text-ink"
              >
                สุ่ม
              </button>
            </div>
          </Field>
        </section>

        <section className="flex flex-col gap-3 border-t border-hairline-2 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">สิทธิ์การใช้งาน</p>
          <Field label="บริษัท *">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex flex-col gap-1 text-xs text-ink-soft">
            บทบาท * (เลือกได้หลายอย่าง)
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => {
                const on = roleIds.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    aria-pressed={on}
                    className={`rounded-full px-3 py-1.5 text-sm transition active:scale-95 ${
                      on ? "bg-ink text-card" : "border border-hairline bg-card text-ink-soft hover:text-ink"
                    }`}
                  >
                    {r.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-hairline-2 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">ข้อมูลพนักงาน (กรอกภายหลังได้)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="รหัสพนักงาน">
              <input value={empCode} onChange={(e) => setEmpCode(e.target.value)} placeholder="เช่น EMP010" className={inputCls} />
            </Field>
            <Field label="ตำแหน่ง">
              <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="เช่น ที่ปรึกษาการขาย" className={inputCls} />
            </Field>
            <Field label="วันที่เริ่มงาน">
              <input type="date" value={hiredAt} onChange={(e) => setHiredAt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="เงินเดือน (บาท/เดือน)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="เช่น 15000"
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังสร้างบัญชี…" : "สร้างบัญชีพนักงาน"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
