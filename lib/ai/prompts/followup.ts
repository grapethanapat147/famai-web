/** ร่างข้อความติดตามลูกค้า — prompt builder (pure เพื่อเทสได้ · E12 FAM-1066) */

export type FollowUpInput = {
  customerName: string;
  vehicle: string; // เช่น "NMAX · แดง"
  situation: string; // จุดประสงค์/สถานการณ์ เช่น "ส่งมอบรถแล้ว" หรือหัวข้อจาก FOLLOWUP_PURPOSES
  shopName?: string;
};

/** จุดประสงค์ที่ให้เลือกใน UI */
export const FOLLOWUP_PURPOSES = [
  "ขอบคุณหลังส่งมอบรถ",
  "เชิญเข้าเช็กระยะตามกำหนด",
  "อัปเดตสถานะทะเบียน",
  "ติดตามเรื่องไฟแนนซ์",
  "ทักทาย/ดูแลลูกค้าเก่า",
] as const;

const CAP = 200;

function clip(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, CAP);
}

/** ตัด/ล้าง input ให้ปลอดภัยก่อนใส่ prompt */
export function sanitizeFollowUp(input: FollowUpInput): FollowUpInput {
  return {
    customerName: clip(input.customerName),
    vehicle: clip(input.vehicle),
    situation: clip(input.situation),
    shopName: input.shopName ? clip(input.shopName) : undefined,
  };
}

/** ประกอบ system + user prompt สำหรับร่างข้อความติดตาม */
export function followUpPrompt(raw: FollowUpInput): { system: string; user: string } {
  const input = sanitizeFollowUp(raw);
  const shop = input.shopName || "Famai Motor Group";
  const system = [
    `คุณเป็นพนักงานขายของร้าน "${shop}" (ตัวแทนจำหน่าย Yamaha)`,
    "หน้าที่: ร่างข้อความติดตามลูกค้าสำหรับส่งทาง LINE/SMS",
    "กติกา:",
    "- ภาษาไทย สุภาพ เป็นกันเอง กระชับ 2–4 ประโยค",
    "- ห้ามแต่งข้อมูลที่ไม่ได้ให้มา (ราคา วันที่ โปรโมชั่น เงื่อนไข ส่วนลด) เด็ดขาด",
    "- อ้างถึงลูกค้าและรุ่นรถตามที่ให้มาเท่านั้น",
    "- ลงท้ายด้วยชื่อร้าน",
    "- ตอบกลับเฉพาะตัวข้อความที่จะส่งเท่านั้น ไม่ต้องมีคำอธิบายหรือหัวข้อ",
  ].join("\n");
  const user = [
    `ลูกค้า: ${input.customerName || "ลูกค้า"}`,
    `รุ่นรถ: ${input.vehicle || "-"}`,
    `จุดประสงค์/สถานการณ์: ${input.situation || "ทักทายและดูแลลูกค้า"}`,
  ].join("\n");
  return { system, user };
}
