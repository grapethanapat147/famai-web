import { describe, it, expect } from "vitest";
import { MENU, visibleMenu, ALL_MENU_KEYS } from "@/lib/nav/menu";

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
