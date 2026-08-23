import { describe, expect, it } from "vitest";
import { positionFromRoles } from "@/lib/hr/employee";

describe("positionFromRoles", () => {
  it("maps a single known role to its Thai position", () => {
    expect(positionFromRoles(["sales"])).toBe("ที่ปรึกษาการขาย");
    expect(positionFromRoles(["stock"])).toBe("ฝ่ายสต๊อก");
    expect(positionFromRoles(["tech"])).toBe("ช่างเทคนิค");
  });

  it("prefers a job role over the system admin role", () => {
    expect(positionFromRoles(["admin", "manager"])).toBe("ผู้บริหาร");
    expect(positionFromRoles(["admin", "sales"])).toBe("ที่ปรึกษาการขาย");
  });

  it("falls back to admin when it is the only role", () => {
    expect(positionFromRoles(["admin"])).toBe("ผู้ดูแลระบบ");
  });

  it("returns null when no known role is present", () => {
    expect(positionFromRoles([])).toBeNull();
    expect(positionFromRoles(["unknown"])).toBeNull();
  });
});
