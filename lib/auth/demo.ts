/**
 * ด่านโหมดทดลอง (DEMO_LOGIN) — FAM-1125 · fixlist ข้อ 21
 *
 * โหมดนี้ให้ใส่อะไรก็ได้แล้วเข้าระบบ สะดวกตอนให้ลูกค้าลอง แต่ถ้าลืมปิดตอนขึ้นจริง
 * ใครก็เข้าหลังบ้านได้โดยไม่ต้องรู้รหัส
 *
 * "สวิตช์" ที่เชื่อถือได้ไม่ใช่การหวังว่าจะจำปิด — แต่คือ **ปิดตัวเองบน production เสมอ**
 * ตั้ง DEMO_LOGIN=true บน production = ระบบถือว่าตั้งค่าผิด ไม่เปิดให้ และขึ้นเตือนที่หน้า login
 */

export type DemoLoginState =
  | { enabled: true }
  | { enabled: false; misconfigured: boolean; reason: string | null };

export type DemoLoginEnv = {
  demoLogin: string | undefined;
  nodeEnv: string | undefined;
  email: string | undefined;
  password: string | undefined;
};

export function demoLoginState(env: DemoLoginEnv): DemoLoginState {
  const wanted = env.demoLogin === "true";
  if (!wanted) {
    return { enabled: false, misconfigured: false, reason: null };
  }
  if (env.nodeEnv === "production") {
    return {
      enabled: false,
      misconfigured: true,
      reason: "DEMO_LOGIN เปิดอยู่บนเครื่องจริง — ระบบปิดให้อัตโนมัติ กรุณาตั้ง DEMO_LOGIN=false แล้ว deploy ใหม่",
    };
  }
  if (!env.email || !env.password) {
    return {
      enabled: false,
      misconfigured: true,
      reason: "โหมดทดลองเปิดอยู่แต่ยังไม่ได้ตั้ง DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD",
    };
  }
  return { enabled: true };
}

/** อ่านจาก process.env จริง — ใช้ในโค้ดฝั่งเซิร์ฟเวอร์ */
export function readDemoLoginState(): DemoLoginState {
  return demoLoginState({
    demoLogin: process.env.DEMO_LOGIN,
    nodeEnv: process.env.NODE_ENV,
    email: process.env.DEMO_LOGIN_EMAIL,
    password: process.env.DEMO_LOGIN_PASSWORD,
  });
}
