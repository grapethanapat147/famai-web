import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * โหมดลูกค้าต้องซ่อนตัวเงินทุกหน้า แม้ผู้ใช้จะมีสิทธิ์ `money` — FAM-1146
 *
 * ปิดข้อที่ค้างใน security-checklist ("customer mode → money-fields หายทุก endpoint")
 * เดิมเทสไม่ได้เพราะ lib/auth/money.ts มี `import "server-only"` และอ่าน cookie ของ Next
 * จึงต้อง mock สามอย่าง: server-only, next/headers, และผู้ใช้ปัจจุบัน
 *
 * ตัว canSeeMoney() คือประตูเดียวที่ 12 หน้าใน app/(app) ใช้ตัดสินว่าจะส่งตัวเงินลงไปไหม
 */

vi.mock("server-only", () => ({}));

const cookieStore = { get: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const session: { user: { perms: { money: boolean } } | null } = { user: null };
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => session.user }));

const { canSeeMoney, isCustomerMode } = await import("@/lib/auth/money");
const { CUSTOMER_MODE_COOKIE } = await import("@/lib/auth/constants");

const setCookie = (value: string | null) => {
  cookieStore.get.mockImplementation((name: string) =>
    name === CUSTOMER_MODE_COOKIE && value !== null ? { value } : undefined,
  );
};

beforeEach(() => {
  cookieStore.get.mockReset();
  setCookie(null);
  session.user = null;
});

describe("isCustomerMode", () => {
  it("เปิดเมื่อ cookie เป็น '1' เท่านั้น", async () => {
    setCookie("1");
    expect(await isCustomerMode()).toBe(true);
  });

  it("ไม่มี cookie = ปิด", async () => {
    expect(await isCustomerMode()).toBe(false);
  });

  it("ค่าอื่นที่ไม่ใช่ '1' ถือว่าปิด (ไม่ตีความค่าแปลก ๆ ว่าเปิด)", async () => {
    for (const v of ["0", "true", "", "yes"]) {
      setCookie(v);
      expect(await isCustomerMode(), v).toBe(false);
    }
  });
});

describe("canSeeMoney — ประตูเดียวที่ทุกหน้าใช้", () => {
  it("มีสิทธิ์ money และไม่ได้อยู่โหมดลูกค้า → เห็นเงิน", async () => {
    session.user = { perms: { money: true } };
    expect(await canSeeMoney()).toBe(true);
  });

  it("โหมดลูกค้าเปิด → ไม่เห็นเงิน แม้จะมีสิทธิ์เต็ม", async () => {
    session.user = { perms: { money: true } };
    setCookie("1");
    expect(await canSeeMoney()).toBe(false);
  });

  it("ไม่มีสิทธิ์ money → ไม่เห็นเงิน ไม่ว่าโหมดลูกค้าจะเปิดหรือปิด", async () => {
    session.user = { perms: { money: false } };
    expect(await canSeeMoney()).toBe(false);
    setCookie("1");
    expect(await canSeeMoney()).toBe(false);
  });

  it("ยังไม่ล็อกอิน → ไม่เห็นเงิน (fail closed)", async () => {
    session.user = null;
    expect(await canSeeMoney()).toBe(false);
  });
});
