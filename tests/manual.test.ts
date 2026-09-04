import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_PERMS, type PermSet } from "@/lib/auth/permissions";
import { FLOWS, ROLE_LABEL, type RoleCode } from "@/lib/flow/flows";
import {
  MANUAL_BOOKS,
  PERM_LABEL,
  ROLE_MANUALS,
  ROLE_PERMS,
  flowsForRole,
  groupOfScreen,
  hiddenScreensForRole,
  isManualRole,
  manualBook,
  screenTitle,
  screensForRole,
} from "@/lib/manual/manual";
import { ALL_MENU_KEYS, menuItem } from "@/lib/nav/menu";

const ROLES = Object.keys(ROLE_LABEL) as RoleCode[];

describe("คู่มือครบทุกบทบาท (FAM-1138)", () => {
  it("มีเล่มของทุก role + เล่มผังกระบวนการ", () => {
    for (const role of ROLES) {
      expect(ROLE_MANUALS[role], role).toBeDefined();
      expect(manualBook(role), role).toBeDefined();
    }
    expect(manualBook("flow")).toBeDefined();
    expect(MANUAL_BOOKS).toHaveLength(ROLES.length + 1);
  });

  it("ชื่อไฟล์ไม่ซ้ำ และตรงรูปแบบ famai-<key>.pdf (ตัวสร้าง PDF อ้างชื่อนี้)", () => {
    const files = MANUAL_BOOKS.map((b) => b.file);
    expect(new Set(files).size).toBe(files.length);
    for (const b of MANUAL_BOOKS) {
      expect(b.file).toBe(`famai-${b.key}.pdf`);
      expect(b.title.length).toBeGreaterThan(0);
    }
  });

  it("ทุกเล่มมีเนื้อหาครบ 4 ส่วน — ไม่มีเล่มไหนเป็นโครงเปล่า", () => {
    for (const role of ROLES) {
      const doc = ROLE_MANUALS[role];
      expect(doc.why.length, role).toBeGreaterThan(40);
      expect(doc.daily.length, role).toBeGreaterThanOrEqual(3);
      expect(doc.samples.length, role).toBeGreaterThanOrEqual(2);
      expect(doc.gotchas.length, role).toBeGreaterThanOrEqual(3);
      for (const section of doc.daily) {
        expect(section.steps.length, `${role}/${section.title}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("isManualRole รู้จักเฉพาะ role จริง", () => {
    for (const role of ROLES) {
      expect(isManualRole(role), role).toBe(true);
    }
    expect(isManualRole("flow")).toBe(false);
    expect(isManualRole("ไม่มีจริง")).toBe(false);
  });
});

describe("สิทธิ์ในคู่มือตรงกับฐานข้อมูลจริง", () => {
  /** อ่านค่า role.perms จาก migration 08 มาเทียบ — แก้ DB แล้วลืมแก้คู่มือ เทสต์นี้จะฟ้อง */
  function permsFromMigration(): Record<string, PermSet> {
    const file = path.join(
      process.cwd(),
      "supabase/migrations/20260803232125_08_seed_reference_data.sql",
    );
    const sql = fs.readFileSync(file, "utf8");
    const out: Record<string, PermSet> = {};
    const re = /\('(admin|manager|sales|stock|acct|hr|tech)','[^']*','(\{[^']*\})'\)/g;
    for (const m of sql.matchAll(re)) {
      out[m[1]] = JSON.parse(m[2]) as PermSet;
    }
    return out;
  }

  it("ROLE_PERMS ตรงกับที่ seed ไว้ใน migration 08 ทุกบทบาท", () => {
    const fromDb = permsFromMigration();
    expect(Object.keys(fromDb).sort()).toEqual([...ROLES].sort());
    for (const role of ROLES) {
      expect(ROLE_PERMS[role], role).toEqual(fromDb[role]);
    }
  });

  it("สิทธิ์ทุกชนิดมีคำอธิบายภาษาคนอ่าน", () => {
    for (const perm of ALL_PERMS) {
      expect(PERM_LABEL[perm], perm).toBeTruthy();
    }
  });

  it("มีเพียง admin เท่านั้นที่แก้ผู้ใช้ได้ และ sales/stock/tech ไม่เห็นตัวเงิน", () => {
    expect(ROLES.filter((r) => ROLE_PERMS[r].admin)).toEqual(["admin"]);
    for (const role of ["sales", "stock", "tech"] as RoleCode[]) {
      expect(ROLE_PERMS[role].money, role).toBe(false);
      expect(ROLE_PERMS[role].allBranch, role).toBe(false);
    }
  });
});

describe("คู่มืออ้างถึงหน้าจอจริงเท่านั้น", () => {
  it("ทุกตัวอย่างชี้ไปยังหน้าที่มีจริง และเป็นหน้าที่บทบาทนั้นเห็น", () => {
    for (const role of ROLES) {
      for (const sample of ROLE_MANUALS[role].samples) {
        const item = menuItem(sample.screen);
        expect(item, `${role} → ${sample.screen}`).toBeDefined();
        expect(item?.roles, `${role} → ${sample.screen}`).toContain(role);
        expect(sample.lines.length, `${role} → ${sample.screen}`).toBeGreaterThan(0);
      }
    }
  });

  it("ตัวอย่างในเล่มเดียวกันไม่ซ้ำหน้า (กันเขียนเรื่องเดิมสองที่)", () => {
    for (const role of ROLES) {
      const screens = ROLE_MANUALS[role].samples.map((s) => s.screen);
      expect(new Set(screens).size, role).toBe(screens.length);
    }
  });

  it("ทุกหน้าในเมนูถูกพูดถึงอย่างน้อยหนึ่งเล่ม — ไม่มีหน้าที่ไม่มีคู่มือ", () => {
    const covered = new Set<string>([
      ...ROLES.flatMap((r) => ROLE_MANUALS[r].samples.map((s) => s.screen)),
      ...FLOWS.flatMap((f) => f.steps.map((s) => s.screen).filter(Boolean) as string[]),
    ]);
    // หน้าที่เหลือถูกครอบด้วยตาราง "หน้าจอที่คุณเห็น" ของเล่ม admin เสมอ
    const adminScreens = new Set(screensForRole("admin").map((m) => m.key));
    for (const key of ALL_MENU_KEYS) {
      expect(covered.has(key) || adminScreens.has(key), key).toBe(true);
    }
  });

  it("screenTitle / groupOfScreen คืนค่าจากเมนูจริง", () => {
    expect(screenTitle("payroll")).toBe(menuItem("payroll")?.title);
    expect(groupOfScreen("payroll")).toBe("บัญชีและพนักงาน");
    expect(groupOfScreen("ไม่มีหน้านี้")).toBe("");
  });
});

describe("ตารางหน้าจอของแต่ละบทบาท", () => {
  it("หน้าที่เห็น + หน้าที่ไม่เห็น รวมกันได้ทุกหน้าในเมนู และไม่ทับกัน", () => {
    for (const role of ROLES) {
      const mine = screensForRole(role).map((m) => m.key);
      const hidden = hiddenScreensForRole(role).map((h) => h.item.key);
      expect(mine.length + hidden.length, role).toBe(ALL_MENU_KEYS.length);
      expect(mine.filter((k) => hidden.includes(k)), role).toEqual([]);
    }
  });

  it("admin เห็นทุกหน้า · ช่างเห็นน้อยที่สุด", () => {
    expect(screensForRole("admin").map((m) => m.key)).toEqual(ALL_MENU_KEYS);
    expect(hiddenScreensForRole("admin")).toEqual([]);
    const counts = ROLES.map((r) => screensForRole(r).length);
    expect(screensForRole("tech").length).toBe(Math.min(...counts));
  });

  it("หน้าที่ไม่เห็นบอกได้เสมอว่าใครทำแทน", () => {
    for (const role of ROLES) {
      for (const hidden of hiddenScreensForRole(role)) {
        expect(hidden.owners.length, `${role} → ${hidden.item.key}`).toBeGreaterThan(0);
        expect(hidden.owners, `${role} → ${hidden.item.key}`).not.toContain(ROLE_LABEL[role]);
      }
    }
  });
});

describe("สายงานในคู่มือ", () => {
  it("ทุกบทบาทมีอย่างน้อยหนึ่งสายงานที่เกี่ยวข้อง", () => {
    for (const role of ROLES) {
      expect(flowsForRole(role).length, role).toBeGreaterThan(0);
    }
  });

  it("admin เห็นทุกสายงาน (ดูแลทั้งระบบ)", () => {
    expect(flowsForRole("admin")).toHaveLength(FLOWS.length);
  });

  it("สายงานของแต่ละบทบาทต้องมีขั้นที่เป็นของบทบาทนั้นจริง", () => {
    for (const role of ROLES.filter((r) => r !== "admin")) {
      for (const flow of flowsForRole(role)) {
        expect(flow.steps.some((s) => s.roles.includes(role)), `${role} → ${flow.key}`).toBe(true);
      }
    }
  });
});
