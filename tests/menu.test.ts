import { describe, it, expect } from "vitest";
import { MENU, visibleMenu, ALL_MENU_KEYS } from "@/lib/nav/menu";

describe("MENU config", () => {
  it("has 6 groups and 20 pages (ตรงกับ index.html v1.15)", () => {
    expect(MENU).toHaveLength(6);
    expect(ALL_MENU_KEYS).toHaveLength(20);
    expect(new Set(ALL_MENU_KEYS).size).toBe(20); // ไม่มี key ซ้ำ
  });

  it("sales sees sell but not users/settings", () => {
    const keys = visibleMenu(["sales"]).flatMap((g) => g.items.map((i) => i.key));
    expect(keys).toContain("sell");
    expect(keys).toContain("stock");
    expect(keys).not.toContain("users");
    expect(keys).not.toContain("settings");
  });

  it("admin sees every page; tech does not see users", () => {
    const adminKeys = visibleMenu(["admin"]).flatMap((g) => g.items.map((i) => i.key));
    expect(adminKeys).toHaveLength(20);
    const techKeys = visibleMenu(["tech"]).flatMap((g) => g.items.map((i) => i.key));
    expect(techKeys).not.toContain("users");
    expect(techKeys).toContain("service");
  });

  it("drops empty groups for a role with no access there", () => {
    const groups = visibleMenu(["tech"]).map((g) => g.group);
    // tech ไม่มีสิทธิ์กลุ่ม 'ลูกค้าและการเงิน' เลย → กลุ่มนั้นต้องหาย
    expect(groups).not.toContain("ลูกค้าและการเงิน");
  });
});
