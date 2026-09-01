/**
 * เมนู 20 หน้า × 6 กลุ่ม — port ตรงจาก index.html v1.15 (const MENU)
 * role code ตรงกับ DB (admin/manager/acct/sales/stock/hr/tech)
 * การกรองเมนูตามสิทธิ์เป็นชั้น UX; ด่านจริงอยู่ที่ RLS + server (FAM-1006)
 */

export type MenuItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  roles: string[];
};

export type MenuGroup = {
  group: string;
  items: MenuItem[];
};

export const MENU: MenuGroup[] = [
  {
    group: "ภาพรวม",
    items: [
      { key: "dash", title: "Dashboard", subtitle: "ภาพรวมทั้งกิจการ", icon: "chart", roles: ["admin", "manager", "acct", "sales", "stock", "hr", "tech"] },
      { key: "cal", title: "ปฏิทิน", subtitle: "ปฏิทินรถ และปฏิทินผู้บริหาร", icon: "calendar", roles: ["admin", "manager", "acct", "sales", "hr"] },
      { key: "report", title: "รายงาน", subtitle: "สรุปแยกประเภท พิมพ์และส่งออกได้", icon: "files", roles: ["admin", "manager", "acct", "stock", "hr"] },
    ],
  },
  {
    group: "มอเตอร์ไซค์",
    items: [
      { key: "recv", title: "รับรถเข้าสต๊อก", subtitle: "บันทึกรถทีละคัน", icon: "inbox", roles: ["admin", "manager", "stock"] },
      { key: "stock", title: "สต๊อกรถ", subtitle: "ค้นหาและจัดการรถทุกคัน", icon: "bike", roles: ["admin", "manager", "stock", "sales", "acct"] },
      { key: "sell", title: "ขายรถ", subtitle: "เปิดการขายและออกเอกสาร", icon: "tag", roles: ["admin", "manager", "sales"] },
      { key: "transfer", title: "โอนย้ายบริษัท", subtitle: "ย้ายรถระหว่างบริษัท", icon: "repeat", roles: ["admin", "manager", "stock"] },
    ],
  },
  {
    group: "ลูกค้าและการเงิน",
    items: [
      { key: "quote", title: "ใบเสนอราคา", subtitle: "เทียบรถและไฟแนนซ์ให้ลูกค้า", icon: "file", roles: ["admin", "manager", "sales"] },
      { key: "deal", title: "ลูกค้าและดีล", subtitle: "ขาย ไฟแนนซ์ ทะเบียน จบในหน้าเดียว", icon: "users", roles: ["admin", "manager", "acct", "sales"] },
      { key: "registration", title: "งานทะเบียน", subtitle: "คิวจดทะเบียน/ป้าย เรียงตามค้างนาน", icon: "card", roles: ["admin", "manager", "acct"] },
      { key: "acct", title: "บัญชี", subtitle: "ใบเสร็จรับเงิน / ใบกำกับภาษี", icon: "file", roles: ["admin", "manager", "acct"] },
      { key: "taxinv", title: "ใบกำกับภาษี", subtitle: "ออก/แก้ไข/พิมพ์ ใบกำกับภาษี", icon: "files", roles: ["admin", "manager", "acct"] },
      { key: "ar", title: "เงินค้างรับ", subtitle: "ยอดที่ยังไม่ได้รับ", icon: "cash", roles: ["admin", "manager", "acct"] },
    ],
  },
  {
    group: "บริการและอะไหล่",
    items: [
      { key: "service", title: "ศูนย์ซ่อม", subtitle: "ใบงานซ่อมและเช็กระยะ", icon: "wrench", roles: ["admin", "manager", "tech", "stock"] },
      { key: "parts", title: "อะไหล่และของแถม", subtitle: "ของคงเหลือ เบิก/ขาย และของแถม", icon: "cog", roles: ["admin", "manager", "stock", "tech", "acct", "sales"] },
    ],
  },
  {
    group: "บัญชีและพนักงาน",
    items: [
      { key: "expense", title: "ค่าใช้จ่าย", subtitle: "บันทึกรายจ่ายพร้อมใบเสร็จ", icon: "files", roles: ["admin", "manager", "acct"] },
      { key: "attend", title: "ภาพรวมการเข้างาน", subtitle: "ใครมาแล้ว ใครสาย ใครยังไม่มา", icon: "users", roles: ["admin", "manager", "hr"] },
      { key: "hr", title: "ลงเวลาและลา", subtitle: "เวลาเข้าออกและใบลา", icon: "clock", roles: ["admin", "manager", "hr", "sales", "stock", "tech", "acct"] },
      { key: "employees", title: "พนักงาน", subtitle: "ข้อมูลพนักงาน เงินเดือน และเพิ่มพนักงานใหม่", icon: "users", roles: ["admin", "manager", "hr"] },
      { key: "payroll", title: "เงินเดือนและ OT", subtitle: "เงินเดือน คอมมิชชั่น สลิป", icon: "card", roles: ["admin", "manager", "hr", "acct"] },
      { key: "users", title: "บัญชีผู้ใช้", subtitle: "ผู้ใช้ บทบาท และสิทธิ์", icon: "key", roles: ["admin"] },
    ],
  },
  {
    group: "ข้อมูลและตั้งค่า",
    items: [
      { key: "models", title: "รุ่นรถและสี", subtitle: "แคตตาล็อกรุ่น สี ราคา และรูป", icon: "bike", roles: ["admin", "manager"] },
      { key: "imp", title: "นำเข้าข้อมูล", subtitle: "อ่านไฟล์จากระบบยามาฮ่า", icon: "folder", roles: ["admin", "manager", "stock"] },
      { key: "sites", title: "สาขา", subtitle: "จุดลงเวลาของแต่ละบริษัท (พิกัด + รัศมี)", icon: "route", roles: ["admin", "manager"] },
      { key: "settings", title: "ตั้งค่าระบบ", subtitle: "เกณฑ์ทั้งหมดที่ระบบใช้", icon: "sliders", roles: ["admin", "manager"] },
      { key: "flow", title: "ผังกระบวนการ", subtitle: "ใครทำอะไรตอนไหน", icon: "route", roles: ["admin", "manager", "sales", "stock", "acct", "hr", "tech"] },
    ],
  },
];

/** กลุ่ม+รายการที่ role ชุดนี้เห็น (ตัดกลุ่มที่ว่างออก) */
export function visibleMenu(roleCodes: readonly string[]): MenuGroup[] {
  const roles = new Set(roleCodes);
  return MENU.map((g) => ({
    ...g,
    items: g.items.filter((item) => item.roles.some((r) => roles.has(r))),
  })).filter((g) => g.items.length > 0);
}

/** รายการเมนูแบบแบน (ไม่แบ่งกลุ่ม) */
export const MENU_ITEMS: MenuItem[] = MENU.flatMap((g) => g.items);

/** ทุก key ที่มีในเมนู (ไว้ทำ route/ตรวจ) */
export const ALL_MENU_KEYS: string[] = MENU_ITEMS.map((i) => i.key);

/** หา item จาก key */
export function menuItem(key: string): MenuItem | undefined {
  return MENU_ITEMS.find((i) => i.key === key);
}
