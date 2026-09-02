import { describe, expect, it } from "vitest";
import { demoLoginState, type DemoLoginEnv } from "@/lib/auth/demo";

const base: DemoLoginEnv = {
  demoLogin: "true",
  nodeEnv: "development",
  email: "admin@famai.local",
  password: "secret",
};

describe("demoLoginState (fixlist ข้อ 21)", () => {
  it("dev + ตั้งค่าครบ = เปิดใช้ได้", () => {
    expect(demoLoginState(base)).toEqual({ enabled: true });
  });

  it("ไม่ได้เปิดไว้ = ปิดเงียบ ไม่ใช่ตั้งค่าผิด", () => {
    expect(demoLoginState({ ...base, demoLogin: undefined })).toEqual({ enabled: false, misconfigured: false, reason: null });
    expect(demoLoginState({ ...base, demoLogin: "false" })).toEqual({ enabled: false, misconfigured: false, reason: null });
    expect(demoLoginState({ ...base, demoLogin: "TRUE" })).toMatchObject({ enabled: false }); // รับเฉพาะ "true" ตรง ๆ
  });

  it("บน production ปิดตัวเองเสมอ แม้ตั้ง DEMO_LOGIN=true — นี่คือสวิตช์ที่เชื่อถือได้", () => {
    const r = demoLoginState({ ...base, nodeEnv: "production" });
    expect(r.enabled).toBe(false);
    if (!r.enabled) {
      expect(r.misconfigured).toBe(true);
      expect(r.reason).toContain("เครื่องจริง");
    }
  });

  it("เปิดไว้แต่ยังไม่ได้ตั้งบัญชีทดลอง = แจ้งว่าตั้งค่าไม่ครบ (ไม่ปล่อยผ่านเงียบ ๆ)", () => {
    for (const patch of [{ email: undefined }, { password: undefined }, { password: "" }]) {
      const r = demoLoginState({ ...base, ...patch });
      expect(r.enabled).toBe(false);
      if (!r.enabled) {
        expect(r.misconfigured).toBe(true);
      }
    }
  });
});
