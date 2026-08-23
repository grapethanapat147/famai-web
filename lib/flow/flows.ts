/**
 * ผังกระบวนการ — ใครทำอะไรตอนไหน (ข้อมูลคงที่ อ้างอิง role + เมนูจริง)
 * ตรวจความถูกต้อง (role/screen มีจริง) ด้วยเทสต์
 */

export type RoleCode = "admin" | "manager" | "sales" | "stock" | "acct" | "hr" | "tech";

export const ROLE_LABEL: Record<RoleCode, string> = {
  admin: "ผู้ดูแล",
  manager: "ผู้บริหาร",
  sales: "เซลล์",
  stock: "สต๊อก",
  acct: "บัญชี",
  hr: "ฝ่ายบุคคล",
  tech: "ช่าง",
};

/** สีประจำตำแหน่ง (hex) — ใช้ทำชิปให้แยกตำแหน่งด้วยสายตา (อ่านได้ทั้งธีมสว่าง/มืดด้วย tint + ตัวอักษรสีเข้ม) */
export const ROLE_COLOR: Record<RoleCode, string> = {
  admin: "#64748b", // slate
  manager: "#2563eb", // blue
  sales: "#059669", // emerald
  stock: "#d97706", // amber
  acct: "#7c3aed", // violet
  hr: "#db2777", // pink
  tech: "#0891b2", // cyan
};

export function roleColor(code: string): string {
  return isRoleCode(code) ? ROLE_COLOR[code] : "#64748b";
}

export type FlowStep = {
  title: string;
  roles: RoleCode[];
  screen?: string; // เมนู key ที่ทำขั้นนี้
  note?: string;
};

export type Flow = {
  key: string;
  title: string;
  description: string;
  steps: FlowStep[];
};

export const FLOWS: readonly Flow[] = [
  {
    key: "sale",
    title: "ขายมอเตอร์ไซค์",
    description: "ตั้งแต่รับรถเข้าสต๊อกจนส่งมอบและจดทะเบียน",
    steps: [
      { title: "รับรถเข้าสต๊อก", roles: ["stock"], screen: "recv", note: "บันทึกทีละคัน + เลขเครื่อง/ตัวถัง" },
      { title: "เสนอราคา / เทียบไฟแนนซ์ให้ลูกค้า", roles: ["sales"], screen: "quote" },
      { title: "เปิดการขาย", roles: ["sales"], screen: "sell", note: "เลือกคัน คิดดีล ของแถม" },
      { title: "ไฟแนนซ์อนุมัติ (ถ้าผ่อน)", roles: ["acct", "manager"], screen: "deal" },
      { title: "จดทะเบียน → ป้ายขาว", roles: ["stock", "acct"], screen: "deal" },
      { title: "ส่งมอบรถ", roles: ["sales"], screen: "deal" },
    ],
  },
  {
    key: "service",
    title: "ศูนย์ซ่อม",
    description: "ใบงานซ่อมตั้งแต่รับรถจนส่งมอบ",
    steps: [
      { title: "รับรถเข้าซ่อม / เปิดใบงาน", roles: ["tech", "stock"], screen: "service" },
      { title: "ซ่อม + เบิกอะไหล่", roles: ["tech"], screen: "parts", note: "เบิกอะไหล่ตัดสต๊อก" },
      { title: "เสร็จ → ส่งมอบ + เก็บเงิน", roles: ["tech", "acct"], screen: "service" },
    ],
  },
  {
    key: "parts",
    title: "อะไหล่และของแถม",
    description: "รับเข้า เบิก/ขาย และจัดการของแถม",
    steps: [
      { title: "รับอะไหล่เข้าสต๊อก", roles: ["stock"], screen: "parts" },
      { title: "เบิก / ขายอะไหล่", roles: ["stock", "tech"], screen: "parts", note: "ตัดสต๊อกอัตโนมัติ" },
      { title: "ดูแลของแถม (แก้ราคา/จำนวน)", roles: ["stock", "sales"], screen: "parts" },
    ],
  },
  {
    key: "finance",
    title: "การเงิน",
    description: "ค่าใช้จ่ายและเงินค้างรับ",
    steps: [
      { title: "บันทึกค่าใช้จ่าย + ใบเสร็จ", roles: ["acct"], screen: "expense" },
      { title: "ติดตามเงินค้างรับ", roles: ["acct", "manager"], screen: "ar", note: "ไฟแนนซ์/ลูกค้า" },
      { title: "ลงรับเงิน (ตัดยอด)", roles: ["acct"], screen: "ar" },
    ],
  },
  {
    key: "hr",
    title: "พนักงาน",
    description: "ลงเวลา ลา และเงินเดือน",
    steps: [
      { title: "ลงเวลาเข้า/ออก + ขอลา", roles: ["sales", "stock", "tech", "acct", "hr"], screen: "hr" },
      { title: "อนุมัติใบลา", roles: ["manager", "hr"], screen: "hr" },
      { title: "ดูภาพรวมการเข้างาน", roles: ["manager", "hr"], screen: "attend" },
      { title: "คิดเงินเดือน + OT + คอม", roles: ["hr", "acct"], screen: "payroll" },
    ],
  },
] as const;

const ROLE_CODES: readonly RoleCode[] = ["admin", "manager", "sales", "stock", "acct", "hr", "tech"];

export function isRoleCode(v: string): v is RoleCode {
  return (ROLE_CODES as readonly string[]).includes(v);
}

export function roleLabel(code: string): string {
  return isRoleCode(code) ? ROLE_LABEL[code] : code;
}

/** ขั้นนี้เกี่ยวกับบทบาทของฉันไหม (admin เห็นเป็นของตัวเองทุกขั้น) */
export function stepInvolvesRole(step: FlowStep, roleCodes: readonly string[]): boolean {
  const mine = new Set(roleCodes);
  if (mine.has("admin")) {
    return true;
  }
  return step.roles.some((r) => mine.has(r));
}

/** กระบวนการนี้มีขั้นที่เป็นของฉันไหม */
export function flowInvolvesRole(flow: Flow, roleCodes: readonly string[]): boolean {
  return flow.steps.some((s) => stepInvolvesRole(s, roleCodes));
}

/**
 * ขั้นที่ต้องแสดง (พร้อมเลขขั้นเดิม) — onlyMine=true คืนเฉพาะขั้นของฉัน (คงเลขขั้นจริงไว้)
 * ใช้กับปุ่ม "เฉพาะงานของฉัน" ให้ตัดขั้นที่ไม่ใช่ของเราออกจริง ไม่ใช่แค่ซ่อนทั้งกระบวนการ
 */
export function visibleSteps(
  flow: Flow,
  roleCodes: readonly string[],
  onlyMine: boolean,
): { step: FlowStep; index: number }[] {
  return flow.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => !onlyMine || stepInvolvesRole(step, roleCodes));
}
