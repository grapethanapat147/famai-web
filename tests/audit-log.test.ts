import { describe, expect, it } from "vitest";
import {
  actionLabel,
  actionVariant,
  AUDIT_TABLES,
  canViewAuditLog,
  fieldChanges,
  filterAuditRows,
  formatValue,
  tableLabel,
  type AuditRow,
} from "@/lib/audit/log";

function row(over: Partial<AuditRow>): AuditRow {
  return {
    id: 1,
    at: "2026-09-02T08:15:00Z",
    actorName: "สมชาย ใจดี",
    tableName: "sale",
    rowId: "s-1",
    action: "UPDATE",
    before: { net_price: 60000 },
    after: { net_price: 58000 },
    ...over,
  };
}

describe("canViewAuditLog", () => {
  it("เฉพาะแอดมิน — ตรงกับ RLS audit_log_admin", () => {
    expect(canViewAuditLog(["admin"])).toBe(true);
    expect(canViewAuditLog(["manager"])).toBe(false);
    expect(canViewAuditLog(["sales", "acct"])).toBe(false);
  });
});

describe("ป้ายชื่อ", () => {
  it("ทุกตารางที่มี trigger มีชื่อไทย", () => {
    for (const t of AUDIT_TABLES) {
      expect(tableLabel(t)).not.toBe(t);
    }
  });
  it("ตาราง/การกระทำที่ไม่รู้จัก คืนค่าดิบ ไม่พัง", () => {
    expect(tableLabel("weird_table")).toBe("weird_table");
    expect(actionLabel("TRUNCATE")).toBe("TRUNCATE");
  });
  it("สีบอกชนิดการกระทำ", () => {
    expect(actionVariant("INSERT")).toBe("good");
    expect(actionVariant("DELETE")).toBe("bad");
    expect(actionVariant("UPDATE")).toBe("warn");
  });
});

describe("formatValue", () => {
  it("null/boolean/object อ่านออก", () => {
    expect(formatValue(null)).toBe("—");
    expect(formatValue(undefined)).toBe("—");
    expect(formatValue(true)).toBe("ใช่");
    expect(formatValue(false)).toBe("ไม่");
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
  });
  it("ตัดค่ายาวให้พอดีตาราง", () => {
    expect(formatValue("x".repeat(100), 10)).toBe(`${"x".repeat(10)}…`);
  });
});

describe("fieldChanges", () => {
  it("UPDATE — เห็นทั้งค่าเดิมและค่าใหม่", () => {
    expect(fieldChanges(row({}))).toEqual([{ field: "net_price", from: "60000", to: "58000" }]);
  });

  it("INSERT — มีแต่ค่าใหม่ · DELETE — มีแต่ค่าเดิม", () => {
    expect(fieldChanges({ before: null, after: { stage: "ขายแล้ว" } })).toEqual([
      { field: "stage", from: "—", to: "ขายแล้ว" },
    ]);
    expect(fieldChanges({ before: { stage: "ขายแล้ว" }, after: null })).toEqual([
      { field: "stage", from: "ขายแล้ว", to: "—" },
    ]);
  });

  it("ช่องที่ค่าเท่าเดิมไม่แสดง · เรียงชื่อช่อง", () => {
    const c = fieldChanges({ before: { b: 1, a: "เดิม" }, after: { b: 2, a: "เดิม" } });
    expect(c).toEqual([{ field: "b", from: "1", to: "2" }]);
  });

  it("ไม่มีข้อมูลเลย = ไม่พัง", () => {
    expect(fieldChanges({ before: null, after: null })).toEqual([]);
  });
});

describe("filterAuditRows", () => {
  const rows = [
    row({ id: 1, tableName: "sale", action: "UPDATE", actorName: "สมชาย ใจดี", at: "2026-09-02T08:00:00Z" }),
    row({ id: 2, tableName: "app_user", action: "INSERT", actorName: "มานี รักษ์ดี", at: "2026-09-01T08:00:00Z", before: null, after: { full_name: "ใหม่" } }),
    row({ id: 3, tableName: "receivable", action: "DELETE", actorName: "สมชาย ใจดี", at: "2026-08-20T08:00:00Z", before: { amount_due: 5 }, after: null }),
  ];

  it("กรองตามตาราง / การกระทำ", () => {
    expect(filterAuditRows(rows, { table: "sale" }).map((r) => r.id)).toEqual([1]);
    expect(filterAuditRows(rows, { action: "DELETE" }).map((r) => r.id)).toEqual([3]);
    expect(filterAuditRows(rows, { table: "all", action: "all" })).toHaveLength(3);
  });

  it("กรองตั้งแต่วันที่", () => {
    expect(filterAuditRows(rows, { fromDate: "2026-09-01" }).map((r) => r.id)).toEqual([1, 2]);
  });

  it("ค้นด้วยชื่อผู้แก้ / ชื่อตารางไทย / ชื่อช่องที่เปลี่ยน", () => {
    expect(filterAuditRows(rows, { search: "มานี" }).map((r) => r.id)).toEqual([2]);
    expect(filterAuditRows(rows, { search: "เงินค้างรับ" }).map((r) => r.id)).toEqual([3]);
    expect(filterAuditRows(rows, { search: "net_price" }).map((r) => r.id)).toEqual([1]);
  });

  it("ไม่ใส่ตัวกรอง = ได้ทั้งหมด", () => {
    expect(filterAuditRows(rows)).toHaveLength(3);
  });
});
