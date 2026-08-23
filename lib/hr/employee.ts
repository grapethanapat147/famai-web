/** ตัวช่วยสร้าง/เชื่อมข้อมูลพนักงานจากบัญชีผู้ใช้ (ฟังก์ชันบริสุทธิ์ ทดสอบได้) */

/** ตำแหน่งงานเริ่มต้นจาก role ของบัญชี — HR แก้ทีหลังได้ */
const ROLE_POSITION: Record<string, string> = {
  manager: "ผู้บริหาร",
  sales: "ที่ปรึกษาการขาย",
  stock: "ฝ่ายสต๊อก",
  acct: "ฝ่ายบัญชี",
  hr: "ฝ่ายบุคคล",
  tech: "ช่างเทคนิค",
  admin: "ผู้ดูแลระบบ",
};

/** ลำดับความสำคัญ — เลือกตำแหน่งที่สื่อ "หน้าที่งาน" ก่อน (admin เป็น role ระบบ ไว้ท้ายสุด) */
const POSITION_PRIORITY: readonly string[] = ["manager", "sales", "stock", "acct", "hr", "tech", "admin"];

/** ตำแหน่งเริ่มต้นจากหลาย role — คืน null ถ้าไม่มี role ที่รู้จัก (ให้ HR กรอกเอง) */
export function positionFromRoles(roleCodes: readonly string[]): string | null {
  const set = new Set(roleCodes);
  for (const code of POSITION_PRIORITY) {
    if (set.has(code)) {
      return ROLE_POSITION[code];
    }
  }
  return null;
}
