import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { MENU, MENU_ITEMS, barLabel, bottomBarItems, visibleMenu, ALL_MENU_KEYS } from "@/lib/nav/menu";

describe("MENU config", () => {
  // ตั้งใจไม่ผูกกับ "จำนวนหน้า" เป็นตัวเลขตายตัว — เคยทำ CI แดงทุกครั้งที่เพิ่มเมนู
  // ('assist' ผู้ช่วย AI ถอดออกจาก UI ที่ FAM-1069 — นอก TOR; โค้ด lib/api ยังอยู่ dormant)
  it("มี 6 กลุ่ม · key ไม่ซ้ำ · ทุกหน้ามีชื่อและอยู่ในกลุ่ม", () => {
    expect(MENU).toHaveLength(6);
    expect(new Set(ALL_MENU_KEYS).size).toBe(ALL_MENU_KEYS.length);
    const items = MENU.flatMap((g) => g.items);
    expect(items).toHaveLength(ALL_MENU_KEYS.length);
    for (const i of items) {
      expect(i.title, `หน้า ${i.key} ไม่มีชื่อ`).toBeTruthy();
      expect(i.roles.length, `หน้า ${i.key} ไม่ได้ระบุสิทธิ์`).toBeGreaterThan(0);
    }
  });

  it("sales sees sell but not users/settings/models", () => {
    const keys = visibleMenu(["sales"]).flatMap((g) => g.items.map((i) => i.key));
    expect(keys).toContain("sell");
    expect(keys).toContain("stock");
    expect(keys).not.toContain("users");
    expect(keys).not.toContain("settings");
    expect(keys).not.toContain("models"); // รุ่นรถและสี = admin/manager เท่านั้น
  });

  it("admin sees every page (incl. models); tech does not see users", () => {
    const adminKeys = visibleMenu(["admin"]).flatMap((g) => g.items.map((i) => i.key));
    expect(adminKeys).toEqual([...ALL_MENU_KEYS]); // แอดมินเห็นทุกหน้าเสมอ ไม่ว่าจะเพิ่มกี่หน้า
    expect(adminKeys).toContain("models");
    expect(adminKeys).toContain("acct");
    expect(adminKeys).toContain("registration");
    expect(adminKeys).toContain("employees");
    expect(adminKeys).toContain("taxinv");
    expect(adminKeys).toContain("sites");
    expect(adminKeys).toContain("audit");
    const techKeys = visibleMenu(["tech"]).flatMap((g) => g.items.map((i) => i.key));
    expect(techKeys).not.toContain("users");
    expect(techKeys).not.toContain("audit"); // ประวัติการแก้ไข = แอดมินเท่านั้น (ตรง RLS)
    expect(techKeys).not.toContain("models");
    expect(techKeys).toContain("service");
  });

  it("drops empty groups for a role with no access there", () => {
    const groups = visibleMenu(["tech"]).map((g) => g.group);
    // tech ไม่มีสิทธิ์กลุ่ม 'ลูกค้าและการเงิน' เลย → กลุ่มนั้นต้องหาย
    expect(groups).not.toContain("ลูกค้าและการเงิน");
  });
});

describe("ชื่อบนแถบล่างมือถือ (FAM-1152)", () => {
  const ROLES = ["admin", "manager", "sales", "stock", "acct", "hr", "tech"];
  /** ช่องบนแถบล่างกว้าง ~63px (375 ÷ 6) เหลือที่เขียนราว 59px — วัดจริงแล้วราว 12 ตัวอักษรไทย */
  const MAX_LABEL = 12;

  it("ทุกบทบาท: ชื่อบนแถบล่างไม่ยาวเกินช่อง", () => {
    for (const role of ROLES) {
      const items = visibleMenu([role]).flatMap((g) => g.items);
      for (const item of bottomBarItems(items)) {
        expect(
          barLabel(item).length,
          `${role} → ${item.key}: "${barLabel(item)}" ยาวเกินช่องแถบล่าง ใส่ short ให้ด้วย`,
        ).toBeLessThanOrEqual(MAX_LABEL);
      }
    }
  });

  it("แถบล่างมี 5 ปุ่ม (อีกช่องเป็น 'อื่นๆ' รวม 6)", () => {
    for (const role of ROLES) {
      const items = visibleMenu([role]).flatMap((g) => g.items);
      expect(bottomBarItems(items).length, role).toBe(5);
    }
  });

  it("ทุก short สั้นกว่า title จริง และไม่ว่าง", () => {
    const withShort = MENU_ITEMS.filter((i) => i.short);
    expect(withShort.length).toBeGreaterThan(0);
    for (const item of withShort) {
      expect(item.short!.length, item.key).toBeLessThan(item.title.length);
      expect(item.short!.trim(), item.key).not.toBe("");
    }
  });

  it("short ใช้เฉพาะแถบล่าง — แถบข้างและแผ่น 'อื่นๆ' ต้องแสดงชื่อเต็ม", () => {
    const bar = fs.readFileSync(path.join(process.cwd(), "components/shell/MobileNav.tsx"), "utf8");
    expect(bar).toContain("barLabel(item)");
    expect(fs.readFileSync(path.join(process.cwd(), "components/shell/Sidebar.tsx"), "utf8")).not.toContain("short");
    const sheet = bar.slice(bar.indexOf("moreOpen &&"));
    expect(sheet, 'แผ่น "อื่นๆ" ต้องแสดงชื่อเต็ม').toContain("{item.title}");
  });
});
