/**
 * ประวัติการแก้ไข (audit_log) — FAM-1121 · fixlist ข้อ 10
 * trigger เขียนไว้เงียบ ๆ ตั้งแต่ migration 05 แต่ไม่มีหน้าเปิดดู ย้อนไม่ได้ว่าใครแก้อะไรเมื่อไหร่
 *
 * trigger เก็บ **เฉพาะคอลัมน์ที่เปลี่ยนจริง** (ไม่ใช่ทั้งแถว) — before/after จึงเทียบกันตรง ๆ ได้
 */

/** ตารางที่มี trigger จริง (migration 05) — ใช้เป็นตัวเลือกในตัวกรอง */
export const AUDIT_TABLES: readonly string[] = [
  "motorcycle_unit",
  "sale",
  "registration",
  "finance_case",
  "receivable",
  "app_user",
];

export const TABLE_LABEL: Record<string, string> = {
  motorcycle_unit: "คันรถ",
  sale: "การขาย",
  registration: "งานทะเบียน",
  finance_case: "เคสไฟแนนซ์",
  receivable: "เงินค้างรับ",
  app_user: "ผู้ใช้",
};

export const ACTION_LABEL: Record<string, string> = {
  INSERT: "เพิ่ม",
  UPDATE: "แก้ไข",
  DELETE: "ลบ",
  VIEW_PII: "เปิดดูข้อมูลอ่อนไหว",
};

export function tableLabel(name: string): string {
  return TABLE_LABEL[name] ?? name;
}

export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

export function actionVariant(action: string): "good" | "warn" | "bad" | "info" {
  if (action === "INSERT") {
    return "good";
  }
  if (action === "DELETE") {
    return "bad";
  }
  return action === "UPDATE" ? "warn" : "info";
}

/** เฉพาะแอดมิน — ตรงกับ RLS `audit_log_admin` (is_admin()) */
export function canViewAuditLog(roleCodes: readonly string[]): boolean {
  return roleCodes.includes("admin");
}

export type AuditRow = {
  id: number;
  at: string; // ISO
  actorName: string;
  tableName: string;
  rowId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

export type FieldChange = { field: string; from: string; to: string };

/** ค่า jsonb → ข้อความสั้นสำหรับตาราง (null/ยาวเกินตัดให้อ่านได้) */
export function formatValue(v: unknown, maxLen = 60): string {
  if (v === null || v === undefined) {
    return "—";
  }
  if (typeof v === "boolean") {
    return v ? "ใช่" : "ไม่";
  }
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

/**
 * รายการช่องที่เปลี่ยน — รวมคีย์จากทั้ง before และ after
 * (INSERT มีแต่ after · DELETE มีแต่ before · UPDATE มีทั้งคู่แต่เฉพาะช่องที่เปลี่ยน)
 */
export function fieldChanges(row: Pick<AuditRow, "before" | "after">): FieldChange[] {
  const keys = new Set([...Object.keys(row.before ?? {}), ...Object.keys(row.after ?? {})]);
  return [...keys]
    .sort()
    .map((field) => ({
      field,
      from: formatValue(row.before?.[field] ?? null),
      to: formatValue(row.after?.[field] ?? null),
    }))
    .filter((c) => c.from !== c.to);
}

export type AuditFilter = { table?: string; action?: string; search?: string; fromDate?: string };

/** กรองด้วยตาราง + การกระทำ + คำค้น (ผู้แก้/ตาราง/รหัสแถว/ชื่อช่อง) + ตั้งแต่วันที่ */
export function filterAuditRows(rows: readonly AuditRow[], f: AuditFilter = {}): AuditRow[] {
  const q = (f.search ?? "").trim().toLowerCase();
  const from = (f.fromDate ?? "").trim();
  return rows.filter((r) => {
    if (f.table && f.table !== "all" && r.tableName !== f.table) {
      return false;
    }
    if (f.action && f.action !== "all" && r.action !== f.action) {
      return false;
    }
    if (from && r.at.slice(0, 10) < from) {
      return false;
    }
    if (q) {
      const fields = fieldChanges(r).map((c) => c.field).join(" ");
      const hay = `${r.actorName} ${r.tableName} ${tableLabel(r.tableName)} ${r.rowId} ${fields}`.toLowerCase();
      if (!hay.includes(q)) {
        return false;
      }
    }
    return true;
  });
}
