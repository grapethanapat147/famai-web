import { describe, it, expect } from "vitest";
import { MENU, visibleMenu, ALL_MENU_KEYS } from "@/lib/nav/menu";

describe("MENU config", () => {
  // 20 หน้าจาก index.html v1.15 + models (FAM-1009) + acct (FAM-1102) + registration (FAM-1100) + employees (FAM-1109) + taxinv (FAM-1112) = 25
  // ('assist' ผู้ช่วย AI ถอดออกจาก UI ที่ FAM-1069 — นอก TOR; โค้ด lib/api ยังอยู่ dormant)
  it("has 6 groups and 25 pages", () => {
    expect(MENU).toHaveLength(6);
    expect(ALL_MENU_KEYS).toHaveLength(25);
    expect(new Set(ALL_MENU_KEYS).size).toBe(25); // ไม่มี key ซ้ำ
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
    expect(adminKeys).toHaveLength(25);
    expect(adminKeys).toContain("models");
    expect(adminKeys).toContain("acct");
    expect(adminKeys).toContain("registration");
    expect(adminKeys).toContain("employees");
    expect(adminKeys).toContain("taxinv");
    const techKeys = visibleMenu(["tech"]).flatMap((g) => g.items.map((i) => i.key));
    expect(techKeys).not.toContain("users");
    expect(techKeys).not.toContain("models");
    expect(techKeys).toContain("service");
  });

  it("drops empty groups for a role with no access there", () => {
    const groups = visibleMenu(["tech"]).map((g) => g.group);
    // tech ไม่มีสิทธิ์กลุ่ม 'ลูกค้าและการเงิน' เลย → กลุ่มนั้นต้องหาย
    expect(groups).not.toContain("ลูกค้าและการเงิน");
  });
});
