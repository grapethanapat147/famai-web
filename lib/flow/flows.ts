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
    description: "เฟสหลักตามหน้าลูกค้าและดีล: คุยกับลูกค้า → ไฟแนนซ์ → เปิดการขาย → ส่งมอบ",
    steps: [
      { title: "รับรถเข้าสต๊อก", roles: ["stock"], screen: "recv", note: "บันทึกทีละคัน + เลขเครื่อง/เลขถัง" },
      { title: "คุยกับลูกค้า — เก็บลีด เลื่อนขั้น (เข้ามาดูรถ → สนใจ → ทำสัญญา)", roles: ["sales"], screen: "deal", note: "ระบบจดประวัติทุกครั้งที่เปลี่ยนขั้น" },
      { title: "คุยกับลูกค้า — เสนอราคา / เทียบไฟแนนซ์", roles: ["sales"], screen: "quote" },
      { title: "ไฟแนนซ์ — บันทึกการขาย (ระบบเปิดเคสไฟแนนซ์ + เงินค้างรับ + ทะเบียนให้เอง)", roles: ["sales"], screen: "sell", note: "เลือกคัน ของแถมจากคลัง ตัดสต๊อก" },
      { title: "ไฟแนนซ์ — ยื่นเอกสาร → รอผล → อนุมัติ / ปฏิเสธ (ถ้าผ่อน)", roles: ["acct", "manager"], screen: "deal" },
      { title: "เปิดการขาย — ออกใบเสร็จ / ใบกำกับ (ขายผ่อน = ชุด 3 ใบ)", roles: ["acct"], screen: "acct", note: "เงินดาวน์ชื่อลูกค้า · ยอดจัดชื่อไฟแนนซ์" },
      { title: "เปิดการขาย — จดทะเบียน → ป้ายขาว", roles: ["acct", "stock"], screen: "registration" },
      { title: "ส่งมอบ — ส่งมอบรถ + รหัสเช็กสถานะให้ลูกค้า", roles: ["sales"], screen: "deal", note: "รหัสพิมพ์ท้ายใบเสร็จ ลูกค้าเช็กเองที่ /status" },
    ],
  },
  {
    key: "wholesale",
    title: "ขายส่ง (B2B)",
    description: "ขายให้ร้านค้าด้วยกัน บิลเดียวหลายคัน — โอนรถข้ามนิติบุคคลก็ใช้ทางนี้",
    steps: [
      { title: "เพิ่มร้านค้า (เลขผู้เสียภาษี · เครดิตกี่วัน)", roles: ["manager"], screen: "wholesale" },
      { title: "เปิดบิลขายส่ง — เลือกหลายคัน ตัดสต๊อก", roles: ["sales"], screen: "wholesale", note: "ขายเชื่อ = ระบบตั้งเงินค้างรับให้" },
      { title: "ออกใบกำกับให้ร้านค้า", roles: ["acct"], screen: "wholesale" },
      { title: "ติดตามเงินค้างรับจากร้านค้า", roles: ["acct", "manager"], screen: "ar" },
    ],
  },
  {
    key: "service",
    title: "ศูนย์ซ่อม",
    description: "ใบงานซ่อมตั้งแต่รับรถจนส่งมอบ — ปิดงานแล้วระบบนัดเช็กระยะรอบถัดไปให้",
    steps: [
      { title: "รับรถเข้าซ่อม / เปิดใบงาน (ค้นด้วยเลขเครื่องหรือเลขถัง)", roles: ["tech", "stock"], screen: "service", note: "เห็นประวัติซื้อ/ซ่อมของลูกค้าในใบงานเลย" },
      { title: "ซ่อม + เบิกอะไหล่", roles: ["tech"], screen: "parts", note: "เบิกอะไหล่ตัดสต๊อก" },
      { title: "เสร็จ → ส่งมอบ + เก็บเงิน", roles: ["tech", "acct"], screen: "service", note: "ระบบตั้งรอบเช็กระยะถัดไป + เตือน LINE เมื่อถึงกำหนด" },
    ],
  },
  {
    key: "parts",
    title: "อะไหล่และของแถม",
    description: "รับเข้า เบิก/ขาย และจัดการของแถม",
    steps: [
      { title: "รับอะไหล่เข้าสต๊อก", roles: ["stock"], screen: "parts" },
      { title: "เบิก / ขายอะไหล่", roles: ["stock", "tech"], screen: "parts", note: "ตัดสต๊อกอัตโนมัติ · กำไรอะไหล่ดูที่รายงาน" },
      { title: "ดูแลของแถม (ราคา/จำนวน)", roles: ["stock", "sales"], screen: "parts", note: "ฟอร์มขายดึงจากคลังนี้ ของหมดกดแถมไม่ได้" },
    ],
  },
  {
    key: "finance",
    title: "การเงิน",
    description: "ค่าใช้จ่ายและเงินค้างรับ",
    steps: [
      { title: "บันทึกค่าใช้จ่าย + ใบเสร็จ", roles: ["acct"], screen: "expense" },
      { title: "ติดตามเงินค้างรับ", roles: ["acct", "manager"], screen: "ar", note: "ไฟแนนซ์ / ลูกค้า / ร้านค้าขายส่ง" },
      { title: "ลงรับเงิน (ตัดยอด)", roles: ["acct"], screen: "ar" },
    ],
  },
  {
    key: "hr",
    title: "พนักงาน",
    description: "ลงเวลา ลา และเงินเดือน",
    steps: [
      { title: "ปักหมุดจุดลงเวลาของแต่ละบริษัท", roles: ["manager"], screen: "sites", note: "พิกัด + รัศมี · หลายจุดต่อบริษัทได้" },
      { title: "ลงเวลาเข้า/ออก + ขอลา", roles: ["sales", "stock", "tech", "acct", "hr"], screen: "hr", note: "ออกงานแล้วระบบคิด OT ให้" },
      { title: "อนุมัติใบลา", roles: ["manager", "hr"], screen: "hr" },
      { title: "ดูภาพรวมการเข้างาน", roles: ["manager", "hr"], screen: "attend" },
      { title: "คิดเงินเดือน + OT + คอม → ปิดงวด (แช่ยอด)", roles: ["hr", "acct", "manager"], screen: "payroll", note: "ใบนำส่ง ปกส. + ไฟล์โอนธนาคาร ออกจากหน้านี้" },
    ],
  },
  {
    key: "admin",
    title: "ดูแลระบบ",
    description: "เกณฑ์ที่ระบบใช้ และการตรวจย้อนหลัง",
    steps: [
      { title: "ตั้งค่าเกณฑ์ (VAT · รอบติดตาม · เวลางาน · ไฟแนนซ์)", roles: ["manager"], screen: "settings" },
      { title: "จัดการผู้ใช้และสิทธิ์", roles: ["admin"], screen: "users" },
      { title: "ตรวจประวัติการแก้ไข — ใครแก้อะไรเมื่อไหร่", roles: ["admin"], screen: "audit" },
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
