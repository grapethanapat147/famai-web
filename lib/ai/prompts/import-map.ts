/** จับคู่คอลัมน์ไฟล์นำเข้า → ฟิลด์รถ — prompt builder (pure · E12 FAM-1068) */
import { AI_IMPORT_FIELDS } from "@/lib/import/ai-map";

export function columnMapPrompt(headers: string[], sampleRows: string[][]): { system: string; user: string } {
  const fields = AI_IMPORT_FIELDS.map((f) => `- ${f.field}: ${f.label}`).join("\n");
  const system = [
    "คุณช่วยจับคู่คอลัมน์จากไฟล์ Excel/CSV ส่งออกของยามาฮ่า เข้ากับฟิลด์ข้อมูลรถ",
    "ดูชื่อหัวคอลัมน์และตัวอย่างข้อมูล แล้วระบุว่าคอลัมน์ต้นทางไหนตรงกับฟิลด์เป้าหมายใด",
    "ฟิลด์เป้าหมาย (key ที่ต้องใช้):",
    fields,
    'ตอบเป็น JSON เท่านั้น รูปแบบ: { "<field>": "<ชื่อหัวคอลัมน์ต้นทางเป๊ะ ๆ>", ... }',
    "- ใส่เฉพาะฟิลด์ที่มั่นใจว่าเจอคอลัมน์ตรงกัน · ฟิลด์ที่ไม่เจอให้ข้าม",
    "- ค่าต้องเป็นชื่อหัวคอลัมน์ต้นทางที่ให้มาแบบเป๊ะ ๆ ห้ามแต่งชื่อใหม่",
    "- ห้ามมีข้อความอื่นนอกเหนือจาก JSON",
  ].join("\n");
  const user = [
    `หัวคอลัมน์: ${JSON.stringify(headers)}`,
    "ตัวอย่างข้อมูล (แถวละ 1 อาร์เรย์ ตามลำดับหัวคอลัมน์):",
    ...sampleRows.slice(0, 3).map((r) => JSON.stringify(r)),
  ].join("\n");
  return { system, user };
}
